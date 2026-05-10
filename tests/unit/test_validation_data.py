"""
Tests validation qualité des données
"""
import pytest
import pandas as pd

@pytest.fixture
def sample_zones():
    return pd.DataFrame({
        'zone_id': [1,2,3],
        'region': ['Dakar','Thiès','Saint-Louis'],
        'commune': ['Pikine','Thiès','Saint-Louis'],
        'population': [300000,250000,180000],
        'type_zone': ['urbain','urbain','urbain']
    })

@pytest.fixture
def sample_users():
    return pd.DataFrame({
        'user_id': [1,2,3],
        'prenom': ['Amadou','Fatou','Moussa'],
        'nom': ['Diop','Ndiaye','Fall'],
        'type_compteur': ['DPP','DPP','PPP'],
        'zone_id': [1,2,3],
        'conso_moyenne_jour': [5.5,6.2,15.3]
    })

class TestStructureDonnees:
    def test_zones_colonnes_requises(self, sample_zones):
        required = ['zone_id','region','commune','population','type_zone']
        assert all(col in sample_zones.columns for col in required)
    def test_users_colonnes_requises(self, sample_users):
        required = ['user_id','type_compteur','zone_id','conso_moyenne_jour']
        assert all(col in sample_users.columns for col in required)
    def test_zones_pas_nulls(self, sample_zones):
        assert sample_zones.isnull().sum().sum() == 0
    def test_users_user_id_unique(self, sample_users):
        assert sample_users['user_id'].is_unique

class TestValeursDonnees:
    def test_population_positive(self, sample_zones):
        assert (sample_zones['population'] > 0).all()
    def test_type_compteur_valide(self, sample_users):
        assert sample_users['type_compteur'].isin(['DPP','PPP']).all()
    def test_conso_moyenne_positive(self, sample_users):
        assert (sample_users['conso_moyenne_jour'] > 0).all()
    def test_zone_id_existe(self, sample_users, sample_zones):
        assert sample_users['zone_id'].isin(sample_zones['zone_id']).all()

class TestCoherenceDonnees:
    def test_nb_zones_attendu(self, sample_zones):
        assert len(sample_zones) >= 3
    def test_conso_moyenne_selon_type(self, sample_users):
        conso_dpp = sample_users[sample_users['type_compteur']=='DPP']['conso_moyenne_jour'].mean()
        conso_ppp = sample_users[sample_users['type_compteur']=='PPP']['conso_moyenne_jour'].mean()
        if conso_ppp > 0 and conso_dpp > 0:
            assert conso_ppp > conso_dpp
