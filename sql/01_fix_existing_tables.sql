-- Fix existing tables to be compatible with the new DWH schema
-- Adds missing columns to `dim_users` used by the new creation script
-- Date: 2026-03-05

BEGIN;

-- dim_users: ajouter colonnes si absentes
ALTER TABLE IF EXISTS dim_users
  ADD COLUMN IF NOT EXISTS date_inscription DATE,
  ADD COLUMN IF NOT EXISTS conso_moyenne_jour NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS objectif_mensuel INTEGER,
  ADD COLUMN IF NOT EXISTS segment_client VARCHAR(30),
  ADD COLUMN IF NOT EXISTS risque_depassement_t1 VARCHAR(20),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS date_derniere_recharge DATE;

COMMIT;

SELECT 'fix_done' as status;
