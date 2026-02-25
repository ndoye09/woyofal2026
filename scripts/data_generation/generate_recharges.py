"""
Génération des transactions de recharges Woyofal
CONFORME À LA GRILLE TARIFAIRE OFFICIELLE SENELEC 2026

DÉDUCTIONS STANDARDS :
- Redevance : 429 FCFA (si recharge dans les 5 premiers jours du mois)
- Taxe communale : 2.5% du montant
- Redevance électrification rurale : 0,7 FCFA/kWh (incluse dans tarifs)

TARIFS PRÉPAIEMENT :
- T3 valorisée à T2 (décision CRSE 2025-140)
"""
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import random

# ============================================
# CONSTANTES OFFICIELLES
# ============================================

# Montants fréquents de recharge au Sénégal (FCFA)
MONTANTS_RECHARGE = [1000, 2000, 3000, 5000, 10000, 15000, 20000]

# Canaux de paiement Woyofal (distribution réaliste)
CANAUX_PAIEMENT = {
    'Orange Money': 0.60,  # 60%
    'Wave': 0.30,          # 30%
    'Free Money': 0.07,    # 7%
    'Agence Senelec': 0.03  # 3%
}

# Redevance fixe
REDEVANCE_MENSUELLE = 429  # FCFA (prélevée 1ère recharge du mois)

# Taxe communale
TAXE_COMMUNALE_TAUX = 0.025  # 2.5%

# ============================================
# FONCTIONS CALCUL RECHARGE
# ============================================

def calculate_tranche_dpp(cumul):
    if cumul <= 150:
        return 1
    elif cumul <= 250:
        return 2
    else:
        return 3

def calculate_tranche_ppp(cumul):
    if cumul <= 50:
        return 1
    elif cumul <= 500:
        return 2
    else:
        return 3

def calculate_kwh_obtenus_dpp(montant_net, cumul_avant):
    kwh_total = 0
    reste_montant = montant_net
    cumul_actuel = cumul_avant

    if cumul_actuel < 150:
        kwh_disponibles_t1 = 150 - cumul_actuel
        montant_max_t1 = kwh_disponibles_t1 * 82.00

        if reste_montant <= montant_max_t1:
            kwh_total = reste_montant / 82.00
            return round(kwh_total, 2)
        else:
            kwh_total += kwh_disponibles_t1
            reste_montant -= montant_max_t1
            cumul_actuel = 150

    if cumul_actuel < 250 and reste_montant > 0:
        kwh_disponibles_t2 = 250 - cumul_actuel
        montant_max_t2 = kwh_disponibles_t2 * 136.49

        if reste_montant <= montant_max_t2:
            kwh_total += reste_montant / 136.49
            return round(kwh_total, 2)
        else:
            kwh_total += kwh_disponibles_t2
            reste_montant -= montant_max_t2
            cumul_actuel = 250

    if reste_montant > 0:
        kwh_total += reste_montant / 136.49

    return round(kwh_total, 2)

def calculate_kwh_obtenus_ppp(montant_net, cumul_avant):
    kwh_total = 0
    reste_montant = montant_net
    cumul_actuel = cumul_avant

    if cumul_actuel < 50:
        kwh_disponibles_t1 = 50 - cumul_actuel
        montant_max_t1 = kwh_disponibles_t1 * 147.43

        if reste_montant <= montant_max_t1:
            kwh_total = reste_montant / 147.43
            return round(kwh_total, 2)
        else:
            kwh_total += kwh_disponibles_t1
            reste_montant -= montant_max_t1
            cumul_actuel = 50

    if reste_montant > 0:
        kwh_total += reste_montant / 189.84

    return round(kwh_total, 2)

def calculate_economie_baisse(kwh_obtenus, tranche_finale, type_compteur):
    if tranche_finale == 1:
        if type_compteur == 'DPP':
            return kwh_obtenus * 9.11
        elif type_compteur == 'PPP':
            return kwh_obtenus * 16.38
    return 0

# ============================================
# FONCTION PRINCIPALE
# ============================================

def generate_recharges(nb_recharges_moy=2):
    print(f"💳 Génération des recharges ({nb_recharges_moy} recharges/user/mois en moyenne)...")

    users_df = pd.read_csv('data/raw/users.csv')
    consumption_df = pd.read_csv('data/raw/consumption_daily.csv', parse_dates=['date'])

    date_min = consumption_df['date'].min()
    date_max = consumption_df['date'].max()
    nb_jours = (date_max - date_min).days + 1

    print(f"   Période : {date_min.date()} à {date_max.date()} ({nb_jours} jours)")

    recharges = []
    recharge_id = 1

    print(f"\n🔄 Génération pour {len(users_df):,} utilisateurs...")

    for idx, user in users_df.iterrows():
        if (idx + 1) % 1000 == 0:
            print(f"   → User {idx + 1:,}/{len(users_df):,}...")

        n_recharges = max(1, int(np.random.poisson(nb_recharges_moy)))

        user_id = user['user_id']
        type_compteur = user['type_compteur']

        user_conso = consumption_df[consumption_df['user_id'] == user_id].copy()
        user_conso = user_conso.sort_values('date')

        if len(user_conso) == 0:
            continue

        dates_recharges = []

        mois_presents = user_conso['mois'].unique()
        for mois in mois_presents:
            dates_mois = user_conso[user_conso['mois'] == mois]['date']
            if len(dates_mois) > 0:
                premier_jour = dates_mois.min()
                dates_recharges.append(premier_jour)

        while len(dates_recharges) < n_recharges:
            date_aleatoire = user_conso.sample(1)['date'].iloc[0]
            if date_aleatoire not in dates_recharges:
                dates_recharges.append(date_aleatoire)

        for date_recharge in dates_recharges[:n_recharges]:
            if date_recharge.day <= 5:
                montant_brut = random.choice([5000, 10000, 15000, 20000])
            else:
                montant_brut = random.choice([1000, 2000, 3000, 5000])

            canal = random.choices(list(CANAUX_PAIEMENT.keys()), weights=list(CANAUX_PAIEMENT.values()))[0]

            heure = f"{random.randint(8, 20):02d}:{random.randint(0, 59):02d}"

            conso_avant = user_conso[user_conso['date'] < date_recharge]
            if len(conso_avant) > 0:
                cumul_mois_avant = conso_avant[conso_avant['mois'] == date_recharge.month]['conso_cumul_mois'].max()
                if pd.isna(cumul_mois_avant):
                    cumul_mois_avant = 0
            else:
                cumul_mois_avant = 0

            redevance = REDEVANCE_MENSUELLE if date_recharge.day <= 5 else 0

            taxe_communale = montant_brut * TAXE_COMMUNALE_TAUX

            montant_net = montant_brut - redevance - taxe_communale

            if type_compteur == 'DPP':
                kwh_obtenus = calculate_kwh_obtenus_dpp(montant_net, cumul_mois_avant)
            else:
                kwh_obtenus = calculate_kwh_obtenus_ppp(montant_net, cumul_mois_avant)

            cumul_apres = cumul_mois_avant + kwh_obtenus
            if type_compteur == 'DPP':
                tranche_finale = calculate_tranche_dpp(cumul_apres)
            else:
                tranche_finale = calculate_tranche_ppp(cumul_apres)

            economie_baisse = calculate_economie_baisse(kwh_obtenus, tranche_finale, type_compteur)

            recharge = {
                'recharge_id': recharge_id,
                'date': date_recharge.date(),
                'heure': heure,
                'user_id': int(user_id),
                'numero_compteur': user['numero_compteur'],
                'zone_id': int(user['zone_id']),
                'region': user['region'],
                'type_compteur': type_compteur,
                'montant_brut': montant_brut,
                'redevance': redevance,
                'taxe_communale': round(taxe_communale, 2),
                'montant_net': round(montant_net, 2),
                'kwh_obtenus': kwh_obtenus,
                'cumul_mois_avant': round(cumul_mois_avant, 2),
                'tranche_finale': tranche_finale,
                'economie_baisse': round(economie_baisse, 2),
                'canal_paiement': canal,
                'statut': 'succes'
            }

            recharges.append(recharge)
            recharge_id += 1

    df = pd.DataFrame(recharges)

    output_file = 'data/raw/recharges.csv'
    df.to_csv(output_file, index=False, encoding='utf-8')

    print(f"\n✅ {len(df):,} recharges générées → {output_file}")

    print("\n📊 STATISTIQUES RECHARGES :")
    print(f"   • Montant moyen : {df['montant_brut'].mean():.0f} FCFA")
    print(f"   • kWh moyens obtenus : {df['kwh_obtenus'].mean():.2f} kWh")
    print(f"   • Montant net moyen : {df['montant_net'].mean():.0f} FCFA")
    print(f"   • Économie totale baisse : {df['economie_baisse'].sum():,.0f} FCFA")

    print(f"\n💳 CANAUX DE PAIEMENT :")
    for canal in df['canal_paiement'].unique():
        count = (df['canal_paiement'] == canal).sum()
        pct = count / len(df) * 100
        print(f"   • {canal} : {count:,} ({pct:.1f}%)")

    print(f"\n💰 DISTRIBUTION MONTANTS :")
    for montant in sorted(df['montant_brut'].unique()):
        count = (df['montant_brut'] == montant).sum()
        pct = count / len(df) * 100
        print(f"   • {montant:,} FCFA : {count:,} ({pct:.1f}%)")

    avec_redevance = (df['redevance'] > 0).sum()
    print(f"\n📅 Recharges avec redevance (début mois) : {avec_redevance:,} ({avec_redevance/len(df)*100:.1f}%)")

    return df

if __name__ == "__main__":
    import time
    start_time = time.time()

    recharges_df = generate_recharges(nb_recharges_moy=2)

    elapsed = time.time() - start_time
    print(f"\n⏱️  Temps total : {elapsed:.1f} secondes")