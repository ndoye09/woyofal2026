"""
Script complet : charge les données et crée les data marts pour le dashboard.
"""
import os, sys
import pandas as pd
import psycopg2
import psycopg2.extras
from sqlalchemy import create_engine, text

# ─── Config BDD ───────────────────────────────────────────────────────────────
DB = dict(host='localhost', port=5432, dbname='woyofal_dwh',
          user='woyofal_user', password='woyofal2026')
ENGINE_URL = "postgresql+psycopg2://{user}:{password}@{host}:{port}/{dbname}".format(**DB)

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
RAW  = os.path.join(ROOT, 'data', 'raw')

def pg():
    return psycopg2.connect(**DB)

def engine():
    return create_engine(ENGINE_URL, pool_pre_ping=True)

# ─── 1. dim_tranches (tarifs Sénélec 2026) ────────────────────────────────────
TRANCHES = [
    # type_compteur, tranche_id, nom, seuil_min, seuil_max, prix_kwh
    ('DPP', 1, 'T1 (0-150 kWh)',    0,   150, 83),
    ('DPP', 2, 'T2 (151-300 kWh)', 151,  300, 107),
    ('DPP', 3, 'T3 (>300 kWh)',    301, 9999, 137),
    ('PPP', 4, 'T1 (0-150 kWh)',    0,   150, 83),
    ('PPP', 5, 'T2 (151-300 kWh)', 151,  300, 107),
    ('PPP', 6, 'T3 (>300 kWh)',    301, 9999, 137),
]

def load_tranches():
    conn = pg()
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM dim_tranches")
    if cur.fetchone()[0] > 0:
        print("  dim_tranches déjà chargée.")
        conn.close()
        return
    for tc, tid, nom, smin, smax, prix in TRANCHES:
        cur.execute("""
            INSERT INTO dim_tranches (tranche_id, type_compteur, nom, prix_kwh, seuil_min, seuil_max, annee_application)
            VALUES (%s, %s, %s, %s, %s, %s, 2026)
            ON CONFLICT (tranche_id) DO NOTHING
        """, (tid, tc, nom, prix, smin, smax))
    conn.commit()
    conn.close()
    print(f"  dim_tranches : {len(TRANCHES)} tranches insérées.")

# ─── 2. dim_date (depuis les dates des CSVs) ─────────────────────────────────
def upsert_dates(dates_list):
    import pandas as pd
    rows = []
    for d in set(dates_list):
        dt = pd.to_datetime(d)
        j = int(dt.day); m = int(dt.month); a = int(dt.year)
        rows.append((
            d, j, m, a,
            dt.strftime('%A'), dt.strftime('%B'),
            (m - 1) // 3 + 1,
            j == 1,
            (dt + pd.Timedelta(days=1)).day == 1,
            dt.weekday() >= 5
        ))
    conn = pg()
    cur = conn.cursor()
    psycopg2.extras.execute_values(cur, """
        INSERT INTO dim_date (date, jour, mois, annee, jour_semaine, nom_mois, trimestre,
                              est_debut_mois, est_fin_mois, est_weekend)
        VALUES %s ON CONFLICT (date) DO NOTHING
    """, rows)
    conn.commit()
    conn.close()
    print(f"  dim_date : {len(rows)} dates insérées/ignorées.")

# ─── 3. dim_users ─────────────────────────────────────────────────────────────
def load_users():
    conn = pg()
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM dim_users")
    if cur.fetchone()[0] > 0:
        print("  dim_users déjà chargée.")
        conn.close()
        return
    conn.close()
    df = pd.read_csv(os.path.join(RAW, 'users.csv'))
    # Colums disponibles
    cols_want = ['user_id', 'prenom', 'nom', 'genre', 'email', 'telephone',
                 'type_compteur', 'numero_compteur', 'zone_id',
                 'date_inscription', 'conso_moyenne_jour', 'objectif_mensuel', 'actif']
    df = df[[c for c in cols_want if c in df.columns]]
    eng = engine()
    df.to_sql('dim_users', eng, if_exists='append', index=False, method='multi', chunksize=2000)
    print(f"  dim_users : {len(df)} lignes insérées.")

# ─── 4. fact_consumption ──────────────────────────────────────────────────────
def load_consumption():
    conn = pg()
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM fact_consumption")
    if cur.fetchone()[0] > 0:
        print("  fact_consumption déjà chargée.")
        conn.close()
        return
    conn.close()

    df = pd.read_csv(os.path.join(RAW, 'consumption_daily.csv'), parse_dates=['date'])
    print(f"  consumption CSV colonnes: {list(df.columns)}")

    # Charger les dates
    upsert_dates(pd.to_datetime(df['date']).dt.date.tolist())

    eng = engine()
    date_map = pd.read_sql('SELECT date_id, date FROM dim_date', eng)
    date_map['date'] = pd.to_datetime(date_map['date']).dt.date
    df['date_key'] = pd.to_datetime(df['date']).dt.date
    df = df.merge(date_map, left_on='date_key', right_on='date', how='left')

    # Construire le dataframe de sortie
    out = pd.DataFrame()
    out['date_id'] = df['date_id']
    out['user_id'] = df['user_id']
    out['zone_id'] = df.get('zone_id', pd.Series(dtype='int64'))
    out['tranche_id'] = df.get('tranche_id', pd.Series(dtype='int64'))
    out['conso_kwh'] = df['conso_kwh']
    out['conso_cumul_mois'] = df.get('conso_cumul_mois', df.get('cumul_mois', None))
    out['cout_fcfa'] = df.get('cout_fcfa', None)
    out['economie_baisse_10pct'] = df.get('economie_baisse_10pct', df.get('economie_baisse', None))
    out['jour_semaine'] = df.get('jour_semaine', pd.to_datetime(df['date_key'].apply(str)).dt.strftime('%A'))
    out['mois'] = df.get('mois', pd.to_datetime(df['date_key'].apply(str)).dt.month)
    out['annee'] = df.get('annee', pd.to_datetime(df['date_key'].apply(str)).dt.year)

    out.to_sql('fact_consumption', eng, if_exists='append', index=False, method='multi', chunksize=2000)
    print(f"  fact_consumption : {len(out)} lignes insérées.")

# ─── 5. fact_recharges ────────────────────────────────────────────────────────
def load_recharges():
    conn = pg()
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM fact_recharges")
    if cur.fetchone()[0] > 0:
        print("  fact_recharges déjà chargée.")
        conn.close()
        return
    conn.close()

    df = pd.read_csv(os.path.join(RAW, 'recharges.csv'), parse_dates=['date'])
    print(f"  recharges CSV colonnes: {list(df.columns)}")

    upsert_dates(pd.to_datetime(df['date']).dt.date.tolist())

    eng = engine()
    date_map = pd.read_sql('SELECT date_id, date FROM dim_date', eng)
    date_map['date'] = pd.to_datetime(date_map['date']).dt.date
    df['date_key'] = pd.to_datetime(df['date']).dt.date
    df = df.merge(date_map, left_on='date_key', right_on='date', how='left')

    out = pd.DataFrame()
    out['date_id'] = df['date_id']
    out['user_id'] = df['user_id']
    out['zone_id'] = df.get('zone_id', pd.Series(dtype='int64'))
    out['tranche_finale_id'] = df.get('tranche_finale_id', df.get('tranche_id', None))
    out['montant_brut'] = df.get('montant_brut', df.get('montant', None))
    out['redevance'] = df.get('redevance', None)
    out['taxe_communale'] = df.get('taxe_communale', None)
    out['montant_net'] = df.get('montant_net', df.get('montant', None))
    out['kwh_obtenus'] = df.get('kwh_obtenus', df.get('kwh', None))
    out['cumul_mois_avant'] = df.get('cumul_mois_avant', df.get('cumul_mois', None))
    out['economie_baisse'] = df.get('economie_baisse', None)
    out['heure'] = df.get('heure', None)
    out['canal_paiement'] = df.get('canal_paiement', None)
    out['statut'] = df.get('statut', 'succès')
    out['mois'] = df.get('mois', pd.to_datetime(df['date_key'].apply(str)).dt.month)
    out['annee'] = df.get('annee', pd.to_datetime(df['date_key'].apply(str)).dt.year)

    out.to_sql('fact_recharges', eng, if_exists='append', index=False, method='multi', chunksize=2000)
    print(f"  fact_recharges : {len(out)} lignes insérées.")

# ─── 6. Créer les vues / data marts ──────────────────────────────────────────
SQL_MARTS = """
-- Vue de compatibilité dimension_dates -> dim_date
CREATE OR REPLACE VIEW dimension_dates AS SELECT * FROM dim_date;

-- KPIs globaux par mois
CREATE OR REPLACE VIEW mart_kpis_globaux AS
SELECT
    CONCAT(fc.annee, '-', LPAD(fc.mois::TEXT, 2, '0')) AS periode,
    COUNT(DISTINCT fc.user_id)                          AS users_actifs,
    COUNT(DISTINCT CASE WHEN du.type_compteur = 'DPP' THEN fc.user_id END) AS users_en_t1,
    SUM(fc.conso_kwh)                                   AS conso_totale_kwh,
    SUM(fc.cout_fcfa)                                   AS cout_total,
    SUM(fc.economie_baisse_10pct)                       AS economie_totale,
    COUNT(fr.recharge_id)                               AS nb_recharges,
    SUM(fr.montant_net)                                 AS montant_recharges_total
FROM fact_consumption fc
LEFT JOIN dim_users du ON fc.user_id = du.user_id
LEFT JOIN fact_recharges fr ON fc.user_id = fr.user_id
    AND fc.mois = fr.mois AND fc.annee = fr.annee
GROUP BY fc.annee, fc.mois;

-- Performance journalière
CREATE OR REPLACE VIEW mart_performance_journaliere AS
SELECT
    dd.date,
    SUM(fc.conso_kwh)   AS conso_totale_kwh,
    AVG(fc.conso_kwh)   AS conso_moyenne_kwh,
    COUNT(DISTINCT fc.user_id) AS users_actifs,
    ROUND(100.0 * COUNT(CASE WHEN du.type_compteur = 'DPP' THEN 1 END)
         / NULLIF(COUNT(*), 0), 1) AS pct_t1,
    COUNT(fr.recharge_id) AS nb_recharges
FROM fact_consumption fc
JOIN dim_date dd ON fc.date_id = dd.date_id
LEFT JOIN dim_users du ON fc.user_id = du.user_id
LEFT JOIN fact_recharges fr ON fc.user_id = fr.user_id AND fc.date_id = fr.date_id
GROUP BY dd.date;

-- Répartition par tranche
CREATE OR REPLACE VIEW mart_tarifs_2026 AS
SELECT
    CONCAT(fc.annee, '-', LPAD(fc.mois::TEXT, 2, '0'))  AS periode,
    du.type_compteur,
    dt.nom AS nom_tranche,
    fc.tranche_id AS tranche,
    COUNT(DISTINCT fc.user_id)                           AS nb_users_uniques,
    SUM(fc.conso_kwh)                                    AS conso_totale_kwh,
    SUM(fc.cout_fcfa)                                    AS cout_total_fcfa,
    SUM(fc.economie_baisse_10pct)                        AS economie_totale_fcfa
FROM fact_consumption fc
LEFT JOIN dim_users du ON fc.user_id = du.user_id
LEFT JOIN dim_tranches dt ON fc.tranche_id = dt.tranche_id
GROUP BY fc.annee, fc.mois, du.type_compteur, dt.nom, fc.tranche_id;

-- Consommation par région
CREATE OR REPLACE VIEW mart_conso_regions_mensuel AS
SELECT
    dz.region,
    dz.type_zone,
    fc.mois,
    fc.annee,
    COUNT(DISTINCT fc.user_id) AS nb_users_actifs,
    SUM(fc.conso_kwh)          AS conso_totale_kwh,
    SUM(fc.cout_fcfa)          AS cout_total,
    SUM(fc.economie_baisse_10pct) AS economie_totale
FROM fact_consumption fc
JOIN dim_zones dz ON fc.zone_id = dz.zone_id
GROUP BY dz.region, dz.type_zone, fc.mois, fc.annee;
"""

def create_marts():
    conn = pg()
    cur = conn.cursor()
    for stmt in SQL_MARTS.split(';'):
        s = stmt.strip()
        if s:
            cur.execute(s)
    conn.commit()
    conn.close()
    print("  Data marts créés avec succès.")

# ─── Main ─────────────────────────────────────────────────────────────────────
if __name__ == '__main__':
    print("=== 1. Chargement dim_tranches ===")
    load_tranches()
    print("=== 2. Chargement dim_users ===")
    load_users()
    print("=== 3. Chargement fact_consumption ===")
    load_consumption()
    print("=== 4. Chargement fact_recharges ===")
    load_recharges()
    print("=== 5. Création des data marts ===")
    create_marts()
    print("\nDone ! Rechargez le dashboard sur http://localhost:5173/dashboard")
