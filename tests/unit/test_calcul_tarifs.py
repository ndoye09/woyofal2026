"""
Tests unitaires pour les fonctions de calcul tarifaire
Grille Senelec 2026 officielle
"""
import pytest
import sys
sys.path.insert(0, '.')

# ============================================
# FONCTIONS À TESTER (extraites des scripts)
# ============================================

def calculate_tranche_dpp(conso_cumul_mois):
    if conso_cumul_mois <= 150:
        return 1
    elif conso_cumul_mois <= 250:
        return 2
    else:
        return 3


def calculate_price_kwh_dpp(tranche):
    if tranche == 1:
        return 82.00
    elif tranche in [2, 3]:
        return 136.49


def calculate_economie_baisse(conso_kwh, tranche, type_compteur):
    if tranche == 1:
        if type_compteur == 'DPP':
            return conso_kwh * 9.11
        elif type_compteur == 'PPP':
            return conso_kwh * 16.38
    return 0


class TestCalculTrancheDPP:
    def test_tranche_1_debut(self):
        assert calculate_tranche_dpp(0) == 1
    def test_tranche_1_milieu(self):
        assert calculate_tranche_dpp(75) == 1
    def test_tranche_1_limite(self):
        assert calculate_tranche_dpp(150) == 1
    def test_tranche_2_debut(self):
        assert calculate_tranche_dpp(151) == 2
    def test_tranche_2_milieu(self):
        assert calculate_tranche_dpp(200) == 2
    def test_tranche_2_limite(self):
        assert calculate_tranche_dpp(250) == 2
    def test_tranche_3_debut(self):
        assert calculate_tranche_dpp(251) == 3
    def test_tranche_3_haut(self):
        assert calculate_tranche_dpp(500) == 3


class TestPrixKwhDPP:
    def test_prix_tranche_1(self):
        assert calculate_price_kwh_dpp(1) == 82.00
    def test_prix_tranche_2(self):
        assert calculate_price_kwh_dpp(2) == 136.49
    def test_prix_tranche_3(self):
        assert calculate_price_kwh_dpp(3) == 136.49
    def test_prix_t2_egal_t3(self):
        assert calculate_price_kwh_dpp(2) == calculate_price_kwh_dpp(3)


class TestEconomieBasise:
    def test_economie_t1_dpp(self):
        economie = calculate_economie_baisse(10, 1, 'DPP')
        assert economie == pytest.approx(91.10, rel=0.01)
    def test_economie_t2_zero(self):
        economie = calculate_economie_baisse(10, 2, 'DPP')
        assert economie == 0
    def test_economie_t3_zero(self):
        economie = calculate_economie_baisse(10, 3, 'DPP')
        assert economie == 0
    def test_economie_t1_ppp(self):
        economie = calculate_economie_baisse(10, 1, 'PPP')
        assert economie == pytest.approx(163.80, rel=0.01)
    def test_economie_zero_kwh(self):
        economie = calculate_economie_baisse(0, 1, 'DPP')
        assert economie == 0


class TestCoherenceTarifs:
    def test_prix_croissants(self):
        prix_t1 = calculate_price_kwh_dpp(1)
        prix_t2 = calculate_price_kwh_dpp(2)
        assert prix_t2 > prix_t1
    def test_tranche_progressive(self):
        assert calculate_tranche_dpp(100) < calculate_tranche_dpp(200)
        assert calculate_tranche_dpp(200) < calculate_tranche_dpp(300)
    def test_economie_uniquement_t1(self):
        eco_t1 = calculate_economie_baisse(10, 1, 'DPP')
        eco_t2 = calculate_economie_baisse(10, 2, 'DPP')
        eco_t3 = calculate_economie_baisse(10, 3, 'DPP')
        assert eco_t1 > 0
        assert eco_t2 == 0
        assert eco_t3 == 0


# Tests recharge

def calculate_kwh_obtenus_simple(montant_net, cumul_avant):
    kwh_total = 0
    reste = montant_net
    cumul = cumul_avant
    if cumul < 150:
        kwh_dispo = 150 - cumul
        montant_max = kwh_dispo * 82
        if reste <= montant_max:
            kwh_total = reste / 82
            return round(kwh_total, 2)
        else:
            kwh_total += kwh_dispo
            reste -= montant_max
            cumul = 150
    if reste > 0:
        kwh_total += reste / 136.49
    return round(kwh_total, 2)


class TestCalculKwhObtenus:
    def test_recharge_totalement_t1(self):
        kwh = calculate_kwh_obtenus_simple(5000, 100)
        assert kwh == pytest.approx(5000 / 82, rel=0.01)
    def test_recharge_depasse_t1(self):
        kwh = calculate_kwh_obtenus_simple(2000, 140)
        kwh_t1 = 10
        reste = 2000 - (10 * 82)
        kwh_t2 = reste / 136.49
        assert kwh == pytest.approx(kwh_t1 + kwh_t2, rel=0.01)
    def test_recharge_en_t2(self):
        kwh = calculate_kwh_obtenus_simple(5000, 200)
        assert kwh == pytest.approx(5000 / 136.49, rel=0.01)
    def test_montant_zero(self):
        kwh = calculate_kwh_obtenus_simple(0, 100)
        assert kwh == 0
