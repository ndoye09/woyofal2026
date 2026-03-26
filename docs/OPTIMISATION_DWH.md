**Objectif**: Rassembler les recommandations et procédures pour stabiliser et optimiser le DWH.

- **Analyse**: exécuter `sql/07_analyse_performance_dwh.sql` et sauvegarder le résultat dans `reports/`.
- **Optimisations**: appliquer `sql/08_optimisations_dwh.sql` en mode lecture puis exécution manuelle.
- **Requêtes optimisées**: consulter `sql/09_requetes_optimisees.sql` pour remplacements.
- **Monitoring**: lancer `scripts/monitoring/monitor_dwh_performance.sh` périodiquement (cron ou Airflow).

Procédure recommandée:

1. Vérifier l'encodage du serveur Postgres: `show server_encoding; show client_encoding;` — les deux doivent être `UTF8`.
2. Faire une exécution de test: `docker exec -i woyofal-postgres psql -U woyofal_user -d woyofal_dwh -f sql/07_analyse_performance_dwh.sql > reports/analysis.txt`
3. Appliquer les index manquants listés dans `sql/08_optimisations_dwh.sql` puis `VACUUM ANALYZE`.
4. Planifier `scripts/monitoring/monitor_dwh_performance.sh` via Airflow ou cron chaque 4 heures.
5. Revoir les plans d'exécution (`EXPLAIN ANALYZE`) pour les requêtes lourdes listées dans le rapport d'analyse.

Remarques sur l'encodage:

- Si `dbt debug` renvoie une erreur d'encodage (codec utf-8), vérifier:
  - le `client_encoding` côté client (`PGCLIENTENCODING`),
  - la locale du conteneur Postgres lors de l'initialisation (doit être `en_US.utf8`),
  - les rôles/utilisateurs: noms contenant des caractères non-UTF8 peuvent provoquer des exceptions.

-- Fin
