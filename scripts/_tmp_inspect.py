import psycopg2
conn = psycopg2.connect(host='localhost', port=5432, dbname='woyofal_dwh', user='woyofal_user', password='woyofal2026')
cur = conn.cursor()
for t in ['dim_tranches', 'dim_users', 'dim_zones']:
    cur.execute("SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=%s ORDER BY ordinal_position", (t,))
    cols = [r[0] for r in cur.fetchall()]
    cur.execute(f"SELECT COUNT(*) FROM {t}")
    count = cur.fetchone()[0]
    print(f"{t} ({count} rows): {cols}")
conn.close()
