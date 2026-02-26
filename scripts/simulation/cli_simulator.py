"""
Interface CLI interactive pour simulation recharge
"""
import sys
from recharge_simulator import (
    RechargeSimulator, RechargeInput, format_result
)

def print_header():
    print("\n" + "=" * 70)
    print("🎮 SIMULATEUR RECHARGE WOYOFAL 2026")
    print("   Grille tarifaire officielle Senelec (Décision n° 2025-140)")
    print("=" * 70 + "\n")

def print_menu():
    print("\n📋 MENU PRINCIPAL")
    print("   1. Simulation simple")
    print("   2. Comparaison scénarios (avec/sans redevance)")
    print("   3. Calculer montant pour atteindre X kWh")
    print("   4. Afficher grille tarifaire")
    print("   5. Exporter historique (JSON)")
    print("   0. Quitter")
    print()

def get_input_float(prompt: str, default: float = None) -> float:
    while True:
        try:
            val = input(prompt)
            if val == '' and default is not None:
                return default
            return float(val)
        except ValueError:
            print("   ❌ Erreur : Entrez un nombre valide")

def get_input_choice(prompt: str, choices: list) -> str:
    while True:
        val = input(prompt).upper()
        if val in choices:
            return val
        print(f"   ❌ Erreur : Choisissez parmi {choices}")

def simulation_simple(simulator: RechargeSimulator):
    print("\n" + "=" * 70)
    print("💡 SIMULATION SIMPLE")
    print("=" * 70)
    montant = get_input_float("   Montant à recharger (FCFA) : ")
    cumul = get_input_float("   Cumul actuel du mois (kWh) : ", 0)
    debut_mois = get_input_choice("   Début de mois (redevance 429F) ? (O/N) : ", ['O', 'N']) == 'O'
    input_data = RechargeInput(montant_brut=montant, cumul_actuel=cumul, type_compteur=simulator.type_compteur, debut_mois=debut_mois)
    result = simulator.simulate(input_data)
    print("\n" + format_result(result))

def comparaison_scenarios(simulator: RechargeSimulator):
    print("\n" + "=" * 70)
    print("⚖️  COMPARAISON SCÉNARIOS")
    print("=" * 70)
    montant = get_input_float("   Montant à recharger (FCFA) : ")
    cumul = get_input_float("   Cumul actuel du mois (kWh) : ", 0)
    scenarios = simulator.compare_scenarios(montant, cumul, avec_redevance=True)
    print("\n" + "=" * 70)
    print("📊 COMPARAISON")
    print("=" * 70)
    r1 = scenarios['sans_redevance']
    r2 = scenarios['avec_redevance']
    print("\n1️⃣ SANS REDEVANCE (milieu/fin de mois)")
    print(f"   kWh obtenus  : {r1.kwh_total:.2f} kWh")
    print(f"   Cumul final  : {r1.cumul_apres:.2f} kWh (T{r1.tranche_apres})")
    print(f"   Prix moyen   : {r1.prix_moyen_kwh:.2f} F/kWh")
    print("\n2️⃣ AVEC REDEVANCE (début de mois)")
    print(f"   kWh obtenus  : {r2.kwh_total:.2f} kWh")
    print(f"   Cumul final  : {r2.cumul_apres:.2f} kWh (T{r2.tranche_apres})")
    print(f"   Prix moyen   : {r2.prix_moyen_kwh:.2f} F/kWh")
    diff = scenarios['difference']
    print("\n📉 DIFFÉRENCE")
    print(f"   kWh perdus avec redevance : {diff['kwh']:.2f} kWh")
    print(f"   Coût redevance par kWh    : {diff['economie']:.2f} F/kWh")
    print(f"\n💡 {diff['conseil']}")

def calculer_montant_pour_kwh(simulator: RechargeSimulator):
    print("\n" + "=" * 70)
    print("🎯 CALCULER MONTANT POUR OBJECTIF kWh")
    print("=" * 70)
    kwh_voulu = get_input_float("   kWh souhaités : ")
    cumul = get_input_float("   Cumul actuel (kWh) : ", 0)
    debut_mois = get_input_choice("   Début de mois ? (O/N) : ", ['O', 'N']) == 'O'
    montant_min, montant_max = 100, 50000
    tolerance = 0.5
    best_montant = None
    best_diff = float('inf')
    for _ in range(50):
        montant_test = (montant_min + montant_max) / 2
        input_data = RechargeInput(montant_test, cumul, simulator.type_compteur, debut_mois)
        result = simulator.simulate(input_data)
        diff = abs(result.kwh_total - kwh_voulu)
        if diff < best_diff:
            best_diff = diff
            best_montant = montant_test
        if diff < tolerance:
            break
        if result.kwh_total < kwh_voulu:
            montant_min = montant_test
        else:
            montant_max = montant_test
    print(f"\n✅ RÉSULTAT :")
    print(f"   Montant nécessaire : {best_montant:,.0f} FCFA")
    print(f"   kWh obtenus        : {result.kwh_total:.2f} kWh")
    print(f"   Écart              : {best_diff:.2f} kWh")
    print(f"   Tranche finale     : T{result.tranche_apres}")

def afficher_grille():
    print("\n" + "=" * 70)
    print("📋 GRILLE TARIFAIRE OFFICIELLE SENELEC 2026")
    print("=" * 70)
    print("\n🏠 DOMESTIQUE PETITE PUISSANCE (DPP) - Prépaiement")
    print("   Tranche 1 : 0-150 kWh     → 82,00 FCFA/kWh   ✅ Tarif social")
    print("   Tranche 2 : 151-250 kWh   → 136,49 FCFA/kWh")
    print("   Tranche 3 : >250 kWh      → 136,49 FCFA/kWh  (=T2 en prépaiement)")
    print("\n💰 DÉDUCTIONS")
    print("   Redevance mensuelle : 429 FCFA (si recharge 1-5 du mois)")
    print("   Taxe communale      : 2,5% du montant brut")

def main():
    print_header()
    type_cpt = get_input_choice("🏠 Type de compteur (DPP/PPP) : ", ['DPP', 'PPP'])
    simulator = RechargeSimulator(type_cpt)
    print(f"\n✅ Simulateur {type_cpt} initialisé")
    while True:
        print_menu()
        choice = input("Votre choix : ").strip()
        try:
            if choice == '1':
                simulation_simple(simulator)
            elif choice == '2':
                comparaison_scenarios(simulator)
            elif choice == '3':
                calculer_montant_pour_kwh(simulator)
            elif choice == '4':
                afficher_grille()
            elif choice == '5':
                filepath = simulator.export_history()
                print(f"\n✅ Historique exporté : {filepath}")
            elif choice == '0':
                print("\n👋 Au revoir !")
                break
            else:
                print("\n❌ Choix invalide")
        except KeyboardInterrupt:
            print("\n\n👋 Interruption utilisateur. Au revoir !")
            break
        except Exception as e:
            print(f"\n❌ Erreur : {e}")
    sys.exit(0)


if __name__ == "__main__":
    main()
