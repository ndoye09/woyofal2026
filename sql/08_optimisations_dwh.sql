-- ═══════════════════════════════════════════════════════════════
-- OPTIMISATIONS DATA WAREHOUSE - WOYOFAL
-- ═══════════════════════════════════════════════════════════════

BEGIN;

\echo '══════════════════════════════════════════════════════════════='
\echo '⚡ OPTIMISATIONS DWH - Phase 1 : Nettoyage'
\echo '══════════════════════════════════════════════════════════════='

-- 1️⃣ Suppression tables inutiles/anciennes
DROP TABLE IF EXISTS dim_tranches CASCADE;
DROP TABLE IF EXISTS dim_date CASCADE;
DROP TABLE IF EXISTS old_consumption CASCADE;
DROP TABLE IF EXISTS temp_import CASCADE;
DROP TABLE IF EXISTS staging_consumption CASCADE;

\echo '✅ Tables inutiles supprimées'


-- 2️⃣ Suppression index inutilisés (liste générée, exécution manuelle recommandée)
DO $$
DECLARE
    idx_record RECORD;
    drop_count INTEGER := 0;
BEGIN
    FOR idx_record IN 
        SELECT 
            schemaname,
            tablename,
            indexname
        FROM pg_stat_user_indexes
        WHERE schemaname = 'public'
          AND idx_scan = 0
          AND indexrelid::regclass::text NOT LIKE '%_pkey'
          AND indexrelid::regclass::text NOT LIKE '%_unique'
    LOOP
        RAISE NOTICE 'Candidat suppression index : %.%', idx_record.tablename, idx_record.indexname;
        -- Pour sécurité, ne pas supprimer automatiquement ici
        drop_count := drop_count + 1;
    END LOOP;
    RAISE NOTICE 'Total index candidats suppression : %', drop_count;
END $$;


-- 3️⃣ Création index manquants
\echo ''
\echo '3️⃣ Création index manquants pour requêtes fréquentes...'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fact_consumption_user_month
ON fact_consumption(user_id, mois, annee) 
WHERE mois IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fact_consumption_zone_month
ON fact_consumption(zone_id, mois, annee);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fact_recharges_user_month
ON fact_recharges(user_id, mois, annee);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fact_recharges_status_date
ON fact_recharges(statut, date_id)
WHERE statut = 'success';

-- Index partiel pour données récentes (3 derniers mois)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fact_consumption_recent
ON fact_consumption(date_id, user_id)
WHERE mois >= EXTRACT(MONTH FROM CURRENT_DATE) - 3;

\echo '✅ Index manquants créés'


-- 4️⃣ Optimisation statistiques
\echo ''
\echo '4️⃣ Augmentation statistiques pour colonnes fréquentes...'

ALTER TABLE fact_consumption ALTER COLUMN user_id SET STATISTICS 1000;
ALTER TABLE fact_consumption ALTER COLUMN zone_id SET STATISTICS 1000;
ALTER TABLE fact_consumption ALTER COLUMN date_id SET STATISTICS 1000;
ALTER TABLE fact_consumption ALTER COLUMN tranche SET STATISTICS 500;

ALTER TABLE fact_recharges ALTER COLUMN user_id SET STATISTICS 1000;
ALTER TABLE fact_recharges ALTER COLUMN canal_paiement SET STATISTICS 500;

\echo '✅ Statistiques optimisées'


-- 5️⃣ VACUUM & ANALYZE
\echo ''
\echo '5️⃣ VACUUM & ANALYZE complet...'

VACUUM ANALYZE dimension_dates;
VACUUM ANALYZE dimension_tarifs;
VACUUM ANALYZE dim_zones;
VACUUM ANALYZE dim_users;
VACUUM ANALYZE fact_consumption;
VACUUM ANALYZE fact_recharges;

-- Vues matérialisées (si présentes)
VACUUM ANALYZE IF EXISTS mart_tarifs_2026;
VACUUM ANALYZE IF EXISTS mart_conso_users;
VACUUM ANALYZE IF EXISTS mart_recharges_analyse;
VACUUM ANALYZE IF EXISTS mart_performance_journaliere;
VACUUM ANALYZE IF EXISTS mart_conso_regions_mensuel;
VACUUM ANALYZE IF EXISTS mart_kpis_globaux;
VACUUM ANALYZE IF EXISTS mart_analyse_tranches;

\echo '✅ VACUUM & ANALYZE terminé'


-- 6️⃣ Réorganisation physique (CLUSTER)
\echo ''
\echo '6️⃣ Réorganisation physique tables (CLUSTER)...'

-- Note: CLUSTER requires an index; exécuter uniquement si index existant
-- CLUSTER fact_consumption USING idx_fact_consumption_date;
-- CLUSTER fact_recharges USING idx_fact_recharges_date;

\echo '✅ Optimisations SQL appliquées (vérifier logs pour détails)'

COMMIT;

\echo ''
