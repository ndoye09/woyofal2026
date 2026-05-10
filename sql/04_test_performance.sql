-- ═══════════════════════════════════════════════════════════════
-- TESTS PERFORMANCE DATA WAREHOUSE
-- ═══════════════════════════════════════════════════════════════

-- Activer timing
\timing on

-- ═══════════════════════════════════════════════════════════════
-- TEST 1 : Requêtes simples
-- ═══════════════════════════════════════════════════════════════

SELECT '=== TEST 1 : Requêtes simples ===' as test;

-- 1.1 Count fact_consumption
EXPLAIN ANALYZE
SELECT COUNT(*) FROM fact_consumption;

-- 1.2 Consommation totale par mois
EXPLAIN ANALYZE
SELECT mois, annee, SUM(conso_kwh) as total
FROM fact_consumption
GROUP BY mois, annee
ORDER BY annee, mois;

-- 1.3 Top 10 users par consommation
EXPLAIN ANALYZE
SELECT 
    u.user_id,
    u.prenom,
    u.nom,
    SUM(fc.conso_kwh) as conso_totale
FROM fact_consumption fc
JOIN dim_users u ON fc.user_id = u.user_id
WHERE fc.mois = 1 AND fc.annee = 2026
GROUP BY u.user_id, u.prenom, u.nom
ORDER BY conso_totale DESC
LIMIT 10;


-- ═══════════════════════════════════════════════════════════════
-- TEST 2 : Jointures complexes
-- ═══════════════════════════════════════════════════════════════

SELECT '=== TEST 2 : Jointures complexes ===' as test;

-- 2.1 Join 4 tables avec agrégations
EXPLAIN ANALYZE
SELECT 
    z.region,
    dt.nom_tranche,
    COUNT(DISTINCT fc.user_id) as nb_users,
    SUM(fc.conso_kwh) as conso_totale,
    AVG(fc.cout_fcfa) as cout_moyen
FROM fact_consumption fc
JOIN dim_zones z ON fc.zone_id = z.zone_id
JOIN dimension_tarifs dt ON fc.tarif_id = dt.tarif_id
JOIN dimension_dates dd ON fc.date_id = dd.date_id
WHERE dd.mois = 1 AND dd.annee = 2026
GROUP BY z.region, dt.nom_tranche, dt.tranche
ORDER BY z.region, dt.tranche;


-- ═══════════════════════════════════════════════════════════════
-- TEST 3 : Vues matérialisées
-- ═══════════════════════════════════════════════════════════════

SELECT '=== TEST 3 : Vues matérialisées ===' as test;

-- 3.1 Query sur vue matérialisée (devrait être instantané)
EXPLAIN ANALYZE
SELECT * FROM mart_kpis_globaux
WHERE annee = 2026 AND mois = 1;


-- ═══════════════════════════════════════════════════════════════
-- TEST 4 : Requêtes analytiques complexes
-- ═══════════════════════════════════════════════════════════════

SELECT '=== TEST 4 : Analytiques complexes ===' as test;

-- 4.1 Analyse cohort par semaine
EXPLAIN ANALYZE
WITH cohort AS (
    SELECT 
        u.user_id,
        MIN(dd.semaine_annee) as semaine_inscription,
        u.type_compteur
    FROM dim_users u
    JOIN fact_consumption fc ON u.user_id = fc.user_id
    JOIN dimension_dates dd ON fc.date_id = dd.date_id
    GROUP BY u.user_id, u.type_compteur
)
SELECT 
    c.semaine_inscription,
    c.type_compteur,
    COUNT(DISTINCT c.user_id) as nb_users,
    AVG(fc.conso_kwh) as conso_moyenne
FROM cohort c
JOIN fact_consumption fc ON c.user_id = fc.user_id
GROUP BY c.semaine_inscription, c.type_compteur
ORDER BY c.semaine_inscription;


-- ═══════════════════════════════════════════════════════════════
-- RÉSUMÉ PERFORMANCE
-- ═══════════════════════════════════════════════════════════════

SELECT '=== RÉSUMÉ ===' as titre;

-- Taille tables
SELECT * FROM get_dwh_stats();

-- Nombre d'index
SELECT 
    schemaname,
    tablename,
    COUNT(*) as nb_indexes
FROM pg_indexes
WHERE schemaname = 'public'
GROUP BY schemaname, tablename
ORDER BY nb_indexes DESC;
