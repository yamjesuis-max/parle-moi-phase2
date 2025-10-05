# 🚀 Serveur Backend Parle-moi

Serveur Node.js sécurisé servant de pont entre l'application mobile Parle-moi et l'API OpenAI.

## 📋 Fonctionnalités

- ✅ **Chat intelligent** avec GPT-4 Turbo
- ✅ **Transcription vocale** avec Whisper
- ✅ **Synthèse vocale** avec TTS
- ✅ **Sécurité** : HTTPS, CORS, Rate Limiting, Helmet
- ✅ **Routes futures** pour Phase 3 (fréquences, feedback)

## 🔧 Installation

### 1. Installer les dépendances

```bash
npm install
```

### 2. Configurer les variables d'environnement

Copiez `.env.example` en `.env` :

```bash
cp .env.example .env
```

Éditez `.env` et ajoutez votre clé OpenAI :

```env
OPENAI_API_KEY=sk-proj-VOTRE_CLE_ICI
MODEL=gpt-4-turbo-preview
PORT=3000
ALLOWED_ORIGINS=*
```

### 3. Démarrer le serveur

**Mode développement :**
```bash
npm run dev
```

**Mode production :**
```bash
npm start
```

Le serveur démarre sur `http://localhost:3000`

## 📡 Endpoints API

### POST /chat
Conversation avec GPT-4

**Request:**
```json
{
  "message": "Je me sens un peu anxieux aujourd'hui",
  "conversation_id": "uuid-unique",
  "language": "fr"
}
```

**Response:**
```json
{
  "response": "Je comprends que tu te sentes anxieux...",
  "conversation_id": "uuid-unique",
  "timestamp": "2025-10-04T12:00:00Z"
}
```

### POST /stt
Transcription audio (Speech-to-Text)

**Request:**
- `audio`: fichier audio (multipart/form-data)
- `language`: "fr" ou "en"

**Response:**
```json
{
  "transcription": "Bonjour, j'ai besoin de parler",
  "timestamp": "2025-10-04T12:00:00Z"
}
```

### POST /tts
Synthèse vocale (Text-to-Speech)

**Request:**
```json
{
  "text": "Prends une grande respiration",
  "voice": "nova",
  "language": "fr"
}
```

**Response:**
Fichier audio MP3 (binary)

### GET /health
Vérification de l'état du serveur

**Response:**
```json
{
  "status": "ok",
  "service": "Parle-moi API",
  "version": "2.0.0",
  "timestamp": "2025-10-04T12:00:00Z"
}
```

### GET /frequencies
Liste des fréquences disponibles (Phase 3)

### POST /feedback
Enregistrement du feedback utilisateur (Phase 3)

## 🔐 Sécurité

### Clé API OpenAI
- ⚠️ **JAMAIS** dans le code source
- ⚠️ **JAMAIS** dans Git
- ✅ Toujours dans `.env` (ignoré par Git)
- ✅ Variables d'environnement en production

### CORS
Configuré pour accepter les requêtes depuis l'application mobile uniquement.

### Rate Limiting
- 50 requêtes par IP toutes les 15 minutes
- Protection contre les abus

### Helmet
Headers de sécurité HTTP activés.

## 🌍 Déploiement

### Option 1: Render.com (Recommandé)

1. Créez un compte sur https://render.com
2. Créez un nouveau "Web Service"
3. Connectez votre repo Git
4. Configurez les variables d'environnement
5. Déployez !

**Variables d'environnement à configurer :**
- `OPENAI_API_KEY`
- `MODEL`
- `ALLOWED_ORIGINS`

### Option 2: Vercel

```bash
npm install -g vercel
vercel
```

Ajoutez les variables d'environnement dans le dashboard Vercel.

### Option 3: Railway.app

1. Créez un projet sur https://railway.app
2. Connectez votre repo
3. Ajoutez les variables d'environnement
4. Déployez

## 📊 Coûts Estimés OpenAI

### Par utilisateur actif (30 conversations/mois)

- **GPT-4 Turbo:** ~$1.35/mois
- **Whisper:** ~$0.03/mois
- **TTS:** ~$0.03/mois
- **Total:** ~$1.40/mois par utilisateur actif

Avec un plan à $9/mois, marge de ~$7.60 (84%)

## 🧪 Tests

### Test local avec curl

**Chat:**
```bash
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Bonjour","conversation_id":"test-123","language":"fr"}'
```

**Health Check:**
```bash
curl http://localhost:3000/health
```

## 📝 Logs

Les logs sont affichés dans la console. En production, utilisez un service comme:
- Papertrail
- Loggly
- DataDog

## 🔄 Mise à jour vers GPT-5

Quand GPT-5 sera disponible, changez simplement dans `.env`:

```env
MODEL=gpt-5
```

## 🆘 Dépannage

### "Error: OPENAI_API_KEY not found"
Vérifiez que le fichier `.env` existe et contient votre clé.

### "Rate limit exceeded"
Attendez 15 minutes ou augmentez la limite dans `server.js`.

### "File too large"
La limite est de 25MB pour les fichiers audio.

## 📞 Support

Pour toute question technique, consultez la documentation OpenAI :
- https://platform.openai.com/docs

---

**Version:** 2.0.0  
**Dernière mise à jour:** 4 octobre 2025
