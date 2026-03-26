# 🧪 DBT - Gouvernance Données Woyofal

## Vue d'ensemble

Ce projet dbt (data build tool) assure la **qualité et la gouvernance** du Data Warehouse Woyofal.

## Installation rapide

```powershell
pip install dbt-core dbt-postgres
nano ~/.dbt/profiles.yml
dbt debug --profiles-dir ~/.dbt
```

## Commandes utiles

```powershell
cd woyofal_dbt
dbt deps
dbt test
dbt docs generate
dbt docs serve
```
