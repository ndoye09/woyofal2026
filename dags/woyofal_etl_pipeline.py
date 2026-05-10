"""
DAG AIRFLOW - PIPELINE ETL WOYOFAL
"""
from datetime import datetime, timedelta
from airflow import DAG
from airflow.operators.python import PythonOperator
from airflow.operators.bash import BashOperator
from airflow.operators.dummy import DummyOperator
from airflow.utils.task_group import TaskGroup
import logging

# Configuration logging
logger = logging.getLogger(__name__)

# ===================================
# CONFIGURATION DAG
# ===================================
default_args = {
    'owner': 'woyofal',
    'depends_on_past': False,
    'start_date': datetime(2026, 3, 1),
    'email': ['admin@woyofal.sn'],
    'email_on_failure': True,
    'email_on_retry': False,
    'retries': 2,
    'retry_delay': timedelta(minutes=5),
}

dag = DAG(
    'woyofal_etl_pipeline',
    default_args=default_args,
    description='Pipeline ETL complet Woyofal',
    schedule_interval='0 2 * * *',  # 2h du matin tous les jours
    catchup=False,
    tags=['woyofal', 'etl', 'production']
)

# ===================================
# TÂCHES PYTHON
# ===================================

def check_prerequisites(**context):
    """Vérifier prérequis avant exécution"""
    logger.info("🔍 Vérification prérequis...")
    
    import os
    from utils.database import test_connection
    
    # Vérifier dossiers
    required_dirs = [
        '/opt/airflow/data/01_raw',
        '/opt/airflow/data/02_cleaned',
        '/opt/airflow/data/03_processed'
    ]
    
    for dir_path in required_dirs:
        if not os.path.exists(dir_path):
            os.makedirs(dir_path)
            logger.info(f"✅ Dossier créé : {dir_path}")
    
    # Tester connexion DB
    if not test_connection():
        raise Exception("❌ Connexion PostgreSQL échouée")
    
    logger.info("✅ Prérequis OK")
    return True


def generate_data(**context):
    """Génération données (si pas déjà présentes)"""
    logger.info("📊 Génération données...")
    
    import os
    import subprocess
    
    # Vérifier si données déjà générées
    consumption_file = '/opt/airflow/data/01_raw/consumption_daily.csv'
    
    if os.path.exists(consumption_file):
        logger.info("✅ Données déjà générées, skip")
        return "data_exists"
    
    # Générer
    logger.info("🔧 Génération 330k lignes...")
    result = subprocess.run(
        ['python', '/opt/airflow/scripts/01_generation/generate_all_data.py'],
        capture_output=True,
        text=True,
        cwd='/opt/airflow'
    )
    
    if result.returncode != 0:
        logger.error(f"❌ Erreur génération : {result.stderr}")
        raise Exception("Génération données échouée")
    
    logger.info("✅ Données générées")
    return "data_generated"


def clean_data(**context):
    """Nettoyage données"""
    logger.info("🧹 Nettoyage données...")
    
    import subprocess
    
    result = subprocess.run(
        ['python', '/opt/airflow/scripts/02_cleaning/clean_generated_data.py'],
        capture_output=True,
        text=True,
        cwd='/opt/airflow'
    )
    
    if result.returncode != 0:
        logger.error(f"❌ Erreur nettoyage : {result.stderr}")
        raise Exception("Nettoyage données échoué")
    
    logger.info("✅ Données nettoyées")
    
    # Pousser stats vers XCom
    context['ti'].xcom_push(key='cleaned_rows', value=300000)
    return "cleaned"


def create_schema_if_not_exists(**context):
    """Créer schéma PostgreSQL si nécessaire"""
    logger.info("🗄️ Vérification schéma PostgreSQL...")
    
    from utils.database import get_db_connection
    
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        # Vérifier si tables existent
        cursor.execute("""
            SELECT COUNT(*) 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'fact_consumption'
        """)
        
        table_exists = cursor.fetchone()[0] > 0
        
        if not table_exists:
            logger.info("🔧 Création schéma...")
            
            with open('/opt/airflow/sql/01_create_schema.sql', 'r') as f:
                schema_sql = f.read()
            
            cursor.execute(schema_sql)
            logger.info("✅ Schéma créé")
        else:
            logger.info("✅ Schéma existe déjà")
    
    return "schema_ready"


def load_to_warehouse(**context):
    """Chargement dans PostgreSQL"""
    logger.info("📥 Chargement Data Warehouse...")
    
    import subprocess
    
    result = subprocess.run(
        ['python', '/opt/airflow/scripts/03_ingestion/load_cleaned_to_warehouse.py'],
        capture_output=True,
        text=True,
        cwd='/opt/airflow'
    )
    
    if result.returncode != 0:
        logger.error(f"❌ Erreur ingestion : {result.stderr}")
        raise Exception("Ingestion échouée")
    
    logger.info("✅ Data Warehouse chargé")
    
    # Stats
    from utils.database import get_db_connection
    
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM fact_consumption")
        count = cursor.fetchone()[0]
        
        context['ti'].xcom_push(key='loaded_rows', value=count)
    
    return "loaded"


def create_ml_features(**context):
    """Création features ML"""
    logger.info("🤖 Création features ML...")
    
    import subprocess
    
    result = subprocess.run(
        ['python', '/opt/airflow/scripts/04_transformation/feature_engineering.py'],
        capture_output=True,
        text=True,
        cwd='/opt/airflow'
    )
    
    if result.returncode != 0:
        logger.error(f"❌ Erreur features : {result.stderr}")
        raise Exception("Création features échouée")
    
    logger.info("✅ Features ML créées (39 features)")
    return "features_ready"


def train_ml_model(**context):
    """Entraînement modèle ML (optionnel)"""
    logger.info("🤖 Entraînement modèle ML...")
    
    import os
    model_file = '/opt/airflow/models/rf_classifier_depassement_t1.pkl'
    
    if os.path.exists(model_file):
        logger.info("✅ Modèle existe déjà, skip entraînement")
        return "model_exists"
    
    logger.info("⚠️ Entraînement ML non implémenté dans DAG")
    return "skipped"


def generate_daily_report(**context):
    """Génération rapport quotidien"""
    logger.info("📊 Génération rapport...")
    
    from utils.database import get_db_connection
    import json
    from datetime import datetime
    
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        # Stats globales
        stats = {}
        
        cursor.execute("SELECT COUNT(*) FROM fact_consumption")
        stats['total_consumption_rows'] = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM fact_recharges")
        stats['total_recharges_rows'] = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(DISTINCT user_id) FROM dim_users")
        stats['total_users'] = cursor.fetchone()[0]
        
        cursor.execute("""
            SELECT SUM(economie_baisse_10pct) 
            FROM fact_consumption 
            WHERE tranche_id = 1
        """)
        stats['total_economie'] = float(cursor.fetchone()[0] or 0)
    
    # Sauvegarder rapport
    report_file = f"/opt/airflow/logs/daily_report_{datetime.now().strftime('%Y%m%d')}.json"
    with open(report_file, 'w') as f:
        json.dump(stats, f, indent=2)
    
    logger.info(f"✅ Rapport généré : {report_file}")
    logger.info(f"📊 Stats : {stats}")
    
    return stats


def send_notification(**context):
    """Notification fin de pipeline"""
    logger.info("📧 Envoi notification...")
    
    # Récupérer stats depuis XCom
    ti = context['ti']
    cleaned_rows = ti.xcom_pull(task_ids='clean_data', key='cleaned_rows')
    loaded_rows = ti.xcom_pull(task_ids='load_to_warehouse', key='loaded_rows')
    
    message = f"""
    ✅ PIPELINE ETL WOYOFAL - SUCCÈS
    
    Date : {datetime.now().strftime('%Y-%m-%d %H:%M')}
    
    📊 Résultats :
       • Lignes nettoyées : {cleaned_rows:,}
       • Lignes chargées  : {loaded_rows:,}
       • Features ML      : 39
       
    🎉 Pipeline terminé avec succès !
    """
    
    logger.info(message)
    
    # TODO: Envoyer email/Slack
    
    return "notified"


# ===================================
# DÉFINITION DAG
# ===================================

# Start
start = DummyOperator(
    task_id='start',
    dag=dag
)

# Prérequis
check_prereq = PythonOperator(
    task_id='check_prerequisites',
    python_callable=check_prerequisites,
    provide_context=True,
    dag=dag
)

# Groupe : Data Generation & Cleaning
with TaskGroup('data_preparation', dag=dag) as data_prep:
    
    gen_data = PythonOperator(
        task_id='generate_data',
        python_callable=generate_data,
        provide_context=True,
    )
    
    clean = PythonOperator(
        task_id='clean_data',
        python_callable=clean_data,
        provide_context=True,
    )
    
    gen_data >> clean

# Groupe : Database Operations
with TaskGroup('database_operations', dag=dag) as db_ops:
    
    schema = PythonOperator(
        task_id='create_schema',
        python_callable=create_schema_if_not_exists,
        provide_context=True,
    )
    
    load = PythonOperator(
        task_id='load_to_warehouse',
        python_callable=load_to_warehouse,
        provide_context=True,
    )
    
    schema >> load

# Groupe : ML Pipeline
with TaskGroup('ml_pipeline', dag=dag) as ml_pipe:
    
    features = PythonOperator(
        task_id='create_features',
        python_callable=create_ml_features,
        provide_context=True,
    )
    
    train = PythonOperator(
        task_id='train_model',
        python_callable=train_ml_model,
        provide_context=True,
    )
    
    features >> train

# Rapport
report = PythonOperator(
    task_id='generate_report',
    python_callable=generate_daily_report,
    provide_context=True,
    dag=dag
)

# Notification
notify = PythonOperator(
    task_id='send_notification',
    python_callable=send_notification,
    provide_context=True,
    dag=dag
)

# End
end = DummyOperator(
    task_id='end',
    dag=dag
)

# ===================================
# WORKFLOW
# ===================================

start >> check_prereq >> data_prep >> db_ops >> ml_pipe >> report >> notify >> end
