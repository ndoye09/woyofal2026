"""
Tests approfondis du calcul progressif de kWh
Cas limites et edge cases
"""
import pytest
import sys
sys.path.insert(0, 'scripts/simulation')

from recharge_simulator import RechargeSimulator, RechargeInput


class TestCalculProgressifEdgeCases:
    """Tests cas limites calcul kWh"""
    
    @pytest.fixture
    def sim_dpp(self):
        return RechargeSimulator('DPP')
    
    @pytest.fixture
    def sim_ppp(self):
        return RechargeSimulator('PPP')
    
    def test_exactement_limite_t1(self, sim_dpp):
        """Recharge qui atteint exactement 150 kWh"""
        inp = RechargeInput(4206, 100, 'DPP', False)
        result = sim_dpp.simulate(inp)
        assert result.cumul_apres == pytest.approx(150, abs=1)
        # Légère marge d'arrondi possible → accepter T1 ou T2
        assert result.tranche_apres in (1, 2)
    
    def test_un_kwh_apres_limite_t1(self, sim_dpp):
        """1 kWh après la limite T1"""
        inp = RechargeInput(150, 150, 'DPP', False)
        result = sim_dpp.simulate(inp)
        assert result.tranche_apres == 2
        assert result.cumul_apres > 150
    
    def test_exactement_limite_t2(self, sim_dpp):
        """Recharge qui atteint exactement 250 kWh"""
        inp = RechargeInput(7000, 200, 'DPP', False)
        result = sim_dpp.simulate(inp)
        assert result.cumul_apres == pytest.approx(250, abs=2)
        assert result.tranche_apres == 2
    
    def test_passage_t1_t2_t3(self, sim_dpp):
        """Recharge qui traverse T1, T2 et atteint T3"""
        inp = RechargeInput(20000, 140, 'DPP', False)
        result = sim_dpp.simulate(inp)
        assert result.detail_kwh['T1'] > 0
        assert result.detail_kwh['T2'] > 0
        assert result.detail_kwh['T3'] > 0
        assert result.tranche_apres == 3
    
    def test_montant_minimum(self, sim_dpp):
        """Montant très faible (100 FCFA)"""
        inp = RechargeInput(100, 50, 'DPP', False)
        result = sim_dpp.simulate(inp)
        assert result.kwh_total > 0
        assert result.kwh_total < 2
    
    def test_montant_maximum(self, sim_dpp):
        """Montant très élevé (100,000 FCFA)"""
        inp = RechargeInput(100000, 0, 'DPP', False)
        result = sim_dpp.simulate(inp)
        assert result.kwh_total > 700
        assert result.tranche_apres == 3
    
    def test_cumul_zero(self, sim_dpp):
        """Début de mois (cumul 0)"""
        inp = RechargeInput(5000, 0, 'DPP', False)
        result = sim_dpp.simulate(inp)
        assert result.cumul_avant == 0
        assert result.tranche_avant == 1
        assert result.detail_kwh['T2'] == 0
        assert result.detail_kwh['T3'] == 0
    
    def test_cumul_tres_eleve(self, sim_dpp):
        """Cumul déjà très élevé (500 kWh)"""
        inp = RechargeInput(5000, 500, 'DPP', False)
        result = sim_dpp.simulate(inp)
        assert result.tranche_avant == 3
        assert result.tranche_apres == 3
        assert result.detail_kwh['T1'] == 0
        assert result.detail_kwh['T2'] == 0
    
    def test_redevance_impact_kwh(self, sim_dpp):
        """Impact redevance sur kWh obtenus"""
        inp1 = RechargeInput(5000, 100, 'DPP', False)
        result1 = sim_dpp.simulate(inp1)
        inp2 = RechargeInput(5000, 100, 'DPP', True)
        result2 = sim_dpp.simulate(inp2)
        assert result2.kwh_total < result1.kwh_total
        diff = result1.kwh_total - result2.kwh_total
        # Vérifier qu'il y a bien une perte de kWh liée à la redevance
        assert diff > 0
        assert diff < 10
    
    def test_redevance_montant_juste(self, sim_dpp):
        """Redevance avec montant tout juste suffisant"""
        inp = RechargeInput(450, 100, 'DPP', True)
        result = sim_dpp.simulate(inp)
        assert result.kwh_total > 0
        assert result.montant_net < 50
    
    def test_ppp_plus_cher_que_dpp(self, sim_dpp, sim_ppp):
        """PPP devrait donner moins de kWh que DPP"""
        montant, cumul = 5000, 30
        inp_dpp = RechargeInput(montant, cumul, 'DPP', False)
        result_dpp = sim_dpp.simulate(inp_dpp)
        inp_ppp = RechargeInput(montant, cumul, 'PPP', False)
        result_ppp = sim_ppp.simulate(inp_ppp)
        assert result_dpp.kwh_total > result_ppp.kwh_total
    
    def test_seuils_differents_dpp_ppp(self, sim_dpp, sim_ppp):
        """Seuils tranches différents"""
        cumul = 60
        inp_dpp = RechargeInput(1000, cumul, 'DPP', False)
        result_dpp = sim_dpp.simulate(inp_dpp)
        assert result_dpp.tranche_avant == 1
        inp_ppp = RechargeInput(1000, cumul, 'PPP', False)
        result_ppp = sim_ppp.simulate(inp_ppp)
        assert result_ppp.tranche_avant == 2
