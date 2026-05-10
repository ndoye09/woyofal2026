"""
Génération de la consommation quotidienne (30 jours × 10,000 users)
CONFORME À LA GRILLE TARIFAIRE OFFICIELLE SENELEC 2026
Décision n° 2025-140 du 26/12/2025

TARIFS PRÉPAIEMENT WOYOFAL (DPP) :
- Tranche 1 (0-150 kWh)   : 82,00 FCFA/kWh
- Tranche 2 (151-250 kWh) : 136,49 FCFA/kWh
- Tranche 3 (>250 kWh)    : 136,49 FCFA/kWh (valorisée à T2 en prépaiement)

TARIFS PPP (Professionnel) :
- Tranche 1 (0-50 kWh)    : 147,43 FCFA/kWh
- Tranche 2 (51-500 kWh)  : 189,84 FCFA/kWh
- Tranche 3 (>500 kWh)    : 189,84 FCFA/kWh (valorisée à T2 en prépaiement)
"""
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import random

# ============================================
# FONCTIONS CALCUL TARIFAIRE (GRILLE 2026)
# ============================================

def calculate_tranche_dpp(conso_cumul_mois):
    if conso_cumul_mois <= 150:
        return 1
    elif conso_cumul_mois <= 250:
        return 2
    else:
        return 3

def calculate_tranche_ppp(conso_cumul_mois):
    if conso_cumul_mois <= 50:
        return 1
    elif conso_cumul_mois <= 500:
        return 2
    else:
        return 3

def calculate_price_kwh_dpp(tranche):
    if tranche == 1:
        return 82.00
    elif tranche in [2, 3]:
        return 136.49

def calculate_price_kwh_ppp(tranche):
    if tranche == 1:
        return 147.43
    elif tranche in [2, 3]:
        return 189.84

def calculate_economie_baisse(conso_kwh, tranche, type_compteur):
    if tranche == 1:
        if type_compteur == 'DPP':
            ancien_prix_t1 = 91.11
            nouveau_prix_t1 = 82.00
            return conso_kwh * (ancien_prix_t1 - nouveau_prix_t1)
        elif type_compteur == 'PPP':
            ancien_prix_t1 = 163.81
            nouveau_prix_t1 = 147.43
            return conso_kwh * (ancien_prix_t1 - nouveau_prix_t1)
    return 0

# ============================================
# FONCTION PRINCIPALE
# ============================================

def generate_daily_consumption(n_days=30):
    print(f"📊 Génération consommation quotidienne ({n_days} jours)...")
    print("⚠️  Cela peut prendre 10-15 minutes (300,000 lignes à générer)...")

    users_df = pd.read_csv('data/raw/users.csv')

    end_date = datetime.now().date()
    start_date = end_date - timedelta(days=n_days)

    consumption_records = []

    print(f"\n🔄 Traitement de {len(users_df):,} utilisateurs...")

    for idx, user in users_df.iterrows():
        if (idx + 1) % 500 == 0:
            print(f"   → User {idx + 1:,}/{len(users_df):,} ({(idx+1)/len(users_df)*100:.1f}%)...")

        base_conso = user['conso_moyenne_jour']
        type_compteur = user['type_compteur']

        conso_cumul_mois = 0

        for day_offset in range(n_days):
            current_date = start_date + timedelta(days=day_offset)

            if current_date.day == 1:
                conso_cumul_mois = 0

            if current_date.weekday() >= 5:
                daily_factor = 1.2
            else:
                daily_factor = np.random.uniform(0.85, 1.15)

            month = current_date.month
            if month in [3, 4, 5, 6]:
                seasonal_factor = 1.15
            else:
                seasonal_factor = 1.0

            conso_jour = base_conso * daily_factor * seasonal_factor
            conso_jour = max(0.5, conso_jour)

            conso_cumul_mois += conso_jour

            if type_compteur == 'DPP':
                tranche = calculate_tranche_dpp(conso_cumul_mois)
                prix_kwh = calculate_price_kwh_dpp(tranche)
            else:
                tranche = calculate_tranche_ppp(conso_cumul_mois)
                prix_kwh = calculate_price_kwh_ppp(tranche)

            cout_jour = conso_jour * prix_kwh

            economie_jour = calculate_economie_baisse(conso_jour, tranche, type_compteur)

            record = {
                'date': current_date,
                'user_id': int(user['user_id']),
                'numero_compteur': user['numero_compteur'],
                'zone_id': int(user['zone_id']),
                'region': user['region'],
                'type_compteur': user['type_compteur'],
                'conso_kwh': round(conso_jour, 2),
                'conso_cumul_mois': round(conso_cumul_mois, 2),
                'tranche': tranche,
                'prix_kwh': prix_kwh,
                'cout_fcfa': round(cout_jour, 2),
                'economie_baisse_10pct': round(economie_jour, 2),
                'jour_semaine': current_date.strftime('%A'),
                'mois': current_date.month,
                'annee': current_date.year
            }

            consumption_records.append(record)

    df = pd.DataFrame(consumption_records)

    output_file = 'data/raw/consumption_daily.csv'
    df.to_csv(output_file, index=False, encoding='utf-8')

    print(f"\n✅ {len(df):,} lignes générées → {output_file}")

    print("\n📊 STATISTIQUES CONSOMMATION :")
    print(f"   • Période : {df['date'].min()} à {df['date'].max()}")
    print(f"   • Consommation moyenne/jour : {df['conso_kwh'].mean():.2f} kWh")
    print(f"   • Coût moyen/jour : {df['cout_fcfa'].mean():.2f} FCFA")
    print(f"   • Économie totale baisse 10% : {df['economie_baisse_10pct'].sum():,.0f} FCFA")

    print(f"\n📈 DISTRIBUTION PAR TRANCHE :")
    for tranche in [1, 2, 3]:
        count = (df['tranche'] == tranche).sum()
        pct = count / len(df) * 100
        print(f"   • Tranche {tranche} : {count:,} lignes ({pct:.1f}%)")

    print(f"\n🏠 PAR TYPE DE COMPTEUR :")
    for type_cpt in ['DPP', 'PPP']:
        df_type = df[df['type_compteur'] == type_cpt]
        if len(df_type) > 0:
            print(f"   • {type_cpt} :")
            print(f"     - Lignes : {len(df_type):,}")
            print(f"     - Conso moy : {df_type['conso_kwh'].mean():.2f} kWh/j")
            print(f"     - Coût moy : {df_type['cout_fcfa'].mean():.2f} FCFA/j")

    return df

if __name__ == "__main__":
    import time
    start_time = time.time()

    consumption_df = generate_daily_consumption(30)

    elapsed = time.time() - start_time
    print(f"\n⏱️  Temps total : {elapsed/60:.1f} minutes")
    print(f"📊 Total lignes : {len(consumption_df):,}")
    print(f"💾 Taille fichier : ~{len(consumption_df) * 150 / 1024 / 1024:.1f} MB")
