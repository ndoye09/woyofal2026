"""Test du moteur local de calcul tarifaire."""
import sys, os
sys.path.insert(0, 'api/flask')
os.chdir('C:/Users/HP/woyofal-data-platform')

from routes.ai import _local_answer, _fcfa_to_kwh, _kwh_to_fcfa

tests = [
    "Combien de kWh pour 5 000 FCFA ?",
    "5000 FCFA combien de kWh",
    "10 000 FCFA en DPP",
    "80 kWh combien ca coute",
    "Quelle est la redevance mensuelle ?",
    "Difference entre DPP et PPP",
    "Comment rester en tranche 1",
    "Les tarifs Senelec 2026",
    "Comment ca va ?",
]

for q in tests:
    ans = _local_answer(q)
    status = "LOCAL OK" if ans else "-> IA needed"
    preview = ans[:60].replace('\n', ' ') + '...' if ans else ""
    print(f"[{status}] {q[:40]:<40} {preview}")
