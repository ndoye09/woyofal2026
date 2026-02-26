"""
Script d'analyse de performance du pipeline
"""
import time
import pandas as pd
import psycopg2
from contextlib import contextmanager


@contextmanager
def timer(name: str):
    start = time.time()
    yield
    elapsed = time.time() - start
    print(f"⏱️  {name} : {elapsed:.2f}s ({elapsed/60:.1f}min)")


def analyze_csv_loading():
    files = {
        'zones': 'data/raw/zones_senegal.csv',
        'users': 'data/raw/users.csv',
        'consumption': 'data/raw/consumption_daily.csv',
        'recharges': 'data/raw/recharges.csv'
    }
    results = {}
    for name, filepath in files.items():
        with timer(f"Lecture {name}"):
            df = pd.read_csv(filepath)
            results[name] = {
                'rows': len(df),
                'memory_mb': df.memory_usage(deep=True).sum() / 1024 / 1024
            }
    return results


def analyze_sql_queries():
    conn = psycopg2.connect(
        host='localhost',
        database='woyofal_dwh',
        user='woyofal_user',
        password='woyofal2026'
    )
    cursor = conn.cursor()
    queries = {
        'count_consumption': "SELECT COUNT(*) FROM fact_consumption",
        'sum_economie': "SELECT SUM(economie_baisse_10pct) FROM fact_consumption",
        'group_by_tranche': """
            SELECT tranche_id, COUNT(*), AVG(conso_kwh) 
            FROM fact_consumption 
            GROUP BY tranche_id
        """,
    }
    for name, query in queries.items():
        with timer(f"Query: {name}"):
            cursor.execute(query)
            cursor.fetchall()
    cursor.close()
    conn.close()


if __name__ == "__main__":
    print("📊 ANALYSE PERFORMANCE\n")
    print("1️⃣ Chargement CSV :")
    results = analyze_csv_loading()
    for name, stats in results.items():
        print(f"   {name:15s} : {stats['rows']:>8,} lignes, {stats['memory_mb']:.1f} MB")
    print("\n2️⃣ Requêtes SQL :")
    analyze_sql_queries()
