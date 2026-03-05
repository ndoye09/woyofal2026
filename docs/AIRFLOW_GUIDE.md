# 🔄 Guide Airflow - Woyofal Data Platform

## Installation

### Démarrage
```bash
docker-compose up -d
```

Attendre 2-3 minutes que tous les services démarrent.

### Accès
- **Airflow UI** : http://localhost:8080
- **Credentials** : admin / admin2026

## DAGs Disponibles

### 1. woyofal_etl_pipeline
**Description :** Pipeline ETL complet  
**Schedule :** Quotidien à 2h du matin  
**Durée :** ~20 minutes

**Étapes :**
1. Vérification prérequis
2. Génération données (si nécessaire)
3. Nettoyage données
4. Création schéma PostgreSQL
5. Chargement Data Warehouse
6. Création features ML
7. Entraînement modèle (optionnel)
8. Génération rapport
9. Notification

**Workflow :**
```
start → check_prereq
        ↓
      [data_preparation]
        gen_data → clean_data
        ↓
      [database_operations]
        create_schema → load_warehouse
        ↓
      [ml_pipeline]
        create_features → train_model
        ↓
      generate_report → notify → end
```

### 2. woyofal_monitoring
**Description :** Surveillance qualité données  
**Schedule :** Toutes les 6 heures  
**Durée :** ~1 minute

**Checks :**
- Volumétrie minimale
- Fraîcheur données
- Intégrité données

## Opérations

### Exécuter manuellement
1. Aller sur http://localhost:8080
2. Cliquer sur le DAG
3. Bouton ▶️ "Trigger DAG"

### Via CLI
```bash
docker exec -it woyofal-airflow-scheduler bash
airflow dags trigger woyofal_etl_pipeline
```

### Voir logs
```bash
# Dans Airflow UI : Task → Logs
# Ou via fichiers
ls -lh logs/
```

### Désactiver DAG
```bash
# Dans Airflow UI : Toggle OFF
# Ou CLI
airflow dags pause woyofal_etl_pipeline
```

## Troubleshooting

### DAG n'apparaît pas
```bash
# Vérifier syntaxe Python
docker exec -it woyofal-airflow-scheduler python /opt/airflow/dags/woyofal_etl_pipeline.py

# Recharger DAGs
docker exec -it woyofal-airflow-scheduler airflow dags list-import-errors
```

### Tâche échoue
1. Cliquer sur la tâche rouge
2. Logs → Voir erreur
3. Corriger script
4. Clear task + Retry

### Connexion PostgreSQL échoue
```bash
# Vérifier réseau Docker
docker network inspect woyofal-data-platform_woyofal-network

# Tester connexion
docker exec -it woyofal-airflow-scheduler python -c "
from utils.database import test_connection
print(test_connection())
"
```

## Configuration Avancée

### Changer schedule
Modifier dans le DAG :
```python
schedule_interval='0 2 * * *'  # Cron expression
```

### Notifications email
Ajouter SMTP dans `docker-compose.yml` :
```yaml
AIRFLOW__SMTP__SMTP_HOST: smtp.gmail.com
AIRFLOW__SMTP__SMTP_PORT: 587
AIRFLOW__SMTP__SMTP_USER: your-email@gmail.com
AIRFLOW__SMTP__SMTP_PASSWORD: your-password
```

### Parallelisation
Changer executor :
```yaml
AIRFLOW__CORE__EXECUTOR: CeleryExecutor
```
(Nécessite Redis/RabbitMQ)

## Métriques

### Dashboard Airflow
- DAG Runs : http://localhost:8080/dagrun/list/
- Task Duration : Graph View
- Success Rate : Browse → DAG Runs

### Logs PostgreSQL
```sql
SELECT * FROM dag_run 
WHERE dag_id = 'woyofal_etl_pipeline' 
ORDER BY execution_date DESC;
```
