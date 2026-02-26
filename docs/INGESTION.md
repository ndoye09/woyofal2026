# Ingestion — Woyofal Data Platform

Procédure recommandée pour charger les CSV dans le DWH :

1. Démarrer les services Docker (Postgres + pgAdmin) :

```powershell
docker-compose up -d
```

2. Vérifier l'accès à Postgres :

```powershell
docker-compose exec woyofal-postgres pg_isready -U postgres
```

3. Charger les CSV (option A — serveur) :

- Copier les CSV dans `data/raw/` (déjà montés dans le conteneur).
- Exécuter le loader SQL côté serveur :

```powershell
docker-compose exec -T woyofal-postgres psql -U woyofal_user -d woyofal_dwh -f /data/sql/02_load_csvs.sql
```

4. Charger les CSV (option B — hôte) :

- Utiliser `scripts/etl/load_to_warehouse_v2.py` (référence) mais exécuter idéalement depuis un conteneur Python configuré pour éviter problèmes d'encodage.

```powershell
# Exemple d'exécution depuis l'environnement virtuel Windows
.\venv\Scripts\python.exe scripts\etl\load_to_warehouse_v2.py --csv-path data/raw
```

Conseils :
- Préférer `COPY` côté serveur pour gros fichiers.
- Après un bulk-load, reconstruire les indexes (`REINDEX TABLE ...`) et réactiver triggers/contraintes.
- Ne pas ré-exécuter l'insert sans dedup si le script n'est pas idempotent (clé primaire).
