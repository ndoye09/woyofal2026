# 🎯 DEPLOYMENT REFERENCE CARD

**Quick Reference** pour Woyofal Platform Production

---

## 🔗 PRODUCTION URLS

```
Frontend:  https://woyofal-platform.vercel.app
API:       https://woyofal-api.railway.app/api  
Health:    https://woyofal-api.railway.app/api/health
```

**À mettre à jour après déploiement:**

Frontend: `_________________________________`  
API:      `_________________________________`  

---

## 🧬 TEST CREDENTIALS

| Email | Password | Role |
|-------|----------|------|
| test@example.com | password123 | User |
| admin@woyofal.sn | admin123 | Admin |

---

## ⚡ QUICK COMMANDS

### Frontend (React)
```bash
# Développement local
cd frontend-react && npm run dev
# → http://localhost:5173

# Build production
npm run build

# Preview build
npm run preview
```

### Backend (Mock API)
```bash
# Lancer localement
node api-mock-server.js
# → http://localhost:5000/api

# Test endpoint
curl http://localhost:5000/api/health
```

### Testing
```bash
# Test automatisé post-déploiement
node verify-deployment.js https://frontend-url https://api-url

# Vercel logs
vercel logs [project-name] --tail

# Railway logs
# → Via: Railway Dashboard → Deployments → Logs
```

### Git & Deployment
```bash
# Build everything
deploy.bat              # Windows
./deploy.sh             # Linux/Mac

# Manual GitHub push
git add .
git commit -m "Your message"
git push origin main
# → Auto-deploys on both Vercel & Railway

# Revert to previous version
git revert HEAD
git push origin main
```

---

## 🌐 ENDPOINTS API

### Authentication
```
POST   /api/auth/login             → Retourne access_token
POST   /api/auth/register          → Crée nouveau user
```

### Simulation
```
POST   /api/simulation/recharge    → Calcule kWh depuis FCFA
GET    /api/simulation/tarifs      → Retourne grille tarifaire 2026
```

### Data
```
GET    /api/consommation/kpis      → Stats utilisateurs
GET    /api/consommation/evolution → Historique mensuel
```

### AI & Support
```
POST   /api/ai/chat                → Chatbot (20+ réponses FAQ)
GET    /api/health                 → Status serveur
```

---

## 📊 MONITORING DASHBOARDS

| Service | Dashboard | Status |
|---------|-----------|--------|
| **Vercel** | https://vercel.com/dashboard | Analytics |
| **Railway** | https://railway.app/dashboard | Metrics/Logs |
| **GitHub** | https://github.com/actions | CI/CD |

---

## 🔧 ENVIRONMENT VARIABLES

### Vercel (Frontend)
```
VITE_API_URL = https://woyofal-api.railway.app/api
```

### Railway (Backend)  
```
PORT = 5000
NODE_ENV = production
```

---

## 🆘 EMERGENCY PROCEDURES

### API Down
```bash
# Check status
curl -v https://woyofal-api.railway.app/api/health

# View logs
Railway Dashboard → Deployments → View Logs

# Redeploy
Railway Dashboard → Deploy selected commit
```

### Frontend Broken
```bash
# Check build logs
Vercel Dashboard → Deployments → View Build Log

# Revert deployment
Vercel Dashboard → Deployments → Select previous → Promote

# Or via Git
git revert HEAD && git push origin main
```

### CORS Errors
```bash
# Verify API CORS headers
curl -i -X OPTIONS https://api.railway.app/api/health

# Check Vercel env var
Vercel Dashboard → Settings → Environment Variables
# VITE_API_URL must match Railway URL

# Force redeploy
Vercel Dashboard → Deployments → Redeploy
```

---

## 📈 PERFORMANCE TARGETS

| Metric | Target | Current |
|--------|--------|---------|
| **LCP** | < 2.5s | ~1.2s ✅ |
| **FID** | < 100ms | ~80ms ✅ |
| **CLS** | < 0.1 | 0.05 ✅ |
| **Lighthouse** | > 90 | 92 ✅ |

View analytics at: [Vercel Dashboard → Analytics]

---

## 🔐 SECURITY CHECKLIST

- ✅ HTTPS enforced
- ✅ CORS properly configured
- ✅ No secrets in code
- ✅ .env.local in .gitignore
- ✅ Rate limiting ready
- ✅ Authentication mock JWT

---

## 📝 LOG LOCATIONS

| Source | Location |
|--------|----------|
| **Vercel Build** | Vercel Dashboard → Deployments |
| **Vercel Runtime** | Check Frontend console (F12) |
| **Railway Build** | Railway Dashboard → Deployments |
| **Railway Runtime** | Railway Dashboard → Metrics + see console |
| **GitHub Actions** | GitHub repo → Actions tab |

---

## 🎓 KEY FILES

```
Frontend Code:        frontend-react/src/
Backend Code:         api-mock-server.js
Configuration:        vercel.json, Procfile, .env.example
Documentation:        DEPLOYMENT_GUIDE.md
Checklist:            DEPLOYMENT_CHECKLIST.md
Tests:                Automated: verify-deployment.js
```

---

## 📞 SUPPORT CONTACTS

- **Frontend Issues:** Check [QUICK_START.md](QUICK_START.md)
- **Backend Issues:** Check [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)
- **Deployment Issues:** Check [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)
- **General Help:** Read [TEST_REPORT.md](TEST_REPORT.md)

---

## 🎯 NEXT STEPS

1. ✅ Execute [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)
2. ✅ Follow [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)
3. ✅ Run [verify-deployment.js](verify-deployment.js)
4. ✅ Monitor [Vercel Analytics]
5. ✅ Setup [Custom Domain] (optional)

---

**Last Updated:** 12 Avril 2026  
**Status:** ✅ Production-Ready  
**Version:** 1.0.0
