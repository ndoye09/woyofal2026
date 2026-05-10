-- Script to load CSVs into the DWH using server-side COPY (files mounted at /data)
\set ON_ERROR_STOP on

-- 1) Load dim_zones via staging + upsert (avoid truncating referenced tables)
DROP TABLE IF EXISTS staging_zones;
CREATE TEMP TABLE staging_zones (
  zone_id integer,
  region text,
  commune text,
  population integer,
  type_zone text,
  densite text
);
\copy staging_zones FROM '/data/raw/zones_senegal.csv' CSV HEADER;

INSERT INTO dim_zones(zone_id, region, commune, population, type_zone, densite)
SELECT zone_id, region, commune, population, type_zone, densite FROM staging_zones
ON CONFLICT (zone_id) DO UPDATE SET
  region = EXCLUDED.region,
  commune = EXCLUDED.commune,
  population = EXCLUDED.population,
  type_zone = EXCLUDED.type_zone,
  densite = EXCLUDED.densite;
DROP TABLE staging_zones;

-- 2) Load users via staging (CSV has extra columns)
DROP TABLE IF EXISTS staging_users;
CREATE TEMP TABLE staging_users (
  user_id integer,
  prenom text,
  nom text,
  genre text,
  email text,
  telephone text,
  type_compteur text,
  numero_compteur text,
  zone_id integer,
  region text,
  commune text,
  type_zone text,
  date_inscription date,
  conso_moyenne_jour numeric,
  objectif_mensuel integer,
  actif boolean
);
\copy staging_users FROM '/data/raw/users.csv' CSV HEADER;

-- insert into dim_users, ignore conflicts
INSERT INTO dim_users(user_id, prenom, nom, genre, email, telephone, type_compteur, numero_compteur, zone_id, date_inscription, conso_moyenne_jour, objectif_mensuel, actif)
SELECT user_id, prenom, nom, genre, email, telephone, type_compteur, numero_compteur, zone_id, date_inscription, conso_moyenne_jour, objectif_mensuel, actif
FROM staging_users
ON CONFLICT DO NOTHING;

-- 3) Load consumption via staging
DROP TABLE IF EXISTS staging_consumption;
CREATE TEMP TABLE staging_consumption (
  date date,
  user_id integer,
  numero_compteur text,
  zone_id integer,
  region text,
  type_compteur text,
  conso_kwh numeric,
  conso_cumul_mois numeric,
  tranche integer,
  prix_kwh numeric,
  cout_fcfa numeric,
  economie_baisse_10pct numeric,
  jour_semaine text,
  mois integer,
  annee integer
);
\copy staging_consumption FROM '/data/raw/consumption_daily.csv' CSV HEADER;

-- ensure dates in dim_date
INSERT INTO dim_date(date, jour, mois, annee, jour_semaine, nom_mois, trimestre, est_debut_mois, est_fin_mois, est_weekend)
SELECT d,
       EXTRACT(day FROM d)::int,
       EXTRACT(month FROM d)::int,
       EXTRACT(year FROM d)::int,
       TO_CHAR(d,'Day')::text,
       TO_CHAR(d,'Month')::text,
       EXTRACT(quarter FROM d)::int,
       (EXTRACT(day FROM d)=1),
       (EXTRACT(day FROM (d + INTERVAL '1 day'))=1),
       (EXTRACT(dow FROM d) IN (0,6))
FROM (
  SELECT DISTINCT date FROM staging_consumption
) t(d)
ON CONFLICT (date) DO NOTHING;

-- insert fact_consumption
INSERT INTO fact_consumption(date_id, user_id, zone_id, tranche_id, conso_kwh, conso_cumul_mois, cout_fcfa, economie_baisse_10pct, jour_semaine, mois, annee)
SELECT dd.date_id, u.user_id, s.zone_id, s.tranche, s.conso_kwh, s.conso_cumul_mois, s.cout_fcfa, s.economie_baisse_10pct, s.jour_semaine, s.mois, s.annee
FROM staging_consumption s
JOIN dim_date dd ON dd.date = s.date
LEFT JOIN dim_users u ON u.user_id = s.user_id;

-- 4) Load recharges via staging
DROP TABLE IF EXISTS staging_recharges;
CREATE TEMP TABLE staging_recharges (
  recharge_id integer,
  date date,
  heure time,
  user_id integer,
  numero_compteur text,
  zone_id integer,
  region text,
  type_compteur text,
  montant_brut numeric,
  redevance numeric,
  taxe_communale numeric,
  montant_net numeric,
  kwh_obtenus numeric,
  cumul_mois_avant numeric,
  tranche_finale integer,
  economie_baisse numeric,
  canal_paiement text,
  statut text
);
\copy staging_recharges FROM '/data/raw/recharges.csv' CSV HEADER;

-- ensure recharge dates in dim_date
INSERT INTO dim_date(date, jour, mois, annee, jour_semaine, nom_mois, trimestre, est_debut_mois, est_fin_mois, est_weekend)
SELECT d,
       EXTRACT(day FROM d)::int,
       EXTRACT(month FROM d)::int,
       EXTRACT(year FROM d)::int,
       TO_CHAR(d,'Day')::text,
       TO_CHAR(d,'Month')::text,
       EXTRACT(quarter FROM d)::int,
       (EXTRACT(day FROM d)=1),
       (EXTRACT(day FROM (d + INTERVAL '1 day'))=1),
       (EXTRACT(dow FROM d) IN (0,6))
FROM (
  SELECT DISTINCT date FROM staging_recharges
) t(d)
ON CONFLICT (date) DO NOTHING;

-- insert fact_recharges
INSERT INTO fact_recharges(recharge_id, date_id, user_id, zone_id, tranche_finale_id, montant_brut, redevance, taxe_communale, montant_net, kwh_obtenus, cumul_mois_avant, economie_baisse, heure, canal_paiement, statut, mois, annee)
SELECT s.recharge_id, dd.date_id, u.user_id, s.zone_id, s.tranche_finale, s.montant_brut, s.redevance, s.taxe_communale, s.montant_net, s.kwh_obtenus, s.cumul_mois_avant, s.economie_baisse, s.heure, s.canal_paiement, s.statut, EXTRACT(month FROM s.date)::int, EXTRACT(year FROM s.date)::int
FROM staging_recharges s
JOIN dim_date dd ON dd.date = s.date
LEFT JOIN dim_users u ON u.user_id = s.user_id;

COMMIT;

\echo 'CSV import terminé'
