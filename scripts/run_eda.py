import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from datetime import datetime
import warnings
import os

warnings.filterwarnings('ignore')
plt.style.use('seaborn-v0_8-darkgrid')
sns.set_palette('husl')

print('✅ Imports OK')

print('📂 Chargement des données...')
# Définir chemins relatifs au repo (quel que soit le working dir)
base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
raw_dir = os.path.join(base_dir, 'data', 'raw')
df_zones = pd.read_csv(os.path.join(raw_dir, 'zones_senegal.csv'))
print(f"✅ Zones : {len(df_zones)} lignes")

df_users = pd.read_csv(os.path.join(raw_dir, 'users.csv'))
print(f"✅ Users : {len(df_users):,} lignes")

df_consumption = pd.read_csv(os.path.join(raw_dir, 'consumption_daily.csv'), parse_dates=['date'])
print(f"✅ Consumption : {len(df_consumption):,} lignes")

df_recharges = pd.read_csv(os.path.join(raw_dir, 'recharges.csv'), parse_dates=['date'])
print(f"✅ Recharges : {len(df_recharges):,} lignes")

print('\n📊 Total : {:,} lignes'.format(len(df_zones) + len(df_users) + len(df_consumption) + len(df_recharges)))

print('\n📊 STATISTIQUES CONSOMMATION')
print('\n1️⃣ CONSOMMATION QUOTIDIENNE (kWh)')
print(df_consumption['conso_kwh'].describe())

print('\n2️⃣ CONSOMMATION CUMULÉE MENSUELLE (kWh)')
if 'conso_cumul_mois' in df_consumption.columns:
    print(df_consumption['conso_cumul_mois'].describe())
else:
    print('Colonne conso_cumul_mois absente')

print('\n3️⃣ COÛT QUOTIDIEN (FCFA)')
print(df_consumption['cout_fcfa'].describe())

print('\n4️⃣ DISTRIBUTION PAR TRANCHE')
tranche_dist = df_consumption['tranche'].value_counts().sort_index()
for tranche, count in tranche_dist.items():
    pct = count / len(df_consumption) * 100
    print(f'   Tranche {tranche} : {count:,} lignes ({pct:.1f}%)')

# Vérification économies 10%
print('\n💰 VÉRIFICATION ÉCONOMIES BAISSE 10%')
if 'economie_baisse_10pct' in df_consumption.columns:
    economie_totale = df_consumption['economie_baisse_10pct'].sum()
    print(f"\n✅ Économie totale sur période : {economie_totale:,.0f} FCFA")
    eco_par_tranche = df_consumption.groupby('tranche')['economie_baisse_10pct'].agg(['sum','mean','count'])
    print('\n📊 Économies par tranche :')
    print(eco_par_tranche)
    eco_t2 = df_consumption[df_consumption['tranche']==2]['economie_baisse_10pct'].sum()
    eco_t3 = df_consumption[df_consumption['tranche']==3]['economie_baisse_10pct'].sum()
    print(f'   T2 : {eco_t2:.2f} FCFA (devrait être 0)')
    print(f'   T3 : {eco_t3:.2f} FCFA (devrait être 0)')
    if eco_t2 == 0 and eco_t3 == 0:
        print('   ✅ CORRECT : Économies uniquement en T1')
    else:
        print('   ❌ ERREUR : Économies détectées hors T1')
    eco_par_user = df_consumption.groupby('user_id')['economie_baisse_10pct'].sum()
    print(f"\n💡 Économie moyenne par user sur période : {eco_par_user.mean():,.0f} FCFA")
else:
    print('Colonne economie_baisse_10pct absente dans df_consumption')

# Visualisations
os.makedirs(os.path.join('..','docs'), exist_ok=True)
fig, axes = plt.subplots(2,2, figsize=(15,10))
axes[0,0].hist(df_consumption['conso_kwh'].dropna(), bins=50, color='skyblue', edgecolor='black')
axes[0,0].axvline(df_consumption['conso_kwh'].mean(), color='red', linestyle='--', label=f"Moyenne: {df_consumption['conso_kwh'].mean():.2f} kWh")
axes[0,0].set_xlabel('Consommation (kWh)')
axes[0,0].set_ylabel('Fréquence')
axes[0,0].set_title('Distribution Consommation Quotidienne')
axes[0,0].legend()

if 'conso_cumul_mois' in df_consumption.columns:
    axes[0,1].hist(df_consumption['conso_cumul_mois'].dropna(), bins=50, color='lightgreen', edgecolor='black')
    axes[0,1].axvline(150, color='red', linestyle='--', label='Seuil T1 (150 kWh)')
    axes[0,1].axvline(250, color='orange', linestyle='--', label='Seuil T2 (250 kWh)')
else:
    axes[0,1].text(0.5,0.5,'conso_cumul_mois absent',ha='center')
axes[0,1].set_xlabel('Cumul Mensuel (kWh)')
axes[0,1].set_title('Distribution Cumul Mensuel')

tranche_counts = df_consumption['tranche'].value_counts().sort_index()
colors = ['#90EE90', '#FFD700', '#FF6B6B']
axes[1,0].pie(tranche_counts, labels=[f'T{i}' for i in tranche_counts.index], autopct='%1.1f%%', colors=colors, startangle=90)
axes[1,0].set_title('Répartition par Tranche')

if 'economie_baisse_10pct' in df_consumption.columns:
    eco_data = df_consumption.groupby('tranche')['economie_baisse_10pct'].sum()
else:
    eco_data = pd.Series([0,0,0], index=[1,2,3])
axes[1,1].bar(eco_data.index, eco_data.values, color=['green','gray','gray'])
axes[1,1].set_xlabel('Tranche')
axes[1,1].set_ylabel('Économie totale (FCFA)')
axes[1,1].set_title('Économies Baisse 10% par Tranche')
axes[1,1].set_xticks([1,2,3])

plt.tight_layout()
plt.savefig(os.path.join('..','docs','eda_consommation_overview.png'), dpi=300, bbox_inches='tight')
print('✅ Graphiques sauvegardés : docs/eda_consommation_overview.png')

# Export recap
stats_recap = {
    'date_analyse': datetime.now().strftime('%Y-%m-%d %H:%M'),
    'nb_users': len(df_users),
    'nb_jours': df_consumption['date'].nunique(),
    'nb_lignes_conso': len(df_consumption),
    'conso_moy_jour': df_consumption['conso_kwh'].mean(),
    'cout_moy_jour': df_consumption['cout_fcfa'].mean(),
    'economie_totale': df_consumption['economie_baisse_10pct'].sum() if 'economie_baisse_10pct' in df_consumption.columns else 0,
    'pct_t1': (df_consumption['tranche']==1).sum() / len(df_consumption) * 100 if 'tranche' in df_consumption.columns else 0,
    'pct_t2': (df_consumption['tranche']==2).sum() / len(df_consumption) * 100 if 'tranche' in df_consumption.columns else 0,
    'pct_t3': (df_consumption['tranche']==3).sum() / len(df_consumption) * 100 if 'tranche' in df_consumption.columns else 0,
}

pd.DataFrame([stats_recap]).to_csv(os.path.join('..','docs','eda_stats_recap.csv'), index=False)
print('✅ Statistiques sauvegardées : docs/eda_stats_recap.csv')
