"""
Connecteur PostgreSQL pour Streamlit
"""
import os
import psycopg2
import pandas as pd
import streamlit as st

DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'port': os.getenv('DB_PORT', '5432'),
    'database': os.getenv('DB_NAME', 'woyofal_dwh'),
    'user': os.getenv('DB_USER', 'woyofal_user'),
    'password': os.getenv('DB_PASSWORD', 'woyofal2026')
}


@st.cache_resource
def get_connection():
    # Ensure client encoding before connecting to avoid utf-8 decode errors
    # Try UTF8 first, fallback to LATIN1 if necessary
    os.environ.setdefault('PGCLIENTENCODING', 'UTF8')
    conn = psycopg2.connect(**DB_CONFIG)
    try:
        conn.set_client_encoding('UTF8')
    except Exception:
        try:
            conn.set_client_encoding('LATIN1')
        except Exception:
            pass
    return conn


@st.cache_data(ttl=3600)
def query_db(query, params=None):
    conn = get_connection()
    try:
        df = pd.read_sql_query(query, conn, params=params)
        return df
    except UnicodeDecodeError:
        # Retry with LATIN1 client encoding
        try:
            conn.close()
        except Exception:
            pass
        os.environ['PGCLIENTENCODING'] = 'LATIN1'
        conn = get_connection()
        df = pd.read_sql_query(query, conn, params=params)
        return df


def test_connection():
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("SELECT 1")
        cur.close()
        return True
    except Exception as e:
        # If decoding error, try reconnect with LATIN1
        if isinstance(e, UnicodeDecodeError):
            try:
                os.environ['PGCLIENTENCODING'] = 'LATIN1'
                conn = get_connection()
                cur = conn.cursor()
                cur.execute("SELECT 1")
                cur.close()
                return True
            except Exception:
                pass
        st.error(f"❌ Erreur connexion : {e}")
        return False
