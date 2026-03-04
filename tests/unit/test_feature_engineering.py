"""
Tests unitaires pour feature engineering
"""
import pytest
import sys
import os

sys.path.insert(0, os.path.abspath('scripts/transformation'))

from feature_engineering import FeatureEngineer


class TestFeatureEngineer:
    @pytest.fixture
    def fe(self):
        fe = FeatureEngineer('data/raw')
        fe.load_data()
        return fe

    def test_load_data(self, fe):
        assert fe.df_consumption is not None
        assert fe.df_recharges is not None
        assert len(fe.df_consumption) > 0
        assert len(fe.df_recharges) > 0

    def test_calculate_kwh_per_montant(self, fe):
        df = fe.calculate_kwh_per_montant()
        assert 'kwh_per_1000fcfa' in df.columns
        assert 'efficacite_recharge' in df.columns
        assert (df['kwh_per_1000fcfa'].dropna() > 0).any()

    def test_add_cout_reel(self, fe):
        df = fe.add_cout_reel()
        assert 'cout_avec_baisse' in df.columns
        assert 'cout_sans_baisse' in df.columns
        assert 'cout_si_tout_t1' in df.columns

    def test_create_ml_features(self, fe):
        fe.add_cout_reel()
        df = fe.create_ml_features()
        assert 'jour_mois' in df.columns
        assert 'est_weekend' in df.columns
        assert 'conso_moy_7j' in df.columns
        assert 'conso_moy_14j' in df.columns
        assert 'target_depasse_t1' in df.columns

    def test_pipeline_complet(self, fe):
        files = fe.run_full_pipeline()
        assert isinstance(files, dict)
        assert 'consumption_ml' in files and os.path.exists(files['consumption_ml'])
        assert 'ml_ready' in files and os.path.exists(files['ml_ready'])


if __name__ == '__main__':
    pytest.main([__file__, '-q'])
