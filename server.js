require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuration OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Middleware de sécurité
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  methods: ['GET', 'POST'],
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 requêtes max par IP
  message: { error: 'Trop de requêtes, veuillez réessayer plus tard.' },
});
app.use(limiter);

// Configuration Multer pour upload audio
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB max
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/webm', 'audio/m4a'];
    if (allowedTypes.includes(file.mimetype) || file.originalname.match(/\.(mp3|mp4|wav|webm|m4a)$/)) {
      cb(null, true);
    } else {
      cb(new Error('Format audio non supporté'));
    }
  },
});

// Prompt système pour Parle-moi
const getSystemPrompt = (language = 'fr') => {
  if (language === 'en') {
    return `You are a compassionate listening assistant named Parle-moi.
Your role is to provide a safe, judgment-free space for users to express their emotions and thoughts.

Principles:
- Active and empathetic listening
- Validate emotions without judgment
- Ask open-ended questions to encourage expression
- Gently suggest well-being techniques (breathing, meditation) when appropriate
- Detect distress signals and redirect to professional help when needed
- Respect confidentiality

You NEVER replace a mental health professional.
In case of crisis, you direct users to appropriate emergency resources.

Respond with warmth, empathy, and kindness. Keep responses concise (2-4 sentences).`;
  }
  
  return `Tu es un assistant d'écoute bienveillante nommé Parle-moi.
Ton rôle est d'offrir un espace sûr et sans jugement pour que l'utilisateur puisse exprimer ses émotions et pensées.

Principes :
- Écoute active et empathique
- Validation des émotions sans jugement
- Questions ouvertes pour encourager l'expression
- Suggestions douces de techniques de bien-être (respiration, méditation) quand approprié
- Détection de signaux de détresse et redirection vers aide professionnelle si nécessaire
- Respect de la confidentialité

Tu ne remplaces JAMAIS un professionnel de santé mentale.
En cas de crise, tu diriges vers les ressources d'urgence appropriées.

Réponds avec chaleur, empathie et bienveillance. Garde tes réponses concises (2-4 phrases).`;
};

// Stockage temporaire des conversations (en production, utiliser une vraie DB)
const conversations = new Map();

// ============================================
// ROUTE 1: Chat avec GPT-4
// ============================================
app.post('/chat', async (req, res) => {
  try {
    const { message, conversation_id, language = 'fr' } = req.body;
    
    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message requis' });
    }
    
    // Récupérer l'historique de conversation
    let history = conversations.get(conversation_id) || [];
    
    // Construire les messages pour OpenAI
    const messages = [
      { role: 'system', content: getSystemPrompt(language) },
      ...history,
      { role: 'user', content: message },
    ];
    
    // Appel à OpenAI GPT-4 Turbo (le plus récent disponible)
    const completion = await openai.chat.completions.create({
      model: process.env.MODEL || 'gpt-4-turbo-preview',
      messages: messages,
      temperature: 0.8,
      top_p: 1.0,
      max_tokens: 500,
    });
    
    const response = completion.choices[0].message.content;
    
    // Sauvegarder dans l'historique (garder les 10 derniers échanges)
    history.push({ role: 'user', content: message });
    history.push({ role: 'assistant', content: response });
    if (history.length > 20) {
      history = history.slice(-20);
    }
    conversations.set(conversation_id, history);
    
    res.json({
      response,
      conversation_id,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('Erreur /chat:', error);
    res.status(500).json({
      error: 'Erreur lors de la génération de la réponse',
      details: error.message,
    });
  }
});

// ============================================
// ROUTE 2: Speech-to-Text (Whisper)
// ============================================
app.post('/stt', upload.single('audio'), async (req, res) => {
  let filePath = null;
  
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Fichier audio requis' });
    }
    
    filePath = req.file.path;
    const language = req.body.language || 'fr';
    
    // Transcription avec Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(filePath),
      model: 'whisper-1',
      language: language === 'fr' ? 'fr' : 'en',
      response_format: 'text',
    });
    
    res.json({
      transcription: transcription,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('Erreur /stt:', error);
    res.status(500).json({
      error: 'Erreur lors de la transcription',
      details: error.message,
    });
  } finally {
    // Nettoyer le fichier temporaire
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
});

// ============================================
// ROUTE 3: Text-to-Speech
// ============================================
app.post('/tts', async (req, res) => {
  try {
    const { text, voice = 'alloy', language = 'fr' } = req.body;
    
    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: 'Texte requis' });
    }
    
    // Choisir la voix selon la langue
    const selectedVoice = language === 'fr' ? 'nova' : voice;
    
    // Génération audio avec TTS
    const mp3 = await openai.audio.speech.create({
      model: 'tts-1',
      voice: selectedVoice,
      input: text,
      speed: 0.95, // Légèrement plus lent pour un ton apaisant
    });
    
    const buffer = Buffer.from(await mp3.arrayBuffer());
    
    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': buffer.length,
    });
    res.send(buffer);
    
  } catch (error) {
    console.error('Erreur /tts:', error);
    res.status(500).json({
      error: 'Erreur lors de la synthèse vocale',
      details: error.message,
    });
  }
});

// ============================================
// ROUTES FUTURES (Phase 3 - Placeholders)
// ============================================

// Catalogue des fréquences
app.get('/frequencies', (req, res) => {
  res.json({
    frequencies: [
      { id: '432hz', name: '432 Hz - Harmonie naturelle', file: '432hz.wav' },
      { id: '528hz', name: '528 Hz - Transformation', file: '528hz.wav' },
      { id: '639hz', name: '639 Hz - Relations', file: '639hz.wav' },
      { id: '741hz', name: '741 Hz - Expression', file: '741hz.wav' },
      { id: '963hz', name: '963 Hz - Éveil', file: '963hz.wav' },
      { id: 'crystal', name: 'Cristal - Pureté', file: 'crystal.wav' },
    ],
  });
});

// Feedback utilisateur
app.post('/feedback', (req, res) => {
  const { mood, notes, anonymous = true } = req.body;
  console.log('Feedback reçu:', { mood, notes, anonymous });
  res.json({ success: true, message: 'Merci pour votre retour' });
});

// Version du prompt
app.get('/prompts/version', (req, res) => {
  res.json({
    version: '1.0.0',
    model: process.env.MODEL || 'gpt-4-turbo-preview',
    updated_at: '2025-10-04',
  });
});

// ============================================
// ROUTE DE SANTÉ (Health Check)
// ============================================
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Parle-moi API',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Route racine
app.get('/', (req, res) => {
  res.json({
    service: 'Parle-moi API',
    version: '2.0.0',
    endpoints: {
      chat: 'POST /chat',
      stt: 'POST /stt',
      tts: 'POST /tts',
      frequencies: 'GET /frequencies',
      feedback: 'POST /feedback',
      health: 'GET /health',
    },
  });
});

// Gestion des erreurs globales
app.use((err, req, res, next) => {
  console.error('Erreur serveur:', err);
  res.status(500).json({
    error: 'Erreur interne du serveur',
    message: err.message,
  });
});

// Démarrage du serveur
app.listen(PORT, () => {
  console.log(`🚀 Serveur Parle-moi démarré sur le port ${PORT}`);
  console.log(`📡 Endpoints disponibles:`);
  console.log(`   POST /chat - Conversation avec IA`);
  console.log(`   POST /stt  - Transcription audio`);
  console.log(`   POST /tts  - Synthèse vocale`);
  console.log(`   GET  /health - État du serveur`);
  console.log(`\n⚠️  N'oubliez pas de configurer le fichier .env avec votre clé OpenAI`);
});

// Nettoyage des fichiers temporaires au démarrage
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}
