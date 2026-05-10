# Dossier `scripts/etl`

Contient les scripts d'ingestion vers le Data Warehouse.

Fichiers clés:
- `load_to_warehouse.py` : ETL initial
- `load_to_warehouse_v2.py` : version optimisée (COPY, rebuild indexes)

Préférence : utiliser le loader server-side (`sql/02_load_csvs.sql`) ou la version optimisée si la base est accessible.
