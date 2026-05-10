-- ═══════════════════════════════════════════════════════════════
-- ANALYSE PERFORMANCE DATA WAREHOUSE - WOYOFAL
-- ═══════════════════════════════════════════════════════════════

\timing on
SET work_mem = '256MB';
SET maintenance_work_mem = '512MB';

-- ═══════════════════════════════════════════════════════════════
-- 1. STATISTIQUES VOLUMÉTRIE
-- ═══════════════════════════════════════════════════════════════

\echo '══════════════════════════════════════════════════════════════='
\echo '📊 1. STATISTIQUES VOLUMÉTRIE'
\echo '══════════════════════════════════════════════════════════════='

SELECT 
    schemaname,
    tablename,
    n_live_tup as nb_lignes,
    n_dead_tup as nb_lignes_mortes,
    ROUND(100.0 * n_dead_tup / NULLIF(n_live_tup, 0), 2) as pct_lignes_mortes,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as taille_totale,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as taille_table,
    pg_size_pretty(pg_indexes_size(schemaname||'.'||tablename)) as taille_indexes,
    last_vacuum,
    last_autovacuum,
    last_analyze,
    last_autoanalyze
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;


-- ═══════════════════════════════════════════════════════════════
-- 2. ANALYSE INDEX
-- ═══════════════════════════════════════════════════════════════

\echo ''
\echo '══════════════════════════════════════════════════════════════='
\echo '📇 2. ANALYSE INDEX'
\echo '══════════════════════════════════════════════════════════════='

-- 2.1 Index les plus volumineux
\echo ''
\echo '2.1 Index les plus volumineux :'
SELECT 
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) as taille_index,
    idx_scan as nb_scans,
    idx_tup_read as tuples_lus,
    idx_tup_fetch as tuples_fetches,
    CASE 
        WHEN idx_scan = 0 THEN '⚠️  JAMAIS UTILISÉ'
        WHEN idx_scan < 10 THEN '⚠️  PEU UTILISÉ'
        ELSE '✅ Utilisé'
    END as statut_utilisation
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY pg_relation_size(indexrelid) DESC
LIMIT 20;

-- 2.2 Index inutilisés (candidats suppression)
\echo ''
\echo '2.2 Index inutilisés (candidats suppression) :'
SELECT 
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) as taille_index,
    idx_scan as nb_scans
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND idx_scan = 0
  AND indexrelid::regclass::text NOT LIKE '%_pkey'
ORDER BY pg_relation_size(indexrelid) DESC;

-- 2.3 Index dupliqués potentiels
\echo ''
\echo '2.3 Index dupliqués potentiels :'
SELECT 
    pg_size_pretty(SUM(pg_relation_size(idx))::BIGINT) AS taille_totale,
    (array_agg(idx))[1] AS idx1,
    (array_agg(idx))[2] AS idx2,
    (array_agg(idx))[3] AS idx3,
    (array_agg(idx))[4] AS idx4
FROM (
    SELECT 
        indexrelid::regclass AS idx,
        (indrelid::text ||E'\n'|| indclass::text ||E'\n'|| 
         indkey::text ||E'\n'||COALESCE(indexprs::text,'')||E'\n' ||
         COALESCE(indpred::text,'')) AS key
    FROM pg_index
) sub
GROUP BY key 
HAVING COUNT(*) > 1
ORDER BY SUM(pg_relation_size(idx)) DESC;


-- ═══════════════════════════════════════════════════════════════
-- 3. REQUÊTES LENTES (depuis pg_stat_statements si activé)
-- ═══════════════════════════════════════════════════════════════

\echo ''
\echo '══════════════════════════════════════════════════════════════='
\echo '🐌 3. REQUÊTES LENTES'
\echo '══════════════════════════════════════════════════════════════='

-- Activer extension si pas déjà fait
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Top 10 requêtes les plus lentes (temps total)
\echo ''
\echo '3.1 Top 10 requêtes les plus lentes (temps total) :'
SELECT 
    ROUND(total_exec_time::numeric, 2) as total_time_ms,
    calls,
    ROUND(mean_exec_time::numeric, 2) as mean_time_ms,
    ROUND((100 * total_exec_time / SUM(total_exec_time) OVER())::numeric, 2) AS pct_total,
    LEFT(query, 100) as query_preview
FROM pg_stat_statements
WHERE query NOT LIKE '%pg_stat_statements%'
  AND query NOT LIKE '%pg_catalog%'
ORDER BY total_exec_time DESC
LIMIT 10;

-- Top 10 requêtes les plus lentes (temps moyen)
\echo ''
\echo '3.2 Top 10 requêtes les plus lentes (temps moyen) :'
SELECT 
    ROUND(mean_exec_time::numeric, 2) as mean_time_ms,
    calls,
    ROUND(total_exec_time::numeric, 2) as total_time_ms,
    LEFT(query, 100) as query_preview
FROM pg_stat_statements
WHERE query NOT LIKE '%pg_stat_statements%'
  AND query NOT LIKE '%pg_catalog%'
  AND calls > 10
ORDER BY mean_exec_time DESC
LIMIT 10;


-- ═══════════════════════════════════════════════════════════════
-- 4. CACHE HIT RATIO
-- ═══════════════════════════════════════════════════════════════

\echo ''
\echo '══════════════════════════════════════════════════════════════='
\echo '💾 4. CACHE HIT RATIO'
\echo '══════════════════════════════════════════════════════════════='

SELECT 
    'Table Cache Hit Rate' as metric,
    ROUND(
        100.0 * SUM(heap_blks_hit) / NULLIF(SUM(heap_blks_hit + heap_blks_read), 0),
    2) as percentage,
    CASE 
        WHEN ROUND(100.0 * SUM(heap_blks_hit) / NULLIF(SUM(heap_blks_hit + heap_blks_read), 0), 2) > 99 
        THEN '✅ Excellent'
        WHEN ROUND(100.0 * SUM(heap_blks_hit) / NULLIF(SUM(heap_blks_hit + heap_blks_read), 0), 2) > 95 
        THEN '✅ Bon'
        WHEN ROUND(100.0 * SUM(heap_blks_hit) / NULLIF(SUM(heap_blks_hit + heap_blks_read), 0), 2) > 90 
        THEN '⚠️  Moyen'
        ELSE '❌ Faible'
    END as status
FROM pg_statio_user_tables
UNION ALL
SELECT 
    'Index Cache Hit Rate' as metric,
    ROUND(
        100.0 * SUM(idx_blks_hit) / NULLIF(SUM(idx_blks_hit + idx_blks_read), 0),
    2) as percentage,
    CASE 
        WHEN ROUND(100.0 * SUM(idx_blks_hit) / NULLIF(SUM(idx_blks_hit + idx_blks_read), 0), 2) > 99 
        THEN '✅ Excellent'
        WHEN ROUND(100.0 * SUM(idx_blks_hit) / NULLIF(SUM(idx_blks_hit + idx_blks_read), 0), 2) > 95 
        THEN '✅ Bon'
        WHEN ROUND(100.0 * SUM(idx_blks_hit) / NULLIF(SUM(idx_blks_hit + idx_blks_read), 0), 2) > 90 
        THEN '⚠️  Moyen'
        ELSE '❌ Faible'
    END as status
FROM pg_statio_user_indexes;


-- ═══════════════════════════════════════════════════════════════
-- 5. SÉQUENTIAL SCANS (Tables scannées sans index)
-- ═══════════════════════════════════════════════════════════════

\echo ''
\echo '══════════════════════════════════════════════════════════════='
\echo '🔍 5. SEQUENTIAL SCANS (Candidats indexation)'
\echo '══════════════════════════════════════════════════════════════='

SELECT 
    schemaname,
    tablename,
    seq_scan as nb_seq_scans,
    seq_tup_read as tuples_lus,
    idx_scan as nb_idx_scans,
    n_live_tup as nb_lignes,
    ROUND(100.0 * seq_scan / NULLIF(seq_scan + idx_scan, 0), 2) as pct_seq_scans,
    CASE 
        WHEN seq_scan > 1000 AND n_live_tup > 10000 THEN '⚠️  INDEX RECOMMANDÉ'
        WHEN seq_scan > 100 AND n_live_tup > 1000 THEN '⚠️  À SURVEILLER'
        ELSE '✅ OK'
    END as recommandation
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND seq_scan > 0
ORDER BY seq_scan DESC
LIMIT 10;


-- ═══════════════════════════════════════════════════════════════
-- 6. BLOAT (Tables et index gonflés)
-- ═══════════════════════════════════════════════════════════════

\echo ''
\echo '══════════════════════════════════════════════════════════════='
\echo '💨 6. BLOAT (Gonflement tables/index)'
\echo '══════════════════════════════════════════════════════════════='

-- Estimation bloat tables
WITH bloat AS (
    SELECT 
        schemaname,
        tablename,
        ROUND(100 * (n_dead_tup::NUMERIC / NULLIF(n_live_tup, 0)), 2) AS bloat_pct,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS taille,
        n_dead_tup
    FROM pg_stat_user_tables
    WHERE schemaname = 'public'
)
SELECT 
    schemaname,
    tablename,
    bloat_pct,
    taille,
    n_dead_tup,
    CASE 
        WHEN bloat_pct > 20 THEN '❌ VACUUM URGENT'
        WHEN bloat_pct > 10 THEN '⚠️  VACUUM RECOMMANDÉ'
        WHEN bloat_pct > 5 THEN '⚠️  À SURVEILLER'
        ELSE '✅ OK'
    END as action_requise
FROM bloat
WHERE n_dead_tup > 0
ORDER BY bloat_pct DESC NULLS LAST;


-- ═══════════════════════════════════════════════════════════════
-- 7. LOCKS & CONNEXIONS
-- ═══════════════════════════════════════════════════════════════

\echo ''
\echo '══════════════════════════════════════════════════════════════='
\echo '🔒 7. LOCKS & CONNEXIONS'
\echo '══════════════════════════════════════════════════════════════='

-- Connexions actives
\echo ''
\echo '7.1 Connexions actives :'
SELECT 
    datname,
    COUNT(*) as nb_connexions,
    COUNT(*) FILTER (WHERE state = 'active') as actives,
    COUNT(*) FILTER (WHERE state = 'idle') as idle,
    COUNT(*) FILTER (WHERE state = 'idle in transaction') as idle_in_transaction
FROM pg_stat_activity
WHERE datname IS NOT NULL
GROUP BY datname;

-- Locks actuels
\echo ''
\echo '7.2 Locks actuels :'
SELECT 
    locktype,
    relation::regclass as relation,
    mode,
    granted,
    COUNT(*) as nb_locks
FROM pg_locks
WHERE locktype IN ('relation', 'tuple')
  AND database = (SELECT oid FROM pg_database WHERE datname = current_database())
GROUP BY locktype, relation, mode, granted
ORDER BY nb_locks DESC;


-- ═══════════════════════════════════════════════════════════════
-- 8. CONFIGURATION POSTGRESQL
-- ═══════════════════════════════════════════════════════════════

\echo ''
\echo '══════════════════════════════════════════════════════════════='
\echo '⚙️  8. CONFIGURATION POSTGRESQL'
\echo '══════════════════════════════════════════════════════════════='

SELECT 
    name,
    setting,
    unit,
    CASE 
        WHEN name = 'shared_buffers' AND setting::BIGINT < 256*1024 THEN '⚠️  Augmenter (min 256MB)'
        WHEN name = 'effective_cache_size' AND setting::BIGINT < 1024*1024 THEN '⚠️  Augmenter (min 1GB)'
        WHEN name = 'work_mem' AND setting::BIGINT < 4*1024 THEN '⚠️  Augmenter (min 4MB)'
        WHEN name = 'maintenance_work_mem' AND setting::BIGINT < 64*1024 THEN '⚠️  Augmenter (min 64MB)'
        ELSE '✅ OK'
    END as recommandation
FROM pg_settings
WHERE name IN (
    'shared_buffers',
    'effective_cache_size',
    'work_mem',
    'maintenance_work_mem',
    'random_page_cost',
    'effective_io_concurrency',
    'max_connections'
)
ORDER BY name;


-- RÉSUMÉ & RECOMMANDATIONS
\echo ''
\echo '══════════════════════════════════════════════════════════════='
\echo '📋 RÉSUMÉ & RECOMMANDATIONS'
\echo '══════════════════════════════════════════════════════════════='

WITH summary AS (
    SELECT 
        COUNT(*) FILTER (WHERE idx_scan = 0 AND indexrelid::regclass::text NOT LIKE '%_pkey') as index_inutilises,
        COUNT(*) FILTER (WHERE n_dead_tup::NUMERIC / NULLIF(n_live_tup, 0) > 0.1) as tables_bloat,
        COUNT(*) FILTER (WHERE seq_scan > 1000 AND n_live_tup > 10000) as tables_seq_scan
    FROM pg_stat_user_indexes
    FULL OUTER JOIN pg_stat_user_tables USING (schemaname, tablename)
    WHERE schemaname = 'public'
)
SELECT 
    index_inutilises,
    tables_bloat,
    tables_seq_scan,
    CASE 
        WHEN index_inutilises > 0 THEN '⚠️  Supprimer index inutilisés'
        ELSE '✅ Index OK'
    END as action_index,
    CASE 
        WHEN tables_bloat > 0 THEN '⚠️  VACUUM tables gonflées'
        ELSE '✅ Bloat OK'
    END as action_vacuum,
    CASE 
        WHEN tables_seq_scan > 0 THEN '⚠️  Créer index manquants'
        ELSE '✅ Scans OK'
    END as action_scans
FROM summary;

\echo ''
\echo '✅ Analyse performance terminée'
\echo ''
