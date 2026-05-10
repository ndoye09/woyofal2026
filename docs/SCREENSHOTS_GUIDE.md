# 📸 Guide Screenshots - Documentation Visuelle

## Liste des Screenshots Requis

### 1. Architecture & Infrastructure

#### Screenshot 1.1 : Docker Containers
```bash
docker-compose ps
```
**Capture :** Tous les containers actifs (postgres, pgadmin)

#### Screenshot 1.2 : PostgreSQL Schema
```bash
docker exec -it woyofal-postgres psql -U woyofal_user -d woyofal_dwh
\dt
```
**Capture :** Liste des 6 tables (4 dims + 2 facts)

#### Screenshot 1.3 : Volumétrie Base de Données
```bash
docker exec -it woyofal-postgres psql -U woyofal_user -d woyofal_dwh -c "
SELECT 
  'dim_date' as table_name, COUNT(*) as rows FROM dim_date
UNION ALL
SELECT 'dim_zones', COUNT(*) FROM dim_zones
UNION ALL
SELECT 'dim_users', COUNT(*) FROM dim_users
UNION ALL
SELECT 'fact_consumption', COUNT(*) FROM fact_consumption
UNION ALL
SELECT 'fact_recharges', COUNT(*) FROM fact_recharges
ORDER BY rows DESC;
"
```
**Capture :** Nombre de lignes par table (300k consumption, 20k recharges)

---

## 2. Pipeline Ingestion

#### Screenshot 2.1 : Génération Données
```bash
python scripts/generate_all_data.py
```
**Capture :** Logs avec progression (500/10000 users...)

#### Screenshot 2.2 : Ingestion ETL
```bash
python scripts/etl/load_to_warehouse.py
```
**Capture :** Logs complets avec timing

#### Screenshot 2.3 : Vérification Chargement
```bash
docker exec -it woyofal-postgres psql -U woyofal_user -d woyofal_dwh -c "
SELECT * FROM fact_consumption LIMIT 10;
"
```
**Capture :** Premières lignes avec données réelles

---

## 3. Simulation Recharge

#### Screenshot 3.1 : Menu Principal CLI
```bash
python scripts/simulation/cli_simulator.py
```

#### Screenshot 3.2 : Simulation Simple
Inputs : Montant 5000 FCFA, Cumul 120 kWh — Capture résultat complet

#### Screenshot 3.3 : Comparaison Scénarios
Inputs : Montant 5000 FCFA, Cumul 145 kWh — Capture comparaison

---

## 4. Tests & Qualité

#### Screenshot 4.1 : Tests Unitaires
```bash
pytest tests/unit/ -v --tb=short
```

#### Screenshot 4.2 : Tests Intégration
```bash
pytest tests/integration/ -v
```

#### Screenshot 4.3 : Coverage Report
```bash
pytest tests/ --cov=scripts --cov-report=term
```

#### Screenshot 4.4 : Tests CI/CD GitHub
**Capture :** GitHub Actions - All checks passed

---

## 5. Analyses & Résultats

#### Screenshot 5.1 : Jupyter Notebook EDA
**Capture :** Notebook avec graphiques (distribution, pie chart, économies)

#### Screenshot 5.2 : Statistiques Descriptives
```python
df_consumption.describe()
```

#### Screenshot 5.3 : Requête Analytics SQL
```sql
SELECT region, COUNT(*) as nb_users, AVG(conso_kwh) as conso_moyenne
FROM fact_consumption c
JOIN dim_zones z ON c.zone_id = z.zone_id
GROUP BY region
ORDER BY conso_moyenne DESC;
```

---

## Conseils Capture d'Écran

- **Terminal:** Police 14pt, thème clair, largeur 100-120 colonnes, PNG
- **Code:** Syntax highlighting, numéros de ligne visibles, zoom 120-150%
- **Graphiques:** 300 DPI, PNG/PDF, légendes lisibles

## Organisation Screenshots

```
docs/screenshots/
├── 01_infrastructure/
├── 02_pipeline/
├── 03_simulation/
├── 04_tests/
├── 05_analytics/
└── 06_documentation/
```

---

## Checklist rapide

- [ ] Docker containers
- [ ] PostgreSQL schema
- [ ] Volumétrie DB
- [ ] Génération données
- [ ] Ingestion ETL
- [ ] Vérification load
- [ ] Menu CLI simulation
- [ ] Simulation simple
- [ ] Comparaison scénarios
- [ ] Tests unitaires
- [ ] Tests intégration
- [ ] Coverage
- [ ] Notebook EDA
- [ ] Structure projet
