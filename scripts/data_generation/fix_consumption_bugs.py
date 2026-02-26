"""
Corrections de bugs identifiés dans generate_consumption.py
Fichier de référence avec correctifs proposés.
"""

# FIX BUG 1 : Reset cumul
# APRÈS (corrigé) :
def reset_cumul_if_needed(current_date, day_offset, conso_cumul_mois):
    if current_date.day == 1 or (day_offset == 0 and current_date.day != 1):
        return 0
    return conso_cumul_mois


# FIX BUG 2 : Prix T3 égal à T2
def calculate_price_kwh_dpp(tranche):
    if tranche == 1:
        return 82.00
    elif tranche in [2, 3]:
        return 136.49


# FIX BUG 3 : Économie uniquement en T1
def calculate_economie_baisse(conso_kwh, tranche, type_compteur):
    if tranche == 1:
        if type_compteur == 'DPP':
            return conso_kwh * 9.11
    return 0
