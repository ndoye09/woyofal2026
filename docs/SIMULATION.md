# Simulation — Woyofal Data Platform

Module principal : `scripts/simulation/recharge_simulator.py`

Usage rapide :

```powershell
# CLI interactif
python scripts/simulation/cli_simulator.py

# Importer le module dans un script
from scripts.simulation.recharge_simulator import RechargeSimulator, RechargeInput
sim = RechargeSimulator('DPP')
inp = RechargeInput(5000, 120, 'DPP', False)
res = sim.simulate(inp)
print(res.to_json())
```

Composants :
- `RechargeSimulator` : initialise selon `DPP` ou `PPP` et expose `simulate()`.
- `RechargeInput` : modèle d'entrée (montant_brut, cumul_actuel, type_compteur, debut_mois).
- `RechargeResult` : résultat détaillé (montant_net, kwh_total, détail par tranche, cumuls, économie, etc.).

Bonnes pratiques :
- Pour tests reproductibles, initialiser `RechargeSimulator` et réutiliser l'instance pour collecter `history`.
- Les fonctions sont unit-testées dans `tests/unit/` et il existe des tests de régression pour bugs historiques.
