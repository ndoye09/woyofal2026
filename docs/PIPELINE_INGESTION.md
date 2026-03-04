# 🔄 Pipeline d'Ingestion - Documentation Technique

## Vue d'Ensemble

Le pipeline d'ingestion automatise le chargement des données CSV vers le Data Warehouse PostgreSQL.

**Volumétrie :** 330,000+ lignes en 8-12 minutes

## Architecture du Pipeline

```
CSV Files (data/raw/)
        ↓
    Extraction
        ↓
    Validation
        ↓
  Transformation
        ↓
PostgreSQL (woyofal_dwh)
```

## Composants

### 1. Script Principal : `load_to_warehouse.py`

**Localisation :** `scripts/etl/load_to_warehouse.py`

**Classe :** `DataWarehouseLoader`

**Méthodes principales :**
- `connect()` : Connexion PostgreSQL avec retry (3 tentatives)
- `load_dim_date()` : Chargement dimension dates
- `load_dim_zones()` : Chargement dimension zones (23 lignes)
- `load_dim_users()` : Chargement dimension users (10,000 lignes, batch 5,000)
- `load_fact_consumption()` : Chargement consommation (300,000 lignes, batch 5,000)
- `load_fact_recharges()` : Chargement recharges (20,000 lignes, batch 2,000)
- `verify_load()` : Vérification post-chargement
- `run()` : Orchestration complète

### 2. Configuration

**Variables d'environnement :**
```bash
DB_HOST=localhost
DB_PORT=5432
DB_NAME=woyofal_dwh
DB_USER=woyofal_user
DB_PASSWORD=woyofal2026
```

**Paramètres ligne de commande :**
```bash
python scripts/etl/load_to_warehouse.py \
  --csv-path data/raw \
  --db-host localhost \
  --batch-size 5000
```

## Flux Détaillé

### Phase 1 : Extraction
```python
# Lecture CSV avec Pandas
df_zones = pd.read_csv('data/raw/zones_senegal.csv')
df_users = pd.read_csv('data/raw/users.csv')
df_consumption = pd.read_csv('data/raw/consumption_daily.csv')
df_recharges = pd.read_csv('data/raw/recharges.csv')
```

**Durée :** ~30 secondes

### Phase 2 : Validation
```python
# Vérifications
assert len(df_zones) == 23
assert len(df_users) == 10000
assert df_consumption['conso_kwh'].notna().all()
assert df_consumption['tranche'].isin([1, 2, 3]).all()
```

**Checks effectués :**
- Volumétrie attendue
- Pas de nulls sur colonnes clés
- Valeurs dans ranges valides
- Intégrité référentielle (zone_id, user_id)

### Phase 3 : Transformation

**Mapping dates :**
```python
# Récupération mapping date → date_id
date_mapping = {row[0]: row[1] for row in cursor.fetchall()}
df['date_id'] = df['date'].dt.date.map(date_mapping)
```

**Conversions types :**
```python
df['date'] = pd.to_datetime(df['date'])
df['conso_kwh'] = df['conso_kwh'].astype(float)
```

### Phase 4 : Chargement (Load)

**Stratégie batch insert :**

```python
batch_size = 5000
for i in range(0, len(df), batch_size):
    batch = df.iloc[i:i+batch_size]
    execute_values(cursor, sql_insert, data)
    
    if (i + batch_size) % 10000 == 0:
        conn.commit()  # Commit intermédiaire
```

**Performance :**
- dim_date : 30 lignes → <1s
- dim_zones : 23 lignes → <1s
- dim_users : 10,000 lignes → ~30s
- fact_consumption : 300,000 lignes → ~8min
- fact_recharges : 20,000 lignes → ~1min

**Total : 8-12 minutes**

## Gestion des Erreurs

### Retry Connexion
```python
max_retries = 3
for attempt in range(1, max_retries + 1):
    try:
        conn = psycopg2.connect(...)
        return True
    except psycopg2.Error as e:
        logger.warning(f"Tentative {attempt}/{max_retries} échouée")
        time.sleep(2)
```

### Rollback en cas d'erreur
```python
try:
    # Opérations INSERT
    conn.commit()
except Exception as e:
    conn.rollback()
    logger.error(f"Erreur : {e}")
    raise
```

### Logging complet
```python
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/ingestion.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
```

**Fichier log :** `logs/ingestion.log`

## Optimisations Possibles

### 1. PostgreSQL COPY (10x plus rapide)
```python
# Au lieu de execute_values
buffer = StringIO()
df.to_csv(buffer, sep='\t', header=False)
cursor.copy_from(buffer, 'table_name', columns=cols)
```

**Gain :** 300k lignes en ~2min (vs 8min)

### 2. Désactiver contraintes temporairement
```sql
ALTER TABLE fact_consumption DISABLE TRIGGER ALL;
-- INSERT massif
ALTER TABLE fact_consumption ENABLE TRIGGER ALL;
```

### 3. Indexes après chargement
```sql
-- Drop indexes
-- Chargement massif
-- Recréer indexes
REINDEX TABLE fact_consumption;
```

### 4. Parallel processing
```python
from multiprocessing import Pool

with Pool(4) as pool:
    pool.map(load_batch, batches)
```

## Monitoring

### Métriques trackées
- Durée totale et par étape
- Nombre lignes insérées
- Taux de succès/échec
- Taille mémoire utilisée

### Vérification post-chargement
```sql
SELECT 
  'dim_date' as table, COUNT(*) as rows FROM dim_date
UNION ALL
SELECT 'dim_zones', COUNT(*) FROM dim_zones
UNION ALL
SELECT 'dim_users', COUNT(*) FROM dim_users
UNION ALL
SELECT 'fact_consumption', COUNT(*) FROM fact_consumption
UNION ALL
SELECT 'fact_recharges', COUNT(*) FROM fact_recharges;
```

**Résultat attendu :**
```
table              | rows
-------------------+--------
dim_date           |     30
dim_zones          |     23
dim_users          |  10000
fact_consumption   | 300000
fact_recharges     |  20000
```

## Troubleshooting

### Problème : Connexion refusée
**Solution :** Vérifier Docker
```bash
docker-compose ps
docker-compose up -d postgres
```

### Problème : Out of memory
**Solution :** Réduire batch_size
```bash
python scripts/etl/load_to_warehouse.py --batch-size 1000
```

### Problème : Duplicate key
**Solution :** Nettoyer tables avant rechargement
```sql
TRUNCATE TABLE fact_consumption CASCADE;
TRUNCATE TABLE fact_recharges CASCADE;
```

### Problème : Lenteur extrême
**Solution :** Vérifier indexes
```sql
SELECT schemaname, tablename, indexname 
FROM pg_indexes 
WHERE tablename IN ('fact_consumption', 'fact_recharges');
```

## Tests

**Tests unitaires :** `tests/unit/test_ingestion.py`
**Tests intégration :** `tests/integration/test_ingestion.py`

```bash
# Lancer tests
pytest tests/ -k ingestion -v
```

## Maintenance

### Rechargement complet
```bash
# 1. Nettoyer
psql -U woyofal_user -d woyofal_dwh -c "TRUNCATE TABLE fact_consumption CASCADE"

# 2. Recharger
python scripts/etl/load_to_warehouse.py

# 3. Vérifier
psql -U woyofal_user -d woyofal_dwh -c "SELECT COUNT(*) FROM fact_consumption"
```

### Chargement incrémental

Pour les jeux de données volumineux, le pipeline supporte un mode incrémental basé sur un watermark simple :

- Watermark : colonne `loaded_at` ou `id` (dernier `date_id`/`id` chargé).
- Extraction : ne lire que les lignes > watermark (fichier source ou métadonnées d'objet).
- Chargement : upsert sur les tables de dimensions et insert append pour les faits, ou partitionnement par mois.
- Idempotence : toutes les étapes sont idempotentes (transactions, upsert, fichiers marqués comme "ingérés").
- Orchestration : tâche Airflow dédiée qui lit le watermark depuis la table `meta.ingestion_watermark`.

Exemple de pseudo-procédure :

1. Lire `watermark = SELECT last_loaded_at FROM meta.ingestion_watermark`.
2. Extraire les nouvelles lignes depuis la source où `updated_at > watermark`.
3. Valider et transformer.
4. Charger dans tables temporaires puis `BEGIN;` upsert dimensions; insert facts; UPDATE meta.ingestion_watermark SET last_loaded_at = NOW(); COMMIT;

Notes opérationnelles :
- Penser à la purge/archivage des partitions anciennes.
- Sur fortes volumétries, utiliser COPY/parallel loading et batch size paramétrable.
- Tests d'intégration : scénarios d'insert/duplicate/update pour valider l'idempotence.
```python
# Charger seulement nouvelles données
last_date = get_last_date_in_db()
df_new = df[df['date'] > last_date]
load_incremental(df_new)
```

## Références

- Script : `scripts/etl/load_to_warehouse.py`
- Tests : `tests/integration/test_ingestion.py`
- Logs : `logs/ingestion.log`
- PostgreSQL docs : https://www.postgresql.org/docs/14/
