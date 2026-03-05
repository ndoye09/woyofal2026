-- Supprimer anciennes tables pour repartir d'un schéma propre
-- Attention : suppression définitive des données contenues
-- Date: 2026-03-05

BEGIN;

DROP TABLE IF EXISTS fact_recharges CASCADE;
DROP TABLE IF EXISTS fact_consumption CASCADE;
DROP TABLE IF EXISTS dim_users CASCADE;
DROP TABLE IF EXISTS dim_zones CASCADE;

COMMIT;

SELECT 'old_tables_removed' as status;
