import psycopg2
conn = psycopg2.connect(host='localhost', port=5432, dbname='woyofal_dwh', user='woyofal_user', password='woyofal2026')
cur = conn.cursor()
for t in ['dim_users', 'dim_tranches', 'fact_consumption', 'fact_recharges', 'dim_date']:
    cur.execute(f"SELECT COUNT(*) FROM {t}")
    print(f"{t}: {cur.fetchone()[0]}")

# Check views
for v in ['mart_kpis_globaux', 'mart_performance_journaliere', 'mart_tarifs_2026', 'mart_conso_regions_mensuel', 'dimension_dates']:
    cur.execute("SELECT COUNT(*) FROM information_schema.views WHERE table_name=%s", (v,))
    exists = cur.fetchone()[0] > 0
    print(f"Vue {v}: {'OK' if exists else 'MANQUANTE'}")
conn.close()
