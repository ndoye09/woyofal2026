# 🚀 QUICK START - Déploiement Local & Production

## 🏠 DÉMARRER EN LOCAL

### 1️⃣ Prérequis
```bash
# Vérifier Node.js
node --version # Devrait être 18+
npm --version
```

### 2️⃣ Installer & Lancer

**Terminal 1 - Backend (API):**
```bash
node api-mock-server.js
# Output: ✅ Mock API Server lancé sur port 5000
```

**Terminal 2 - Frontend (React):**
```bash
cd frontend-react
npm install  # Premier fois seulement
npm run dev
# Output: ✅ Local: http://localhost:5173
```

### 3️⃣ Accéder au Site
- **Frontend:** http://localhost:5173
- **API:**      http://localhost:5000/api/health
- **Mock:**     http://localhost:5173 (pages mockées)

### 4️⃣ Tester les Fonctionnalités
```
✅ HomePage: http://localhost:5173
✅ Simulateur: http://localhost:5173/simulateur
✅ Chatbot: Click coin bas-droit
✅ Dashboard: Login avec test@example.com / password123
```

---

## 🌐 DÉPLOYER EN PRODUCTION

### Option 1: Vercel + Railway (Recommandé)

**Étape 1: Préparer**
```bash
# Windows
deploy.bat

# Linux/Mac
chmod +x deploy.sh
./deploy.sh
```

**Étape 2: Créer Accounts**
- Vercel: https://vercel.com/signup
- Railway: https://railway.app/register
- GitHub: Avoir votre repo pushé

**Étape 3: Déployer Frontend (Vercel)**
1. Aller à https://vercel.com/dashboard
2. Click "Add New..." → "Project"
3. Select GitHub repo
4. Set Root Directory: `frontend-react`
5. Click "Deploy"
6. Attendre ~2 minutes
7. Copier URL (ex: `https://woyofal-platform.vercel.app`)

**Étape 4: Déployer Backend (Railway)**
1. Aller à https://railway.app/dashboard
2. Click "New Project" → "Deploy from GitHub"
3. Select repo
4. Railway auto-déploie
5. Aller à "Settings" et copier URL (ex: `https://woyofal-api.railway.app`)

**Étape 5: Configurer Variables Vercel**
1. Vercel Dashboard → Select Project
2. Go to "Settings" → "Environment Variables"
3. Add: `VITE_API_URL` = `https://woyofal-api.railway.app/api`
4. Save
5. Go to "Deployments" → "Redeploy" latest

**Étape 6: Vérifier**
```bash
# Frontend
curl https://woyofal-platform.vercel.app

# Backend
curl https://woyofal-api.railway.app/api/health
# Output: { "status": "ok" }

# Login test
curl -X POST https://woyofal-api.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

---

## ⚙️ CONFIGURATION POST-DÉPLOIEMENT

### Railway Environment Variables
Dans Railway Dashboard → Project → Variables:
```
PORT = 5000  # Auto-set
NODE_ENV = production
```

### Vercel Environment Variables
Dans Vercel Dashboard → Settings → Environment Variables:
```
VITE_API_URL = https://your-railway-url/api
```

### Custom Domain (Optionnel)
**Vercel:**
1. Settings → Domains
2. Add custom domain
3. Configure DNS records

**Railway:**
1. Settings → Custom Domain
2. Add domain
3. Configure DNS CNAME

---

## 🧪 TEST CHECKLIST

Après déploiement, vérifier:

- [ ] Frontend chargé (sous 3 secondes)
- [ ] API accessible (health endpoint)
- [ ] Login fonctionne (test@example.com)
- [ ] Simulateur calcule correctement
- [ ] Chatbot répond aux messages
- [ ] Dashboard affiche les données
- [ ] Responsive sur mobile (F12)
- [ ] Aucune erreur console (F12)
- [ ] Pas de CORS errors

---

## 🆘 TROUBLESHOOTING

### "Can't reach API"
```bash
# Vérifier API URL
echo $VITE_API_URL

# Vérifier CORS
curl -i -X OPTIONS https://your-api/api/health
# Doit avoir Access-Control-Allow-Origin header
```

### "White screen on Vercel"
1. Ouvrir DevTools (F12)
2. Check console pour erreurs
3. Vérifier que ENV vars sont set
4. Redéployer

### "API returns 404"
1. Vérifier que Railway est déployé
2. Vérifier logs: Railway → Deployments → Logs
3. Vérifier que PORT=5000 en variable

### "Token expired"
Normal en mock - Re-login

---

## 📊 MONITORING

### Vercel Analytics
- Aller à Dashboard → Analytics
- Voir page views, response times

### Railway Metrics
- Aller à Project → Metrics
- Voir CPU, Memory, Network

---

## 📚 RESSOURCES

- Vercel Docs: https://vercel.com/docs
- Railway Docs: https://docs.railway.app
- React Vite: https://vitejs.dev/guide/
- GitHub Actions: https://github.com/features/actions

---

**Besoin d'aide ?** Check [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) pour plus de détails.

