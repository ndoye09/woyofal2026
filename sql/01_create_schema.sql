-- ============================================
-- WOYOFAL DATA WAREHOUSE - SCHEMA CREATION
-- Grille tarifaire Senelec 2026
-- ============================================

-- Nettoyage si réexécution
DROP TABLE IF EXISTS fact_recharges CASCADE;
DROP TABLE IF EXISTS fact_consumption CASCADE;
DROP TABLE IF EXISTS dim_tranches CASCADE;
DROP TABLE IF EXISTS dim_users CASCADE;
DROP TABLE IF EXISTS dim_zones CASCADE;
DROP TABLE IF EXISTS dim_date CASCADE;

-- ============================================
-- DIMENSION : DATE
-- ============================================
CREATE TABLE dim_date (
    date_id SERIAL PRIMARY KEY,
    date DATE UNIQUE NOT NULL,
    jour INTEGER NOT NULL,
    mois INTEGER NOT NULL,
    annee INTEGER NOT NULL,
    jour_semaine VARCHAR(10) NOT NULL,
    nom_mois VARCHAR(20),
    trimestre INTEGER,
    est_debut_mois BOOLEAN DEFAULT FALSE,
    est_fin_mois BOOLEAN DEFAULT FALSE,
    est_weekend BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_dim_date_date ON dim_date(date);
CREATE INDEX idx_dim_date_mois_annee ON dim_date(mois, annee);

COMMENT ON TABLE dim_date IS 'Dimension temporelle - calendrier';

-- ============================================
-- DIMENSION : ZONES GÉOGRAPHIQUES
-- ============================================
CREATE TABLE dim_zones (
    zone_id INTEGER PRIMARY KEY,
    region VARCHAR(50) NOT NULL,
    commune VARCHAR(100) NOT NULL,
    population INTEGER,
    type_zone VARCHAR(20) CHECK (type_zone IN ('urbain', 'semi_urbain', 'rural')),
    densite VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_dim_zones_region ON dim_zones(region);

COMMENT ON TABLE dim_zones IS 'Dimension géographique - régions Sénégal';

-- ============================================
-- DIMENSION : UTILISATEURS
-- ============================================
CREATE TABLE dim_users (
    user_id INTEGER PRIMARY KEY,
    prenom VARCHAR(50),
    nom VARCHAR(50),
    genre CHAR(1) CHECK (genre IN ('M', 'F')),
    email VARCHAR(100),
    telephone VARCHAR(20),
    type_compteur VARCHAR(3) CHECK (type_compteur IN ('DPP', 'PPP')),
    numero_compteur VARCHAR(20) UNIQUE NOT NULL,
    zone_id INTEGER REFERENCES dim_zones(zone_id),
    date_inscription DATE,
    conso_moyenne_jour DECIMAL(10,2),
    objectif_mensuel INTEGER,
    actif BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_dim_users_zone ON dim_users(zone_id);
CREATE INDEX idx_dim_users_type ON dim_users(type_compteur);
CREATE INDEX idx_dim_users_numero ON dim_users(numero_compteur);

COMMENT ON TABLE dim_users IS 'Dimension utilisateurs Woyofal';

-- ============================================
-- DIMENSION : TRANCHES TARIFAIRES
-- ============================================
CREATE TABLE dim_tranches (
    tranche_id INTEGER PRIMARY KEY,
    type_compteur VARCHAR(3) NOT NULL,
    nom VARCHAR(50) NOT NULL,
    prix_kwh DECIMAL(10,2) NOT NULL,
    seuil_min INTEGER NOT NULL,
    seuil_max INTEGER,
    description TEXT,
    annee_application INTEGER DEFAULT 2026,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertion des tranches 2026 (DPP)
INSERT INTO dim_tranches (tranche_id, type_compteur, nom, prix_kwh, seuil_min, seuil_max, description) VALUES
(1, 'DPP', 'Tranche 1 (Sociale)', 82.00, 0, 150, 'Tarif social avec baisse 10% - Grille 2026'),
(2, 'DPP', 'Tranche 2', 136.49, 151, 250, 'Tarif intermédiaire - Grille 2026'),
(3, 'DPP', 'Tranche 3', 136.49, 251, NULL, 'Valorisée à T2 en prépaiement - Grille 2026'),
(4, 'PPP', 'Tranche 1', 147.43, 0, 50, 'Professionnel petite conso - Grille 2026'),
(5, 'PPP', 'Tranche 2', 189.84, 51, 500, 'Professionnel moyenne conso - Grille 2026'),
(6, 'PPP', 'Tranche 3', 189.84, 501, NULL, 'Valorisée à T2 en prépaiement - Grille 2026');

CREATE INDEX idx_dim_tranches_type ON dim_tranches(type_compteur);

COMMENT ON TABLE dim_tranches IS 'Tranches tarifaires officielles Senelec 2026';

-- ============================================
-- FAIT : CONSOMMATION QUOTIDIENNE
-- ============================================
CREATE TABLE fact_consumption (
    id SERIAL PRIMARY KEY,
    date_id INTEGER REFERENCES dim_date(date_id),
    user_id INTEGER REFERENCES dim_users(user_id),
    zone_id INTEGER REFERENCES dim_zones(zone_id),
    tranche_id INTEGER,
    
    -- Métriques
    conso_kwh DECIMAL(10,2) NOT NULL,
    conso_cumul_mois DECIMAL(10,2) NOT NULL,
    cout_fcfa DECIMAL(10,2) NOT NULL,
    economie_baisse_10pct DECIMAL(10,2) DEFAULT 0,
    
    -- Métadonnées
    jour_semaine VARCHAR(10),
    mois INTEGER,
    annee INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT chk_conso_positive CHECK (conso_kwh >= 0),
    CONSTRAINT chk_cumul_croissant CHECK (conso_cumul_mois >= 0)
);

CREATE INDEX idx_fact_conso_date ON fact_consumption(date_id);
CREATE INDEX idx_fact_conso_user ON fact_consumption(user_id);
CREATE INDEX idx_fact_conso_zone ON fact_consumption(zone_id);
CREATE INDEX idx_fact_conso_tranche ON fact_consumption(tranche_id);
CREATE INDEX idx_fact_conso_mois_annee ON fact_consumption(mois, annee);

COMMENT ON TABLE fact_consumption IS 'Consommation quotidienne par utilisateur';

-- ============================================
-- FAIT : RECHARGES
-- ============================================
CREATE TABLE fact_recharges (
    recharge_id INTEGER PRIMARY KEY,
    date_id INTEGER REFERENCES dim_date(date_id),
    user_id INTEGER REFERENCES dim_users(user_id),
    zone_id INTEGER REFERENCES dim_zones(zone_id),
    tranche_finale_id INTEGER,
    
    -- Métriques financières
    montant_brut DECIMAL(10,2) NOT NULL,
    redevance DECIMAL(10,2) DEFAULT 0,
    taxe_communale DECIMAL(10,2) DEFAULT 0,
    montant_net DECIMAL(10,2) NOT NULL,
    
    -- Métriques électriques
    kwh_obtenus DECIMAL(10,2) NOT NULL,
    cumul_mois_avant DECIMAL(10,2),
    economie_baisse DECIMAL(10,2) DEFAULT 0,
    
    -- Métadonnées
    heure TIME,
    canal_paiement VARCHAR(50),
    statut VARCHAR(20) DEFAULT 'succes',
    mois INTEGER,
    annee INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT chk_montant_positive CHECK (montant_brut > 0),
    CONSTRAINT chk_kwh_positive CHECK (kwh_obtenus > 0)
);

CREATE INDEX idx_fact_rech_date ON fact_recharges(date_id);
CREATE INDEX idx_fact_rech_user ON fact_recharges(user_id);
CREATE INDEX idx_fact_rech_zone ON fact_recharges(zone_id);
CREATE INDEX idx_fact_rech_canal ON fact_recharges(canal_paiement);
CREATE INDEX idx_fact_rech_mois_annee ON fact_recharges(mois, annee);

COMMENT ON TABLE fact_recharges IS 'Transactions de recharges Woyofal';

-- ============================================
-- CONFIRMATION
-- ============================================
SELECT 'Schema créé avec succès !' AS message;
SELECT 'Tables créées : ' || COUNT(*) AS tables_count 
FROM information_schema.tables 
WHERE table_schema = 'public';
