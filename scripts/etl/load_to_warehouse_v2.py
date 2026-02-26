"""
Version optimisée du script d'ingestion (référence)
Améliorations : transactions batch, COPY PostgreSQL, rebuild indexes
"""
import os
import logging
from datetime import datetime
import pandas as pd
import psycopg2
from psycopg2.extras import execute_values
from io import StringIO

logger = logging.getLogger(__name__)


class OptimizedLoader:
    """Chargeur optimisé avec COPY PostgreSQL"""
    
    def __init__(self, conn):
        self.conn = conn
        self.cursor = conn.cursor()
    
    def bulk_copy_from_dataframe(self, df: pd.DataFrame, table_name: str, columns: list):
        logger.info(f"   COPY optimisé : {len(df):,} lignes → {table_name}")
        buffer = StringIO()
        df[columns].to_csv(buffer, index=False, header=False, sep='\t', na_rep='\\N')
        buffer.seek(0)
        self.cursor.copy_from(
            buffer,
            table_name,
            columns=columns,
            sep='\t',
            null='\\N'
        )
        logger.info(f"   ✅ COPY terminé : {len(df):,} lignes")
    
    def rebuild_indexes(self, table_name: str):
        logger.info(f"   Reconstruction indexes {table_name}...")
        self.cursor.execute(f"REINDEX TABLE {table_name}")


def load_fact_consumption_optimized(config, conn):
    csv_file = os.path.join(config['csv_path'], 'consumption_daily.csv')
    df = pd.read_csv(csv_file, parse_dates=['date'])
    logger.info(f"📊 Chargement optimisé fact_consumption : {len(df):,} lignes")
    cursor = conn.cursor()
    cursor.execute("SELECT date, date_id FROM dim_date")
    date_mapping = {row[0]: row[1] for row in cursor.fetchall()}
    df['date_id'] = df['date'].dt.date.map(date_mapping)
    cursor.execute("ALTER TABLE fact_consumption DISABLE TRIGGER ALL")
    loader = OptimizedLoader(conn)
    cols = ['date_id', 'user_id', 'zone_id', 'tranche_id', 'conso_kwh',
            'conso_cumul_mois', 'cout_fcfa', 'economie_baisse_10pct']
    loader.bulk_copy_from_dataframe(df, 'fact_consumption', cols)
    cursor.execute("ALTER TABLE fact_consumption ENABLE TRIGGER ALL")
    loader.rebuild_indexes('fact_consumption')
    conn.commit()
    logger.info(f"✅ fact_consumption optimisé : {len(df):,} lignes")
