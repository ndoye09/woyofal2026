-- ═══════════════════════════════════════════════════════════════
-- REQUÊTES BI OPTIMISÉES - WOYOFAL 2026
-- ═══════════════════════════════════════════════════════════════
-- Collection requêtes pour dashboards et rapports
-- ═══════════════════════════════════════════════════════════════

-- SECTION 1 : ANALYSE TARIFAIRE
-- Q1.1 : Vue d'ensemble tarifs 2026
SELECT 
    type_compteur,
    nom_tranche,
    prix_kwh_actuel,
    economie_unitaire,
    nb_users_uniques,
    conso_totale_kwh,
    economie_totale_fcfa,
    pct_observations,
    importance_tranche
FROM mart_tarifs_2026
WHERE annee = 2026 AND mois = 1
ORDER BY type_compteur, tranche;

-- SECTION 2 : ANALYSE USERS (Anonymisée)
-- Q2.1 : Segmentation users par consommation
SELECT 
    segment_conso,
    type_compteur,
    COUNT(*) as nb_users,
    ROUND(AVG(conso_totale_kwh), 2) as conso_moyenne,
    ROUND(AVG(cout_total_fcfa), 0) as cout_moyen,
    SUM(CASE WHEN reste_tarif_social THEN 1 ELSE 0 END) as nb_reste_t1,
    ROUND(100.0 * SUM(CASE WHEN reste_tarif_social THEN 1 ELSE 0 END) / COUNT(*), 1) as pct_reste_t1
FROM mart_conso_users
WHERE periode = '2026-01'
GROUP BY segment_conso, type_compteur
ORDER BY segment_conso, type_compteur;

-- SECTION 3 : ANALYSE RECHARGES
-- Q3.1 : Performance par canal paiement
SELECT 
    canal_paiement,
    COUNT(DISTINCT periode) as nb_mois,
    SUM(nb_recharges) as total_recharges,
    SUM(nb_users_uniques) as total_users_uniques,
    ROUND(AVG(montant_moyen_brut), 0) as montant_moyen,
    ROUND(SUM(montant_total_brut), 0) as montant_total,
    ROUND(AVG(taux_success), 2) as taux_success_moyen,
    ROUND(AVG(efficacite_moyenne), 6) as efficacite_moyenne
FROM mart_recharges_analyse
WHERE annee = 2026
GROUP BY canal_paiement
ORDER BY total_recharges DESC;

-- SECTION 4 : MONITORING PERFORMANCE
-- Q4.1 : Performance derniers 7 jours
SELECT 
    date,
    nom_jour,
    est_weekend,
    users_actifs,
    ROUND(conso_totale_kwh, 0) as conso_totale,
    ROUND(conso_moyenne_kwh, 2) as conso_moyenne,
    pct_t1,
    nb_recharges,
    ROUND(economie_totale, 0) as economie_totale,
    variation_vs_j_1_pct
FROM mart_performance_journaliere
ORDER BY date DESC
LIMIT 7;

-- SECTION 5 : VUES DASHBOARD
-- Q6.1 : vw_dashboard_kpis
CREATE OR REPLACE VIEW vw_dashboard_kpis AS
SELECT 
    k.periode,
    k.nom_mois,
    k.users_actifs,
    k.users_en_t1,
    ROUND(100.0 * k.users_en_t1 / NULLIF(k.users_actifs, 0), 1) as pct_users_t1,
    ROUND(k.conso_totale_kwh, 0) as conso_totale_kwh,
    ROUND(k.conso_moyenne_jour, 2) as conso_moyenne_jour,
    ROUND(k.cout_total, 0) as cout_total,
    ROUND(k.economie_totale, 0) as economie_totale,
    k.nb_recharges,
    ROUND(k.montant_recharges_total, 0) as montant_recharges_total,
    ROUND(k.kwh_moyen_recharge, 2) as kwh_moyen_recharge,
    ROUND(k.conso_dpp, 0) as conso_dpp,
    ROUND(k.conso_ppp, 0) as conso_ppp
FROM mart_kpis_globaux k
ORDER BY k.annee, k.mois;

-- Q6.2 : vw_dashboard_tranches
CREATE OR REPLACE VIEW vw_dashboard_tranches AS
SELECT 
    periode,
    nom_mois,
    type_compteur,
    tranche,
    nom_tranche,
    nb_users,
    conso_totale,
    cout_total,
    economie_totale,
    prix_unitaire,
    couleur_affichage
FROM mart_analyse_tranches
ORDER BY annee, mois, type_compteur, tranche;
