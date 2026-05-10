"""
Ingestion PostgreSQL - Étape 3 du Pipeline
Charge les données NETTOYÉES dans le Data Warehouse

Input  : data/02_cleaned/*.csv (données propres)
Output : PostgreSQL woyofal_dwh
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'etl'))

try:
    from load_to_warehouse import DataWarehouseLoader
except Exception:
    # Fallback if module path differs
    sys.path.insert(0, os.path.join(os.getcwd(), 'scripts', 'etl'))
    from load_to_warehouse import DataWarehouseLoader


def main():
    cfg = {
        'csv_path': 'data/02_cleaned',
        'db_host': os.environ.get('DWH_HOST', 'localhost'),
        'db_port': os.environ.get('DWH_PORT', '5432'),
        'db_name': os.environ.get('DWH_NAME', 'woyofal_dwh'),
        'db_user': os.environ.get('DWH_USER', 'woyofal_user'),
        'db_password': os.environ.get('DWH_PASS', 'woyofal2026'),
        'batch_size': 5000
    }

    loader = DataWarehouseLoader(cfg)
    success = loader.run()

    if success:
        print('\n✅ INGESTION RÉUSSIE : Données propres dans PostgreSQL')
    else:
        print('\n❌ ERREUR INGESTION')


if __name__ == '__main__':
    main()
