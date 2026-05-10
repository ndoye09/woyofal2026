# 🗄️ Data Warehouse - Documentation Technique

## Architecture

### Schéma Étoile (Star Schema)

```
        dimension_dates
              ↓
        dimension_tarifs
              ↓
fact_consumption ← dim_zones
              ↓
         dim_users

fact_recharges
```

## Tables Dimensions

### 1. dimension_dates (Enrichie)
**Lignes :** ~30-365 selon période  
**Clé primaire :** date_id  
**Colonnes principales :**
- Temporelles : jour, mois, trimestre, semestre, jour_semaine
- Noms : nom_jour, nom_mois (français)
- Indicateurs : est_weekend, est_debut_mois, est_ferie
- Saison : chaude, fraiche, pluvieuse (Sénégal)

**Index :** 5 index pour performance

### 2. dimension_tarifs (Nouvelle)
**Lignes :** 6 (3 DPP + 3 PPP)  
**Clé primaire :** tarif_id  
**Colonnes principales :**
- Identification : type_compteur, tranche, nom_tranche
- Seuils : seuil_min_kwh, seuil_max_kwh
- Tarification : prix_kwh_actuel, prix_kwh_ancien
- Économies : economie_kwh, taux_economie
- Règlementation : decision_crse, date_application

**Avantages :**
- Historique tarifs
- Traçabilité règlementaire
- Calculs économies automatiques

### 3. dim_zones
**Lignes :** 23  
**Enrichissement :** latitude, longitude

### 4. dim_users
**Lignes :** 10,000  
**Enrichissement :** segment_client, risque_depassement_t1

## Tables de Faits

### 1. fact_consumption
**Lignes :** ~300,000  
**Grain :** 1 ligne = 1 user × 1 jour  
**Métriques :**
- Consommation : conso_kwh, conso_cumul_mois
- Financières : cout_fcfa, cout_si_t1, surcout_vs_t1, economie
- Contexte : tranche, type_compteur (dénormalisé)

**Index :** 8 index dont 2 composites

### 2. fact_recharges
**Lignes :** ~20,000  
**Grain :** 1 ligne = 1 recharge  
**Métriques :**
- Montants : montant_brut, montant_net, redevance, taxe
- kWh : kwh_obtenus, kwh_t1, kwh_t2, kwh_t3
- Efficacité : prix_moyen_kwh, efficacite_recharge
- Transaction : canal_paiement, statut

**Index :** 7 index

## Vues Matérialisées (Data Marts)

### 1. mart_conso_regions_mensuel
**Agrégation :** Consommation par région × mois  
**Refresh :** CONCURRENTLY (sans lock)  
**Usage :** Dashboards régionaux

### 2. mart_kpis_globaux
**Agrégation :** KPIs mensuels globaux  
**Métriques :** users actifs, conso totale, économies, recharges  
**Usage :** Executive dashboard

### 3. mart_analyse_tranches
**Agrégation :** Analyse par tranche × mois  
**Métriques :** nb users, conso, coûts, surcoûts vs T1  
**Usage :** Analyse tarifaire

## Indexation

### Stratégie
- **Clés étrangères :** Toutes indexées
- **Colonnes fréquentes :** mois, annee, type_compteur, tranche
- **Index composites :** Pour requêtes analytiques
- **Index partiels :** Données récentes (3 derniers mois)

### Performance
- Requêtes simples : < 100ms
- Jointures complexes : < 500ms
- Vues matérialisées : < 10ms

## Fonctions Utilitaires

### refresh_all_marts()
Rafraîchit toutes les vues matérialisées.

```sql
SELECT refresh_all_marts();
```

### get_dwh_stats()
Statistiques volumétrie et taille.

```sql
SELECT * FROM get_dwh_stats();
```

## Maintenance

### Rafraîchir vues matérialisées
```sql
REFRESH MATERIALIZED VIEW CONCURRENTLY mart_kpis_globaux;
```

### Analyser tables (après chargement)
```sql
ANALYZE fact_consumption;
ANALYZE fact_recharges;
```

### Vacuum (nettoyage)
```sql
VACUUM ANALYZE fact_consumption;
```

## Requêtes Types

### Top 10 régions par consommation
```sql
SELECT 
    region,
    SUM(conso_totale_kwh) as total
FROM mart_conso_regions_mensuel
WHERE annee = 2026 AND mois = 1
GROUP BY region
ORDER BY total DESC
LIMIT 10;
```

### Évolution économies mensuelles
```sql
SELECT 
    mois,
    annee,
    economie_totale
FROM mart_kpis_globaux
ORDER BY annee, mois;
```

### Distribution tranches par type compteur
```sql
SELECT 
    type_compteur,
    tranche,
    nb_users,
    conso_totale,
    economie_totale
FROM mart_analyse_tranches
WHERE annee = 2026 AND mois = 1
ORDER BY type_compteur, tranche;
```
