"""
Chargement robuste des données Woyofal dans PostgreSQL.

Colonnes CSV :
  users.csv          : user_id, prenom, nom, genre, email, telephone,
                       type_compteur, numero_compteur, zone_id, region, commune,
                       type_zone, date_inscription, conso_moyenne_jour,
                       objectif_mensuel, actif
  consumption_daily  : date, user_id, numero_compteur, zone_id, region,
                       type_compteur, conso_kwh, conso_cumul_mois, tranche (1-3),
                       prix_kwh, cout_fcfa, economie_baisse_10pct, jour_semaine,
                       mois, annee
  recharges.csv      : recharge_id, date, heure, user_id, numero_compteur, zone_id,
                       region, type_compteur, montant_brut, redevance, taxe_communale,
                       montant_net, kwh_obtenus, cumul_mois_avant, tranche_finale (1-3),
                       economie_baisse, canal_paiement, statut
"""
import os, io
import pandas as pd
import psycopg2
import psycopg2.extras
from sqlalchemy import create_engine

DB = dict(host='localhost', port=5432, dbname='woyofal_dwh',
          user='woyofal_user', password='woyofal2026')
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
RAW  = os.path.join(ROOT, 'data', 'raw')

# Mapping (type_compteur, tranche_int) → tranche_id dans dim_tranches
TRANCHE_MAP = {
    ('DPP', 1): 1, ('DPP', 2): 2, ('DPP', 3): 3,
    ('PPP', 1): 4, ('PPP', 2): 5, ('PPP', 3): 6,
}
TRANCHE_DF = pd.DataFrame([
    {'type_compteur': k[0], 'tranche_num': k[1], 'tranche_id': v}
    for k, v in TRANCHE_MAP.items()
])

def pg():
    return psycopg2.connect(**DB)

def engine():
    return create_engine(
        "postgresql+psycopg2://{user}:{password}@{host}:{port}/{dbname}".format(**DB),
        pool_pre_ping=True)

# ── helpers ───────────────────────────────────────────────────────────────────
def _count(table):
    conn = pg(); cur = conn.cursor()
    cur.execute(f"SELECT COUNT(*) FROM {table}")
    n = cur.fetchone()[0]; conn.close()
    return n

def _copy(cur, df, tmp_table, cols):
    """COPY df (already with correct columns) via StringIO into tmp_table."""
    buf = io.StringIO()
    df[cols].to_csv(buf, index=False, header=False, na_rep='\\N')
    buf.seek(0)
    cur.copy_expert(
        f"COPY {tmp_table} ({','.join(cols)}) FROM STDIN WITH CSV NULL '\\N'",
        buf)

# ── 1. dim_date ───────────────────────────────────────────────────────────────
def upsert_dates(dates_list):
    rows = []
    for d in sorted(set(dates_list)):
        dt = pd.Timestamp(d)
        m = dt.month
        rows.append((
            dt.date(), dt.day, m, dt.year,
            dt.strftime('%A'), dt.strftime('%B'),
            (m - 1) // 3 + 1,
            dt.day == 1,
            (dt + pd.Timedelta(days=1)).month != m,
            dt.weekday() >= 5
        ))
    conn = pg(); cur = conn.cursor()
    psycopg2.extras.execute_values(cur, """
        INSERT INTO dim_date
            (date, jour, mois, annee, jour_semaine, nom_mois,
             trimestre, est_debut_mois, est_fin_mois, est_weekend)
        VALUES %s ON CONFLICT (date) DO NOTHING
    """, rows)
    conn.commit(); conn.close()
    print(f"  dim_date : {len(rows)} dates insérées/ignorées.")

# ── 2. dim_users ──────────────────────────────────────────────────────────────
def load_users():
    if _count('dim_users') > 0:
        print("  dim_users : déjà peuplée, ignorée.")
        return
    cols = ['user_id','prenom','nom','genre','email','telephone',
            'type_compteur','numero_compteur','zone_id',
            'date_inscription','conso_moyenne_jour','objectif_mensuel','actif']
    df = pd.read_csv(os.path.join(RAW, 'users.csv'))
    df = df[[c for c in cols if c in df.columns]]
    # Dédoublonner uniquement sur user_id (PK)
    df = df.drop_duplicates('user_id')
    rows = [tuple(r) for r in df.itertuples(index=False)]
    conn = pg(); cur = conn.cursor()
    psycopg2.extras.execute_values(
        cur,
        f"INSERT INTO dim_users ({','.join(df.columns)}) VALUES %s"
        " ON CONFLICT (user_id) DO NOTHING",
        rows, page_size=500)
    conn.commit(); conn.close()
    print(f"  dim_users : {len(rows)} lignes insérées.")

# ── 3. fact_consumption ───────────────────────────────────────────────────────
def load_consumption():
    if _count('fact_consumption') > 0:
        print("  fact_consumption : déjà peuplée, ignorée.")
        return

    df = pd.read_csv(os.path.join(RAW, 'consumption_daily.csv'))
    df['date'] = pd.to_datetime(df['date']).dt.date

    # Peupler dim_date
    upsert_dates(df['date'].tolist())

    # Récupérer date_id
    date_map = pd.read_sql('SELECT date_id, date FROM dim_date', engine())
    date_map['date'] = pd.to_datetime(date_map['date']).dt.date
    df = df.merge(date_map, on='date', how='left')

    # Mapper tranche (1-3) + type_compteur → tranche_id
    df['tranche_num'] = df['tranche'].astype(int)
    df = df.merge(TRANCHE_DF, on=['type_compteur', 'tranche_num'], how='left')

    cols = ['date_id','user_id','zone_id','tranche_id','conso_kwh','conso_cumul_mois',
            'cout_fcfa','economie_baisse_10pct','jour_semaine','mois','annee']
    df = df[cols]

    conn = pg(); cur = conn.cursor()
    cur.execute("CREATE TEMP TABLE tmp_fc AS SELECT %s FROM fact_consumption WHERE FALSE"
                % ','.join(cols))
    _copy(cur, df, 'tmp_fc', cols)
    cur.execute(f"""
        INSERT INTO fact_consumption ({','.join(cols)})
        SELECT {','.join(cols)} FROM tmp_fc
    """)
    conn.commit(); conn.close()
    print(f"  fact_consumption : {len(df)} lignes insérées.")

# ── 4. fact_recharges ─────────────────────────────────────────────────────────
def load_recharges():
    if _count('fact_recharges') > 0:
        print("  fact_recharges : déjà peuplée, ignorée.")
        return

    df = pd.read_csv(os.path.join(RAW, 'recharges.csv'))
    df['date'] = pd.to_datetime(df['date']).dt.date

    upsert_dates(df['date'].tolist())

    date_map = pd.read_sql('SELECT date_id, date FROM dim_date', engine())
    date_map['date'] = pd.to_datetime(date_map['date']).dt.date
    df = df.merge(date_map, on='date', how='left')

    df['tranche_num'] = df['tranche_finale'].astype(int)
    df = df.merge(TRANCHE_DF.rename(columns={'tranche_id': 'tranche_finale_id'}),
                  on=['type_compteur', 'tranche_num'], how='left')

    df['mois']  = pd.to_datetime(df['date'].astype(str)).dt.month
    df['annee'] = pd.to_datetime(df['date'].astype(str)).dt.year

    cols = ['recharge_id','date_id','user_id','zone_id','tranche_finale_id',
            'montant_brut','redevance','taxe_communale','montant_net','kwh_obtenus',
            'cumul_mois_avant','economie_baisse','heure','canal_paiement','statut',
            'mois','annee']
    df = df[cols].drop_duplicates('recharge_id')

    conn = pg(); cur = conn.cursor()
    cur.execute("CREATE TEMP TABLE tmp_fr AS SELECT %s FROM fact_recharges WHERE FALSE"
                % ','.join(cols))
    _copy(cur, df, 'tmp_fr', cols)
    cur.execute(f"""
        INSERT INTO fact_recharges ({','.join(cols)})
        SELECT {','.join(cols)} FROM tmp_fr
        ON CONFLICT (recharge_id) DO NOTHING
    """)
    conn.commit(); conn.close()
    print(f"  fact_recharges : {len(df)} lignes insérées.")

# ── 5. Data marts (vues SQL) ──────────────────────────────────────────────────
SQL_MARTS = [
    ("dimension_dates",
     "CREATE OR REPLACE VIEW dimension_dates AS SELECT * FROM dim_date"),

    ("mart_kpis_globaux", """
CREATE OR REPLACE VIEW mart_kpis_globaux AS
SELECT
    CONCAT(fc.annee, '-', LPAD(fc.mois::TEXT, 2, '0'))   AS periode,
    COUNT(DISTINCT fc.user_id)                             AS users_actifs,
    COUNT(DISTINCT CASE WHEN du.type_compteur='DPP' THEN fc.user_id END) AS users_en_t1,
    SUM(fc.conso_kwh)                                      AS conso_totale_kwh,
    SUM(fc.cout_fcfa)                                      AS cout_total,
    SUM(fc.economie_baisse_10pct)                          AS economie_totale,
    COUNT(fr.recharge_id)                                  AS nb_recharges,
    SUM(fr.montant_net)                                    AS montant_recharges_total
FROM fact_consumption fc
LEFT JOIN dim_users du ON fc.user_id = du.user_id
LEFT JOIN fact_recharges fr
       ON fc.user_id = fr.user_id AND fc.mois = fr.mois AND fc.annee = fr.annee
GROUP BY fc.annee, fc.mois"""),

    ("mart_performance_journaliere", """
CREATE OR REPLACE VIEW mart_performance_journaliere AS
SELECT
    dd.date,
    SUM(fc.conso_kwh)                   AS conso_totale_kwh,
    AVG(fc.conso_kwh)                   AS conso_moyenne_kwh,
    COUNT(DISTINCT fc.user_id)          AS users_actifs,
    ROUND(100.0 * COUNT(CASE WHEN du.type_compteur='DPP' THEN 1 END)
          / NULLIF(COUNT(*), 0), 1)     AS pct_t1,
    COUNT(fr.recharge_id)               AS nb_recharges
FROM fact_consumption fc
JOIN  dim_date dd   ON fc.date_id = dd.date_id
LEFT JOIN dim_users  du ON fc.user_id = du.user_id
LEFT JOIN fact_recharges fr ON fc.user_id = fr.user_id AND fc.date_id = fr.date_id
GROUP BY dd.date"""),

    ("mart_tarifs_2026", """
CREATE OR REPLACE VIEW mart_tarifs_2026 AS
SELECT
    CONCAT(fc.annee, '-', LPAD(fc.mois::TEXT, 2, '0')) AS periode,
    COALESCE(du.type_compteur, 'DPP')                  AS type_compteur,
    COALESCE(dt.nom, 'Tranche inconnue')               AS nom_tranche,
    COUNT(DISTINCT fc.user_id)                         AS nb_users_uniques,
    SUM(fc.conso_kwh)                                  AS conso_totale_kwh,
    SUM(fc.cout_fcfa)                                  AS cout_total_fcfa,
    SUM(fc.economie_baisse_10pct)                      AS economie_totale_fcfa
FROM fact_consumption fc
LEFT JOIN dim_users   du ON fc.user_id   = du.user_id
LEFT JOIN dim_tranches dt ON fc.tranche_id = dt.tranche_id
GROUP BY fc.annee, fc.mois, du.type_compteur, dt.nom"""),

    ("mart_conso_regions_mensuel", """
CREATE OR REPLACE VIEW mart_conso_regions_mensuel AS
SELECT
    dz.region,
    dz.type_zone,
    fc.mois,
    fc.annee,
    COUNT(DISTINCT fc.user_id)    AS nb_users_actifs,
    SUM(fc.conso_kwh)             AS conso_totale_kwh,
    SUM(fc.cout_fcfa)             AS cout_total,
    SUM(fc.economie_baisse_10pct) AS economie_totale
FROM fact_consumption fc
JOIN dim_zones dz ON fc.zone_id = dz.zone_id
GROUP BY dz.region, dz.type_zone, fc.mois, fc.annee"""),
]

def create_marts():
    conn = pg(); cur = conn.cursor()
    for name, sql in SQL_MARTS:
        cur.execute(sql.strip())
        print(f"  Vue '{name}' créée/mise à jour.")
    conn.commit(); conn.close()

# ── Main ──────────────────────────────────────────────────────────────────────
if __name__ == '__main__':
    print("=== 1. dim_users ===")
    load_users()
    print("=== 2. fact_consumption (300 000 lignes) ===")
    load_consumption()
    print("=== 3. fact_recharges ===")
    load_recharges()
    print("=== 4. data marts ===")
    create_marts()
    print("\n=== Vérification finale ===")
    conn = pg(); cur = conn.cursor()
    for t in ['dim_users','dim_date','fact_consumption','fact_recharges']:
        cur.execute(f"SELECT COUNT(*) FROM {t}")
        print(f"  {t}: {cur.fetchone()[0]} lignes")
    for v in ['mart_kpis_globaux','mart_performance_journaliere',
              'mart_tarifs_2026','mart_conso_regions_mensuel','dimension_dates']:
        cur.execute("SELECT to_regclass(%s) IS NOT NULL", (v,))
        ok = cur.fetchone()[0]
        print(f"  vue {v}: {'OK' if ok else 'MANQUANTE'}")
    conn.close()
    print("\nDone ! Ouvrez http://localhost:5173/dashboard")

