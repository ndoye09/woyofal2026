"""
Script d'ingestion automatique des données CSV vers PostgreSQL
Woyofal Data Warehouse - Grille Senelec 2026

Usage:
    python scripts/etl/load_to_warehouse.py
    python scripts/etl/load_to_warehouse.py --csv-path data/raw
"""

import os
import sys
import argparse
import logging
from datetime import datetime
from typing import Dict

import pandas as pd
import psycopg2
from psycopg2.extras import execute_values

# ============================================
# CONFIGURATION
# ============================================

DEFAULT_CONFIG = {
    'db_host': os.getenv('DB_HOST', 'localhost'),
    'db_port': os.getenv('DB_PORT', '5432'),
    'db_name': os.getenv('DB_NAME', 'woyofal_dwh'),
    'db_user': os.getenv('DB_USER', 'woyofal_user'),
    'db_password': os.getenv('DB_PASSWORD', 'woyofal2026'),
    'csv_path': 'data/raw',
    'batch_size': 5000
}

os.makedirs('logs', exist_ok=True)
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/ingestion.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)


class DataWarehouseLoader:
    def __init__(self, config: Dict = None):
        self.config = config or DEFAULT_CONFIG
        self.conn = None
        self.cursor = None
        self.stats = {
            'start_time': datetime.now(),
            'tables_loaded': [],
            'total_rows': 0,
            'errors': []
        }

    def connect(self) -> bool:
        logger.info("📡 Connexion à PostgreSQL...")
        max_retries = 3
        for attempt in range(1, max_retries + 1):
            try:
                self.conn = psycopg2.connect(
                    host=self.config['db_host'],
                    port=self.config['db_port'],
                    database=self.config['db_name'],
                    user=self.config['db_user'],
                    password=self.config['db_password']
                )
                self.cursor = self.conn.cursor()
                self.cursor.execute("SELECT version();")
                version = self.cursor.fetchone()[0]
                logger.info(f"✅ Connecté à PostgreSQL : {version[:50]}...")
                return True
            except psycopg2.Error as e:
                logger.warning(f"⚠️  Tentative {attempt}/{max_retries} échouée: {e}")
                if attempt == max_retries:
                    logger.error(f"❌ Impossible de se connecter après {max_retries} tentatives")
                    return False
                import time
                time.sleep(2)
        return False

    def disconnect(self):
        if self.cursor:
            self.cursor.close()
        if self.conn:
            self.conn.close()
        logger.info("🔌 Connexion fermée")

    def load_dim_date(self) -> int:
        logger.info("\n" + "="*70)
        logger.info("📅 Chargement dim_date...")
        logger.info("="*70)
        try:
            csv_file = os.path.join(self.config['csv_path'], 'consumption_daily.csv')
            df = pd.read_csv(csv_file, parse_dates=['date'])
            dates_uniques = df['date'].dt.date.unique()
            logger.info(f"   Dates uniques trouvées : {len(dates_uniques)}")
            inserted = 0
            for date in dates_uniques:
                dt = pd.to_datetime(date)
                nom_mois = dt.strftime('%B')
                trimestre = (dt.month - 1) // 3 + 1
                est_debut_mois = (dt.day == 1)
                est_fin_mois = (dt.day == dt.days_in_month)
                est_weekend = (dt.weekday() >= 5)
                self.cursor.execute(
                    """
                    INSERT INTO dim_date 
                    (date, jour, mois, annee, jour_semaine, nom_mois, 
                     trimestre, est_debut_mois, est_fin_mois, est_weekend)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (date) DO NOTHING
                    """,
                    (
                        dt.date(), dt.day, dt.month, dt.year,
                        dt.strftime('%A'), nom_mois, trimestre,
                        est_debut_mois, est_fin_mois, est_weekend
                    )
                )
                inserted += self.cursor.rowcount
            self.conn.commit()
            logger.info(f"✅ dim_date : {inserted} lignes insérées")
            return inserted
        except Exception as e:
            self.conn.rollback()
            logger.error(f"❌ Erreur dim_date : {e}")
            self.stats['errors'].append(('dim_date', str(e)))
            raise

    def load_dim_zones(self) -> int:
        logger.info("\n" + "="*70)
        logger.info("🗺️  Chargement dim_zones...")
        logger.info("="*70)
        try:
            csv_file = os.path.join(self.config['csv_path'], 'zones_senegal.csv')
            df = pd.read_csv(csv_file)
            logger.info(f"   Lignes CSV : {len(df)}")
            data = [tuple(row) for row in df[['zone_id', 'region', 'commune', 'population', 'type_zone', 'densite']].values]
            execute_values(
                self.cursor,
                """
                INSERT INTO dim_zones (zone_id, region, commune, population, type_zone, densite)
                VALUES %s
                ON CONFLICT (zone_id) DO UPDATE SET
                    region = EXCLUDED.region,
                    commune = EXCLUDED.commune,
                    population = EXCLUDED.population
                """,
                data
            )
            self.conn.commit()
            logger.info(f"✅ dim_zones : {len(df)} lignes insérées")
            return len(df)
        except Exception as e:
            self.conn.rollback()
            logger.error(f"❌ Erreur dim_zones : {e}")
            self.stats['errors'].append(('dim_zones', str(e)))
            raise

    def load_dim_users(self) -> int:
        logger.info("\n" + "="*70)
        logger.info("👥 Chargement dim_users...")
        logger.info("="*70)
        try:
            csv_file = os.path.join(self.config['csv_path'], 'users.csv')
            df = pd.read_csv(csv_file)
            logger.info(f"   Lignes CSV : {len(df):,}")
            if 'date_inscription' in df.columns:
                df['date_inscription'] = pd.to_datetime(df['date_inscription'])
            cols = ['user_id', 'prenom', 'nom', 'genre', 'email', 'telephone',
                    'type_compteur', 'numero_compteur', 'zone_id', 'date_inscription',
                    'conso_moyenne_jour', 'objectif_mensuel', 'actif']
            batch_size = self.config['batch_size']
            total_inserted = 0
            for i in range(0, len(df), batch_size):
                batch = df.iloc[i:i+batch_size]
                data = [tuple(row) for row in batch[cols].values]
                execute_values(
                    self.cursor,
                    f"""
                    INSERT INTO dim_users ({', '.join(cols)})
                    VALUES %s
                    ON CONFLICT (user_id) DO UPDATE SET
                        actif = EXCLUDED.actif
                    """,
                    data
                )
                total_inserted += len(batch)
                if (i + batch_size) % 5000 == 0:
                    logger.info(f"   → {total_inserted:,}/{len(df):,} users insérés...")
            self.conn.commit()
            logger.info(f"✅ dim_users : {len(df):,} lignes insérées")
            return len(df)
        except Exception as e:
            self.conn.rollback()
            logger.error(f"❌ Erreur dim_users : {e}")
            self.stats['errors'].append(('dim_users', str(e)))
            raise

    def load_fact_consumption(self) -> int:
        logger.info("\n" + "="*70)
        logger.info("📊 Chargement fact_consumption...")
        logger.info("="*70)
        try:
            csv_file = os.path.join(self.config['csv_path'], 'consumption_daily.csv')
            df = pd.read_csv(csv_file, parse_dates=['date'])
            logger.info(f"   Lignes CSV : {len(df):,}")
            logger.info(f"   ⚠️  Cela peut prendre 5-10 minutes pour 300k lignes...")
            self.cursor.execute("SELECT date, date_id FROM dim_date")
            date_mapping = {row[0]: row[1] for row in self.cursor.fetchall()}
            df['date_id'] = df['date'].dt.date.map(date_mapping)
            missing = df['date_id'].isna().sum()
            if missing > 0:
                logger.warning(f"⚠️  {missing} dates sans date_id correspondant")
                df = df.dropna(subset=['date_id'])
            cols = ['date_id', 'user_id', 'zone_id', 'tranche', 'conso_kwh',
                    'conso_cumul_mois', 'cout_fcfa', 'economie_baisse_10pct',
                    'jour_semaine', 'mois', 'annee']
            batch_size = self.config['batch_size']
            total_inserted = 0
            for i in range(0, len(df), batch_size):
                batch = df.iloc[i:i+batch_size]
                data = [tuple(row) for row in batch[cols].values]
                execute_values(
                    self.cursor,
                    f"""
                    INSERT INTO fact_consumption 
                    (date_id, user_id, zone_id, tranche_id, conso_kwh,
                     conso_cumul_mois, cout_fcfa, economie_baisse_10pct,
                     jour_semaine, mois, annee)
                    VALUES %s
                    """,
                    data
                )
                total_inserted += len(batch)
                if (i + batch_size) % 10000 == 0:
                    self.conn.commit()
                    logger.info(f"   → {total_inserted:,}/{len(df):,} lignes insérées...")
            self.conn.commit()
            logger.info(f"✅ fact_consumption : {len(df):,} lignes insérées")
            return len(df)
        except Exception as e:
            self.conn.rollback()
            logger.error(f"❌ Erreur fact_consumption : {e}")
            self.stats['errors'].append(('fact_consumption', str(e)))
            raise

    def load_fact_recharges(self) -> int:
        logger.info("\n" + "="*70)
        logger.info("💳 Chargement fact_recharges...")
        logger.info("="*70)
        try:
            csv_file = os.path.join(self.config['csv_path'], 'recharges.csv')
            df = pd.read_csv(csv_file, parse_dates=['date'])
            logger.info(f"   Lignes CSV : {len(df):,}")
            self.cursor.execute("SELECT date, date_id FROM dim_date")
            date_mapping = {row[0]: row[1] for row in self.cursor.fetchall()}
            df['date_id'] = df['date'].dt.date.map(date_mapping)
            cols = ['recharge_id', 'date_id', 'user_id', 'zone_id', 'tranche_finale',
                    'montant_brut', 'redevance', 'taxe_communale', 'montant_net',
                    'kwh_obtenus', 'cumul_mois_avant', 'economie_baisse',
                    'heure', 'canal_paiement', 'statut', 'mois', 'annee']
            if 'mois' not in df.columns:
                df['mois'] = pd.to_datetime(df['date']).dt.month
            if 'annee' not in df.columns:
                df['annee'] = pd.to_datetime(df['date']).dt.year
            batch_size = 2000
            total_inserted = 0
            for i in range(0, len(df), batch_size):
                batch = df.iloc[i:i+batch_size]
                data = [tuple(row) for row in batch[cols].values]
                execute_values(
                    self.cursor,
                    f"""
                    INSERT INTO fact_recharges 
                    (recharge_id, date_id, user_id, zone_id, tranche_finale_id,
                     montant_brut, redevance, taxe_communale, montant_net,
                     kwh_obtenus, cumul_mois_avant, economie_baisse,
                     heure, canal_paiement, statut, mois, annee)
                    VALUES %s
                    ON CONFLICT (recharge_id) DO NOTHING
                    """,
                    data
                )
                total_inserted += len(batch)
                if (i + batch_size) % 5000 == 0:
                    logger.info(f"   → {total_inserted:,}/{len(df):,} recharges insérées...")
            self.conn.commit()
            logger.info(f"✅ fact_recharges : {len(df):,} lignes insérées")
            return len(df)
        except Exception as e:
            self.conn.rollback()
            logger.error(f"❌ Erreur fact_recharges : {e}")
            self.stats['errors'].append(('fact_recharges', str(e)))
            raise

    def verify_load(self):
        logger.info("\n" + "="*70)
        logger.info("🔍 VÉRIFICATION CHARGEMENT")
        logger.info("="*70)
        tables = [
            'dim_date',
            'dim_zones',
            'dim_users',
            'dim_tranches',
            'fact_consumption',
            'fact_recharges'
        ]
        for table in tables:
            try:
                self.cursor.execute(f"SELECT COUNT(*) FROM {table}")
                count = self.cursor.fetchone()[0]
                logger.info(f"   {table:20s} : {count:>10,} lignes")
            except Exception as e:
                logger.error(f"   {table:20s} : ❌ Erreur - {e}")

    def run(self) -> bool:
        logger.info("="*70)
        logger.info("🚀 DÉMARRAGE PIPELINE INGESTION WOYOFAL")
        logger.info("="*70)
        try:
            if not self.connect():
                return False
            self.load_dim_date()
            self.stats['tables_loaded'].append('dim_date')
            self.load_dim_zones()
            self.stats['tables_loaded'].append('dim_zones')
            rows_users = self.load_dim_users()
            self.stats['total_rows'] += rows_users
            self.stats['tables_loaded'].append('dim_users')
            rows_conso = self.load_fact_consumption()
            self.stats['total_rows'] += rows_conso
            self.stats['tables_loaded'].append('fact_consumption')
            rows_rech = self.load_fact_recharges()
            self.stats['total_rows'] += rows_rech
            self.stats['tables_loaded'].append('fact_recharges')
            self.verify_load()
            self.print_stats()
            return True
        except Exception as e:
            logger.error(f"❌ Erreur fatale : {e}")
            return False
        finally:
            self.disconnect()

    def print_stats(self):
        duration = (datetime.now() - self.stats['start_time']).total_seconds()
        logger.info("\n" + "="*70)
        logger.info("📊 STATISTIQUES FINALES")
        logger.info("="*70)
        logger.info(f"⏱️  Durée totale : {duration:.1f} secondes ({duration/60:.1f} minutes)")
        logger.info(f"📦 Tables chargées : {len(self.stats['tables_loaded'])}")
        for table in self.stats['tables_loaded']:
            logger.info(f"   ✅ {table}")
        logger.info(f"📊 Total lignes insérées : {self.stats['total_rows']:,}")
        if self.stats['errors']:
            logger.warning(f"\n⚠️  Erreurs rencontrées : {len(self.stats['errors'])}")
            for table, error in self.stats['errors']:
                logger.warning(f"   {table} : {error}")
        else:
            logger.info("\n✅ AUCUNE ERREUR")
        logger.info("="*70)


def main():
    parser = argparse.ArgumentParser(description='Ingestion données Woyofal vers PostgreSQL')
    parser.add_argument('--csv-path', default='data/raw', help='Chemin dossier CSV')
    parser.add_argument('--db-host', default='localhost', help='Hôte PostgreSQL')
    parser.add_argument('--db-port', default='5432', help='Port PostgreSQL')
    parser.add_argument('--batch-size', type=int, default=5000, help='Taille batch')
    args = parser.parse_args()
    config = DEFAULT_CONFIG.copy()
    config['csv_path'] = args.csv_path
    config['db_host'] = args.db_host
    config['db_port'] = args.db_port
    config['batch_size'] = args.batch_size
    loader = DataWarehouseLoader(config)
    success = loader.run()
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
