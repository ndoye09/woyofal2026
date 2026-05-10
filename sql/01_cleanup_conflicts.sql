-- Cleanup: renommer anciennes tables et supprimer indexes en conflit
-- Date: 2026-03-05

BEGIN;

-- Sauvegarde tables anciennes
ALTER TABLE IF EXISTS dim_date RENAME TO dim_date_backup_20260305;
ALTER TABLE IF EXISTS dim_tranches RENAME TO dim_tranches_backup_20260305;

-- Supprimer indexs qui pourraient entrer en conflit avec le nouveau script
DROP INDEX IF EXISTS idx_dim_zones_region;
DROP INDEX IF EXISTS idx_dim_zones_type;
DROP INDEX IF EXISTS idx_dim_zones_population;

DROP INDEX IF EXISTS idx_dim_users_zone;
DROP INDEX IF EXISTS idx_dim_users_type;
DROP INDEX IF EXISTS idx_dim_users_numero;
DROP INDEX IF EXISTS idx_dim_users_actif;
DROP INDEX IF EXISTS idx_dim_users_segment;
DROP INDEX IF EXISTS idx_dim_users_telephone;

DROP INDEX IF EXISTS idx_fact_conso_date;
DROP INDEX IF EXISTS idx_fact_conso_user;
DROP INDEX IF EXISTS idx_fact_conso_zone;
DROP INDEX IF EXISTS idx_fact_conso_tarif;
DROP INDEX IF EXISTS idx_fact_conso_mois_annee;
DROP INDEX IF EXISTS idx_fact_conso_tranche;
DROP INDEX IF EXISTS idx_fact_conso_type;
DROP INDEX IF EXISTS idx_fact_conso_analytics;
DROP INDEX IF EXISTS idx_fact_conso_aggregation;

DROP INDEX IF EXISTS idx_fact_rech_date;
DROP INDEX IF EXISTS idx_fact_rech_user;
DROP INDEX IF EXISTS idx_fact_rech_zone;
DROP INDEX IF EXISTS idx_fact_rech_canal;
DROP INDEX IF EXISTS idx_fact_rech_statut;
DROP INDEX IF EXISTS idx_fact_rech_mois_annee;
DROP INDEX IF EXISTS idx_fact_rech_analytics;

COMMIT;

SELECT 'cleanup_done' as status;
