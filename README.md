# 🚀 Woyofal Data Platform 2026

[![CI/CD](https://github.com/VOTRE-USERNAME/woyofal-data-platform/actions/workflows/ci.yml/badge.svg)](https://github.com/VOTRE-USERNAME/woyofal-data-platform/actions/workflows/ci.yml)
[![Python 3.10](https://img.shields.io/badge/python-3.10-blue.svg)](https://www.python.org/downloads/)
[![Tests](https://img.shields.io/badge/tests-passing-brightgreen)](https://github.com/VOTRE-USERNAME/woyofal-data-platform)
[![Coverage](https://img.shields.io/badge/coverage-85%25-green)](https://github.com/VOTRE-USERNAME/woyofal-data-platform)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Plateforme d'analyse de données pour la consommation électrique prépayée (Woyofal) au Sénégal.

**Grille tarifaire officielle Senelec 2026** (Décision n° 2025-140 du 26/12/2025)

---

## 📊 Vue d'Ensemble

```
CSV (330k lignes) → ETL Pipeline → PostgreSQL → Analytics → Dashboards BI
```

## 🔎 Résultats EDA (Exploratory Data Analysis)

Analyse exploratoire complète et graphiques générés automatiquement par `scripts/run_eda.py`.

- **Fichiers générés** (dans `docs/`):
	- `eda_consommation_overview.png` — distribution consommation & répartition tranches
	- `eda_recharge_correlation.png` — corrélation montant ↔ kWh obtenus
	- `eda_monthly_trend.png` — évolution mensuelle totale (marqueur post-2026)
	- `eda_economies_t1.png` — économies mensuelles tranches sociales (T1)
	- `eda_surcouts_tranches.png` — surcoûts estimés T2/T3 vs T1
	- `eda_stats_recap.csv` — récapitulatif chiffré

Voir `docs/` pour les images et les CSV produits.

### Aperçus EDA

![Distribution consommation](docs/eda_consommation_overview.png)

![Corrélation recharge vs kWh](docs/eda_recharge_correlation.png)

![Évolution mensuelle consommation](docs/eda_monthly_trend.png)

### Données Générées
- ✅ 23 zones géographiques (14 régions Sénégal)
- ✅ 10,000 utilisateurs (profils réalistes)
- ✅ 300,000 lignes consommation quotidienne
- ✅ ~20,000 transactions recharges

### Fonctionnalités Clés
- 🔄 Pipeline ETL automatisé (8-12 min)
- 🗄️ Data Warehouse PostgreSQL (star schema)
- 🎮 Simulateur recharge interactif
- 📊 Analyses exploratoires (Jupyter)
- 🧪 Tests automatisés (85% coverage)
- 🚀 CI/CD GitHub Actions

---

## 🏗️ Architecture

```
┌──────────────┐
│  CSV Files   │  330k lignes générées
└──────┬───────┘
	│
	▼
┌──────────────┐
│   ETL        │  Validation + Transformation
│   Python     │  Grille tarifaire 2026
└──────┬───────┘
	│
	▼
┌──────────────┐
│  PostgreSQL  │  Star Schema (4 dims + 2 facts)
│  Data WH     │  330k lignes chargées
└──────┬───────┘
	│
	▼
┌──────────────┐
│  Analytics   │  Jupyter + ML + Simulation
│  & BI        │  Streamlit Dashboards
└──────────────┘
```

📐 **[Architecture détaillée](docs/ARCHITECTURE_ASCII.md)**

---

## 🚀 Quick Start

### 1. Installation

```bash
# Clone
git clone https://github.com/VOTRE-USERNAME/woyofal-data-platform.git
cd woyofal-data-platform

# Setup Python
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Setup Docker
docker-compose up -d
```

### 2. Générer Données

```bash
python scripts/generate_all_data.py
# ⏱️ ~15 minutes → 330k lignes CSV
```

### 3. Charger Data Warehouse

```bash
# Créer schéma
docker exec -i woyofal-postgres psql -U woyofal_user -d woyofal_dwh < sql/01_create_schema.sql

# Ingestion
python scripts/etl/load_to_warehouse.py
# ⏱️ ~10 minutes → PostgreSQL prêt
```

### 4. Simuler Recharge

```bash
python scripts/simulation/cli_simulator.py
```

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [Guide Utilisateur](docs/USER_GUIDE.md) | Installation et usage |
| [Pipeline Ingestion](docs/PIPELINE_INGESTION.md) | ETL détaillé |
| [Simulation Recharge](docs/SIMULATION_RECHARGE.md) | Algorithmes et cas d'usage |
| [Guide Tests](docs/TESTING.md) | Tests et coverage |
| [Architecture](docs/ARCHITECTURE_ASCII.md) | Schémas complets |
| [Workflow (ordre corrigé)](docs/WORKFLOW_ORDRE_CORRIGE.md) | Nouveau workflow : Gen → Clean → Ingest → Features |

---

## 🧪 Tests

```bash
# Tous les tests
pytest tests/ -v

# Avec couverture
pytest tests/ --cov=scripts --cov-report=html

# Tests spécifiques
pytest tests/unit/ -v              # Unitaires
pytest tests/integration/ -v       # Intégration
```

**Résultats :**
- ✅ 50+ tests passés
- ✅ 85% code coverage
- ✅ CI/CD GitHub Actions

---

## 🚀 DÉPLOIEMENT PRODUCTION

### Frontend React (Vercel)
```bash
cd frontend-react
npm install
npm run build
# Deploy via Vercel Dashboard
```

### Backend Mock API (Railway)
```bash
node api-mock-server.js
# Deploy via Railway Dashboard
```

### Guide Complet
| Document | Utilité |
|----------|---------|
| [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) | Guide détaillé 3 phases |
| [QUICK_START.md](QUICK_START.md) | Démarrage rapide |
| [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) | Checklist 10 phases |

**Status:** ✅ Production-ready avec test report [TEST_REPORT.md](TEST_REPORT.md)

---

## 🎯 Cas d'Usage

### Optimiser Recharge Fin de Mois

```python
from scripts.simulation.recharge_simulator import RechargeSimulator, RechargeInput

sim = RechargeSimulator('DPP')

# Scénario : 145 kWh cumul, recharge 5000 F le 28 fév
result = sim.simulate(RechargeInput(5000, 145, 'DPP', False))

# Conseil : Attendre le 1er mars pour rester en T1
# Économie : 2,900 FCFA/mois
```

### Calculer Budget Mensuel

```python
# Objectif : Rester en Tranche 1 (≤150 kWh)
# Conso moyenne : 5 kWh/jour
# Budget nécessaire : 150 kWh × 82 F/kWh + 429 F ≈ 13,200 FCFA
```

---

## 🛠️ Stack Technique

### Data Engineering
- Python 3.10 (Pandas, NumPy)
- PostgreSQL 14 (Data Warehouse)
- Docker Compose

### Analytics & BI
- Jupyter Notebooks
- Scikit-learn (ML)
- Streamlit (Dashboards)
- Plotly, Folium

### Tests & CI/CD
- pytest (50+ tests)
- GitHub Actions
- Coverage 85%+

---

## 📁 Structure Projet

```
woyofal-data-platform/
├── data/
│   └── raw/                    # CSV sources (330k lignes)
├── scripts/
│   ├── data_generation/        # Génération données
│   ├── etl/                    # Pipeline ingestion
│   └── simulation/             # Simulateur recharge
├── sql/                        # Schémas PostgreSQL
├── tests/                      # Tests (50+)
│   ├── unit/
│   └── integration/
├── notebooks/                  # Analyses Jupyter
├── docs/                       # Documentation
├── docker-compose.yml
└── README.md
```

---

## 🤝 Contribution

1. Fork le projet
2. Créer une branche (`git checkout -b feature/AmazingFeature`)
3. Commit (`git commit -m 'Add AmazingFeature'`)
4. Push (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

---

## 📄 License

MIT License - voir [LICENSE](LICENSE)

---

## 📞 Contact

**Projet :** Woyofal Data Platform  
**Grille tarifaire :** Senelec 2026 (Décision n° 2025-140)

---

## 🙏 Remerciements

- CRSE (Commission de Régulation du Secteur de l'Électricité)
- Senelec (Société nationale d'électricité du Sénégal)
- Données conformes grille officielle 2026

