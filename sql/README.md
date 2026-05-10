# Dossier `sql`

Contient les scripts SQL pour créer le schéma du Data Warehouse et charger les données.

Fichiers importants:
- `01_create_schema.sql` — création des tables `dim_` et `fact_`
- `02_load_csvs.sql` — loader server-side avec COPY et INSERT/UPSERT

Exécuter depuis le conteneur Postgres pour de meilleures performances.
