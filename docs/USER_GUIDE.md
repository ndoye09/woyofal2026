# 👤 Guide Utilisateur - Woyofal Data Platform

## Installation

### Prérequis
- Python 3.10+
- Docker Desktop
- Git
- 8 GB RAM minimum

## Installation Rapide

```bash
# 1. Cloner le repository
git clone https://github.com/VOTRE-USERNAME/woyofal-data-platform.git
cd woyofal-data-platform

# 2. Créer environnement virtuel
python3 -m venv venv

# Activer l'environnement virtuel
## Unix / macOS
source venv/bin/activate

## Windows (PowerShell)
venv\Scripts\Activate.ps1

## Windows (cmd.exe)
venv\Scripts\activate.bat

# 3. Installer dépendances
pip install -r requirements.txt

# 4. Démarrer PostgreSQL
docker-compose up -d

# 5. Créer schéma Data Warehouse
docker exec -i woyofal-postgres psql -U woyofal_user -d woyofal_dwh < sql/01_create_schema.sql
```

## Utilisation

### 1. Générer les Données

```bash
# Générer 330,000 lignes de données
python scripts/generate_all_data.py
```

**Durée :** 15 minutes  
**Résultat :** 4 fichiers CSV dans `data/raw/`

### 2. Charger dans PostgreSQL

```bash
# Ingestion automatique
python scripts/etl/load_to_warehouse.py
```

**Durée :** 8-12 minutes  
**Résultat :** 330k lignes dans PostgreSQL

### 3. Simuler une Recharge

```bash
# Lancer simulateur interactif
python scripts/simulation/cli_simulator.py
```

**Fonctionnalités :**
- Simulation simple
- Comparaison scénarios
- Calcul montant pour X kWh
- Grille tarifaire
- Export historique

### 4. Analyses Exploratoires

```bash
# Lancer Jupyter
jupyter notebook

# Ouvrir : notebooks/01_EDA_Initiale.ipynb
```

### 5. Lancer Tests

```bash
# Tous les tests
pytest tests/ -v

# Avec couverture
pytest tests/ --cov=scripts --cov-report=html
```

## Cas d'Usage Fréquents

### Cas 1 : Optimiser ma recharge

**Problème :** "J'ai 145 kWh consommés, dois-je recharger maintenant (28 fév) ou attendre le 1er mars ?"

**Solution :**
```bash
python scripts/simulation/cli_simulator.py
# Choisir : 2. Comparaison scénarios
# Montant : 5000
# Cumul : 145
# Résultat : Attendre = économie 2,900 FCFA
```

### Cas 2 : Combien recharger pour tenir 15 jours ?

**Problème :** "Je consomme ~5 kWh/jour, combien mettre pour 15 jours ?"

**Solution :**
```bash
python scripts/simulation/cli_simulator.py
# Choisir : 3. Calculer montant pour X kWh
# kWh voulus : 75 (15j × 5 kWh)
# Résultat : ~6,300 FCFA
```

### Cas 3 : Vérifier mes données

**Problème :** "Combien de lignes dans ma base ?"

**Solution :**
```bash
docker exec -it woyofal-postgres psql -U woyofal_user -d woyofal_dwh
# Puis : SELECT COUNT(*) FROM fact_consumption;
```

## Troubleshooting

### "psycopg2 not installed"
```bash
pip install psycopg2-binary
```

### "Docker not running"
```bash
# Démarrer Docker Desktop
# Puis : docker-compose up -d
```

### "Permission denied"
```bash
chmod +x scripts/*.py
```

### "Out of memory"
```bash
# Réduire batch size
python scripts/etl/load_to_warehouse.py --batch-size 1000
```

## Support

- **Issues :** https://github.com/VOTRE-USERNAME/woyofal-data-platform/issues
- **Documentation :** `/docs`
- **Tests :** `pytest tests/ -v`
