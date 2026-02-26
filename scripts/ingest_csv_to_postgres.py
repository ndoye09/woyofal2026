import os
import logging
from datetime import datetime

import pandas as pd
from sqlalchemy import create_engine, text
import psycopg2.extras

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
log = logging.getLogger(__name__)


DB_HOST = os.getenv('WOYOFAL_DB_HOST', '127.0.0.1')
DB_PORT = int(os.getenv('WOYOFAL_DB_PORT', 5432))
DB_NAME = os.getenv('WOYOFAL_DB_NAME', 'woyofal_dwh')
DB_USER = os.getenv('WOYOFAL_DB_USER', 'woyofal_user')
DB_PASS = os.getenv('WOYOFAL_DB_PASS', 'woyofal2026')


def create_engine_url():
    # use pg8000 (pure-Python) driver to avoid native psycopg2 encoding issues on Windows
    return f"postgresql+pg8000://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}"


def upsert_dim_date(engine, dates_series):
    # dates_series: iterable of datetime.date
    unique_dates = pd.to_datetime(pd.Series(list(dates_series))).dt.date.unique()
    rows = []
    for d in unique_dates:
        dt = pd.to_datetime(d)
        jour = int(dt.day)
        mois = int(dt.month)
        annee = int(dt.year)
        jour_semaine = dt.strftime('%A')
        nom_mois = dt.strftime('%B')
        trimestre = (mois - 1) // 3 + 1
        est_debut_mois = jour == 1
        # est_fin_mois: compute by moving to next day
        next_day = dt + pd.Timedelta(days=1)
        est_fin_mois = next_day.day == 1
        est_weekend = dt.weekday() >= 5
        rows.append((d, jour, mois, annee, jour_semaine, nom_mois, trimestre, est_debut_mois, est_fin_mois, est_weekend))

    insert_sql = '''
    INSERT INTO dim_date (date, jour, mois, annee, jour_semaine, nom_mois, trimestre, est_debut_mois, est_fin_mois, est_weekend)
    VALUES %s
    ON CONFLICT (date) DO NOTHING
    '''

    conn = engine.raw_connection()
    try:
        cur = conn.cursor()
        psycopg2.extras.execute_values(cur, insert_sql, rows, template=None, page_size=100)
        conn.commit()
        log.info('Inserted/ignored %d date rows into dim_date', len(rows))
    finally:
        conn.close()


def load_dim_zones(engine, path):
    df = pd.read_csv(path)
    df = df[['zone_id', 'region', 'commune', 'population', 'type_zone', 'densite']]
    df.to_sql('dim_zones', engine, if_exists='append', index=False, method='multi', chunksize=1000)
    log.info('Loaded %d rows into dim_zones', len(df))


def load_dim_users(engine, path):
    df = pd.read_csv(path, parse_dates=['date_inscription'])
    want = ['user_id', 'prenom', 'nom', 'genre', 'email', 'telephone', 'type_compteur', 'numero_compteur', 'zone_id', 'date_inscription', 'conso_moyenne_jour', 'objectif_mensuel', 'actif']
    df = df[want]
    df.to_sql('dim_users', engine, if_exists='append', index=False, method='multi', chunksize=1000)
    log.info('Loaded %d rows into dim_users', len(df))


def load_fact_consumption(engine, path):
    df = pd.read_csv(path, parse_dates=['date'])
    # map date -> date_id
    df_dates = pd.DataFrame({'date': pd.to_datetime(df['date']).dt.date})
    upsert_dim_date(engine, df_dates['date'])

    # fetch mapping
    date_map = pd.read_sql('SELECT date_id, date FROM dim_date', engine)
    date_map['date'] = pd.to_datetime(date_map['date']).dt.date

    df['date'] = pd.to_datetime(df['date']).dt.date
    df = df.merge(date_map, left_on='date', right_on='date', how='left')
    df.rename(columns={'date_id': 'date_id'}, inplace=True)

    # select / rename columns matching fact_consumption
    out = pd.DataFrame()
    out['date_id'] = df['date_id']
    out['user_id'] = df['user_id']
    out['zone_id'] = df['zone_id']
    out['tranche_id'] = df.get('tranche')
    out['conso_kwh'] = df['conso_kwh']
    out['conso_cumul_mois'] = df['conso_cumul_mois']
    out['cout_fcfa'] = df['cout_fcfa']
    out['economie_baisse_10pct'] = df.get('economie_baisse_10pct')
    out['jour_semaine'] = df.get('jour_semaine')
    out['mois'] = df['mois']
    out['annee'] = df['annee']

    out.to_sql('fact_consumption', engine, if_exists='append', index=False, method='multi', chunksize=2000)
    log.info('Loaded %d rows into fact_consumption', len(out))


def load_fact_recharges(engine, path):
    df = pd.read_csv(path, parse_dates=['date'])
    # ensure dates in dim_date
    df_dates = pd.DataFrame({'date': pd.to_datetime(df['date']).dt.date})
    upsert_dim_date(engine, df_dates['date'])

    date_map = pd.read_sql('SELECT date_id, date FROM dim_date', engine)
    date_map['date'] = pd.to_datetime(date_map['date']).dt.date

    df['date'] = pd.to_datetime(df['date']).dt.date
    df = df.merge(date_map, left_on='date', right_on='date', how='left')

    out = pd.DataFrame()
    out['recharge_id'] = df['recharge_id']
    out['date_id'] = df['date_id']
    out['user_id'] = df['user_id']
    out['zone_id'] = df['zone_id']
    out['tranche_finale_id'] = df.get('tranche_finale')
    out['montant_brut'] = df['montant_brut']
    out['redevance'] = df.get('redevance')
    out['taxe_communale'] = df.get('taxe_communale')
    out['montant_net'] = df['montant_net']
    out['kwh_obtenus'] = df['kwh_obtenus']
    out['cumul_mois_avant'] = df.get('cumul_mois_avant')
    out['economie_baisse'] = df.get('economie_baisse')
    out['heure'] = df.get('heure')
    out['canal_paiement'] = df.get('canal_paiement')
    out['statut'] = df.get('statut')
    out['mois'] = pd.to_datetime(df['date']).dt.month
    out['annee'] = pd.to_datetime(df['date']).dt.year

    # Use to_sql; if duplicates on primary key occur, user can re-run with a clean DB or use SQL upsert enhancements
    out.to_sql('fact_recharges', engine, if_exists='append', index=False, method='multi', chunksize=2000)
    log.info('Loaded %d rows into fact_recharges', len(out))


def main():
    # Ensure libpq/psycopg2 use UTF8 client encoding to avoid locale decode issues
    os.environ.setdefault('PGCLIENTENCODING', 'UTF8')
    engine = create_engine(create_engine_url(), pool_pre_ping=True)

    root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    data_dir = os.path.join(root, 'data', 'raw')

    log.info('Starting ingestion using DB %s@%s:%s/%s', DB_USER, DB_HOST, DB_PORT, DB_NAME)

    load_dim_zones(engine, os.path.join(data_dir, 'zones_senegal.csv'))
    load_dim_users(engine, os.path.join(data_dir, 'users.csv'))
    load_fact_consumption(engine, os.path.join(data_dir, 'consumption_daily.csv'))
    load_fact_recharges(engine, os.path.join(data_dir, 'recharges.csv'))

    log.info('Ingestion terminée')


if __name__ == '__main__':
    main()
