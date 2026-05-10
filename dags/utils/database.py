"""
Utilitaires base de données pour Airflow DAGs
"""
import psycopg2
from contextlib import contextmanager

DB_CONFIG = {
    'host': 'woyofal-postgres',  # Nom service Docker
    'port': '5432',
    'database': 'woyofal_dwh',
    'user': 'woyofal_user',
    'password': 'woyofal2026'
}

@contextmanager
def get_db_connection():
    """Context manager pour connexion PostgreSQL"""
    conn = psycopg2.connect(**DB_CONFIG)
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def test_connection():
    """Test connexion PostgreSQL"""
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT 1")
            return True
    except Exception as e:
        print(f"Erreur connexion : {e}")
        return False
