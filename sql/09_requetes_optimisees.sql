-- ═══════════════════════════════════════════════════════════════
-- REQUÊTES OPTIMISÉES - EXEMPLES - WOYOFAL DWH
-- Contient versions optimisées de requêtes lourdes identifiées

-- 1) Consommation mensuelle par utilisateur (optimisée)
-- Objectif: réduire jointures, utiliser index, filtrer partition/date
SELECT
    fc.user_id,
    DATE_TRUNC('month', d.date) AS month,
    SUM(fc.kwh) AS total_kwh,
    COUNT(*) AS event_count,
    AVG(fc.kwh) AS avg_kwh
FROM fact_consumption fc
JOIN dim_date d ON fc.date_id = d.date_id
WHERE d.date >= (CURRENT_DATE - INTERVAL '12 months')
GROUP BY fc.user_id, DATE_TRUNC('month', d.date)
ORDER BY fc.user_id, month;


-- 2) Top 10 zones par consommation mensuelle (optimisée)
SELECT
    z.zone_id,
    z.zone_nom,
    SUM(fc.kwh) AS total_kwh
FROM fact_consumption fc
JOIN dim_zones z ON fc.zone_id = z.zone_id
WHERE fc.date_id >= (SELECT MIN(date_id) FROM dim_date WHERE date >= (CURRENT_DATE - INTERVAL '3 months'))
GROUP BY z.zone_id, z.zone_nom
ORDER BY total_kwh DESC
LIMIT 10;


-- 3) Recharges réussies par canal et par jour (optimisée)
SELECT
    r.canal_paiement,
    d.date::date AS day,
    SUM(r.montant) AS total_montant,
    COUNT(*) AS nb_recharges
FROM fact_recharges r
JOIN dim_date d ON r.date_id = d.date_id
WHERE r.statut = 'success'
  AND d.date >= (CURRENT_DATE - INTERVAL '90 days')
GROUP BY r.canal_paiement, d.date::date
ORDER BY day DESC, total_montant DESC;


-- 4) Fenêtre: évolution moyenne consommation 7 jours (optimisée)
SELECT
    user_id,
    date::date,
    SUM(kwh) OVER (PARTITION BY user_id ORDER BY date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) / 7.0 AS ma7_kwh
FROM (
    SELECT fc.user_id, d.date, fc.kwh
    FROM fact_consumption fc
    JOIN dim_date d ON fc.date_id = d.date_id
    WHERE d.date >= (CURRENT_DATE - INTERVAL '180 days')
) t
ORDER BY user_id, date;


-- 5) Requête analytique avec agrégation partielle pour limiter mémoire
WITH partial AS (
    SELECT user_id, SUM(kwh) AS s_kwh
    FROM fact_consumption
    WHERE date_id >= (SELECT MIN(date_id) FROM dim_date WHERE date >= (CURRENT_DATE - INTERVAL '12 months'))
    GROUP BY user_id
)
SELECT p.user_id, p.s_kwh
FROM partial p
ORDER BY p.s_kwh DESC
LIMIT 100;

