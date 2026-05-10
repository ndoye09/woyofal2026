# 🚀 GUIDE DÉPLOIEMENT COMPLET - Woyofal Platform

**Objectif** : Frontend sur Vercel + Backend sur Railway  
**Temps estimé** : 20 minutes  
**Coût** : Gratuit (tier free suffisant)

---

## 📋 PRÉREQUIS

### Accounts Requis
- [ ] Compte **Vercel** (gratuit) → https://vercel.com/signup
- [ ] Compte **Railway** (gratuit) → https://railway.app/
- [ ] Compte **GitHub** (pour intégration CI/CD)

### Outils Locaux
- [ ] Node.js 18+ installé
- [ ] npm ou yarn
- [ ] Git configuré

---

## 🎯 PHASE 1 : FRONTEND - Vercel

### 1️⃣ Préparer le Frontend

```bash
cd frontend-react

# Vérifier build
npm run build

# Vérifier pas d'erreurs
```

**Output attendu** :
```
✅ vite v5.x.x building for production...
✅ built in 2.34s
✅ dist/index.html
✅ dist/assets/...
```

### 2️⃣ Créer fichier Configuration Vercel

Créer `frontend-react/vercel.json` :

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "env": {
    "VITE_API_URL": "@api_url"
  },
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### 3️⃣ Push sur GitHub

```bash
cd ..
git add .
git commit -m "Prêt pour déploiement"
git push origin main
```

### 4️⃣ Déployer sur Vercel

**Option A : Via Dashboard (Easiest)**
1. Aller à https://vercel.com/dashboard
2. Click "New Project"
3. Import GitHub repo `woyofal-data-platform`
4. Select `frontend-react/` comme root directory
5. Click "Deploy"

**Option B : Via CLI**
```bash
cd frontend-react
npm i -g vercel
vercel login
vercel deploy --prod
```

**Résultat** : URL comme `https://woyofal-platform.vercel.app`

---

## 🎯 PHASE 2 : BACKEND - Railway

### 1️⃣ Préparer le Backend

Créer `api/Procfile` (si éxiste pas) :

```
web: node ../api-mock-server.js
```

Créer `api/package.json` (si éxiste pas) :

```json
{
  "name": "woyofal-api",
  "version": "1.0.0",
  "main": "../api-mock-server.js",
  "scripts": {
    "start": "node ../api-mock-server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5"
  }
}
```

Puis :
```bash
npm install
```

### 2️⃣ Push Backend sur GitHub

```bash
git add api/Procfile api/package.json
git commit -m "Backend prêt pour Railway"
git push origin main
```

### 3️⃣ Déployer sur Railway

**Via Dashboard** :
1. Aller à https://railway.app
2. Click "New Project"
3. Select "GitHub Repo"
4. Authorize + choose `woyofal-data-platform`
5. Click "Deploy"

**Configuration Railway** :
- Root directory : `.` (racine du repo)
- Start command : `node api-mock-server.js`
- Environment variables (voir section 4)

**Résultat** : URL comme `https://woyofal-api-prod.railway.app`

---

## 🎯 PHASE 3 : CONFIGURATION ENV & CONNEXION

### 1️⃣ Variables Vercel

Aller à : **Vercel Dashboard → Project Settings → Environment Variables**

Ajouter :
```
VITE_API_URL = https://woyofal-api-prod.railway.app/api
```

Puis redéployer :
```
vercel deploy --prod
```

### 2️⃣ Variables Railway

Aller à : **Railway Dashboard → Project → Variables**

Ajouter :
```
PORT = 5000
NODE_ENV = production
```

### 3️⃣ CORS Configuration

Modifier `api-mock-server.js` pour ajouter :

```javascript
const cors = require('cors');
const express = require('express');

const app = express();

// CORS pour production
app.use(cors({
  origin: [
    'https://woyofal-platform.vercel.app',
    'http://localhost:3000',
    'http://localhost:5173'
  ],
  credentials: true
}));

app.use(express.json());

// ... reste du code
```

Push les changements :
```bash
git add api-mock-server.js
git commit -m "CORS config production"
git push origin main
```

---

## ✅ VÉRIFICATION & TESTS

### Test 1 : Frontend Accessible
```bash
curl https://woyofal-platform.vercel.app
# ✅ Devrait retourner HTML du site
```

### Test 2 : Backend Accessible
```bash
curl https://woyofal-api-prod.railway.app/api/health
# ✅ Devrait retourner { "status": "ok" }
```

### Test 3 : Login Workflow
1. Ouvrir https://woyofal-platform.vercel.app
2. Aller à "Dashboard"
3. Login avec `test@example.com / password123`
4. Vérifier qu'on accède au dashboard

### Test 4 : Simulateur
1. Aller à "Simulateur"
2. Entrer un montant (5000 FCFA)
3. Vérifier que ça calcule le kWh

### Test 5 : Chatbot
1. Click sur chatbot (coin bas-droit)
2. Envoyer un message
3. Vérifier la réponse IA

---

## 🔧 TROUBLESHOOTING

### "CORS Error"
→ Ajouter l'URL Vercel dans CORS whitelist (voir Phase 3.3)

### "API Not Responding"
→ Vérifier les logs Railway :
```
Railway Dashboard → Project → Deploy → View Build Logs
```

### "Build Failed on Vercel"
→ Vérifier que `npm run build` fonctionne localement :
```bash
cd frontend-react
npm run build
```

### "White Screen on Vercel"
→ Vérifier console.log des erreurs (F12)
→ Vérifier que `VITE_API_URL` est correcte

---

## 📊 ARCHITECTURE FINALE

```
┌─────────────────────────────────────┐
│  https://woyofal-platform.vercel.app │ (Frontend React)
│  - Build optimisé Vite              │
│  - Vercel CDN global                │
│  - Auto-deploy sur push GitHub      │
└─────────────────────┬───────────────┘
                      │ API calls
                      ↓
        ┌─────────────────────────┐
        │ https://woyofal-api... │ (Backend Mock)
        │ Railway (Node.js)      │
        │ - CORS enabled         │
        │ - All endpoints ready  │
        └─────────────────────────┘
```

---

## 🎁 BONUS : CI/CD Automatique

Vercel déploie automatiquement sur chaque push :
```bash
git push origin main
# ↓
# Vercel build automatiquement
# ↓
# Site mis à jour en ~2 minutes
```

---

## 📈 MONITORING

### Vercel Analytics
- Aller à : **Vercel Dashboard → Analytics**
- Voir : page views, top pages, countries

### Railway Metrics
- Aller à : **Railway Dashboard → Metrics**
- Voir : CPU, Memory, Network usage

---

## ✨ RÉSULTAT FINAL

| Composant | URL | Status |
|-----------|-----|--------|
| **Frontend** | https://woyofal-platform.vercel.app | ✅ Production |
| **API** | https://woyofal-api-prod.railway.app | ✅ Production |
| **Domain Custom** | À configurer après | 🔄 Optionnel |

---

## 🎓 PROCHAINES ÉTAPES (Post-Déploiement)

1. ✅ Configurer domaine custom (woyofal.sn)
2. ✅ Ajouter SSL/TLS certificat
3. ✅ Connecter PostgreSQL réelle
4. ✅ Ajouter authentification réelle (Firebase)
5. ✅ Setup monitoring + alertes

---

**Prêt à lancer ? Continue avec l'étape qui te convient ! 🚀**
