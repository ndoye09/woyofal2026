# 🎮 Simulateur de Recharge - Documentation Technique

## Vue d'Ensemble

Module de simulation conforme à la **grille tarifaire officielle Senelec 2026** (Décision n° 2025-140).

**Objectif :** Simuler recharges Woyofal avec calculs progressifs tranches.

## Grille Tarifaire 2026

### Domestique Petite Puissance (DPP) - Prépaiement

| Tranche | Seuils | Prix kWh | Note |
|---------|--------|----------|------|
| T1 | 0-150 kWh | 82,00 FCFA | Tarif social avec baisse 10% |
| T2 | 151-250 kWh | 136,49 FCFA | Tarif intermédiaire |
| T3 | >250 kWh | 136,49 FCFA | **Valorisée à T2 en prépaiement** |

### Professionnel Petite Puissance (PPP) - Prépaiement

| Tranche | Seuils | Prix kWh |
|---------|--------|----------|
| T1 | 0-50 kWh | 147,43 FCFA |
| T2 | 51-500 kWh | 189,84 FCFA |
| T3 | >500 kWh | 189,84 FCFA |

<!-- No-op placeholder to keep context (will append EDA summary next) -->

## 🔎 Résumé EDA & Résultats clés

Les analyses exploratoires ont été exécutées via `scripts/run_eda.py` et les artefacts exportés dans `docs/`.

- **Corrélation montant ↔ kWh obtenus :** 0.975 (forte linéarité)
- **Distribution par tranche :** T1 = 86.5%, T2 = 13.2%, T3 = 0.4%
- **Économie totale (baisse 10% sur T1) :** 15,238,322 FCFA
- **Surcoût total estimé (T2+T3 vs tarif T1 hypothétique) :** 55,963,425 FCFA

Artefacts :
- [eda_consommation_overview.png](docs/eda_consommation_overview.png)
- [eda_recharge_correlation.png](docs/eda_recharge_correlation.png)
- [eda_monthly_trend.png](docs/eda_monthly_trend.png)
- [eda_economies_t1.png](docs/eda_economies_t1.png)
- [eda_surcouts_tranches.png](docs/eda_surcouts_tranches.png)
- [eda_stats_recap.csv](docs/eda_stats_recap.csv)

Ces résultats servent d'entrée pour les discussions tarifaires et les dashboards. Le notebook interactif `notebooks/02_EDA_Complete.ipynb` reproduit les analyses pas-à-pas.
### Déductions Standards

- **Redevance mensuelle :** 429 FCFA (si recharge 1-5 du mois)
- **Taxe communale :** 2,5% du montant brut
- **Redevance électrification rurale :** 0,7 FCFA/kWh (incluse dans tarifs)

## Architecture du Simulateur

### Classe Principale : `RechargeSimulator`

**Localisation :** `scripts/simulation/recharge_simulator.py`

```python
from recharge_simulator import RechargeSimulator, RechargeInput

# Initialisation
sim = RechargeSimulator('DPP')  # ou 'PPP'

# Simulation
input_data = RechargeInput(
    montant_brut=5000,
    cumul_actuel=120,
    type_compteur='DPP',
    debut_mois=False
)

result = sim.simulate(input_data)
print(result.kwh_total)  # 59.45 kWh
```

### Classes de Données

#### RechargeInput
```python
@dataclass
class RechargeInput:
    montant_brut: float      # Montant à recharger (FCFA)
    cumul_actuel: float      # Cumul mois en cours (kWh)
    type_compteur: str       # 'DPP' ou 'PPP'
    debut_mois: bool = False # Redevance 429F ?
```

#### RechargeResult
```python
@dataclass
class RechargeResult:
    # Input
    montant_brut: float
    cumul_avant: float
    type_compteur: str
    
    # Déductions
    redevance: float
    taxe_communale: float
    montant_net: float
    
    # kWh
    kwh_total: float
    detail_kwh: Dict[str, float]  # {'T1': X, 'T2': Y}
    
    # Résultat
    cumul_apres: float
    tranche_avant: int
    tranche_apres: int
    
    # Économies
    economie_baisse: float
    prix_moyen_kwh: float
```

## Algorithme de Calcul Progressif

### Principe

Le calcul des kWh est **progressif** : il traverse les tranches dans l'ordre jusqu'à épuisement du montant.

### Pseudo-code

```
FUNCTION calculate_kwh_progressif(montant_net, cumul_avant):
    kwh_total = 0
    reste_montant = montant_net
    cumul_actuel = cumul_avant
    
    // Phase 1 : Remplir Tranche 1
    IF cumul_actuel < 150:
        kwh_disponibles = 150 - cumul_actuel
        montant_max = kwh_disponibles × 82
        
        IF reste_montant ≤ montant_max:
            kwh_total = reste_montant / 82
            RETURN kwh_total
        ELSE:
            kwh_total += kwh_disponibles
            reste_montant -= montant_max
            cumul_actuel = 150
    
    // Phase 2 : Remplir Tranche 2
    IF cumul_actuel < 250 AND reste_montant > 0:
        kwh_disponibles = 250 - cumul_actuel
        montant_max = kwh_disponibles × 136.49
        
        IF reste_montant ≤ montant_max:
            kwh_total += reste_montant / 136.49
            RETURN kwh_total
            
        ELSE:
            kwh_total += kwh_disponibles
            reste_montant -= montant_max
            cumul_actuel = 250
    
    // Phase 3 : Tranche 3 (reste)
    IF reste_montant > 0:
        kwh_total += reste_montant / 136.49  // T3 = T2
    
    RETURN kwh_total
```

### Exemple Détaillé

**Scénario :** Recharge 10,000 FCFA avec cumul actuel 140 kWh (DPP)

```
Étape 1 : Déductions
─────────────────────
Montant brut     : 10,000 FCFA
Redevance        : 0 FCFA (pas début mois)
Taxe (2.5%)      : 250 FCFA
Montant net      : 9,750 FCFA

Étape 2 : Calcul kWh progressif
────────────────────────────────
Cumul actuel : 140 kWh (T1)

Phase 1 - Tranche 1 (82 F/kWh) :
  Reste en T1     : 150 - 140 = 10 kWh
  Coût pour 10 kWh: 10 × 82 = 820 FCFA
  kWh obtenus T1  : 10 kWh
  Reste montant   : 9,750 - 820 = 8,930 FCFA
  Cumul atteint   : 150 kWh

Phase 2 - Tranche 2 (136.49 F/kWh) :
  Reste en T2     : 250 - 150 = 100 kWh
  Coût pour 100   : 100 × 136.49 = 13,649 FCFA
  Budget disponible: 8,930 FCFA < 13,649 FCFA
  kWh obtenus T2  : 8,930 / 136.49 = 65.4 kWh
  Reste montant   : 0 FCFA
  Cumul atteint   : 215.4 kWh

Étape 3 : Résultat
──────────────────
kWh total       : 10 + 65.4 = 75.4 kWh
Cumul final     : 215.4 kWh
Tranche finale  : T2
Prix moyen      : 9,750 / 75.4 = 129.31 F/kWh
Économie baisse : 0 FCFA (T2)
```

## Modes d'Utilisation

### 1. Simulation Simple

```python
sim = RechargeSimulator('DPP')

inp = RechargeInput(5000, 120, 'DPP', False)
result = sim.simulate(inp)

print(f"kWh obtenus : {result.kwh_total}")
print(f"Tranche finale : T{result.tranche_apres}")
```

### 2. Comparaison Scénarios

```python
scenarios = sim.compare_scenarios(
    montant=5000,
    cumul=120,
    avec_redevance=True
)

# Accès résultats
sans_red = scenarios['sans_redevance']
avec_red = scenarios['avec_redevance']
diff = scenarios['difference']

print(f"kWh perdus avec redevance : {diff['kwh']}")
```

### 3. Calcul Inverse (montant pour X kWh)

```python
# Recherche dichotomique
montant_min, montant_max = 100, 50000

for _ in range(50):
    montant_test = (montant_min + montant_max) / 2
    result = sim.simulate(RechargeInput(montant_test, cumul, 'DPP', False))
    
    if result.kwh_total < kwh_voulu:
        montant_min = montant_test
    else:
        montant_max = montant_test
```

### 4. Export Historique

```python
# Après plusieurs simulations
sim.export_history('simulation_history.json')

# Format JSON :
{
  "type_compteur": "DPP",
  "nb_simulations": 10,
  "simulations": [
    {
      "montant_brut": 5000,
      "kwh_total": 59.45,
      "tranche_apres": 1,
      ...
    }
  ]
}
```

## Interface CLI

**Lancement :**
```bash
python scripts/simulation/cli_simulator.py
```

**Fonctionnalités :**
1. Simulation simple
2. Comparaison scénarios (avec/sans redevance)
3. Calculer montant pour objectif kWh
4. Afficher grille tarifaire
5. Exporter historique JSON

## Cas d'Usage

### Cas 1 : Optimisation Fin de Mois

**Problème :** User cumul 145 kWh le 28 février, veut recharger 5000 FCFA

**Solution :**
```python
# Scénario A : Recharger maintenant
result_a = sim.simulate(RechargeInput(5000, 145, 'DPP', False))
# → Passage en T2

# Scénario B : Attendre le 1er mars
result_b = sim.simulate(RechargeInput(5000, 0, 'DPP', True))
# → Reste en T1 (après reset)

# Recommandation : Attendre 2 jours = économie 2,900 FCFA/mois
```

### Cas 2 : Budget Mensuel Optimal

**Objectif :** Rester en T1 (≤150 kWh) tout le mois

**Calcul :**
```python
# Conso moyenne : 5 kWh/jour
# Budget mensuel T1 : 150 kWh × 82 = 12,300 FCFA net
# + Redevance 429 F + Taxe = ~13,200 FCFA total

# Stratégie :
# - 1er du mois : 10,000 FCFA → ~117 kWh
# - 15 du mois  : 3,000 FCFA → ~33 kWh
# Total : 150 kWh en T1 ✅
```

### Cas 3 : Comparaison DPP vs PPP

```python
sim_dpp = RechargeSimulator('DPP')
sim_ppp = RechargeSimulator('PPP')

result_dpp = sim_dpp.simulate(RechargeInput(10000, 0, 'DPP', False))
result_ppp = sim_ppp.simulate(RechargeInput(10000, 0, 'PPP', False))

print(f"DPP : {result_dpp.kwh_total} kWh")  # ~119 kWh
print(f"PPP : {result_ppp.kwh_total} kWh")  # ~66 kWh
```

## Tests

**Tests unitaires :** `tests/unit/test_simulator.py`
- 15+ tests cas nominaux
- Tests edge cases (limites tranches)
- Tests robustesse

**Tests progressif :** `tests/unit/test_calcul_progressif.py`
- 20+ tests calcul progressif
- Tests montants extrêmes
- Tests cohérence

```bash
# Lancer tests
pytest tests/unit/test_simulator.py -v
pytest tests/unit/test_calcul_progressif.py -v
```

## Références

- Script principal : `scripts/simulation/recharge_simulator.py`
- Interface CLI : `scripts/simulation/cli_simulator.py`
- Tests : `tests/unit/test_simulator.py`
- Grille Senelec 2026 : `docs/Grille-tarifaire-Senelec-2026.pdf`
