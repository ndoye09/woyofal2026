-- Vues de compatibilité pour restaurer noms canoniques attendus par l'app
-- Ne modifie pas les données originales, renomme tables en *_base puis crée des vues

BEGIN;

-- Renommer dim_zones en dim_zones_base si nécessaire
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='dim_zones')
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='dim_zones_base') THEN
    EXECUTE 'ALTER TABLE public.dim_zones RENAME TO dim_zones_base';
  END IF;
END
$$;

-- Créer la vue dim_zones exposant zone_nom
CREATE OR REPLACE VIEW public.dim_zones AS
SELECT
  zone_id,
  region AS zone_nom,
  commune,
  population,
  type_zone,
  densite,
  latitude,
  longitude,
  created_at
FROM public.dim_zones_base;

-- Renommer fact_consumption en fact_consumption_base si nécessaire
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='fact_consumption')
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='fact_consumption_base') THEN
    EXECUTE 'ALTER TABLE public.fact_consumption RENAME TO fact_consumption_base';
  END IF;
END
$$;

-- Créer la vue fact_consumption exposant kwh
CREATE OR REPLACE VIEW public.fact_consumption AS
SELECT
  id,
  date_id,
  user_id,
  zone_id,
  tarif_id,
  conso_kwh AS kwh,
  conso_cumul_mois,
  cout_fcfa,
  cout_si_t1,
  surcout_vs_t1,
  economie_baisse_10pct,
  tranche,
  type_compteur,
  jour_semaine,
  est_weekend,
  mois,
  annee,
  created_at
FROM public.fact_consumption_base;

-- Créer une vue dim_date si elle n'existe pas
CREATE OR REPLACE VIEW public.dim_date AS
SELECT * FROM public.dimension_dates;

COMMIT;
