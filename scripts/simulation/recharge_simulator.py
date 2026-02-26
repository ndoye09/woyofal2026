"""
Module de simulation de recharge Woyofal
Grille tarifaire officielle Senelec 2026
"""

from typing import Dict, List, Tuple
from datetime import datetime
from dataclasses import dataclass, asdict
import json

# Tarifs DPP (Domestique Petite Puissance)
TARIFS_DPP = {
    'T1': {'prix_kwh': 82.00, 'seuil_min': 0, 'seuil_max': 150},
    'T2': {'prix_kwh': 136.49, 'seuil_min': 151, 'seuil_max': 250},
    'T3': {'prix_kwh': 136.49, 'seuil_min': 251, 'seuil_max': None}
}

# Tarifs PPP (Professionnel Petite Puissance)
TARIFS_PPP = {
    'T1': {'prix_kwh': 147.43, 'seuil_min': 0, 'seuil_max': 50},
    'T2': {'prix_kwh': 189.84, 'seuil_min': 51, 'seuil_max': 500},
    'T3': {'prix_kwh': 189.84, 'seuil_min': 501, 'seuil_max': None}
}

# Déductions
REDEVANCE_MENSUELLE = 429.0
TAXE_COMMUNALE_TAUX = 0.025

# Économies baisse 10% (estimations)
ECONOMIE_DPP_T1 = 9.11
ECONOMIE_PPP_T1 = 16.38


@dataclass
class RechargeInput:
    montant_brut: float
    cumul_actuel: float
    type_compteur: str = 'DPP'
    debut_mois: bool = False

    def __post_init__(self):
        if self.type_compteur not in ['DPP', 'PPP']:
            raise ValueError("type_compteur doit être 'DPP' ou 'PPP'")
        if self.montant_brut <= 0:
            raise ValueError("montant_brut doit être positif")
        if self.cumul_actuel < 0:
            raise ValueError("cumul_actuel ne peut pas être négatif")


@dataclass
class RechargeResult:
    montant_brut: float
    cumul_avant: float
    type_compteur: str
    redevance: float
    taxe_communale: float
    montant_net: float
    kwh_total: float
    detail_kwh: Dict[str, float]
    cumul_apres: float
    tranche_avant: int
    tranche_apres: int
    economie_baisse: float
    prix_moyen_kwh: float
    timestamp: str = None

    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.now().isoformat()

    def to_dict(self) -> Dict:
        return asdict(self)

    def to_json(self) -> str:
        return json.dumps(self.to_dict(), indent=2, ensure_ascii=False)


class RechargeSimulator:
    def __init__(self, type_compteur: str = 'DPP'):
        self.type_compteur = type_compteur
        self.tarifs = TARIFS_DPP if type_compteur == 'DPP' else TARIFS_PPP
        self.history: List[RechargeResult] = []

    def get_tranche(self, cumul: float) -> int:
        if cumul <= self.tarifs['T1']['seuil_max']:
            return 1
        elif cumul <= self.tarifs['T2']['seuil_max']:
            return 2
        else:
            return 3

    def calculate_deductions(self, montant_brut: float, debut_mois: bool) -> Tuple[float, float, float]:
        redevance = REDEVANCE_MENSUELLE if debut_mois else 0.0
        taxe_communale = round(montant_brut * TAXE_COMMUNALE_TAUX, 2)
        montant_net = montant_brut - redevance - taxe_communale
        # Ne pas autoriser montant net négatif
        if montant_net < 0:
            montant_net = 0.0
        return redevance, taxe_communale, montant_net

    def calculate_kwh_progressif(self, montant_net: float, cumul_avant: float) -> Tuple[float, Dict[str, float]]:
        kwh_total = 0.0
        detail_kwh = {'T1': 0.0, 'T2': 0.0, 'T3': 0.0}
        reste_montant = montant_net
        cumul_actuel = cumul_avant

        seuil_t1 = self.tarifs['T1']['seuil_max']
        if cumul_actuel < seuil_t1:
            kwh_disponibles = seuil_t1 - cumul_actuel
            prix_t1 = self.tarifs['T1']['prix_kwh']
            montant_max = kwh_disponibles * prix_t1
            if reste_montant <= montant_max:
                kwh_t1 = reste_montant / prix_t1
                detail_kwh['T1'] = kwh_t1
                kwh_total += kwh_t1
                return round(kwh_total, 2), {k: round(v, 2) for k, v in detail_kwh.items()}
            else:
                detail_kwh['T1'] = kwh_disponibles
                kwh_total += kwh_disponibles
                reste_montant -= montant_max
                cumul_actuel = seuil_t1

        seuil_t2 = self.tarifs['T2']['seuil_max']
        if seuil_t2 and cumul_actuel < seuil_t2 and reste_montant > 0:
            kwh_disponibles = seuil_t2 - cumul_actuel
            prix_t2 = self.tarifs['T2']['prix_kwh']
            montant_max = kwh_disponibles * prix_t2
            if reste_montant <= montant_max:
                kwh_t2 = reste_montant / prix_t2
                detail_kwh['T2'] = kwh_t2
                kwh_total += kwh_t2
                return round(kwh_total, 2), {k: round(v, 2) for k, v in detail_kwh.items()}
            else:
                detail_kwh['T2'] = kwh_disponibles
                kwh_total += kwh_disponibles
                reste_montant -= montant_max
                cumul_actuel = seuil_t2

        if reste_montant > 0:
            prix_t3 = self.tarifs['T3']['prix_kwh']
            kwh_t3 = reste_montant / prix_t3
            detail_kwh['T3'] = kwh_t3
            kwh_total += kwh_t3

        return round(kwh_total, 2), {k: round(v, 2) for k, v in detail_kwh.items()}

    def calculate_economie(self, kwh_obtenus: float, tranche_finale: int) -> float:
        if tranche_finale == 1:
            val = kwh_obtenus * (ECONOMIE_DPP_T1 if self.type_compteur == 'DPP' else ECONOMIE_PPP_T1)
            return max(0.0, val)
        return 0.0

    def simulate(self, recharge_input: RechargeInput) -> RechargeResult:
        redevance, taxe, montant_net = self.calculate_deductions(recharge_input.montant_brut, recharge_input.debut_mois)
        tranche_avant = self.get_tranche(recharge_input.cumul_actuel)
        kwh_total, detail_kwh = self.calculate_kwh_progressif(montant_net, recharge_input.cumul_actuel)
        cumul_apres = recharge_input.cumul_actuel + kwh_total
        tranche_apres = self.get_tranche(cumul_apres)
        economie = self.calculate_economie(kwh_total, tranche_apres)
        prix_moyen = montant_net / kwh_total if kwh_total > 0 else 0

        result = RechargeResult(
            montant_brut=recharge_input.montant_brut,
            cumul_avant=recharge_input.cumul_actuel,
            type_compteur=self.type_compteur,
            redevance=redevance,
            taxe_communale=round(taxe, 2),
            montant_net=round(montant_net, 2),
            kwh_total=kwh_total,
            detail_kwh=detail_kwh,
            cumul_apres=round(cumul_apres, 2),
            tranche_avant=tranche_avant,
            tranche_apres=tranche_apres,
            economie_baisse=round(economie, 2),
            prix_moyen_kwh=round(prix_moyen, 2)
        )

        self.history.append(result)
        return result

    def compare_scenarios(self, montant: float, cumul: float, avec_redevance: bool = True) -> Dict:
        scenarios = {}
        input1 = RechargeInput(montant, cumul, self.type_compteur, False)
        result1 = self.simulate(input1)
        scenarios['sans_redevance'] = result1
        if avec_redevance:
            input2 = RechargeInput(montant, cumul, self.type_compteur, True)
            result2 = self.simulate(input2)
            scenarios['avec_redevance'] = result2
            scenarios['difference'] = {
                'kwh': round(result1.kwh_total - result2.kwh_total, 2),
                'economie': round(REDEVANCE_MENSUELLE / result2.kwh_total if result2.kwh_total > 0 else 0, 2),
                'conseil': self._get_conseil_redevance(result1, result2)
            }
        return scenarios

    def _get_conseil_redevance(self, sans_red: RechargeResult, avec_red: RechargeResult) -> str:
        if sans_red.tranche_apres != avec_red.tranche_apres:
            return "⚠️ ATTENTION: Différence de tranche finale ! Vérifiez votre timing."
        if sans_red.cumul_avant > (self.tarifs['T1']['seuil_max'] - 10):
            return "💡 Vous êtes proche de la limite T1. Attendez le 1er du mois si possible."
        diff_kwh = sans_red.kwh_total - avec_red.kwh_total
        if diff_kwh > 5:
            return f"💰 Vous gagnez {diff_kwh:.1f} kWh en évitant la redevance."
        return "✅ Impact redevance modéré sur votre situation."

    def export_history(self, filepath: str = 'simulation_history.json'):
        data = {
            'type_compteur': self.type_compteur,
            'nb_simulations': len(self.history),
            'simulations': [r.to_dict() for r in self.history]
        }
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        return filepath


def format_result(result: RechargeResult) -> str:
    output = []
    output.append("=" * 70)
    output.append("💳 RÉSULTAT SIMULATION RECHARGE")
    output.append("=" * 70)
    output.append(f"\n📊 INPUT")
    output.append(f"   Montant brut : {result.montant_brut:,.0f} FCFA")
    output.append(f"   Cumul avant  : {result.cumul_avant:.2f} kWh (T{result.tranche_avant})")
    output.append(f"   Type compteur: {result.type_compteur}")
    output.append(f"\n💰 DÉDUCTIONS")
    output.append(f"   Redevance        : {result.redevance:,.0f} FCFA")
    output.append(f"   Taxe communale   : {result.taxe_communale:,.2f} FCFA")
    output.append(f"   Montant net      : {result.montant_net:,.2f} FCFA")
    output.append(f"\n⚡ kWh OBTENUS")
    output.append(f"   Total : {result.kwh_total:.2f} kWh")
    output.append(f"   Détail par tranche :")
    for tranche, kwh in result.detail_kwh.items():
        if kwh > 0:
            output.append(f"      {tranche} : {kwh:.2f} kWh")
    output.append(f"\n📈 RÉSULTAT")
    output.append(f"   Cumul après  : {result.cumul_apres:.2f} kWh (T{result.tranche_apres})")
    if result.tranche_avant != result.tranche_apres:
        output.append(f"   ⚠️  CHANGEMENT: T{result.tranche_avant} → T{result.tranche_apres}")
    output.append(f"   Prix moyen   : {result.prix_moyen_kwh:.2f} F/kWh")
    if result.economie_baisse > 0:
        output.append(f"   💚 Économie baisse 10% : {result.economie_baisse:,.2f} FCFA")
    output.append("=" * 70)
    return "\n".join(output)


if __name__ == "__main__":
    sim = RechargeSimulator('DPP')
    inp = RechargeInput(montant_brut=5000, cumul_actuel=120, debut_mois=False)
    res = sim.simulate(inp)
    print(format_result(res))
