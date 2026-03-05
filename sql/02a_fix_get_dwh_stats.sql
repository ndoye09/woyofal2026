-- Patch minimal pour remplacer uniquement la fonction get_dwh_stats()
-- Utiliser CREATE OR REPLACE FUNCTION sans transaction wrapper

CREATE OR REPLACE FUNCTION get_dwh_stats()
RETURNS TABLE (
    table_name VARCHAR,
    row_count BIGINT,
    size_mb NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.relname::VARCHAR AS table_name,
        COALESCE(s.n_live_tup, 0) AS row_count,
        ROUND(pg_total_relation_size(c.oid) / 1024.0 / 1024.0, 2) AS size_mb
    FROM pg_class c
    LEFT JOIN pg_stat_all_tables s
        ON s.relname = c.relname AND s.schemaname = 'public'
    LEFT JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND c.relname IN (
            'dimension_dates', 'dimension_tarifs', 'dim_zones', 'dim_users',
            'fact_consumption', 'fact_recharges'
      )
    ORDER BY pg_total_relation_size(c.oid) DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_dwh_stats() IS 'Patch: Statistiques DWH utilisant pg_stat_all_tables';
