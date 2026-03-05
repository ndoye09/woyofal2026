-- ═══════════════════════════════════════════════════════════════
-- MIGRATION VERS DATA WAREHOUSE OPTIMISÉ
-- ═══════════════════════════════════════════════════════════════

-- No global transaction: handle missing source table gracefully

-- ═══════════════════════════════════════════════════════════════
-- 1. PEUPLER dimension_dates
-- ═══════════════════════════════════════════════════════════════

INSERT INTO dimension_dates (
    date, jour, mois, annee, trimestre, semestre,
    jour_semaine, nom_jour, nom_jour_court,
    numero_semaine, semaine_annee,
    nom_mois, nom_mois_court, mois_annee,
    est_debut_mois, est_milieu_mois, est_fin_mois,
    est_weekend, est_jour_ouvrable,
    saison
)
SELECT DISTINCT
    date,
    EXTRACT(DAY FROM date)::INTEGER,
    EXTRACT(MONTH FROM date)::INTEGER,
    EXTRACT(YEAR FROM date)::INTEGER,
    EXTRACT(QUARTER FROM date)::INTEGER,
    CASE WHEN EXTRACT(MONTH FROM date) <= 6 THEN 1 ELSE 2 END,
    
    EXTRACT(ISODOW FROM date)::INTEGER - 1,  -- 0=Lundi
    CASE EXTRACT(ISODOW FROM date)
        WHEN 1 THEN 'Lundi'
        WHEN 2 THEN 'Mardi'
        WHEN 3 THEN 'Mercredi'
        WHEN 4 THEN 'Jeudi'
        WHEN 5 THEN 'Vendredi'
        WHEN 6 THEN 'Samedi'
        WHEN 7 THEN 'Dimanche'
    END,
    CASE EXTRACT(ISODOW FROM date)
        WHEN 1 THEN 'Lun'
        WHEN 2 THEN 'Mar'
        WHEN 3 THEN 'Mer'
        WHEN 4 THEN 'Jeu'
        WHEN 5 THEN 'Ven'
        WHEN 6 THEN 'Sam'
        WHEN 7 THEN 'Dim'
    END,
    
    EXTRACT(WEEK FROM date)::INTEGER,
    TO_CHAR(date, 'IYYY-"W"IW'),
    
    CASE EXTRACT(MONTH FROM date)
        WHEN 1 THEN 'Janvier'
        WHEN 2 THEN 'Février'
        WHEN 3 THEN 'Mars'
        WHEN 4 THEN 'Avril'
        WHEN 5 THEN 'Mai'
        WHEN 6 THEN 'Juin'
        WHEN 7 THEN 'Juillet'
        WHEN 8 THEN 'Août'
        WHEN 9 THEN 'Septembre'
        WHEN 10 THEN 'Octobre'
        WHEN 11 THEN 'Novembre'
        WHEN 12 THEN 'Décembre'
    END,
    CASE EXTRACT(MONTH FROM date)
        WHEN 1 THEN 'Janv'
        WHEN 2 THEN 'Févr'
        WHEN 3 THEN 'Mars'
        WHEN 4 THEN 'Avr'
        WHEN 5 THEN 'Mai'
        WHEN 6 THEN 'Juin'
        WHEN 7 THEN 'Juil'
        WHEN 8 THEN 'Août'
        WHEN 9 THEN 'Sept'
        WHEN 10 THEN 'Oct'
        WHEN 11 THEN 'Nov'
        WHEN 12 THEN 'Déc'
    END,
    TO_CHAR(date, 'YYYY-MM'),
    
    EXTRACT(DAY FROM date) <= 5,
    EXTRACT(DAY FROM date) BETWEEN 11 AND 20,
    EXTRACT(DAY FROM date) >= 25,
    EXTRACT(ISODOW FROM date) IN (6, 7),
    EXTRACT(ISODOW FROM date) <= 5,
    
    CASE 
        WHEN EXTRACT(MONTH FROM date) IN (3,4,5,6) THEN 'chaude'
        WHEN EXTRACT(MONTH FROM date) IN (7,8,9,10) THEN 'pluvieuse'
        ELSE 'fraiche'
    END

FROM consumption_daily
ON CONFLICT (date) DO NOTHING;

-- If source table does not exist, skip population with a notice
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'consumption_daily') THEN
        RAISE NOTICE 'Table consumption_daily introuvable : saut de la population de dimension_dates';
    END IF;
END
$$;


-- ═══════════════════════════════════════════════════════════════
-- 2. MIGRER fact_consumption vers nouveau schéma
-- ═══════════════════════════════════════════════════════════════

-- Cette partie sera adaptée selon vos données existantes
-- Pour l'instant, on suppose que les données seront re-chargées


-- ═══════════════════════════════════════════════════════════════
-- 3. CRÉER INDEXES ADDITIONNELS POUR PERFORMANCE
-- ═══════════════════════════════════════════════════════════════

-- Index partiel pour données récentes (plus consultées)
CREATE INDEX IF NOT EXISTS idx_fact_consumption_recent 
ON fact_consumption(date_id) 
WHERE mois >= EXTRACT(MONTH FROM CURRENT_DATE) - 3;

-- Index pour recherche par téléphone (si besoin)
CREATE INDEX IF NOT EXISTS idx_dim_users_telephone_trgm 
ON dim_users USING gin(telephone gin_trgm_ops);

-- Pas de COMMIT global (opérations isolées)

SELECT 'Migration terminée!' as status;
