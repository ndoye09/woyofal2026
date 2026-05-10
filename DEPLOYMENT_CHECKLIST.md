# ✅ DEPLOYMENT CHECKLIST

## 📋 PRÉ-DÉPLOIEMENT

- [ ] **Code Review**
  - [ ] Aucune erreur console
  - [ ] `npm run build` réussit en local
  - [ ] Tests passent (si applicable)
  - [ ] Pas de console.log de debug

- [ ] **Configuration**
  - [ ] `.env` créé (avec VITE_API_URL)
  - [ ] Vercel.json configuré (frontend-react/)
  - [ ] Procfile créé (backend)
  - [ ] package.json à la racine OK

- [ ] **Git**
  - [ ] Tout commité (`git status` clean)
  - [ ] Branch main à jour
  - [ ] `.gitignore` correct (pas de .env)
  - [ ] Repo visible et accessible

- [ ] **Accounts**
  - [ ] Vercel account créé (https://vercel.com/signup)
  - [ ] Railway account créé (https://railway.app/register)
  - [ ] GitHub account lié aux deux

---

## 🚀 PHASE 1: DÉPLOYER FRONTEND (Vercel)

**Délai estimé:** 5 minutes

- [ ] Aller à https://vercel.com/dashboard
- [ ] Click "Add New → Project"
- [ ] Sélectionner repository (woyofal-data-platform)
- [ ] **IMPORTANT**: Set "Root Directory" → `frontend-react/`
- [ ] Click "Deploy"
- [ ] Attendre la construction (~2-3 min)
- [ ] Vérifier que déployé (status: Ready)
- [ ] **Copier URL** → `https://xxxx.vercel.app`

**Test local:**
```bash
npm run build
# ✅ Doit réussir sans erreurs
```

---

## 🚀 PHASE 2: DÉPLOYER BACKEND (Railway)

**Délai estimé:** 5 minutes

- [ ] Aller à https://railway.app/dashboard
- [ ] Click "New Project" → "Deploy from GitHub"
- [ ] Sélectionner repository
- [ ] Railway déploie automatiquement
- [ ] Aller à "Settings" → "Environment"
- [ ] Vérifier: `PORT=5000`
- [ ] Click "Deploy" si nécessaire
- [ ] Attendre la construction
- [ ] Aller à "Settings" → "Domain"
- [ ] **Copier URL** → `https://xxxx.railway.app`

**Test local:**
```bash
node api-mock-server.js
# ✅ Doit se lancer sur port 5000
```

---

## ⚙️ PHASE 3: CONFIGURER VARIABLES ENVIRONNEMENT

**Délai estimé:** 2 minutes

### Vercel Environment Variables

- [ ] Aller à: Vercel Dashboard → Project (woyofal)
- [ ] Click "Settings" → "Environment Variables"
- [ ] Ajouter:
  ```
  Name:  VITE_API_URL
  Value: https://[YOUR-RAILWAY-URL]/api
  ```
- [ ] Click "Save"
- [ ] **IMPORTANT**: Aller à "Deployments" → Click le dernier
- [ ] Click "Redeploy" pour appliquer les changements
- [ ] Attendre que la redéploiement complète

### Railway Verification

- [ ] Railway Dashboard → Project → "Settings"
- [ ] Vérifier que PORT=5000 est set
- [ ] Vérifier que NODE_ENV=production (optionnel pour mock)

---

## 🧪 PHASE 4: VÉRIFICATION POST-DÉPLOIEMENT

### Test 1: Frontend Accessible
```bash
curl https://[YOUR-VERCEL-URL]
# ✅ Doit retourner HTML (pas d'erreur)
```
- [ ] Frontend charge en < 3 secondes

### Test 2: Backend Accessible
```bash
curl https://[YOUR-RAILWAY-URL]/api/health
# ✅ Output: {"status":"ok","timestamp":"..."} 
```
- [ ] Health check retourne 200 OK

### Test 3: Login Fonctionne
```bash
curl -X POST https://[YOUR-RAILWAY-URL]/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
# ✅ Doit retourner access_token
```
- [ ] Login retourne token

### Test 4: Navigateur (Important!)
1. [ ] Ouvrir https://[YOUR-VERCEL-URL]
2. [ ] Page chargée correctement
3. [ ] Click "Tableau de Bord" → Login
4. [ ] Entrer: test@example.com / password123
5. [ ] Dashboard chargé sans erreur
6. [ ] Aller à "Simulateur" → Tester calcul
7. [ ] Ouvrir DevTools (F12) → Aucune erreur rouge

### Test 5: Automatisé (Optionnel)
```bash
node verify-deployment.js https://[YOUR-VERCEL-URL] https://[YOUR-RAILWAY-URL]/api
# ✅ Tous les tests doivent passer
```
- [ ] Script de vérification retourne 5/5 tests OK

---

## 📊 PHASE 5: UX/RESPONSIVE

- [ ] [ ] Desktop (1920×1080) → UI correct
- [ ] [ ] Tablet (768×1024) → Layout adaptatif
- [ ] [ ] Mobile (375×667) → Readable, buttons touchable

**Test sur Mobile:**
1. DevTools (F12)
2. Click "Toggle device toolbar" (Ctrl+Shift+M)
3. Select différents devices
4. [ ] Tout est responsive

---

## 🎯 PHASE 6: PERFORMANCE

### Vercel Analytics
- [ ] Aller à Vercel Dashboard → Analytics
- [ ] Vérifier:
  - [ ] Core Web Vitals (LCP, FID, CLS) verts
  - [ ] Response time < 500ms

### Railway Metrics
- [ ] Railway Dashboard → Metrics
- [ ] Vérifier:
  - [ ] CPU usage < 50%
  - [ ] Memory < 100MB
  - [ ] Pas de errors

---

## 🔐 PHASE 7: SÉCURITÉ

- [ ] [ ] HTTPS activé (Vercel + Railway auto)
- [ ] [ ] Pas de secrets dans code
- [ ] [ ] .env.local pas commité
- [ ] [ ] API CORS correctement configuré
- [ ] [ ] Pas de console.log() sensibles

**Vérifier CORS:**
```bash
curl -i -X OPTIONS https://[YOUR-RAILWAY-URL]/api/health
# ✅ Headers incluent: Access-Control-Allow-Origin
```

---

## 📱 PHASE 8: DOMAINES CUSTOM (Optionnel)

### Pour Vercel
- [ ] [ ] Domaine acheté (ex: woyofal.sn)
- [ ] [ ] Aller à Vercel → Settings → Domains
- [ ] [ ] Ajouter domaine
- [ ] [ ] Suivre instructions DNS
- [ ] [ ] Vérifier DNS propagation (24-48h)

### Pour Railway (Optionnel)
- [ ] [ ] Railway → Settings → Custom Domain
- [ ] [ ] Ajouter CNAME record

---

## 🎓 PHASE 9: MONITORING & MAINTENANCE

### Alertes Vercel
- [ ] [ ] Aller à Project → Settings → Notifications
- [ ] [ ] Activer notifications pour:
  - [ ] Deployment errors
  - [ ] Performance alerts

### Logs & Debugging
- [ ] [ ] Vercel: Deployments → View Logs si erreur
- [ ] [ ] Railway: Deployments → View Build Logs si erreur

### Backup & Recovery
- [ ] [ ] Git repo sauvegardé
- [ ] [ ] Environment variables documentées
- [ ] [ ] Plan B identifié (redéploiement rapide)

---

## ✨ PHASE 10: GO LIVE!

- [ ] [ ] Tous les tests passent
- [ ] [ ] Performance acceptable
- [ ] [ ] Sécurité OK
- [ ] [ ] Équipe confirmée
- [ ] [ ] Annonce prête
- [ ] [ ] Support prévu

**Communication:**
- [ ] [ ] Annoncer la launch
- [ ] [ ] Mettre à jour docs
- [ ] [ ] Partager URLs avec équipe
- [ ] [ ] Setup monitoring continu

---

## 📞 TROUBLESHOOTING RAPIDE

| Problème | Solution |
|----------|----------|
| **"Cannot reach frontend"** | Vercel → Deployments → Redeploy |
| **"Cannot reach API"** | Railway → Deployments → View Logs |
| **"CORS Error"** | Vérifier VITE_API_URL en Vercel env vars |
| **"White screen"** | F12 → Console → Check erreurs |
| **"Slow load"** | Vérifier bundle size (`npm run build` report) |
| **"503 - API Down"** | Railway → Metrics → Check status |

---

## 📊 SIGNOFF

- [ ] Frontend Lead: **____________________**  Date: ____
- [ ] Backend Lead: **____________________**  Date: ____
- [ ] QA: **____________________**  Date: ____
- [ ] Release Manager: **____________________**  Date: ____

---

**Checklist Completée!** 🎉

Tous les contrôles sont done. Le site est maintenant en production!

Pour support: [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)
