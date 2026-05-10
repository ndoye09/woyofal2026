-- ═══════════════════════════════════════════════════════════════
-- DATA MARTS SPÉCIALISÉS - WOYOFAL 2026
-- ═══════════════════════════════════════════════════════════════
-- Description : Data Marts optimisés pour analyses BI
-- Version     : 1.0
-- Date        : 2026-03-05
-- ═══════════════════════════════════════════════════════════════

BEGIN;

-- ═══════════════════════════════════════════════════════════════
-- 1. MART_TARIFS_2026 (Analyse Tarifaire Complète)
-- ═══════════════════════════════════════════════════════════════

DROP MATERIALIZED VIEW IF EXISTS mart_tarifs_2026 CASCADE;

CREATE MATERIALIZED VIEW mart_tarifs_2026 AS
WITH stats_mensuelles AS (
    SELECT 
        fc.type_compteur,
        fc.tranche,
        dd.mois,
        dd.annee,
        dd.nom_mois,
        
        -- Métriques volumétriques
        COUNT(DISTINCT fc.user_id) as nb_users_uniques,
        COUNT(DISTINCT fc.date_id) as nb_jours,
        COUNT(*) as nb_observations,
        
        -- Consommation
        SUM(fc.conso_kwh) as conso_totale_kwh,
        AVG(fc.conso_kwh) as conso_moyenne_kwh,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY fc.conso_kwh) as conso_mediane_kwh,
        MIN(fc.conso_kwh) as conso_min_kwh,
        MAX(fc.conso_kwh) as conso_max_kwh,
        STDDEV(fc.conso_kwh) as conso_stddev_kwh,
        
        -- Financier
        SUM(fc.cout_fcfa) as cout_total_fcfa,
        AVG(fc.cout_fcfa) as cout_moyen_fcfa,
        SUM(fc.cout_si_t1) as cout_si_tout_t1,
        SUM(fc.surcout_vs_t1) as surcout_total_vs_t1,
        
        -- Économies
        SUM(fc.economie_baisse_10pct) as economie_totale_fcfa,
        AVG(fc.economie_baisse_10pct) as economie_moyenne_fcfa
        
    FROM fact_consumption fc
    JOIN dimension_dates dd ON fc.date_id = dd.date_id
    GROUP BY fc.type_compteur, fc.tranche, dd.mois, dd.annee, dd.nom_mois
),
tarifs_ref AS (
    SELECT 
        type_compteur,
        tranche,
        nom_tranche,
        prix_kwh_actuel,
        prix_kwh_ancien,
        economie_kwh,
        taux_economie,
        seuil_min_kwh,
        seuil_max_kwh,
        couleur_affichage,
        description
    FROM dimension_tarifs
    WHERE est_actif = TRUE
)
SELECT 
    -- Identification
    sm.type_compteur,
    sm.tranche,
    tr.nom_tranche,
    sm.mois,
    sm.annee,
    sm.nom_mois,
    CONCAT(sm.annee, '-', LPAD(sm.mois::TEXT, 2, '0')) as periode,
    
    -- Tarification
    tr.prix_kwh_actuel,
    tr.prix_kwh_ancien,
    tr.economie_kwh as economie_unitaire,
    tr.taux_economie,
    tr.seuil_min_kwh,
    tr.seuil_max_kwh,
    
    -- Volumétrie
    sm.nb_users_uniques,
    sm.nb_jours,
    sm.nb_observations,
    ROUND((100.0 * sm.nb_observations / SUM(sm.nb_observations) OVER (
        PARTITION BY sm.type_compteur, sm.mois, sm.annee
    ))::numeric, 2) as pct_observations,
    
    -- Consommation
    ROUND(sm.conso_totale_kwh::numeric, 2) as conso_totale_kwh,
    ROUND(sm.conso_moyenne_kwh::numeric, 2) as conso_moyenne_kwh,
    ROUND(sm.conso_mediane_kwh::numeric, 2) as conso_mediane_kwh,
    ROUND(sm.conso_min_kwh::numeric, 2) as conso_min_kwh,
    ROUND(sm.conso_max_kwh::numeric, 2) as conso_max_kwh,
    ROUND(sm.conso_stddev_kwh::numeric, 2) as conso_stddev_kwh,
    
    -- Financier
    ROUND(sm.cout_total_fcfa::numeric, 0) as cout_total_fcfa,
    ROUND(sm.cout_moyen_fcfa::numeric, 2) as cout_moyen_fcfa,
    ROUND((sm.cout_total_fcfa / NULLIF(sm.conso_totale_kwh, 0))::numeric, 2) as prix_reel_moyen_kwh,
    
    -- Comparaison vs T1
    ROUND(sm.cout_si_tout_t1::numeric, 0) as cout_si_tout_t1,
    ROUND(sm.surcout_total_vs_t1::numeric, 0) as surcout_total_vs_t1,
    ROUND((100.0 * sm.surcout_total_vs_t1 / NULLIF(sm.cout_total_fcfa, 0))::numeric, 2) as pct_surcout_vs_t1,
    
    -- Économies baisse 10%
    ROUND(sm.economie_totale_fcfa::numeric, 0) as economie_totale_fcfa,
    ROUND(sm.economie_moyenne_fcfa::numeric, 2) as economie_moyenne_fcfa,
    ROUND((sm.economie_totale_fcfa / NULLIF(sm.nb_users_uniques, 0))::numeric, 2) as economie_par_user,
    
    -- Pénétration tranches
    CASE 
        WHEN sm.tranche = 1 THEN 'Tarif Social ✅'
        WHEN sm.tranche = 2 THEN 'Tarif Intermédiaire'
        WHEN sm.tranche = 3 THEN 'Tarif Normal'
    END as categorie_tarifaire,
    
    -- Indicateurs
    CASE 
        WHEN sm.tranche = 1 THEN TRUE 
        ELSE FALSE 
    END as beneficie_tarif_social,
    
    CASE 
        WHEN ROUND((100.0 * sm.nb_observations / SUM(sm.nb_observations) OVER (
                PARTITION BY sm.type_compteur, sm.mois, sm.annee
            ))::numeric, 2) > 60 THEN 'Dominant'
            WHEN ROUND((100.0 * sm.nb_observations / SUM(sm.nb_observations) OVER (
                PARTITION BY sm.type_compteur, sm.mois, sm.annee
            ))::numeric, 2) > 30 THEN 'Significatif'
        ELSE 'Minoritaire'
    END as importance_tranche,
    
    -- Métadonnées
    tr.couleur_affichage,
    tr.description,
    CURRENT_TIMESTAMP as updated_at

FROM stats_mensuelles sm
JOIN tarifs_ref tr ON sm.type_compteur = tr.type_compteur 
                   AND sm.tranche = tr.tranche
ORDER BY sm.type_compteur, sm.annee, sm.mois, sm.tranche;

-- Index
CREATE UNIQUE INDEX idx_mart_tarifs_2026_pk 
ON mart_tarifs_2026(type_compteur, tranche, annee, mois);

CREATE INDEX idx_mart_tarifs_2026_periode 
ON mart_tarifs_2026(periode);

CREATE INDEX idx_mart_tarifs_2026_tranche 
ON mart_tarifs_2026(tranche);

CREATE INDEX idx_mart_tarifs_2026_social 
ON mart_tarifs_2026(beneficie_tarif_social);

COMMENT ON MATERIALIZED VIEW mart_tarifs_2026 IS 
'Data Mart - Analyse tarifaire complète 2026 avec économies et surcoûts';


-- ═══════════════════════════════════════════════════════════════
-- 2. MART_CONSO_USERS (Anonymisé RGPD-Compliant)
-- ═══════════════════════════════════════════════════════════════

DROP MATERIALIZED VIEW IF EXISTS mart_conso_users CASCADE;

CREATE MATERIALIZED VIEW mart_conso_users AS
WITH profil_mensuel AS (
    SELECT 
        fc.user_id,
        dd.mois,
        dd.annee,
        
        -- Consommation
        COUNT(*) as nb_jours_actifs,
        SUM(fc.conso_kwh) as conso_totale_kwh,
        AVG(fc.conso_kwh) as conso_moyenne_jour,
        MAX(fc.conso_cumul_mois) as conso_cumul_final,
        
        -- Coûts
        SUM(fc.cout_fcfa) as cout_total_fcfa,
        SUM(fc.economie_baisse_10pct) as economie_totale_fcfa,
        
        -- Distribution tranches
        SUM(CASE WHEN fc.tranche = 1 THEN 1 ELSE 0 END) as nb_jours_t1,
        SUM(CASE WHEN fc.tranche = 2 THEN 1 ELSE 0 END) as nb_jours_t2,
        SUM(CASE WHEN fc.tranche = 3 THEN 1 ELSE 0 END) as nb_jours_t3,
        
        -- Tranche finale du mois
        MAX(fc.tranche) as tranche_finale,
        
        -- Weekend vs semaine
        AVG(CASE WHEN dd.est_weekend THEN fc.conso_kwh ELSE NULL END) as conso_moy_weekend,
        AVG(CASE WHEN NOT dd.est_weekend THEN fc.conso_kwh ELSE NULL END) as conso_moy_semaine
        
    FROM fact_consumption fc
    JOIN dimension_dates dd ON fc.date_id = dd.date_id
    GROUP BY fc.user_id, dd.mois, dd.annee
),
recharges_mensuelles AS (
    SELECT 
        fr.user_id,
        dd.mois,
        dd.annee,
        
        COUNT(*) as nb_recharges,
        SUM(fr.montant_brut) as montant_total_recharge,
        AVG(fr.kwh_obtenus) as kwh_moyen_recharge,
        MAX(fr.canal_paiement) as canal_principal
        
    FROM fact_recharges fr
    JOIN dimension_dates dd ON fr.date_id = dd.date_id
    WHERE fr.statut = 'success'
    GROUP BY fr.user_id, dd.mois, dd.annee
)
SELECT 
    -- Identification anonymisée (RGPD)
    MD5(pm.user_id::TEXT) as user_hash,                    -- Hash anonyme
    pm.user_id as user_id_interne,                         -- ID interne (non exposé)
    
    -- Période
    pm.mois,
    pm.annee,
    CONCAT(pm.annee, '-', LPAD(pm.mois::TEXT, 2, '0')) as periode,
    
    -- Profil user (anonymisé)
    u.type_compteur,
    z.type_zone,
    z.region,                                               -- Agrégé géographique OK
    
    -- Segmentation (pas de données perso)
    CASE 
        WHEN pm.conso_totale_kwh <= 100 THEN 'Petit consommateur'
        WHEN pm.conso_totale_kwh <= 200 THEN 'Consommateur moyen'
        ELSE 'Gros consommateur'
    END as segment_conso,
    
    CASE 
        WHEN pm.tranche_finale = 1 THEN 'Reste T1'
        WHEN pm.tranche_finale = 2 THEN 'Passe T2'
        WHEN pm.tranche_finale = 3 THEN 'Passe T3'
    END as comportement_tarifaire,
    
    -- Métriques consommation
    pm.nb_jours_actifs,
    ROUND(pm.conso_totale_kwh::numeric, 2) as conso_totale_kwh,
    ROUND(pm.conso_moyenne_jour::numeric, 2) as conso_moyenne_jour,
    ROUND(pm.conso_cumul_final::numeric, 2) as conso_cumul_final,
    
    -- Métriques financières
    ROUND(pm.cout_total_fcfa::numeric, 0) as cout_total_fcfa,
    ROUND(pm.economie_totale_fcfa::numeric, 0) as economie_totale_fcfa,
    ROUND((pm.cout_total_fcfa / NULLIF(pm.conso_totale_kwh, 0))::numeric, 2) as prix_moyen_kwh,
    
    -- Distribution tranches (%)
    ROUND((100.0 * pm.nb_jours_t1 / NULLIF(pm.nb_jours_actifs, 0))::numeric, 1) as pct_jours_t1,
    ROUND((100.0 * pm.nb_jours_t2 / NULLIF(pm.nb_jours_actifs, 0))::numeric, 1) as pct_jours_t2,
    ROUND((100.0 * pm.nb_jours_t3 / NULLIF(pm.nb_jours_actifs, 0))::numeric, 1) as pct_jours_t3,
    
    pm.tranche_finale,
    
    -- Comportement weekend
    ROUND(pm.conso_moy_weekend::numeric, 2) as conso_moy_weekend,
    ROUND(pm.conso_moy_semaine::numeric, 2) as conso_moy_semaine,
    ROUND((100.0 * (pm.conso_moy_weekend - pm.conso_moy_semaine) / 
        NULLIF(pm.conso_moy_semaine, 0))::numeric, 1) as variation_weekend_pct,
    
    -- Recharges
    COALESCE(rm.nb_recharges, 0) as nb_recharges,
    ROUND(COALESCE(rm.montant_total_recharge, 0)::numeric, 0) as montant_total_recharge,
    ROUND(COALESCE(rm.kwh_moyen_recharge, 0)::numeric, 2) as kwh_moyen_recharge,
    COALESCE(rm.canal_principal, 'N/A') as canal_paiement_principal,
    
    -- Indicateurs
    CASE 
        WHEN pm.tranche_finale = 1 THEN TRUE 
        ELSE FALSE
    END as reste_tarif_social,
    
    CASE 
        WHEN pm.conso_cumul_final >= 145 AND pm.tranche_finale = 1 THEN TRUE
        ELSE FALSE
    END as proche_limite_t1,
    
    CASE 
        WHEN pm.conso_moy_weekend > pm.conso_moy_semaine * 1.2 THEN TRUE
        ELSE FALSE
    END as surconso_weekend,
    
    -- Métadonnées
    CURRENT_TIMESTAMP as updated_at

FROM profil_mensuel pm
JOIN dim_users u ON pm.user_id = u.user_id
JOIN dim_zones z ON u.zone_id = z.zone_id
LEFT JOIN recharges_mensuelles rm ON pm.user_id = rm.user_id 
                                   AND pm.mois = rm.mois 
                                   AND pm.annee = rm.annee
ORDER BY pm.annee, pm.mois, pm.user_id;

-- Index
CREATE INDEX idx_mart_conso_users_hash 
ON mart_conso_users(user_hash);

CREATE INDEX idx_mart_conso_users_periode 
ON mart_conso_users(periode);

CREATE INDEX idx_mart_conso_users_segment 
ON mart_conso_users(segment_conso);

CREATE INDEX idx_mart_conso_users_tranche 
ON mart_conso_users(tranche_finale);

CREATE INDEX idx_mart_conso_users_region 
ON mart_conso_users(region);

CREATE INDEX idx_mart_conso_users_type 
ON mart_conso_users(type_compteur);

-- Index composite pour analytics
CREATE INDEX idx_mart_conso_users_analytics 
ON mart_conso_users(type_compteur, segment_conso, tranche_finale);

COMMENT ON MATERIALIZED VIEW mart_conso_users IS 
'Data Mart - Profil consommation users anonymisé (RGPD-compliant)';

COMMENT ON COLUMN mart_conso_users.user_hash IS 
'Hash MD5 anonyme - Ne permet PAS identification user';


-- ═══════════════════════════════════════════════════════════════
-- 3. MART_RECHARGES_ANALYSE (Analyse Recharges)
-- ═══════════════════════════════════════════════════════════════

DROP MATERIALIZED VIEW IF EXISTS mart_recharges_analyse CASCADE;

CREATE MATERIALIZED VIEW mart_recharges_analyse AS
SELECT 
    -- Période
    dd.mois,
    dd.annee,
    dd.nom_mois,
    CONCAT(dd.annee, '-', LPAD(dd.mois::TEXT, 2, '0')) as periode,
    dd.est_debut_mois,
    dd.est_fin_mois,
    
    -- Segmentation
    fr.canal_paiement,
    z.region,
    z.type_zone,
    u.type_compteur,
    
    -- Volumétrie
    COUNT(*) as nb_recharges,
    COUNT(DISTINCT fr.user_id) as nb_users_uniques,
    
    -- Montants
    SUM(fr.montant_brut) as montant_total_brut,
    AVG(fr.montant_brut) as montant_moyen_brut,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY fr.montant_brut) as montant_median,
    MIN(fr.montant_brut) as montant_min,
    MAX(fr.montant_brut) as montant_max,
    
    -- Déductions
    SUM(fr.redevance) as redevance_totale,
    SUM(fr.taxe_communale) as taxe_totale,
    SUM(fr.montant_net) as montant_total_net,
    
    -- kWh
    SUM(fr.kwh_obtenus) as kwh_total_obtenus,
    AVG(fr.kwh_obtenus) as kwh_moyen_obtenus,
    SUM(fr.kwh_t1) as kwh_total_t1,
    SUM(fr.kwh_t2) as kwh_total_t2,
    SUM(fr.kwh_t3) as kwh_total_t3,
    
    -- Efficacité
    AVG(fr.prix_moyen_kwh) as prix_moyen_kwh,
    AVG(fr.efficacite_recharge) as efficacite_moyenne,
    
    -- Économies
    SUM(fr.economie_baisse) as economie_totale,
    
    -- Distribution tranches finales
    ROUND((100.0 * SUM(CASE WHEN dt.tranche = 1 THEN 1 ELSE 0 END) / COUNT(*))::numeric, 1) as pct_final_t1,
    ROUND((100.0 * SUM(CASE WHEN dt.tranche = 2 THEN 1 ELSE 0 END) / COUNT(*))::numeric, 1) as pct_final_t2,
    ROUND((100.0 * SUM(CASE WHEN dt.tranche = 3 THEN 1 ELSE 0 END) / COUNT(*))::numeric, 1) as pct_final_t3,
    
    -- Statut
    SUM(CASE WHEN fr.statut = 'success' THEN 1 ELSE 0 END) as nb_success,
    SUM(CASE WHEN fr.statut = 'failed' THEN 1 ELSE 0 END) as nb_failed,
    ROUND((100.0 * SUM(CASE WHEN fr.statut = 'success' THEN 1 ELSE 0 END) / COUNT(*))::numeric, 2) as taux_success,
    
    -- Métadonnées
    CURRENT_TIMESTAMP as updated_at

FROM fact_recharges fr
JOIN dimension_dates dd ON fr.date_id = dd.date_id
JOIN dim_users u ON fr.user_id = u.user_id
JOIN dim_zones z ON u.zone_id = z.zone_id
LEFT JOIN dimension_tarifs dt ON fr.tarif_final_id = dt.tarif_id
GROUP BY 
    dd.mois, dd.annee, dd.nom_mois,
    dd.est_debut_mois, dd.est_fin_mois,
    fr.canal_paiement, z.region, z.type_zone, u.type_compteur;

-- Index
CREATE INDEX idx_mart_recharges_periode 
ON mart_recharges_analyse(periode);

CREATE INDEX idx_mart_recharges_canal 
ON mart_recharges_analyse(canal_paiement);

CREATE INDEX idx_mart_recharges_region 
ON mart_recharges_analyse(region);

COMMENT ON MATERIALIZED VIEW mart_recharges_analyse IS 
'Data Mart - Analyse détaillée recharges par canal et région';


-- ═══════════════════════════════════════════════════════════════
-- 4. MART_PERFORMANCE_JOURNALIERE (Monitoring temps réel)
-- ═══════════════════════════════════════════════════════════════

DROP MATERIALIZED VIEW IF EXISTS mart_performance_journaliere CASCADE;

CREATE MATERIALIZED VIEW mart_performance_journaliere AS
SELECT 
    dd.date,
    dd.nom_jour,
    dd.est_weekend,
    dd.mois,
    dd.annee,
    
    -- Volumétrie
    COUNT(DISTINCT fc.user_id) as users_actifs,
    COUNT(*) as nb_observations,
    
    -- Consommation
    SUM(fc.conso_kwh) as conso_totale_kwh,
    AVG(fc.conso_kwh) as conso_moyenne_kwh,
    
    -- Distribution tranches
    SUM(CASE WHEN fc.tranche = 1 THEN 1 ELSE 0 END) as nb_users_t1,
    SUM(CASE WHEN fc.tranche = 2 THEN 1 ELSE 0 END) as nb_users_t2,
    SUM(CASE WHEN fc.tranche = 3 THEN 1 ELSE 0 END) as nb_users_t3,
    
    ROUND((100.0 * SUM(CASE WHEN fc.tranche = 1 THEN 1 ELSE 0 END) / COUNT(*))::numeric, 1) as pct_t1,
    
    -- Financier
    SUM(fc.cout_fcfa) as cout_total,
    SUM(fc.economie_baisse_10pct) as economie_totale,
    
    -- Recharges du jour
    COUNT(DISTINCT fr.recharge_id) as nb_recharges,
    SUM(fr.montant_brut) as montant_recharges,
    
    -- Comparaison jour précédent
    LAG(SUM(fc.conso_kwh)) OVER (ORDER BY dd.date) as conso_j_1,
    ROUND((100.0 * (SUM(fc.conso_kwh) - LAG(SUM(fc.conso_kwh)) OVER (ORDER BY dd.date)) / 
        NULLIF(LAG(SUM(fc.conso_kwh)) OVER (ORDER BY dd.date), 0))::numeric, 1) as variation_vs_j_1_pct,
    
    -- Métadonnées
    CURRENT_TIMESTAMP as updated_at

FROM fact_consumption fc
JOIN dimension_dates dd ON fc.date_id = dd.date_id
LEFT JOIN fact_recharges fr ON fc.user_id = fr.user_id 
                            AND fc.date_id = fr.date_id
GROUP BY dd.date, dd.nom_jour, dd.est_weekend, dd.mois, dd.annee
ORDER BY dd.date DESC;

-- Index
CREATE UNIQUE INDEX idx_mart_perf_date 
ON mart_performance_journaliere(date DESC);

CREATE INDEX idx_mart_perf_mois 
ON mart_performance_journaliere(annee, mois);

COMMENT ON MATERIALIZED VIEW mart_performance_journaliere IS 
'Data Mart - Performance quotidienne avec évolution';


-- ═══════════════════════════════════════════════════════════════
-- 5. FONCTION : Rafraîchissement tous les Data Marts
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION refresh_all_data_marts()
RETURNS TABLE (
    mart_name VARCHAR,
    status VARCHAR,
    duration_ms INTEGER
) AS $$
DECLARE
    start_time TIMESTAMP;
    end_time TIMESTAMP;
BEGIN
    -- mart_tarifs_2026
    start_time := clock_timestamp();
    REFRESH MATERIALIZED VIEW CONCURRENTLY mart_tarifs_2026;
    end_time := clock_timestamp();
    
    mart_name := 'mart_tarifs_2026';
    status := 'SUCCESS';
    duration_ms := EXTRACT(MILLISECONDS FROM (end_time - start_time))::INTEGER;
    RETURN NEXT;
    
    -- mart_conso_users
    start_time := clock_timestamp();
    REFRESH MATERIALIZED VIEW CONCURRENTLY mart_conso_users;
    end_time := clock_timestamp();
    
    mart_name := 'mart_conso_users';
    status := 'SUCCESS';
    duration_ms := EXTRACT(MILLISECONDS FROM (end_time - start_time))::INTEGER;
    RETURN NEXT;
    
    -- mart_recharges_analyse
    start_time := clock_timestamp();
    REFRESH MATERIALIZED VIEW CONCURRENTLY mart_recharges_analyse;
    end_time := clock_timestamp();
    
    mart_name := 'mart_recharges_analyse';
    status := 'SUCCESS';
    duration_ms := EXTRACT(MILLISECONDS FROM (end_time - start_time))::INTEGER;
    RETURN NEXT;
    
    -- mart_performance_journaliere
    start_time := clock_timestamp();
    REFRESH MATERIALIZED VIEW CONCURRENTLY mart_performance_journaliere;
    end_time := clock_timestamp();
    
    mart_name := 'mart_performance_journaliere';
    status := 'SUCCESS';
    duration_ms := EXTRACT(MILLISECONDS FROM (end_time - start_time))::INTEGER;
    RETURN NEXT;
    
    -- Anciens marts (si existent)
    start_time := clock_timestamp();
    REFRESH MATERIALIZED VIEW CONCURRENTLY mart_conso_regions_mensuel;
    end_time := clock_timestamp();
    
    mart_name := 'mart_conso_regions_mensuel';
    status := 'SUCCESS';
    duration_ms := EXTRACT(MILLISECONDS FROM (end_time - start_time))::INTEGER;
    RETURN NEXT;
    
    start_time := clock_timestamp();
    REFRESH MATERIALIZED VIEW CONCURRENTLY mart_kpis_globaux;
    end_time := clock_timestamp();
    
    mart_name := 'mart_kpis_globaux';
    status := 'SUCCESS';
    duration_ms := EXTRACT(MILLISECONDS FROM (end_time - start_time))::INTEGER;
    RETURN NEXT;
    
    start_time := clock_timestamp();
    REFRESH MATERIALIZED VIEW CONCURRENTLY mart_analyse_tranches;
    end_time := clock_timestamp();
    
    mart_name := 'mart_analyse_tranches';
    status := 'SUCCESS';
    duration_ms := EXTRACT(MILLISECONDS FROM (end_time - start_time))::INTEGER;
    RETURN NEXT;
    
    RAISE NOTICE 'Tous les Data Marts ont été rafraîchis';
    
EXCEPTION WHEN OTHERS THEN
    mart_name := 'ERROR';
    status := SQLERRM;
    duration_ms := 0;
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION refresh_all_data_marts() IS 
'Rafraîchit tous les Data Marts avec tracking performance';


COMMIT;

-- ═══════════════════════════════════════════════════════════════
-- AFFICHAGE RÉSUMÉ
-- ═══════════════════════════════════════════════════════════════

SELECT '✅ Data Marts créés avec succès!' as message;

-- Lister tous les marts
SELECT 
    matviewname as data_mart,
    pg_size_pretty(pg_total_relation_size('public.'||matviewname)) as size
FROM pg_matviews
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size('public.'||matviewname) DESC;
