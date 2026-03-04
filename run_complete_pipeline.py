"""
Pipeline Complet - Ordre Correct
Exécute toutes les étapes dans le bon ordre
"""

import subprocess
import sys
from datetime import datetime

STEPS = [
    (1, "scripts/01_generation/generate_all_data.py", "Génération Données (330k lignes)"),
    (2, "scripts/02_cleaning/clean_generated_data.py", "Nettoyage Données (validation + outliers)"),
    (3, "scripts/03_ingestion/load_cleaned_to_warehouse.py", "Ingestion PostgreSQL (données propres)"),
    (4, "scripts/04_transformation/feature_engineering.py", "Feature Engineering (39 features ML)")
]


def run_step(step_num, script_path, description):
    print('\n' + '=' * 70)
    print(f"🚀 ÉTAPE {step_num} : {description}")
    print('=' * 70)
    start = datetime.now()
    try:
        subprocess.run([sys.executable, script_path], check=True)
        duration = (datetime.now() - start).total_seconds()
        print(f"\n✅ ÉTAPE {step_num} terminée en {duration:.1f}s")
        return True
    except subprocess.CalledProcessError as e:
        print(f"\n❌ ERREUR ÉTAPE {step_num} -> {e}")
        return False


def main():
    print('\n' + '=' * 80)
    print('🎯 PIPELINE COMPLET WOYOFAL - ORDRE CORRECT')
    print('=' * 80)
    pipeline_start = datetime.now()

    for step_num, script, desc in STEPS:
        success = run_step(step_num, script, desc)
        if not success:
            print(f"\n❌ PIPELINE ARRÊTÉ À L'ÉTAPE {step_num}")
            sys.exit(1)

    total_duration = (datetime.now() - pipeline_start).total_seconds()
    print('\n' + '=' * 80)
    print('🎉 PIPELINE COMPLET TERMINÉ AVEC SUCCÈS')
    print('=' * 80)
    print(f"\n⏱️  Durée totale : {total_duration/60:.1f} minutes")


if __name__ == '__main__':
    main()
