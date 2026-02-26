"""
Tests de régression pour éviter bugs connus
"""
import pytest
import sys
sys.path.insert(0, 'scripts/simulation')

from recharge_simulator import RechargeSimulator, RechargeInput


class TestRegressionBugs:
    """Tests pour bugs historiques"""
    
    def test_bug_prix_t3_egal_t2(self):
        sim = RechargeSimulator('DPP')
        inp = RechargeInput(10000, 300, 'DPP', False)
        result = sim.simulate(inp)
        if result.detail_kwh.get('T3', 0) > 0:
            # Les tarifs sont disponibles via l'instance du simulateur
            prix_t3_apparent = sim.tarifs['T3']['prix_kwh']
            prix_t2 = sim.tarifs['T2']['prix_kwh']
            assert prix_t3_apparent == prix_t2
    
    def test_bug_economie_seulement_t1(self):
        sim = RechargeSimulator('DPP')
        inp = RechargeInput(5000, 200, 'DPP', False)
        result = sim.simulate(inp)
        if result.tranche_apres > 1:
            assert result.economie_baisse == 0
    
    def test_bug_cumul_decroissant(self):
        sim = RechargeSimulator('DPP')
        inp = RechargeInput(5000, 100, 'DPP', False)
        result = sim.simulate(inp)
        assert result.cumul_apres >= result.cumul_avant
    
    def test_bug_montant_net_negatif(self):
        sim = RechargeSimulator('DPP')
        inp = RechargeInput(400, 100, 'DPP', True)
        result = sim.simulate(inp)
        assert result.montant_net >= 0
