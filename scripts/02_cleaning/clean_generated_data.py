"""
Data Cleaning - Étape 2 du Pipeline
Nettoie les données IMMÉDIATEMENT après génération

Input  : data/01_raw/*.csv (données brutes générées)
Output : data/02_cleaned/*.csv (données propres)
"""

import pandas as pd
import numpy as np
from datetime import datetime
import logging
import sys
import os

# Configuration logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/02_data_cleaning.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)


class DataCleaner:
    def __init__(self, input_path='data/01_raw', output_path='data/02_cleaned'):
        self.input_path = input_path
        self.output_path = output_path
        self.stats = {
            'timestamp': datetime.now().isoformat(),
            'datasets': {}
        }

    def clean_all_datasets(self):
        logger.info('\n' + '=' * 70)
        logger.info('🧹 ÉTAPE 2 : DATA CLEANING')
        logger.info('=' * 70)

        datasets = self.load_raw_data()
        datasets = self.validate_and_clean(datasets)
        self.export_cleaned_data(datasets)
        self.generate_report()

        logger.info('\n✅ NETTOYAGE TERMINÉ : Données propres prêtes pour ingestion')
        return datasets

    def load_raw_data(self):
        logger.info(f"\n📂 Chargement depuis {self.input_path}/")

        datasets = {}
        datasets['zones'] = pd.read_csv(os.path.join(self.input_path, 'zones_senegal.csv'))
        datasets['users'] = pd.read_csv(os.path.join(self.input_path, 'users.csv'))
        datasets['consumption'] = pd.read_csv(os.path.join(self.input_path, 'consumption_daily.csv'), parse_dates=['date'])
        datasets['recharges'] = pd.read_csv(os.path.join(self.input_path, 'recharges.csv'), parse_dates=['date'])

        for name, df in datasets.items():
            logger.info(f"   ✅ {name:15s} : {len(df):>8,} lignes × {len(df.columns):>2} cols")
            self.stats['datasets'][name] = {'raw_rows': len(df), 'raw_cols': len(df.columns)}

        return datasets

    def validate_and_clean(self, datasets):
        logger.info('\n1️⃣ Vérification valeurs manquantes...')
        for name, df in datasets.items():
            nulls = int(df.isna().sum().sum())
            if nulls > 0:
                logger.warning(f"   ⚠️  {name} : {nulls} valeurs manquantes")
                df = self.handle_missing(df, name)
            else:
                logger.info(f"   ✅ {name} : Aucune valeur manquante")
            self.stats['datasets'][name]['nulls_found'] = nulls
            datasets[name] = df

        logger.info('\n2️⃣ Suppression doublons...')
        for name, df in datasets.items():
            before = len(df)
            if name == 'zones':
                df = df.drop_duplicates(subset=['zone_id'], keep='first')
            elif name == 'users':
                if 'user_id' in df.columns:
                    df = df.drop_duplicates(subset=['user_id'], keep='first')
                else:
                    df = df.drop_duplicates()
            elif name == 'consumption':
                if set(['date', 'user_id']).issubset(df.columns):
                    df = df.drop_duplicates(subset=['date', 'user_id'], keep='first')
                else:
                    df = df.drop_duplicates()
            elif name == 'recharges':
                if 'recharge_id' in df.columns:
                    df = df.drop_duplicates(subset=['recharge_id'], keep='first')
                else:
                    df = df.drop_duplicates()

            removed = before - len(df)
            if removed > 0:
                logger.warning(f"   ⚠️  {name} : {removed} doublons supprimés")
            else:
                logger.info(f"   ✅ {name} : Aucun doublon")

            self.stats['datasets'][name]['duplicates_removed'] = removed
            datasets[name] = df

        logger.info('\n3️⃣ Traitement outliers (IQR) & capping...')
        numeric_cols = {
            'consumption': ['conso_kwh', 'cout_fcfa'],
            'recharges': ['montant_brut', 'kwh_obtenus']
        }

        for name in numeric_cols:
            if name not in datasets:
                continue
            df = datasets[name]
            for col in numeric_cols[name]:
                if col not in df.columns:
                    continue
                Q1 = df[col].quantile(0.25)
                Q3 = df[col].quantile(0.75)
                IQR = Q3 - Q1
                lower = Q1 - 1.5 * IQR
                upper = Q3 + 1.5 * IQR
                outliers = int(((df[col] < lower) | (df[col] > upper)).sum())
                if outliers > 0:
                    df[col] = df[col].clip(lower=lower, upper=upper)
                    logger.info(f"   {name}.{col} : {outliers} outliers cappés [{lower:.2f}, {upper:.2f}]")
                    self.stats['datasets'][name].setdefault('outliers', {})[col] = outliers
            datasets[name] = df

        logger.info('\n4️⃣ Validation cohérence...')
        # Intégrité référentielle users.zone_id -> zones.zone_id
        if 'zones' in datasets and 'users' in datasets:
            valid_zones = set(datasets['zones']['zone_id']) if 'zone_id' in datasets['zones'].columns else set()
            if valid_zones and 'zone_id' in datasets['users'].columns:
                users_zones = set(datasets['users']['zone_id'])
                invalid = users_zones - valid_zones
                if len(invalid) > 0:
                    logger.error(f"   ❌ {len(invalid)} zone_id invalides dans users")
                    datasets['users'] = datasets['users'][datasets['users']['zone_id'].isin(valid_zones)]
                    logger.info(f"   ✅ Lignes invalides supprimées")
                else:
                    logger.info(f"   ✅ Intégrité référentielle OK")

        # Basic range checks
        if 'consumption' in datasets:
            dfc = datasets['consumption']
            if 'conso_kwh' in dfc.columns:
                assert (dfc['conso_kwh'] >= 0).all(), "Conso négative détectée"
            if 'tranche' in dfc.columns:
                assert dfc['tranche'].isin([1, 2, 3]).all(), "Tranche invalide"
        if 'recharges' in datasets:
            dfr = datasets['recharges']
            if 'montant_brut' in dfr.columns:
                assert (dfr['montant_brut'] > 0).all(), "Montant <= 0 détecté"

        for name, df in datasets.items():
            self.stats['datasets'][name]['clean_rows'] = len(df)
            self.stats['datasets'][name]['clean_cols'] = len(df.columns)

        logger.info('   ✅ Tous les checks terminés')
        return datasets

    def handle_missing(self, df, name):
        for col in df.columns:
            if df[col].isna().any():
                if pd.api.types.is_numeric_dtype(df[col]):
                    df[col].fillna(df[col].median(), inplace=True)
                else:
                    df[col].fillna(df[col].mode().iloc[0] if not df[col].mode().empty else '', inplace=True)
        return df

    def export_cleaned_data(self, datasets):
        logger.info(f"\n💾 Export vers {self.output_path}/")
        os.makedirs(self.output_path, exist_ok=True)
        for name, df in datasets.items():
            filepath = os.path.join(self.output_path, f"{name}_clean.csv")
            df.to_csv(filepath, index=False)
            logger.info(f"   ✅ {filepath} : {len(df):,} lignes")

    def generate_report(self):
        import json
        os.makedirs(self.output_path, exist_ok=True)
        with open(os.path.join(self.output_path, 'cleaning_report.json'), 'w', encoding='utf-8') as f:
            json.dump(self.stats, f, indent=2, ensure_ascii=False)
        with open(os.path.join(self.output_path, 'cleaning_report.txt'), 'w', encoding='utf-8') as f:
            f.write('=' * 70 + "\n")
            f.write('RAPPORT NETTOYAGE DONNÉES\n')
            f.write('=' * 70 + "\n\n")
            f.write(f"Date : {self.stats['timestamp']}\n\n")
            for name, stats in self.stats['datasets'].items():
                f.write(f"\n{name.upper()}:\n")
                f.write(f"  Lignes brutes  : {stats.get('raw_rows',0):,}\n")
                f.write(f"  Lignes propres : {stats.get('clean_rows',0):,}\n")
                if 'duplicates_removed' in stats:
                    f.write(f"  Doublons       : {stats['duplicates_removed']}\n")
                if 'outliers' in stats:
                    f.write(f"  Outliers       : {sum(stats['outliers'].values())}\n")
        logger.info('   ✅ Rapports générés')


def main():
    os.makedirs('logs', exist_ok=True)
    cleaner = DataCleaner(input_path='data/01_raw', output_path='data/02_cleaned')
    cleaner.clean_all_datasets()


if __name__ == '__main__':
    main()
