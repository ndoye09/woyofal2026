# Workflow Data Science — Ordre Corrigé

Ce document décrit le workflow recommandé (best practices) : générer → nettoyer → ingérer → transformer → analyser.

## Ordre corrigé

1. Génération & collecte
   - `data/01_raw/` : fichiers bruts
2. Nettoyage & validation
   - `data/02_cleaned/` : fichiers nettoyés (imputation, dédup, capping)
3. Ingestion
   - Charger `data/02_cleaned/` → PostgreSQL (Data Warehouse)
4. Feature engineering
   - `data/03_processed/` : jeux de données ML
5. Analyse & visualisation
   - Notebooks et dashboards

## Commandes rapides

```bash
# Nettoyer les données générées
python scripts/02_cleaning/clean_generated_data.py

# Charger les données propres
python scripts/03_ingestion/load_cleaned_to_warehouse.py

# Pipeline complet
python run_complete_pipeline.py
```

## Emplacement des fichiers
- Données brutes  : `data/01_raw/`
- Données propres : `data/02_cleaned/`
- Features ML     : `data/03_processed/`
- Artéfacts finaux : `data/04_final/`

## Justification
Nettoyer et valider les données avant toute EDA ou ingestion garantit reproductibilité, traçabilité et qualité des modèles ML.
