"""
Module de Feature Engineering - Woyofal Data Platform
Transformations et calculs pour Machine Learning

Fonctionnalités :
- Calcul kWh/montant final
- Ajout coût réel
- Création features ML
- Export datasets transformés
"""

import pandas as pd
import numpy as np
from datetime import datetime
import logging

# Configuration logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class FeatureEngineer:
    """Classe pour transformations et feature engineering"""
    def __init__(self, data_path: str = 'data/raw'):
        self.data_path = data_path
        self.df_consumption = None
        self.df_recharges = None
        self.df_users = None
        self.df_zones = None
        self.df_consumption_ml = None
        logger.info("FeatureEngineer initialisé")

    def load_data(self):
        """Charge toutes les données sources"""
        logger.info("📂 Chargement données...")
        self.df_zones = pd.read_csv(f'{self.data_path}/zones_senegal.csv')
        self.df_users = pd.read_csv(f'{self.data_path}/users.csv')
        self.df_consumption = pd.read_csv(f'{self.data_path}/consumption_daily.csv', parse_dates=['date'])
        self.df_recharges = pd.read_csv(f'{self.data_path}/recharges.csv', parse_dates=['date'])

        logger.info(f"✅ Consumption : {len(self.df_consumption):,} lignes")
        logger.info(f"✅ Recharges   : {len(self.df_recharges):,} lignes")
        logger.info(f"✅ Users       : {len(self.df_users):,} lignes")
        logger.info(f"✅ Zones       : {len(self.df_zones):,} lignes")

    def calculate_kwh_per_montant(self):
        """Calcule ratio kWh obtenus par FCFA dépensé"""
        logger.info("🔧 TRANSFORMATION 1 : Calcul kWh/Montant")
        # éviter division par zéro
        self.df_recharges['kwh_per_1000fcfa'] = (
            self.df_recharges['kwh_obtenus'] / self.df_recharges['montant_brut'].replace(0, np.nan) * 1000
        )
        self.df_recharges['efficacite_recharge'] = (
            self.df_recharges['kwh_obtenus'] / self.df_recharges['montant_brut'].replace(0, np.nan)
        )
        logger.info('✅ Colonnes ajoutées aux recharges : kwh_per_1000fcfa, efficacite_recharge')
        return self.df_recharges

    def add_cout_reel(self):
        """Ajoute coût réel incluant toutes les composantes"""
        logger.info('💰 TRANSFORMATION 2 : Ajout Coût Réel')
        # Coût AVEC baisse (existant)
        self.df_consumption['cout_avec_baisse'] = self.df_consumption['cout_fcfa']

        # Coût SANS baisse (ancien prix T1 = 91.11)
        self.df_consumption['cout_sans_baisse'] = self.df_consumption['cout_fcfa']
        mask_t1 = self.df_consumption['tranche'] == 1
        self.df_consumption.loc[mask_t1, 'cout_sans_baisse'] = (
            self.df_consumption.loc[mask_t1, 'conso_kwh'] * 91.11
        )

        # Coût si tout en T1
        self.df_consumption['cout_si_tout_t1'] = self.df_consumption['conso_kwh'] * 82.00

        # Surcoût vs optimal
        self.df_consumption['surcout_vs_optimal'] = (
            self.df_consumption['cout_avec_baisse'] - self.df_consumption['cout_si_tout_t1']
        )

        # Économie vs ancien tarif
        self.df_consumption['economie_vs_ancien'] = (
            self.df_consumption['cout_sans_baisse'] - self.df_consumption['cout_avec_baisse']
        )

        logger.info('✅ Colonnes ajoutées à consumption')
        return self.df_consumption

    def create_ml_features(self):
        """Crée features pour Machine Learning"""
        logger.info('🤖 TRANSFORMATION 3 : Features ML')
        df = self.df_consumption.copy()

        # s'assurer des colonnes mois/annee
        df['mois'] = df['date'].dt.month
        df['annee'] = df['date'].dt.year

        # Features temporelles
        df['jour_mois'] = df['date'].dt.day
        df['jour_semaine_num'] = df['date'].dt.dayofweek
        df['est_weekend'] = df['jour_semaine_num'].isin([5, 6]).astype(int)
        df['semaine_mois'] = ((df['jour_mois'] - 1) // 7) + 1
        df['est_debut_mois'] = (df['jour_mois'] <= 5).astype(int)
        df['est_fin_mois'] = (df['jour_mois'] >= 25).astype(int)
        df['saison'] = df['mois'].apply(lambda m: 'chaude' if m in [3,4,5,6] else 'fraiche')

        # Agrégées par user
        df = df.sort_values(['user_id', 'date'])
        df['conso_moy_7j'] = df.groupby('user_id')['conso_kwh'].transform(lambda x: x.rolling(window=7, min_periods=1).mean())
        df['conso_moy_14j'] = df.groupby('user_id')['conso_kwh'].transform(lambda x: x.rolling(window=14, min_periods=1).mean())
        df['conso_std_7j'] = df.groupby('user_id')['conso_kwh'].transform(lambda x: x.rolling(window=7, min_periods=1).std())
        df['conso_diff_j_1'] = df.groupby('user_id')['conso_kwh'].diff()

        # merger objectif_mensuel si présent
        if 'objectif_mensuel' in self.df_users.columns:
            df = df.merge(self.df_users[['user_id', 'objectif_mensuel']], on='user_id', how='left')
        else:
            df['objectif_mensuel'] = np.nan

        df['ratio_cumul_objectif'] = df['conso_cumul_mois'] / df['objectif_mensuel']
        df['jours_restant_mois'] = df['date'].dt.days_in_month - df['jour_mois']
        df['conso_projetee_fin_mois'] = df['conso_cumul_mois'] + (df['conso_moy_7j'] * df['jours_restant_mois'])

        # dérivées
        df['risque_depassement_t1'] = (df['conso_projetee_fin_mois'] > 150).astype(int)
        df['marge_avant_t2'] = np.where(df['tranche'] == 1, 150 - df['conso_cumul_mois'], 0)
        df['marge_avant_t3'] = np.where(df['tranche'] == 2, 250 - df['conso_cumul_mois'], 0)
        df['cv_conso'] = np.where(df['conso_moy_7j'] > 0, df['conso_std_7j'] / df['conso_moy_7j'], 0)
        df['economie_potentielle_t1'] = np.where(df['tranche'] > 1, df['conso_kwh'] * (136.49 - 82.00), 0)

        # zone
        df = df.merge(self.df_zones[['zone_id', 'type_zone', 'densite', 'population']], on='zone_id', how='left')
        df['type_zone_urbain'] = (df['type_zone'] == 'urbain').astype(int)
        df['type_zone_semi_urbain'] = (df['type_zone'] == 'semi_urbain').astype(int)
        df['type_zone_rural'] = (df['type_zone'] == 'rural').astype(int)

        # encodages
        df['type_compteur_dpp'] = (df['type_compteur'] == 'DPP').astype(int)
        df['type_compteur_ppp'] = (df['type_compteur'] == 'PPP').astype(int)
        df['saison_chaude'] = (df['saison'] == 'chaude').astype(int)
        for i in range(7):
            df[f'jour_semaine_{i}'] = (df['jour_semaine_num'] == i).astype(int)

        # targets
        df['target_depasse_t1'] = (df['conso_projetee_fin_mois'] > 150).astype(int)
        df['target_tranche_finale'] = df.groupby(['user_id', 'mois', 'annee'])['tranche'].transform('last')

        self.df_consumption_ml = df
        return df

    def export_transformed_datasets(self, output_path: str = 'data/processed'):
        """Exporte datasets transformés"""
        logger.info('💾 EXPORT DATASETS TRANSFORMÉS')
        import os
        os.makedirs(output_path, exist_ok=True)

        file1 = f'{output_path}/consumption_ml_features.csv'
        self.df_consumption_ml.to_csv(file1, index=False)

        file2 = f'{output_path}/recharges_transformed.csv'
        self.df_recharges.to_csv(file2, index=False)

        ml_features = [
            'conso_kwh', 'conso_cumul_mois', 'conso_moy_7j', 'conso_moy_14j',
            'conso_std_7j', 'conso_diff_j_1', 'ratio_cumul_objectif',
            'jours_restant_mois', 'marge_avant_t2', 'cv_conso',
            'jour_mois', 'jour_semaine_num', 'semaine_mois',
            'est_weekend', 'est_debut_mois', 'est_fin_mois', 'saison_chaude',
            'type_zone_urbain', 'type_zone_semi_urbain', 'population',
            'type_compteur_dpp', 'target_depasse_t1'
        ]

        df_ml_ready = self.df_consumption_ml[ml_features].dropna()
        file3 = f'{output_path}/dataset_ml_ready.csv'
        df_ml_ready.to_csv(file3, index=False)

        file4 = f'{output_path}/transformation_stats.txt'
        total_features = len(ml_features) - 1  # excluding target
        with open(file4, 'w') as f:
            f.write('FEATURE ENGINEERING\n')
            f.write(f'Date: {datetime.now().isoformat()}\n')
            f.write(f'consumption_ml_features: {self.df_consumption_ml.shape}\n')
            f.write(f'recharges_transformed: {self.df_recharges.shape}\n')
            f.write(f'dataset_ml_ready: {df_ml_ready.shape}\n')
            f.write(f'features_count (excl target): {total_features}\n')

        logger.info(f'✅ Exported: {file1}, {file2}, {file3}, {file4}')
        return {'consumption_ml': file1, 'recharges': file2, 'ml_ready': file3, 'stats': file4}

    def run_full_pipeline(self):
        start = datetime.now()
        self.load_data()
        self.calculate_kwh_per_montant()
        self.add_cout_reel()
        self.create_ml_features()
        files = self.export_transformed_datasets()
        duration = (datetime.now() - start).total_seconds()
        logger.info(f'Pipeline complete in {duration:.1f}s')
        return files


def main():
    print('🔧 FEATURE ENGINEERING - WOYOFAL DATA PLATFORM')
    fe = FeatureEngineer(data_path='data/raw')
    files = fe.run_full_pipeline()
    print('Fichiers créés:')
    for k, v in files.items():
        print(f' - {k}: {v}')


if __name__ == '__main__':
    main()
