import os
import streamlit as st
import pandas as pd
from sqlalchemy import create_engine, text
from urllib.parse import quote_plus
import traceback


def get_engine(host, port, user, password, db):
    # Ensure client encoding to avoid utf-8 decode errors from server/locales
    os.environ.setdefault('PGCLIENTENCODING', 'UTF8')
    user_q = quote_plus(user or '')
    password_q = quote_plus(password or '')
    url = f"postgresql+psycopg2://{user_q}:{password_q}@{host}:{port}/{db}"
    # Force client_encoding at connection level for psycopg2 via options
    return create_engine(url, pool_pre_ping=True, connect_args={"options": "-c client_encoding=UTF8"})


st.set_page_config(page_title="Woyofal DWH Explorer", layout="wide")

st.title("Woyofal — Data Warehouse Explorer")

with st.sidebar.form("conn"):
    host = st.text_input("Host", value=os.getenv('DB_HOST','localhost'))
    port = st.text_input("Port", value=os.getenv('DB_PORT','5432'))
    user = st.text_input("User", value=os.getenv('DB_USER','woyofal_user'))
    password = st.text_input("Password", value=os.getenv('DB_PASS','woyofal2026'), type='password')
    db = st.text_input("Database", value=os.getenv('DB_NAME','woyofal_dwh'))
    submitted = st.form_submit_button("Connect")

conn_ok = False
engine = None
if submitted:
    try:
        engine = get_engine(host, port, user, password, db)
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        conn_ok = True
        st.sidebar.success("Connecté (psycopg2)")
    except Exception as e:
        tb = traceback.format_exc()
        st.sidebar.error(f"Échec connexion (psycopg2): {e}")
        st.sidebar.code(tb)
        # Fallback: try pure-Python pg8000 driver to avoid native client decode issues
        try:
            user_q = quote_plus(user or '')
            password_q = quote_plus(password or '')
            url_pg8000 = f"postgresql+pg8000://{user_q}:{password_q}@{host}:{port}/{db}"
            engine = create_engine(url_pg8000, pool_pre_ping=True)
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            conn_ok = True
            st.sidebar.success("Connecté (pg8000 fallback)")
        except Exception as e2:
            tb2 = traceback.format_exc()
            st.sidebar.error(f"Échec connexion (pg8000 fallback): {e2}")
            st.sidebar.code(tb2)

if conn_ok:
    st.header("Requêtes rapides")
    col1, col2 = st.columns(2)

    with col1:
        st.subheader("Top 10 zones (3 derniers mois)")
        q1 = """
        SELECT z.zone_id, z.region AS zone_nom, SUM(fc.conso_kwh) AS total_kwh
        FROM fact_consumption fc
        JOIN dim_zones z ON fc.zone_id = z.zone_id
        JOIN dimension_dates d ON fc.date_id = d.date_id
        WHERE d.date >= (CURRENT_DATE - INTERVAL '3 months')
        GROUP BY z.zone_id, z.region
        ORDER BY total_kwh DESC
        LIMIT 10
        """
        df1 = pd.read_sql_query(q1, engine)
        st.dataframe(df1)

    with col2:
        st.subheader("Consommation mensuelle par utilisateur (ex.)")
        q2 = """
        SELECT fc.user_id, DATE_TRUNC('month', d.date) AS month, SUM(fc.conso_kwh) AS total_kwh
        FROM fact_consumption fc
        JOIN dimension_dates d ON fc.date_id = d.date_id
        WHERE d.date >= (CURRENT_DATE - INTERVAL '12 months')
        GROUP BY fc.user_id, DATE_TRUNC('month', d.date)
        ORDER BY total_kwh DESC
        LIMIT 200
        """
        df2 = pd.read_sql_query(q2, engine)
        st.dataframe(df2)

    st.markdown("---")
    st.subheader("Exécuter une requête SQL personnalisée")
    sql = st.text_area("SQL", height=120, value="SELECT now()")
    if st.button("Exécuter"):
        try:
            df_custom = pd.read_sql_query(sql, engine)
            st.dataframe(df_custom)
        except Exception as e:
            st.error(f"Erreur SQL: {e}")

    st.sidebar.markdown("---")
    if st.sidebar.button("Télécharger rapport d'analyse"):
        try:
            with engine.connect() as conn:
                res = conn.execute(text("SELECT COUNT(*) FROM fact_consumption"))
                count = res.scalar()
            st.sidebar.success(f"fact_consumption rows: {count}")
        except Exception as e:
            st.sidebar.error(f"Erreur: {e}")

else:
    st.info("Remplissez le formulaire de connexion dans la barre latérale et cliquez sur Connect")
