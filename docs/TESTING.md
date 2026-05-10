# 🧪 Guide des Tests - Woyofal Data Platform

## Structure des Tests

```
tests/
├── unit/                    # Tests unitaires
├── integration/             # Tests d'intégration
└── __init__.py
```

## Lancer les Tests

### Tous les tests
```
pytest tests/ -v
```

### Tests unitaires uniquement
```
pytest tests/unit/ -v
```

### Tests d'intégration
```
pytest tests/integration/ -v
```

### Avec couverture de code
```
pytest tests/ --cov=scripts --cov-report=html
```

## Catégories de Tests
- Calculs tarifaires, simulation, cohérence données, régression

## CI/CD
Tests exécutés automatiquement sur push et PR via GitHub Actions.
