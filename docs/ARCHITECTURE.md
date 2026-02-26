# Architecture technique — Woyofal Data Platform

Résumé haut-niveau :

- Orchestration légère : `docker-compose.yml` (Postgres 14-alpine + pgAdmin)
- Sources : CSV dans `data/raw/` (montés dans le conteneur Postgres pour COPY)
- Ingestion : SQL server-side `sql/02_load_csvs.sql` et scripts ETL Python `scripts/etl/*`
- Data Warehouse : schéma dans `sql/01_create_schema.sql` (dimensions + faits)
- Analyse & EDA : `scripts/run_eda.py` et `notebooks/` (exports dans `docs/`)
- Simulation : `scripts/simulation/recharge_simulator.py` + CLI
- Tests : `tests/unit/` et `tests/integration/` (pytest, badges dans README)

Flux de données :

1. Génération ou dépôt CSV → `data/raw/`
2. Import serveur (Postgres COPY) → tables de staging
3. INSERT/UPSERT vers `dim_` et `fact_` via `sql/02_load_csvs.sql` ou `scripts/etl` optimisé
4. EDA / rapports / simulation

Recommandations opérationnelles :
- Exécuter l'ingestion lourde à l'intérieur du conteneur Postgres (évite problèmes d'encodage/auth depuis l'hôte).
- Utiliser la version `load_to_warehouse_v2.py` (référence) ou server-side `sql/02_load_csvs.sql` pour gros volumes.
- Garder les CSV en lecture seule et tagger les commits de données si vous stockez de grosses traces.

Fichiers clefs :
- `docker-compose.yml` — orchestrateur des services
- `sql/01_create_schema.sql` — schéma DWH
- `sql/02_load_csvs.sql` — loader server-side
- `scripts/etl/load_to_warehouse_v2.py` — loader optimisé (référence)
- `scripts/simulation/recharge_simulator.py` — simulateur de recharges
