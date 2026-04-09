import psycopg2
conn = psycopg2.connect(host='localhost', port=5432, dbname='woyofal_dwh',
                        user='woyofal_user', password='woyofal2026')
cur = conn.cursor()

# DROP toutes les vues qui seront recréées
for v in ['mart_tarifs_2026', 'mart_kpis_globaux', 'mart_performance_journaliere',
          'mart_conso_regions_mensuel', 'dimension_dates']:
    cur.execute(f"DROP VIEW IF EXISTS {v}")

conn.commit()

# 1. dimension_dates
cur.execute("CREATE VIEW dimension_dates AS SELECT * FROM dim_date")

# 2. mart_kpis_globaux — CTE pré-agrégées (pas de jointure cartésienne)
cur.execute("""
CREATE VIEW mart_kpis_globaux AS
WITH conso_agg AS (
    SELECT annee, mois,
           COUNT(DISTINCT user_id)      AS users_actifs,
           SUM(conso_kwh)               AS conso_totale_kwh,
           SUM(cout_fcfa)               AS cout_total,
           SUM(economie_baisse_10pct)   AS economie_totale
    FROM fact_consumption
    GROUP BY annee, mois
),
dpp_agg AS (
    SELECT fc.annee, fc.mois, COUNT(DISTINCT fc.user_id) AS users_en_t1
    FROM fact_consumption fc
    JOIN dim_users du ON fc.user_id = du.user_id AND du.type_compteur = 'DPP'
    GROUP BY fc.annee, fc.mois
),
recharges_agg AS (
    SELECT annee, mois,
           COUNT(recharge_id) AS nb_recharges,
           SUM(montant_net)   AS montant_recharges_total
    FROM fact_recharges
    GROUP BY annee, mois
)
SELECT
    CONCAT(ca.annee, '-', LPAD(ca.mois::TEXT, 2, '0')) AS periode,
    ca.users_actifs,
    COALESCE(da.users_en_t1, 0)             AS users_en_t1,
    ca.conso_totale_kwh,
    ca.cout_total,
    ca.economie_totale,
    COALESCE(ra.nb_recharges, 0)            AS nb_recharges,
    COALESCE(ra.montant_recharges_total, 0) AS montant_recharges_total
FROM conso_agg ca
LEFT JOIN dpp_agg       da ON ca.annee = da.annee AND ca.mois = da.mois
LEFT JOIN recharges_agg ra ON ca.annee = ra.annee AND ca.mois = ra.mois
""")

# 3. mart_performance_journaliere
cur.execute("""
CREATE VIEW mart_performance_journaliere AS
SELECT
    dd.date,
    SUM(fc.conso_kwh)                   AS conso_totale_kwh,
    AVG(fc.conso_kwh)                   AS conso_moyenne_kwh,
    COUNT(DISTINCT fc.user_id)          AS users_actifs,
    ROUND(100.0 * COUNT(CASE WHEN du.type_compteur = 'DPP' THEN 1 END)
          / NULLIF(COUNT(*), 0), 1)     AS pct_t1,
    COUNT(fr.recharge_id)               AS nb_recharges
FROM fact_consumption fc
JOIN  dim_date dd   ON fc.date_id = dd.date_id
LEFT JOIN dim_users  du ON fc.user_id = du.user_id
LEFT JOIN fact_recharges fr ON fc.user_id = fr.user_id AND fc.date_id = fr.date_id
GROUP BY dd.date
""")

# 4. mart_tarifs_2026 — avec colonne tranche pour ORDER BY dans Flask
cur.execute("""
CREATE VIEW mart_tarifs_2026 AS
SELECT
    CONCAT(fc.annee, '-', LPAD(fc.mois::TEXT, 2, '0')) AS periode,
    COALESCE(du.type_compteur, 'DPP')                  AS type_compteur,
    COALESCE(dt.nom, 'Tranche inconnue')               AS nom_tranche,
    fc.tranche_id                                       AS tranche,
    COUNT(DISTINCT fc.user_id)                          AS nb_users_uniques,
    SUM(fc.conso_kwh)                                   AS conso_totale_kwh,
    SUM(fc.cout_fcfa)                                   AS cout_total_fcfa,
    SUM(fc.economie_baisse_10pct)                       AS economie_totale_fcfa
FROM fact_consumption fc
LEFT JOIN dim_users    du ON fc.user_id    = du.user_id
LEFT JOIN dim_tranches dt ON fc.tranche_id = dt.tranche_id
GROUP BY fc.annee, fc.mois, du.type_compteur, dt.nom, fc.tranche_id
""")

# 5. mart_conso_regions_mensuel
cur.execute("""
CREATE VIEW mart_conso_regions_mensuel AS
SELECT
    dz.region,
    dz.type_zone,
    fc.mois,
    fc.annee,
    COUNT(DISTINCT fc.user_id)    AS nb_users_actifs,
    SUM(fc.conso_kwh)             AS conso_totale_kwh,
    SUM(fc.cout_fcfa)             AS cout_total,
    SUM(fc.economie_baisse_10pct) AS economie_totale
FROM fact_consumption fc
JOIN dim_zones dz ON fc.zone_id = dz.zone_id
GROUP BY dz.region, dz.type_zone, fc.mois, fc.annee
""")

conn.commit()
print("Toutes les vues recréées avec succès.")

# Vérification
cur.execute("SELECT * FROM mart_kpis_globaux")
rows = cur.fetchall()
print("mart_kpis_globaux:", rows)

cur.execute("SELECT COUNT(1) FROM mart_tarifs_2026")
print("mart_tarifs_2026 lignes:", cur.fetchone()[0])

conn.close()
