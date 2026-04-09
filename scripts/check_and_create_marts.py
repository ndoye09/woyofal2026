"""
Script pour créer les data marts nécessaires au dashboard
"""
import psycopg2

conn = psycopg2.connect(
    host='localhost', port=5432,
    dbname='woyofal_dwh', user='woyofal_user', password='woyofal2026'
)
conn.autocommit = False
cur = conn.cursor()

# 1. Colonnes de dim_date
cur.execute("""
    SELECT column_name FROM information_schema.columns
    WHERE table_schema='public' AND table_name='dim_date'
    ORDER BY ordinal_position
""")
cols = [r[0] for r in cur.fetchall()]
print("Colonnes dim_date:", cols)

# 2. Colonnes de fact_consumption
cur.execute("""
    SELECT column_name FROM information_schema.columns
    WHERE table_schema='public' AND table_name='fact_consumption'
    ORDER BY ordinal_position
""")
cols2 = [r[0] for r in cur.fetchall()]
print("Colonnes fact_consumption:", cols2)

# 3. Colonnes de fact_recharges
cur.execute("""
    SELECT column_name FROM information_schema.columns
    WHERE table_schema='public' AND table_name='fact_recharges'
    ORDER BY ordinal_position
""")
cols3 = [r[0] for r in cur.fetchall()]
print("Colonnes fact_recharges:", cols3)

# 4. Quelques lignes de dim_date pour voir les données
cur.execute("SELECT * FROM dim_date LIMIT 3")
rows = cur.fetchall()
print("Exemple dim_date:", rows)

# 5. Compter les lignes
for t in ['dim_date', 'fact_consumption', 'fact_recharges', 'dim_users']:
    cur.execute(f"SELECT COUNT(*) FROM {t}")
    print(f"  {t}: {cur.fetchone()[0]} lignes")

conn.close()
