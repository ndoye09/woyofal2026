# 🚀 Guide de Démarrage - Woyofal Platform

## Démarrage Rapide (3 Terminaux)

### Terminal 1 : Mock API Server
```powershell
cd woyofal-data-platform
node api-mock-server.js
```
✅ Écoute sur `http://localhost:5000`  
✅ Simule tous les endpoints (Auth, Simulation, Consommation)

### Terminal 2 : Frontend React
```powershell
cd woyofal-data-platform\frontend-react
npm install  # (si besoin)
npm run dev
```
✅ Accessible sur `http://localhost:5173`

### Terminal 3 : Dashboard Streamlit (Optionnel)
```powershell
cd woyofal-data-platform
streamlit run apps/streamlit_app.py
```
✅ Accessible sur `http://localhost:8501`

---

## ✅ Vérification

```powershell
# 1. Test API Mock
curl http://localhost:5000/api/simulation/tarifs

# 2. Test Frontend
# Ouvrir http://localhost:5173 dans le navigateur

# 3. Comptes de test
Email: test@example.com
Password: password123
# ou
Email: admin@woyofal.sn
Password: admin123
```

---

## 📝 Notes

| Service | Port | Statut | Notes |
|---------|------|--------|-------|
| Mock API | 5000 | ✅ Complète | Données générées aléatoires |
| React Dev | 5173 | ✅ Complète | Vite hot-reload |
| Streamlit | 8501 | ⚠️ Optionnel | Nécessite PostgreSQL |

---

## 🔧 Configuration

### Frontend (.env.local)
- `VITE_API_URL=http://localhost:5000/api` → URL du mock server
- `VITE_DEBUG=true` → Logs détaillés

### Mock Server
- Génère tokens JWT aléatoires
- Données simulées (localStorage côté client)
- Pas de persistance (redémarrer = reset)

---

## ⚠️ Limitations & Solutions

| Problème | Cause | Solution |
|----------|-------|----------|
| Dashboard vide | PostgreSQL absent | Utiliser le Mock Server |
| Historique perdu | localStorage | C'est normal, données côté client |
| CORS error | API différent | Vérifier `VITE_API_URL` |
| 403 sur /dashboard | Token expiré | Se reconnecter |

---

## Production (Futur)

Pour aller en production, remplacer:
- Mock Server → Backend Flask réel
- PostgreSQL local → PostgreSQL cloud
- localStorage → Backend persistant

```bash
# Déploiement Docker
docker-compose up -d
```

---

## Support

❓ Problème ?
- Vérifier les ports libres (5000, 5173, 8501)
- Vérifier Node.js/Python installés
- Redémarrer tous les services
