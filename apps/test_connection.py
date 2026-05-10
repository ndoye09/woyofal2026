"""
Script de test connexion PostgreSQL
"""

import psycopg2
import pg8000


def test_connection():
    config = {
        'host': 'localhost',
        'port': '5432',
        'database': 'woyofal_dwh',
        'user': 'woyofal_user',
        'password': 'woyofal2026'
    }

    print("=" * 60)
    print("TEST CONNEXION POSTGRESQL (psycopg2 puis pg8000)" )
    print("=" * 60)
    print(f"\nConfiguration :")
    print(f"  Host     : {config['host']}")
    print(f"  Port     : {config['port']}")
    print(f"  Database : {config['database']}")
    print(f"  User     : {config['user']}")
    print()

    # Essai 1 : psycopg2
    print("Essai 1 : Connexion via psycopg2...")
    try:
        conn = psycopg2.connect(**config)
        print("✅ SUCCÈS (psycopg2) - Connexion établie")
        conn.close()
    except UnicodeDecodeError as e:
        print("❌ Erreur d'encodage détectée avec psycopg2:")
        print(f"   {e}")
        print("→ Tentative de repli vers pg8000...")
        try:
            conn = pg8000.connect(
                host=config['host'],
                port=int(config['port']),
                database=config['database'],
                user=config['user'],
                password=config['password']
            )
            print("✅ SUCCÈS (pg8000) - Connexion établie")
            cur = conn.cursor()
            cur.execute("SELECT version()")
            ver = cur.fetchone()
            print(f"Version PostgreSQL : {ver[0]}")
            conn.close()
            return
        except Exception as e2:
            print("❌ Échec repli pg8000 :")
            print(f"   {e2}")
            return
    except Exception as e:
        print("❌ Échec psycopg2 :")
        print(f"   {e}")
        print("→ Tentative de repli vers pg8000...")
        try:
            conn = pg8000.connect(
                host=config['host'],
                port=int(config['port']),
                database=config['database'],
                user=config['user'],
                password=config['password']
            )
            print("✅ SUCCÈS (pg8000) - Connexion établie")
            cur = conn.cursor()
            cur.execute("SELECT version()")
            ver = cur.fetchone()
            print(f"Version PostgreSQL : {ver[0]}")
            conn.close()
            return
        except Exception as e2:
            print("❌ Échec repli pg8000 :")
            print(f"   {e2}")
            return


if __name__ == '__main__':
    test_connection()
