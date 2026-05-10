-- ═══════════════════════════════════════════════════════════════
-- TESTS PERSONNALISÉS DBT - WOYOFAL
-- ═══════════════════════════════════════════════════════════════

-- Test 1 : Cumul croissant par user/mois
{% macro test_cumul_croissant(model, column_name, user_id_column, date_column) %}

WITH cumuls_ordonnes AS (
    SELECT 
        {{ user_id_column }},
        {{ date_column }},
        {{ column_name }},
        LAG({{ column_name }}) OVER (
            PARTITION BY {{ user_id_column }}, 
                         EXTRACT(MONTH FROM {{ date_column }}),
                         EXTRACT(YEAR FROM {{ date_column }})
            ORDER BY {{ date_column }}
        ) as cumul_precedent
    FROM {{ model }}
)
SELECT 
    {{ user_id_column }},
    {{ date_column }},
    {{ column_name }},
    cumul_precedent
FROM cumuls_ordonnes
WHERE cumul_precedent IS NOT NULL
  AND {{ column_name }} < cumul_precedent

{% endmacro %}


-- Test 2 : Cohérence prix réel vs prix théorique
{% macro test_prix_coherent(model, cout_column, conso_column, prix_attendu, tolerance_pct=5) %}

SELECT 
    *,
    {{ cout_column }} / NULLIF({{ conso_column }}, 0) as prix_reel,
    {{ prix_attendu }} as prix_attendu,
    ABS(
        100.0 * (
            ({{ cout_column }} / NULLIF({{ conso_column }}, 0)) - {{ prix_attendu }}
        ) / NULLIF({{ prix_attendu }}, 0)
    ) as ecart_pct
FROM {{ model }}
WHERE {{ conso_column }} > 0
  AND ABS(
        100.0 * (
            ({{ cout_column }} / NULLIF({{ conso_column }}, 0)) - {{ prix_attendu }}
        ) / NULLIF({{ prix_attendu }}, 0)
      ) > {{ tolerance_pct }}

{% endmacro %}


-- Test 3 : Pas de trous dans les dates par user
{% macro test_continuite_dates(model, user_id_column, date_column) %}

WITH dates_par_user AS (
    SELECT 
        {{ user_id_column }},
        {{ date_column }}::DATE as date_actuelle,
        LAG({{ date_column }}::DATE) OVER (
            PARTITION BY {{ user_id_column }}
            ORDER BY {{ date_column }}
        ) as date_precedente
    FROM {{ model }}
),
trous_detectes AS (
    SELECT 
        {{ user_id_column }},
        date_precedente,
        date_actuelle,
        date_actuelle - date_precedente as jours_ecart
    FROM dates_par_user
    WHERE date_precedente IS NOT NULL
      AND (date_actuelle - date_precedente) > 1
)
SELECT * FROM trous_detectes

{% endmacro %}


-- Test 4 : Tranche cohérente avec cumul
{% macro test_tranche_coherente(model, cumul_column, tranche_column) %}

SELECT 
    *,
    CASE 
        WHEN {{ cumul_column }} <= 150 THEN 1
        WHEN {{ cumul_column }} <= 250 THEN 2
        ELSE 3
    END as tranche_attendue
FROM {{ model }}
WHERE CASE 
        WHEN {{ cumul_column }} <= 150 THEN 1
        WHEN {{ cumul_column }} <= 250 THEN 2
        ELSE 3
      END != {{ tranche_column }}

{% endmacro %}


-- Test 5 : Montant net <= montant brut
{% macro test_montant_net_valide(model, montant_brut_column, montant_net_column) %}

SELECT 
    *,
    {{ montant_brut_column }} as montant_brut,
    {{ montant_net_column }} as montant_net
FROM {{ model }}
WHERE {{ montant_net_column }} > {{ montant_brut_column }}

{% endmacro %}


-- Test 6 : Économies cohérentes
{% macro test_economie_coherente(model, economie_column, conso_column, economie_unitaire) %}

SELECT 
    *,
    {{ economie_column }} as economie_calculee,
    {{ conso_column }} * {{ economie_unitaire }} as economie_attendue,
    ABS({{ economie_column }} - ({{ conso_column }} * {{ economie_unitaire }})) as ecart
FROM {{ model }}
WHERE ABS({{ economie_column }} - ({{ conso_column }} * {{ economie_unitaire }})) > 0.01

{% endmacro %}


-- Test 7 : Pas de doublons sur clé composite
{% macro test_unique_combination(model, combination_of_columns) %}

WITH validation AS (
    SELECT 
        {{ combination_of_columns | join(', ') }},
        COUNT(*) as nb_occurrences
    FROM {{ model }}
    GROUP BY {{ combination_of_columns | join(', ') }}
    HAVING COUNT(*) > 1
)
SELECT * FROM validation

{% endmacro %}


-- Test 8 : Dates cohérentes (pas de dates futures)
{% macro test_no_future_dates(model, date_column) %}

SELECT 
    *,
    {{ date_column }} as date_value,
    CURRENT_DATE as date_today
FROM {{ model }}
WHERE {{ date_column }}::DATE > CURRENT_DATE

{% endmacro %}
