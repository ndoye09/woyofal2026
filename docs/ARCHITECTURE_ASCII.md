# 🏗️ Architecture Woyofal Data Platform

## Vue d'Ensemble Simplifiée

```
┌──────────────────────────────────────────────────────────────┐
│                  WOYOFAL DATA PLATFORM                        │
│              DatAnalystFlow360 Architecture                   │
└──────────────────────────────────────────────────────────────┘

                    ┌──────────────┐
                    │  CSV Files   │
                    │  330k lignes │
                    └──────┬───────┘
                           │
                           ▼
                    ┌──────────────┐
                    │   Airflow    │
                    │  ETL Pipeline│
                    └──────┬───────┘
                           │
                           ▼
                    ┌──────────────┐
                    │  PostgreSQL  │
                    │ Data Warehouse│
                    └──────┬───────┘
                           │
                           ▼
                    ┌──────────────┐
                    │  Streamlit   │
                    │  Dashboards  │
                    └──────────────┘
```

## Architecture Détaillée 7 Couches

```
┌─────────────────────────────────────────────────────────────┐
│ LAYER 1 : DATA SOURCES                                      │
├─────────────────────────────────────────────────────────────┤
│ • CSV Files (data/raw/)                                     │
│ • Python Scripts (Faker, NumPy, Pandas)                     │
│ • 23 zones, 10k users, 300k consumption, 20k recharges      │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ LAYER 2 : INGESTION & VALIDATION                            │
├─────────────────────────────────────────────────────────────┤
│ • Script : load_to_warehouse.py                             │
│ • Validation qualité données                                │
│ • Gestion erreurs (retry, rollback)                         │
│ • Logging complet                                            │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ LAYER 3 : TRANSFORMATION (ETL)                              │
├─────────────────────────────────────────────────────────────┤
│ • Calcul tranches (T1/T2/T3)                                │
│ • Calcul économies baisse 10%                               │
│ • Agrégations par zone/mois                                 │
│ • Mapping dimensions                                         │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ LAYER 4 : DATA WAREHOUSE (PostgreSQL)                       │
├─────────────────────────────────────────────────────────────┤
│ Star Schema (Kimball):                                       │
│ • 4 Dimensions (date, zones, users, tranches)               │
│ • 2 Facts (consumption, recharges)                          │
│ • 3 Data Marts (vues matérialisées)                         │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ LAYER 5 : ANALYTICS & ML                                    │
├─────────────────────────────────────────────────────────────┤
│ • Jupyter Notebooks (5 analyses)                            │
│ • Machine Learning (prédiction dépassement T1)              │
│ • Statistiques descriptives                                  │
│ • Simulateur recharge                                        │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ LAYER 6 : VISUALIZATION (BI)                                │
├─────────────────────────────────────────────────────────────┤
│ • Streamlit Dashboards (3)                                  │
│   - Vue Nationale                                            │
│   - Analyse Tranches                                         │
│   - Impact Économique                                        │
│ • Plotly charts (interactifs)                               │
│ • Folium maps (heatmap Sénégal)                            │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ LAYER 7 : CI/CD & MONITORING                                │
├─────────────────────────────────────────────────────────────┤
│ • GitHub Actions (tests automatiques)                       │
│ • pytest (50+ tests)                                         │
│ • Docker Compose (déploiement)                              │
│ • Grafana (monitoring optionnel)                            │
└─────────────────────────────────────────────────────────────┘
```

## Star Schema Data Warehouse

```
                    ┌─────────────┐
                    │  dim_date   │
                    │─────────────│
                    │ date_id PK  │
                    │ date        │
                    │ jour        │
                    │ mois        │
                    │ annee       │
                    └──────┬──────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
   ┌────▼─────┐      ┌─────▼──────┐    ┌────▼─────┐
   │dim_zones │      │ dim_users  │    │dim_tranch│
   │──────────│      │────────────│    │──────────│
   │zone_id PK│      │ user_id PK │    │tranche_id│
   │region    │      │ prenom     │    │prix_kwh  │
   │commune   │      │ nom        │    │seuil_min │
   │population│      │ type_cpt   │    │seuil_max │
   └────┬─────┘      └─────┬──────┘    └────┬─────┘
        │                  │                  │
        └──────────────────┼──────────────────┘
                           │
                  ┌────────▼─────────┐
                  │fact_consumption  │
                  │──────────────────│
                  │ id PK            │
                  │ date_id FK       │
                  │ user_id FK       │
                  │ zone_id FK       │
                  │ tranche_id FK    │
                  │ conso_kwh        │
                  │ cout_fcfa        │
                  │ economie         │
                  └──────────────────┘

                  ┌──────────────────┐
                  │ fact_recharges   │
                  │──────────────────│
                  │ recharge_id PK   │
                  │ date_id FK       │
                  │ user_id FK       │
                  │ zone_id FK       │
                  │ montant_brut     │
                  │ kwh_obtenus      │
                  │ canal_paiement   │
                  └──────────────────┘
```

## Flux ETL Détaillé

```
START
  │
  ├─ EXTRACT
  │   ├─ zones_senegal.csv (23 lignes)
  │   ├─ users.csv (10k lignes)
  │   ├─ consumption_daily.csv (300k lignes)
  │   └─ recharges.csv (20k lignes)
  │
  ├─ VALIDATE
  │   ├─ Check nulls
  │   ├─ Check ranges (conso >= 0, tranches IN (1,2,3))
  │   └─ Check intégrité référentielle
  │
  ├─ TRANSFORM
  │   ├─ Map date → date_id
  │   ├─ Calcul tranches selon grille 2026
  │   ├─ Calcul économies (T1 uniquement)
  │   └─ Agrégations par zone/mois
  │
  ├─ LOAD DIMENSIONS
  │   ├─ dim_date (INSERT avec ON CONFLICT)
  │   ├─ dim_zones (INSERT)
  │   ├─ dim_users (BATCH 5000)
  │   └─ dim_tranches (données statiques)
  │
  ├─ LOAD FACTS
  │   ├─ fact_consumption (BATCH 5000, ~8min)
  │   └─ fact_recharges (BATCH 2000, ~1min)
  │
  ├─ VERIFY
  │   └─ SELECT COUNT(*) FROM each table
  │
END (Total : 8-12 minutes)
```
