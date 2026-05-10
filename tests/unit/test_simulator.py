"""
Tests unitaires pour le simulateur de recharge
"""
import pytest
import sys
sys.path.insert(0, 'scripts/simulation')

from recharge_simulator import (
    RechargeSimulator, RechargeInput, RechargeResult,
    TARIFS_DPP, REDEVANCE_MENSUELLE
)


class TestRechargeInput:
    def test_input_valide(self):
        inp = RechargeInput(5000, 100, 'DPP', False)
        assert inp.montant_brut == 5000
        assert inp.cumul_actuel == 100

    def test_montant_negatif(self):
        with pytest.raises(ValueError):
            RechargeInput(-100, 100, 'DPP', False)

    def test_type_invalide(self):
        with pytest.raises(ValueError):
            RechargeInput(5000, 100, 'INVALID', False)


class TestSimulateurDPP:
    @pytest.fixture
    def simulator(self):
        return RechargeSimulator('DPP')

    def test_get_tranche_t1(self, simulator):
        assert simulator.get_tranche(100) == 1

    def test_get_tranche_t2(self, simulator):
        assert simulator.get_tranche(200) == 2

    def test_get_tranche_t3(self, simulator):
        assert simulator.get_tranche(300) == 3

    def test_deductions_sans_redevance(self, simulator):
        redevance, taxe, net = simulator.calculate_deductions(5000, False)
        assert redevance == 0
        assert taxe == pytest.approx(125, rel=0.01)
        assert net == pytest.approx(4875, rel=0.01)

    def test_deductions_avec_redevance(self, simulator):
        redevance, taxe, net = simulator.calculate_deductions(5000, True)
        assert redevance == REDEVANCE_MENSUELLE
        assert net == pytest.approx(5000 - 429 - 125, rel=0.01)

    def test_simulation_totalement_t1(self, simulator):
        inp = RechargeInput(5000, 0, 'DPP', False)
        result = simulator.simulate(inp)
        assert result.kwh_total == pytest.approx(59.45, rel=0.01)
        assert result.tranche_apres == 1
        assert result.detail_kwh['T1'] > 0
        assert result.detail_kwh['T2'] == 0

    def test_simulation_depasse_t1(self, simulator):
        inp = RechargeInput(10000, 140, 'DPP', False)
        result = simulator.simulate(inp)
        assert result.tranche_avant == 1
        assert result.tranche_apres == 2
        assert result.detail_kwh['T1'] > 0
        assert result.detail_kwh['T2'] > 0

    def test_economie_t1(self, simulator):
        inp = RechargeInput(5000, 100, 'DPP', False)
        result = simulator.simulate(inp)
        if result.tranche_apres == 1:
            assert result.economie_baisse > 0

    def test_pas_economie_t2(self, simulator):
        inp = RechargeInput(10000, 200, 'DPP', False)
        result = simulator.simulate(inp)
        assert result.tranche_avant == 2
        assert result.economie_baisse == 0


class TestComparaison:
    def test_avec_sans_redevance(self):
        sim = RechargeSimulator('DPP')
        scenarios = sim.compare_scenarios(5000, 100, avec_redevance=True)
        assert 'sans_redevance' in scenarios
        assert 'avec_redevance' in scenarios
        assert 'difference' in scenarios
        assert scenarios['sans_redevance'].kwh_total > scenarios['avec_redevance'].kwh_total


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
