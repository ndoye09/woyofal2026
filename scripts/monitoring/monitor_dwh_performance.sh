#!/usr/bin/env bash
# Moniteur simple DWH: collecte métriques via psql et écrit rapports
# Usage: ./monitor_dwh_performance.sh [output_dir]

OUTDIR=${1:-./reports}
mkdir -p "${OUTDIR}"

TS=$(date +%Y%m%d_%H%M%S)
OUTFILE="${OUTDIR}/dwh_perf_${TS}.txt"

echo "Collecte métriques DWH: ${TS}" > "${OUTFILE}"
echo "Host: ${PGHOST:-localhost}" >> "${OUTFILE}"

PSQL="docker exec -i woyofal-postgres psql -U woyofal_user -d woyofal_dwh -At -c"

echo "--- Taille des tables (MB) ---" >> "${OUTFILE}"
${PSQL} "SELECT schemaname||'.'||relname, pg_size_pretty(pg_total_relation_size(relid)) FROM pg_catalog.pg_statio_user_tables ORDER BY pg_total_relation_size(relid) DESC LIMIT 50;" >> "${OUTFILE}"

echo "\n--- Requêtes longues (pg_stat_activity) ---" >> "${OUTFILE}"
${PSQL} "SELECT pid, state, now()-query_start AS running_for, query FROM pg_stat_activity WHERE state <> 'idle' ORDER BY query_start LIMIT 20;" >> "${OUTFILE}"

echo "\n--- Statistiques d'index (bloat) ---" >> "${OUTFILE}"
${PSQL} "SELECT relname, idx_scan, pg_size_pretty(pg_relation_size(indexrelid)) FROM pg_stat_user_indexes ORDER BY pg_relation_size(indexrelid) DESC LIMIT 50;" >> "${OUTFILE}"

echo "\n--- Verrous actifs ---" >> "${OUTFILE}"
${PSQL} "SELECT pid, mode, relation::regclass, granted, query FROM pg_locks l JOIN pg_stat_activity a USING (pid) WHERE NOT granted;" >> "${OUTFILE}"

echo "\n--- Cache hit ratio ---" >> "${OUTFILE}"
${PSQL} "SELECT sum(blks_hit) / nullif(sum(blks_hit + blks_read),0) AS hit_ratio FROM pg_stat_database;" >> "${OUTFILE}"

echo "\n--- Autres paramètres utiles ---" >> "${OUTFILE}"
${PSQL} "SELECT name, setting FROM pg_settings WHERE name IN ('shared_buffers','work_mem','maintenance_work_mem','effective_cache_size','max_parallel_workers_per_gather');" >> "${OUTFILE}"

echo "Rapport écrit: ${OUTFILE}"
