# 🚀 Woyofal Data Platform 2026

[![CI/CD](https://github.com/VOTRE-USERNAME/woyofal-data-platform/actions/workflows/ci.yml/badge.svg)](https://github.com/VOTRE-USERNAME/woyofal-data-platform/actions/workflows/ci.yml)
[![Python 3.10](https://img.shields.io/badge/python-3.10-blue.svg)](https://www.python.org/downloads/)

Guide d'installation rapide et usage

## Quick Start (Windows PowerShell)

1) Créer et activer un venv

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

2) Installer dépendances

```powershell
python -m pip install -U pip
pip install -r requirements.txt
```

3) Exécuter génération de données

```powershell
python scripts/generate_all_data.py
```

4) Lancer tests

```powershell
pytest tests/ -v
```

## Structure

```
data/raw/           → Données sources (CSV)
scripts/            → Scripts génération & ETL
tests/              → Tests automatisés (pytest)
notebooks/          → Analyses exploratoires
sql/                → Schémas Data Warehouse
docs/               → Documentation
```

Voir `requirements.txt` pour les dépendances.
