-- ═══════════════════════════════════════════════════════════════
-- DATA WAREHOUSE OPTIMISÉ - WOYOFAL 2026
-- ═══════════════════════════════════════════════════════════════
-- Description : Schéma étoile optimisé avec indexation complète
-- Version     : 2.0
-- Date        : 2026-03-05
-- ═══════════════════════════════════════════════════════════════

-- Nettoyage (si re-création nécessaire)
-- DROP TABLE IF EXISTS fact_recharges CASCADE;
-- DROP TABLE IF EXISTS fact_consumption CASCADE;
-- DROP TABLE IF EXISTS dim_users CASCADE;
-- DROP TABLE IF EXISTS dim_zones CASCADE;
-- DROP TABLE IF EXISTS dimension_tarifs CASCADE;
-- DROP TABLE IF EXISTS dimension_dates CASCADE;

-- Note: Pas de transaction globale pour permettre l'exécution idempotente

-- ═══════════════════════════════════════════════════════════════
-- 1. DIMENSION DATES (Enrichie)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS dimension_dates (
    date_id SERIAL PRIMARY KEY,
    date DATE NOT NULL UNIQUE,
    
    -- Composantes temporelles
    jour INTEGER NOT NULL,
    mois INTEGER NOT NULL,
    annee INTEGER NOT NULL,
    trimestre INTEGER NOT NULL,
    semestre INTEGER NOT NULL,
    
    -- Jour de la semaine
    jour_semaine INTEGER NOT NULL,           -- 0=Lundi, 6=Dimanche
    nom_jour VARCHAR(10) NOT NULL,            -- 'Lundi', 'Mardi'...
    nom_jour_court VARCHAR(3) NOT NULL,       -- 'Lun', 'Mar'...
    
    -- Semaine et mois
    numero_semaine INTEGER NOT NULL,          -- 1-53
    semaine_annee VARCHAR(8) NOT NULL,        -- '2026-W01'
    nom_mois VARCHAR(15) NOT NULL,            -- 'Janvier', 'Février'...
    nom_mois_court VARCHAR(4) NOT NULL,       -- 'Janv', 'Févr'...
    mois_annee VARCHAR(7) NOT NULL,           -- '2026-01'
    
    -- Indicateurs
    est_debut_mois BOOLEAN NOT NULL,          -- J1-J5
    est_milieu_mois BOOLEAN NOT NULL,         -- J11-J20
    est_fin_mois BOOLEAN NOT NULL,            -- J25-Fin
    est_weekend BOOLEAN NOT NULL,             -- Sam-Dim
    est_jour_ouvrable BOOLEAN NOT NULL,       -- Lun-Ven
    est_ferie BOOLEAN DEFAULT FALSE,          -- Jours fériés Sénégal
    
    -- Saison (Sénégal)
    saison VARCHAR(20) NOT NULL,              -- 'chaude', 'fraiche', 'pluvieuse'
    
    -- Métadonnées
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index
CREATE INDEX IF NOT EXISTS idx_dimension_dates_date ON dimension_dates(date);
CREATE INDEX IF NOT EXISTS idx_dimension_dates_mois_annee ON dimension_dates(mois, annee);
CREATE INDEX IF NOT EXISTS idx_dimension_dates_jour_semaine ON dimension_dates(jour_semaine);
CREATE INDEX IF NOT EXISTS idx_dimension_dates_weekend ON dimension_dates(est_weekend);
CREATE INDEX IF NOT EXISTS idx_dimension_dates_saison ON dimension_dates(saison);

COMMENT ON TABLE dimension_dates IS 'Dimension dates enrichie avec calendrier sénégalais';


-- ═══════════════════════════════════════════════════════════════
-- 2. DIMENSION TARIFS (Nouvelle - Remplace dim_tranches)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS dimension_tarifs (
    tarif_id SERIAL PRIMARY KEY,
    
    -- Identification
    type_compteur VARCHAR(10) NOT NULL,       -- 'DPP' ou 'PPP'
    tranche INTEGER NOT NULL,                 -- 1, 2, 3
    nom_tranche VARCHAR(50) NOT NULL,         -- 'Tranche 1 Sociale'
    
    -- Seuils consommation
    seuil_min_kwh INTEGER NOT NULL,           -- kWh minimum
    seuil_max_kwh INTEGER,                    -- kWh maximum (NULL = illimité)
    
    -- Tarification
    prix_kwh_actuel NUMERIC(10, 2) NOT NULL,  -- Prix actuel (avec baisse 10%)
    prix_kwh_ancien NUMERIC(10, 2) NOT NULL,  -- Prix ancien (avant baisse)
    prix_kwh_reference NUMERIC(10, 2),        -- Prix référence (postpaid si diff)
    
    -- Économies
    economie_kwh NUMERIC(10, 2),              -- Économie unitaire par kWh
    taux_economie NUMERIC(5, 2),              -- % d'économie
    
    -- Metadata règlementaire
    decision_crse VARCHAR(50),                 -- Décision CRSE (ex: '2025-140')
    date_application DATE NOT NULL,            -- Date entrée vigueur
    date_fin DATE,                             -- Date fin validité
    est_actif BOOLEAN DEFAULT TRUE,
    
    -- Description
    description TEXT,
    couleur_affichage VARCHAR(7),             -- Code couleur hex (#XXXXXX)
    
    -- Métadonnées
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Contraintes
    UNIQUE(type_compteur, tranche, date_application),
    CHECK (seuil_min_kwh >= 0),
    CHECK (seuil_max_kwh IS NULL OR seuil_max_kwh > seuil_min_kwh),
    CHECK (prix_kwh_actuel > 0),
    CHECK (tranche IN (1, 2, 3)),
    CHECK (type_compteur IN ('DPP', 'PPP'))
);

-- Index
CREATE INDEX IF NOT EXISTS idx_dimension_tarifs_type ON dimension_tarifs(type_compteur);
CREATE INDEX IF NOT EXISTS idx_dimension_tarifs_tranche ON dimension_tarifs(tranche);
CREATE INDEX IF NOT EXISTS idx_dimension_tarifs_actif ON dimension_tarifs(est_actif);
CREATE INDEX IF NOT EXISTS idx_dimension_tarifs_date ON dimension_tarifs(date_application);

COMMENT ON TABLE dimension_tarifs IS 'Dimension tarifs Senelec avec historique règlementaire';


-- Insertion données Senelec 2026
INSERT INTO dimension_tarifs (
    type_compteur, tranche, nom_tranche,
    seuil_min_kwh, seuil_max_kwh,
    prix_kwh_actuel, prix_kwh_ancien,
    economie_kwh, taux_economie,
    decision_crse, date_application,
    description, couleur_affichage
) VALUES
-- DPP (Domestique Petite Puissance)
('DPP', 1, 'Tranche 1 Sociale', 0, 150, 82.00, 91.11, 9.11, 10.00, 
 '2025-140', '2026-01-01', 'Tarif social avec baisse 10%', '#90EE90'),

('DPP', 2, 'Tranche 2 Intermédiaire', 151, 250, 136.49, 136.49, 0.00, 0.00,
 '2025-140', '2026-01-01', 'Tarif intermédiaire', '#FFD700'),

('DPP', 3, 'Tranche 3 Normale', 251, NULL, 136.49, 161.06, 0.00, 0.00,
 '2025-140', '2026-01-01', 'Valorisée à T2 en prépaiement', '#FF6B6B'),

-- PPP (Professionnel Petite Puissance)
('PPP', 1, 'Tranche 1 Professionnelle', 0, 50, 147.43, 163.81, 16.38, 10.00,
 '2025-140', '2026-01-01', 'Tarif professionnel avec baisse 10%', '#87CEEB'),

('PPP', 2, 'Tranche 2 Professionnelle', 51, 500, 189.84, 189.84, 0.00, 0.00,
 '2025-140', '2026-01-01', 'Tarif intermédiaire pro', '#FFA07A'),

('PPP', 3, 'Tranche 3 Professionnelle', 501, NULL, 189.84, 210.93, 0.00, 0.00,
 '2025-140', '2026-01-01', 'Valorisée à T2 en prépaiement', '#CD5C5C');


-- ═══════════════════════════════════════════════════════════════
-- 3. DIMENSION ZONES (Inchangée mais avec index supplémentaires)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS dim_zones (
    zone_id SERIAL PRIMARY KEY,
    region VARCHAR(50) NOT NULL,
    commune VARCHAR(50) NOT NULL,
    population INTEGER NOT NULL,
    type_zone VARCHAR(20) NOT NULL,          -- 'urbain', 'semi_urbain', 'rural'
    densite NUMERIC(10, 2),                  -- hab/km²
    
    -- Géolocalisation (optionnel)
    latitude NUMERIC(10, 6),
    longitude NUMERIC(10, 6),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(region, commune),
    CHECK (population > 0),
    CHECK (type_zone IN ('urbain', 'semi_urbain', 'rural'))
);

-- Index
CREATE INDEX IF NOT EXISTS idx_dim_zones_region ON dim_zones(region);
CREATE INDEX IF NOT EXISTS idx_dim_zones_type ON dim_zones(type_zone);
CREATE INDEX IF NOT EXISTS idx_dim_zones_population ON dim_zones(population);

COMMENT ON TABLE dim_zones IS 'Dimension géographique Sénégal';


-- ═══════════════════════════════════════════════════════════════
-- 4. DIMENSION USERS (Enrichie)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS dim_users (
    user_id SERIAL PRIMARY KEY,
    
    -- Identité
    prenom VARCHAR(50) NOT NULL,
    nom VARCHAR(50) NOT NULL,
    genre VARCHAR(1),                         -- 'M', 'F'
    
    -- Contact
    email VARCHAR(100),
    telephone VARCHAR(20) NOT NULL,
    
    -- Compteur
    type_compteur VARCHAR(10) NOT NULL,       -- 'DPP', 'PPP'
    numero_compteur VARCHAR(20) NOT NULL UNIQUE,
    
    -- Localisation
    zone_id INTEGER NOT NULL REFERENCES dim_zones(zone_id),
    adresse TEXT,
    
    -- Profil consommation
    date_inscription DATE NOT NULL,
    conso_moyenne_jour NUMERIC(10, 2),        -- kWh/jour
    objectif_mensuel INTEGER,                 -- kWh cible/mois
    
    -- Segment client
    segment_client VARCHAR(30),               -- 'petit_conso', 'moyen_conso', 'gros_conso'
    risque_depassement_t1 VARCHAR(20),        -- 'faible', 'moyen', 'eleve'
    
    -- Statut
    actif BOOLEAN DEFAULT TRUE,
    date_derniere_recharge DATE,
    
    -- Métadonnées
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CHECK (type_compteur IN ('DPP', 'PPP')),
    CHECK (conso_moyenne_jour >= 0)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_dim_users_zone ON dim_users(zone_id);
CREATE INDEX IF NOT EXISTS idx_dim_users_type_compteur ON dim_users(type_compteur);
CREATE INDEX IF NOT EXISTS idx_dim_users_numero ON dim_users(numero_compteur);
CREATE INDEX IF NOT EXISTS idx_dim_users_actif ON dim_users(actif);
CREATE INDEX IF NOT EXISTS idx_dim_users_segment ON dim_users(segment_client);
CREATE INDEX IF NOT EXISTS idx_dim_users_telephone ON dim_users(telephone);

COMMENT ON TABLE dim_users IS 'Dimension utilisateurs avec segmentation';


-- ═══════════════════════════════════════════════════════════════
-- 5. TABLE DE FAITS : CONSOMMATION
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS fact_consumption (
    id BIGSERIAL PRIMARY KEY,
    
    -- Clés étrangères (dimensions)
    date_id INTEGER NOT NULL REFERENCES dimension_dates(date_id),
    user_id INTEGER NOT NULL REFERENCES dim_users(user_id),
    zone_id INTEGER NOT NULL REFERENCES dim_zones(zone_id),
    tarif_id INTEGER NOT NULL REFERENCES dimension_tarifs(tarif_id),
    
    -- Métriques consommation
    conso_kwh NUMERIC(10, 2) NOT NULL,
    conso_cumul_mois NUMERIC(10, 2) NOT NULL,
    
    -- Métriques financières
    cout_fcfa NUMERIC(10, 2) NOT NULL,
    cout_si_t1 NUMERIC(10, 2),               -- Coût si tout était en T1
    surcout_vs_t1 NUMERIC(10, 2),            -- Surcoût par rapport à T1
    economie_baisse_10pct NUMERIC(10, 2),    -- Économie grâce à baisse
    
    -- Informations contextuelles
    tranche INTEGER NOT NULL,                 -- 1, 2, 3 (dénormalisé pour perfs)
    type_compteur VARCHAR(10) NOT NULL,       -- 'DPP', 'PPP' (dénormalisé)
    
    -- Métadonnées temporelles (dénormalisées pour partitionnement)
    jour_semaine INTEGER,
    est_weekend BOOLEAN,
    mois INTEGER NOT NULL,
    annee INTEGER NOT NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Contraintes
    CHECK (conso_kwh >= 0),
    CHECK (conso_cumul_mois >= 0),
    CHECK (cout_fcfa >= 0),
    CHECK (tranche IN (1, 2, 3))
);

-- Index composites pour performance
CREATE INDEX IF NOT EXISTS idx_fact_consumption_date ON fact_consumption(date_id);
CREATE INDEX IF NOT EXISTS idx_fact_consumption_user ON fact_consumption(user_id);
CREATE INDEX IF NOT EXISTS idx_fact_consumption_zone ON fact_consumption(zone_id);
CREATE INDEX IF NOT EXISTS idx_fact_consumption_tarif ON fact_consumption(tarif_id);
CREATE INDEX IF NOT EXISTS idx_fact_consumption_mois_annee ON fact_consumption(mois, annee);
CREATE INDEX IF NOT EXISTS idx_fact_consumption_tranche ON fact_consumption(tranche);
CREATE INDEX IF NOT EXISTS idx_fact_consumption_type ON fact_consumption(type_compteur);

-- Index composite pour requêtes analytiques
CREATE INDEX IF NOT EXISTS idx_fact_consumption_analytics ON fact_consumption(
    user_id, mois, annee, tranche
);

-- Index pour agrégations
CREATE INDEX IF NOT EXISTS idx_fact_consumption_aggregation ON fact_consumption(
    zone_id, mois, annee, type_compteur
);

COMMENT ON TABLE fact_consumption IS 'Table de faits - Consommation quotidienne';


-- ═══════════════════════════════════════════════════════════════
-- 6. TABLE DE FAITS : RECHARGES (Optimisée)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS fact_recharges (
    recharge_id BIGSERIAL PRIMARY KEY,
    
    -- Clés étrangères (dimensions)
    date_id INTEGER NOT NULL REFERENCES dimension_dates(date_id),
    user_id INTEGER NOT NULL REFERENCES dim_users(user_id),
    zone_id INTEGER NOT NULL REFERENCES dim_zones(zone_id),
    tarif_initial_id INTEGER REFERENCES dimension_tarifs(tarif_id),
    tarif_final_id INTEGER REFERENCES dimension_tarifs(tarif_id),
    
    -- Métriques recharge
    montant_brut NUMERIC(10, 2) NOT NULL,
    redevance NUMERIC(10, 2) DEFAULT 0,
    taxe_communale NUMERIC(10, 2) NOT NULL,
    montant_net NUMERIC(10, 2) NOT NULL,
    
    -- kWh obtenus
    kwh_obtenus NUMERIC(10, 2) NOT NULL,
    kwh_t1 NUMERIC(10, 2) DEFAULT 0,         -- kWh en tranche 1
    kwh_t2 NUMERIC(10, 2) DEFAULT 0,         -- kWh en tranche 2
    kwh_t3 NUMERIC(10, 2) DEFAULT 0,         -- kWh en tranche 3
    
    -- Contexte mensuel
    cumul_mois_avant NUMERIC(10, 2),         -- Cumul avant recharge
    cumul_mois_apres NUMERIC(10, 2),         -- Cumul après recharge
    
    -- Métriques calculées
    prix_moyen_kwh NUMERIC(10, 2),           -- Montant net / kWh obtenus
    efficacite_recharge NUMERIC(10, 6),       -- kWh / FCFA brut
    economie_baisse NUMERIC(10, 2),          -- Économie T1
    
    -- Transaction
    heure TIME,
    canal_paiement VARCHAR(30),               -- 'Orange Money', 'Wave'...
    statut VARCHAR(20) DEFAULT 'success',     -- 'success', 'failed', 'pending'
    reference_transaction VARCHAR(50),
    
    -- Métadonnées temporelles (dénormalisées)
    jour_semaine INTEGER,
    est_debut_mois BOOLEAN,
    mois INTEGER NOT NULL,
    annee INTEGER NOT NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Contraintes
    CHECK (montant_brut > 0),
    CHECK (kwh_obtenus > 0),
    CHECK (montant_net >= 0),
    CHECK (statut IN ('success', 'failed', 'pending'))
);

-- Index
CREATE INDEX IF NOT EXISTS idx_fact_recharges_date ON fact_recharges(date_id);
CREATE INDEX IF NOT EXISTS idx_fact_recharges_user ON fact_recharges(user_id);
CREATE INDEX IF NOT EXISTS idx_fact_recharges_zone ON fact_recharges(zone_id);
CREATE INDEX IF NOT EXISTS idx_fact_recharges_canal ON fact_recharges(canal_paiement);
CREATE INDEX IF NOT EXISTS idx_fact_recharges_statut ON fact_recharges(statut);
CREATE INDEX IF NOT EXISTS idx_fact_recharges_mois_annee ON fact_recharges(mois, annee);

-- Index composite analytics
CREATE INDEX IF NOT EXISTS idx_fact_recharges_analytics ON fact_recharges(
    user_id, mois, annee, canal_paiement
);

COMMENT ON TABLE fact_recharges IS 'Table de faits - Recharges avec détail tranches';


-- ═══════════════════════════════════════════════════════════════
-- 7. VUES MATÉRIALISÉES (DATA MARTS)
-- ═══════════════════════════════════════════════════════════════

-- Vue 1 : Synthèse mensuelle par région
CREATE MATERIALIZED VIEW IF NOT EXISTS mart_conso_regions_mensuel AS
SELECT 
    z.region,
    z.type_zone,
    dd.mois,
    dd.annee,
    dd.nom_mois,
    
    -- Métriques consommation
    COUNT(DISTINCT fc.user_id) as nb_users_actifs,
    SUM(fc.conso_kwh) as conso_totale_kwh,
    AVG(fc.conso_kwh) as conso_moyenne_kwh,
    
    -- Métriques financières
    SUM(fc.cout_fcfa) as cout_total,
    AVG(fc.cout_fcfa) as cout_moyen,
    SUM(fc.economie_baisse_10pct) as economie_totale,
    
    -- Distribution tranches
    SUM(CASE WHEN fc.tranche = 1 THEN 1 ELSE 0 END) as nb_jours_t1,
    SUM(CASE WHEN fc.tranche = 2 THEN 1 ELSE 0 END) as nb_jours_t2,
    SUM(CASE WHEN fc.tranche = 3 THEN 1 ELSE 0 END) as nb_jours_t3,
    
    -- Pourcentages
    ROUND(100.0 * SUM(CASE WHEN fc.tranche = 1 THEN 1 ELSE 0 END) / COUNT(*), 2) as pct_t1,
    
    -- Métadonnées
    CURRENT_TIMESTAMP as updated_at

FROM fact_consumption fc
JOIN dimension_dates dd ON fc.date_id = dd.date_id
JOIN dim_zones z ON fc.zone_id = z.zone_id
GROUP BY z.region, z.type_zone, dd.mois, dd.annee, dd.nom_mois;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mart_conso_regions_region_mois_annee ON mart_conso_regions_mensuel(region, mois, annee);
CREATE INDEX IF NOT EXISTS idx_mart_conso_regions_annee_mois ON mart_conso_regions_mensuel(annee, mois);

COMMENT ON MATERIALIZED VIEW mart_conso_regions_mensuel IS 'Data Mart - Consommation mensuelle par région';


-- Vue 2 : KPIs globaux
CREATE MATERIALIZED VIEW IF NOT EXISTS mart_kpis_globaux AS
SELECT 
    dd.mois,
    dd.annee,
    dd.nom_mois,
    
    -- Users
    COUNT(DISTINCT fc.user_id) as users_actifs,
    COUNT(DISTINCT CASE WHEN fc.tranche = 1 THEN fc.user_id END) as users_en_t1,
    
    -- Consommation
    SUM(fc.conso_kwh) as conso_totale_kwh,
    AVG(fc.conso_kwh) as conso_moyenne_jour,
    MAX(fc.conso_kwh) as conso_max,
    
    -- Financier
    SUM(fc.cout_fcfa) as cout_total,
    SUM(fc.economie_baisse_10pct) as economie_totale,
    
    -- Recharges
    COUNT(fr.recharge_id) as nb_recharges,
    SUM(fr.montant_brut) as montant_recharges_total,
    AVG(fr.kwh_obtenus) as kwh_moyen_recharge,
    
    -- DPP vs PPP
    SUM(CASE WHEN fc.type_compteur = 'DPP' THEN fc.conso_kwh ELSE 0 END) as conso_dpp,
    SUM(CASE WHEN fc.type_compteur = 'PPP' THEN fc.conso_kwh ELSE 0 END) as conso_ppp,
    
    CURRENT_TIMESTAMP as updated_at

FROM fact_consumption fc
JOIN dimension_dates dd ON fc.date_id = dd.date_id
LEFT JOIN fact_recharges fr ON fc.user_id = fr.user_id 
    AND fc.date_id = fr.date_id
GROUP BY dd.mois, dd.annee, dd.nom_mois;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mart_kpis_globaux_annee_mois ON mart_kpis_globaux(annee, mois);

COMMENT ON MATERIALIZED VIEW mart_kpis_globaux IS 'Data Mart - KPIs globaux mensuels';


-- Vue 3 : Analyse tranches détaillée
CREATE MATERIALIZED VIEW IF NOT EXISTS mart_analyse_tranches AS
SELECT 
    dt.type_compteur,
    dt.tranche,
    dt.nom_tranche,
    dd.mois,
    dd.annee,
    
    -- Volumétrie
    COUNT(DISTINCT fc.user_id) as nb_users,
    COUNT(*) as nb_jours,
    
    -- Consommation
    SUM(fc.conso_kwh) as conso_totale,
    AVG(fc.conso_kwh) as conso_moyenne,
    
    -- Financier
    SUM(fc.cout_fcfa) as cout_total,
    AVG(fc.cout_fcfa) as cout_moyen,
    dt.prix_kwh_actuel as prix_unitaire,
    
    -- Économies
    SUM(fc.economie_baisse_10pct) as economie_totale,
    
    -- Surcoûts vs T1
    SUM(fc.surcout_vs_t1) as surcout_vs_t1_total,
    AVG(fc.surcout_vs_t1) as surcout_vs_t1_moyen,
    
    CURRENT_TIMESTAMP as updated_at

FROM fact_consumption fc
JOIN dimension_dates dd ON fc.date_id = dd.date_id
JOIN dimension_tarifs dt ON fc.tarif_id = dt.tarif_id
GROUP BY dt.type_compteur, dt.tranche, dt.nom_tranche, 
         dt.prix_kwh_actuel, dd.mois, dd.annee;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mart_analyse_tranches_type_tranche_annee_mois ON mart_analyse_tranches(type_compteur, tranche, annee, mois);

COMMENT ON MATERIALIZED VIEW mart_analyse_tranches IS 'Data Mart - Analyse détaillée par tranche';


-- ═══════════════════════════════════════════════════════════════
-- 8. FONCTIONS UTILITAIRES
-- ═══════════════════════════════════════════════════════════════

-- Fonction : Rafraîchir toutes les vues matérialisées
CREATE OR REPLACE FUNCTION refresh_all_marts()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mart_conso_regions_mensuel;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mart_kpis_globaux;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mart_analyse_tranches;
    
    RAISE NOTICE 'Toutes les vues matérialisées ont été rafraîchies';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION refresh_all_marts() IS 'Rafraîchit toutes les vues matérialisées';


-- Fonction : Statistiques Data Warehouse (utilise pg_stat_all_tables pour n_live_tup)
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

COMMENT ON FUNCTION get_dwh_stats() IS 'Statistiques volumétrie Data Warehouse (utilise pg_stat_all_tables)';


-- Pas de COMMIT global (exécution idempotente, erreurs isolées)

-- ═══════════════════════════════════════════════════════════════
-- FIN DU SCRIPT
-- ═══════════════════════════════════════════════════════════════

-- Afficher résumé
SELECT 'Data Warehouse créé avec succès!' as message;
SELECT * FROM get_dwh_stats();
