"""
DAG Monitoring - Surveillance qualité données
"""
from datetime import datetime, timedelta
from airflow import DAG
from airflow.operators.python import PythonOperator
import logging

logger = logging.getLogger(__name__)

default_args = {
    'owner': 'woyofal',
    'start_date': datetime(2026, 3, 1),
    'retries': 1,
}

dag = DAG(
    'woyofal_monitoring',
    default_args=default_args,
    description='Monitoring qualité données',
    schedule_interval='0 */6 * * *',  # Toutes les 6h
    catchup=False,
    tags=['woyofal', 'monitoring']
)


def check_data_quality(**context):
    """Vérifications qualité données"""
    logger.info("🔍 Vérification qualité données...")
    
    from utils.database import get_db_connection
    
    issues = []
    
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        # Check 1 : Volumétrie
        cursor.execute("SELECT COUNT(*) FROM fact_consumption")
        count = cursor.fetchone()[0]
        
        if count < 250000:
            issues.append(f"⚠️ Volumétrie faible : {count:,} lignes")
        
        # Check 2 : Données récentes
        cursor.execute("""
            SELECT MAX(date) FROM fact_consumption
        """)
        last_date = cursor.fetchone()[0]
        
        if last_date:
            days_old = (datetime.now().date() - last_date).days
            if days_old > 2:
                issues.append(f"⚠️ Données anciennes : {days_old} jours")
        
        # Check 3 : Intégrité
        cursor.execute("""
            SELECT COUNT(*) FROM fact_consumption 
            WHERE conso_kwh < 0 OR conso_kwh > 100
        """)
        invalid = cursor.fetchone()[0]
        
        if invalid > 0:
            issues.append(f"⚠️ {invalid} lignes invalides détectées")
    
    if issues:
        logger.warning(f"Problèmes détectés : {issues}")
        # TODO: Envoyer alerte
    else:
        logger.info("✅ Qualité données OK")
    
    return len(issues) == 0


check_quality = PythonOperator(
    task_id='check_data_quality',
    python_callable=check_data_quality,
    provide_context=True,
    dag=dag
)
