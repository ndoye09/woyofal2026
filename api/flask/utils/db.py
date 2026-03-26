"""
Gestionnaire connexion PostgreSQL
"""
import psycopg2
from psycopg2.extras import RealDictCursor
from contextlib import contextmanager
import logging

logger = logging.getLogger(__name__)


class DatabaseManager:
    """Gestionnaire connexion PostgreSQL"""

    def __init__(self):
        self.config = None

    def init_app(self, app):
        """Initialiser avec app Flask"""
        self.config = {
            'host': app.config['DB_HOST'],
            'port': app.config['DB_PORT'],
            'database': app.config['DB_NAME'],
            'user': app.config['DB_USER'],
            'password': app.config['DB_PASSWORD']
        }

    @contextmanager
    def get_connection(self):
        """Context manager pour connexion"""
        conn = None
        try:
            conn = psycopg2.connect(**self.config)
            yield conn
            conn.commit()
        except Exception as e:
            if conn:
                conn.rollback()
            logger.error(f"Erreur DB : {e}")
            raise
        finally:
            if conn:
                conn.close()

    def execute_query(self, query, params=None, fetchall=True):
        """Exécuter requête SELECT"""
        with self.get_connection() as conn:
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            cursor.execute(query, params)

            if fetchall:
                result = cursor.fetchall()
                return [dict(row) for row in result]
            else:
                result = cursor.fetchone()
                return dict(result) if result else None

    def execute_insert(self, query, params=None):
        """Exécuter requête INSERT/UPDATE/DELETE"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(query, params)
            return cursor.rowcount


# Instance globale
db = DatabaseManager()
