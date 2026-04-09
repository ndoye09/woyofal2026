import psycopg2
conn = psycopg2.connect(host='localhost', port=5432, dbname='woyofal_dwh',
                        user='woyofal_user', password='woyofal2026')
cur = conn.cursor()

# 1. Réécrire mart_kpis_globaux avec CTE pré-agrégées
cur.execute("""
CREATE OR REPLACE VIEW mart_kpis_globaux AS
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

# 2. Réécrire mart_tarifs_2026 avec colonne tranche (int) pour ORDER BY
cur.execute("""
CREATE OR REPLACE VIEW mart_tarifs_2026 AS
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

conn.commit()
# DROP + CREATE pour mart_tarifs_2026 (colonnes changées)
cur.execute("DROP VIEW IF EXISTS mart_tarifs_2026")
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
conn.commit()
print("Vues mises à jour.")

cur.execute("SELECT * FROM mart_kpis_globaux")
rows = cur.fetchall()
print("mart_kpis_globaux:", rows)

cur.execute("SELECT COUNT(1) FROM mart_tarifs_2026")
print("mart_tarifs_2026 rows:", cur.fetchone()[0])

conn.close()
