"""
Script master pour régénérer toutes les données d'un coup
Utile pour tester différents scénarios
"""
import subprocess
import time
import sys

def run_script(script_name):
    """Exécute un script et mesure le temps"""
    print(f"\n{'='*70}")
    print(f"▶️  Exécution : {script_name}")
    print(f"{'='*70}")
    start = time.time()
    result = subprocess.run([sys.executable, f"scripts/data_generation/{script_name}"], capture_output=False)
    elapsed = time.time() - start
    if result.returncode == 0:
        print(f"✅ {script_name} terminé en {elapsed:.1f}s")
        return True
    else:
        print(f"❌ Erreur dans {script_name}")
        return False

if __name__ == "__main__":
    print("🚀 GÉNÉRATION COMPLÈTE DES DONNÉES WOYOFAL")
    print("Cela va prendre environ 15-20 minutes...\n")
    total_start = time.time()
    scripts = [
        'generate_zones.py',
        'generate_users.py',
        'generate_consumption.py',
        'generate_recharges.py'
    ]
    success = True
    for script in scripts:
        if not run_script(script):
            success = False
            break
    total_elapsed = time.time() - total_start
    print(f"\n{'='*70}")
    if success:
        print("✅ GÉNÉRATION COMPLÈTE RÉUSSIE !")
    else:
        print("❌ ERREUR DURANT LA GÉNÉRATION")
    print(f"⏱️  Temps total : {total_elapsed/60:.1f} minutes")
    print(f"{'='*70}")
