import os
import traceback

# Try forcing PGCLIENTENCODING via environment (client-side) as a test
os.environ.setdefault('PGCLIENTENCODING', 'LATIN1')

HOST = os.getenv('DB_HOST','localhost')
PORT = os.getenv('DB_PORT','5432')
USER = os.getenv('DB_USER','woyofal_user')
PASS = os.getenv('DB_PASS','woyofal2026')
DB = os.getenv('DB_NAME','woyofal_dwh')

print('Trying psycopg2...')
try:
    import psycopg2
    conn = psycopg2.connect(host=HOST, port=PORT, user=USER, password=PASS, dbname=DB, connect_timeout=5)
    cur = conn.cursor()
    cur.execute('SELECT current_user, pg_encoding_to_char(session_encoding());')
    print(cur.fetchall())
    conn.close()
    print('psycopg2 OK')
except Exception as e:
    print('psycopg2 failed:')
    traceback.print_exc()
    print('repr:', repr(e))

print('\nTrying pg8000...')
try:
    import pg8000
    conn = pg8000.connect(host=HOST, port=int(PORT), user=USER, password=PASS, database=DB, timeout=5)
    cur = conn.cursor()
    cur.execute('SELECT current_user')
    print(cur.fetchall())
    conn.close()
    print('pg8000 OK')
except Exception as e:
    print('pg8000 failed:')
    traceback.print_exc()
    print('repr:', repr(e))
