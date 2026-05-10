"""
Génération de 10,000 utilisateurs Woyofal avec profils réalistes sénégalais
Conforme à la grille tarifaire officielle Senelec 2026
"""
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import random

# ============================================
# DONNÉES SÉNÉGALAISES RÉALISTES
# ============================================

PRENOMS_MASCULINS = [
    "Amadou", "Moussa", "Ousmane", "Ibrahima", "Mamadou", "Abdou", 
    "Cheikh", "Samba", "Modou", "Omar", "Babacar", "Demba", 
    "Pape", "Youssouf", "Lamine", "Alioune", "Ablaye", "Cheikhou",
    "Momar", "Serigne", "Mbaye", "Souleymane", "Malick", "Moustapha",
    "Fallou", "Baye", "Aly", "Boubacar", "Mbagnick", "Elhadji"
]

PRENOMS_FEMININS = [
    "Fatou", "Aissatou", "Khady", "Mariama", "Sokhna", "Binta", 
    "Awa", "Ndeye", "Astou", "Rokhaya", "Seynabou", "Mame", 
    "Dieynaba", "Coumba", "Amy", "Maimouna", "Ndèye", "Bineta",
    "Adja", "Selbé", "Yacine", "Marème", "Nogaye", "Penda",
    "Khoudia", "Rama", "Arame", "Mbathio", "Daba", "Oumou"
]

NOMS_SENEGAL = [
    "Diop", "Ndiaye", "Fall", "Sow", "Sarr", "Sy", "Diallo", 
    "Faye", "Diouf", "Ba", "Kane", "Gueye", "Mbaye", "Seck",
    "Thiam", "Cisse", "Ndoye", "Dieye", "Dieng", "Toure",
    "Samb", "Sall", "Wade", "Dia", "Niang", "Cissé", "Gaye",
    "Badji", "Camara", "Kébé", "Sène", "Sylla", "Traoré", "Bâ"
]

OPERATEURS_SENEGAL = {
    'Orange': ['77', '78'],
    'Free': ['76', '70'],
    'Expresso': ['75']
}

DOMAINES_EMAIL = ['gmail.com', 'yahoo.fr', 'hotmail.com', 'outlook.com', 'orange.sn']

# ============================================
# FONCTIONS UTILITAIRES
# ============================================

def generer_telephone_senegal():
    """Génère un numéro de téléphone sénégalais réaliste"""
    operateur = random.choice(list(OPERATEURS_SENEGAL.keys()))
    prefixe = random.choice(OPERATEURS_SENEGAL[operateur])
    numero = ''.join([str(random.randint(0, 9)) for _ in range(7)])
    return f"+221{prefixe}{numero}"

def generer_email(prenom, nom):
    """Génère une adresse email réaliste"""
    prenom_clean = prenom.lower().replace('é', 'e').replace('è', 'e').replace('ê', 'e').replace('ô', 'o')
    nom_clean = nom.lower().replace('é', 'e').replace('è', 'e').replace('ê', 'e')
    
    formats = [
        f"{prenom_clean}.{nom_clean}",
        f"{prenom_clean}{nom_clean}",
        f"{prenom_clean[0]}{nom_clean}",
        f"{prenom_clean}.{nom_clean}{random.randint(1, 99)}"
    ]
    
    format_choisi = random.choice(formats)
    domaine = random.choice(DOMAINES_EMAIL)
    
    return f"{format_choisi}@{domaine}"

def generer_date_inscription():
    """Génère une date d'inscription aléatoire (2 dernières années)"""
    jours_max = 365 * 2
    jours_aleatoires = random.randint(0, jours_max)
    date = datetime.now() - timedelta(days=jours_aleatoires)
    return date.date()

# ============================================
# FONCTION PRINCIPALE
# ============================================

def generate_users(n_users=10000):
    """
    Génère n_users utilisateurs avec profils réalistes sénégalais
    """
    
    print(f"👥 Génération de {n_users:,} utilisateurs...")
    
    # Charger zones
    zones_df = pd.read_csv('data/raw/zones_senegal.csv')
    
    users = []
    
    for i in range(1, n_users + 1):
        if i % 1000 == 0:
            print(f"   → {i:,}/{n_users:,} utilisateurs générés...")
        
        # Genre (50/50)
        genre = random.choice(['M', 'F'])
        
        # Prénom selon genre
        if genre == 'M':
            prenom = random.choice(PRENOMS_MASCULINS)
        else:
            prenom = random.choice(PRENOMS_FEMININS)
        
        # Nom de famille
        nom = random.choice(NOMS_SENEGAL)
        
        # Zone géographique (pondérée par population)
        zone = zones_df.sample(1, weights='population').iloc[0]
        
        # Type compteur : 90% DPP (domestique), 10% PPP (professionnel)
        type_compteur = 'DPP' if random.random() < 0.9 else 'PPP'
        
        # Date inscription
        date_inscription = generer_date_inscription()
        
        # Email (60% des utilisateurs en ont un)
        has_email = random.random() < 0.6
        email = generer_email(prenom, nom) if has_email else None
        
        # Téléphone
        telephone = generer_telephone_senegal()
        
        # Numéro compteur : SN + zone_id + numéro unique
        numero_compteur = f"SN{zone['zone_id']:02d}{random.randint(100000, 999999)}"
        
        # Profil consommation (basé sur zone et type)
        if type_compteur == 'DPP':
            # Domestique
            if zone['type_zone'] == 'urbain':
                conso_moyenne_jour = np.random.uniform(4.0, 8.0)  # 4-8 kWh/jour
            elif zone['type_zone'] == 'semi_urbain':
                conso_moyenne_jour = np.random.uniform(3.0, 6.0)  # 3-6 kWh/jour
            else:  # rural
                conso_moyenne_jour = np.random.uniform(2.0, 4.5)  # 2-4.5 kWh/jour
        else:
            # Professionnel (PPP)
            conso_moyenne_jour = np.random.uniform(10.0, 25.0)
        
        # Objectif mensuel (80% veulent rester en Tranche 1)
        if random.random() < 0.8:
            objectif_mensuel = 150  # Reste en T1
        else:
            objectif_mensuel = random.choice([200, 250, 300])
        
        # Statut (95% actifs)
        actif = random.random() < 0.95
        
        user = {
            'user_id': i,
            'prenom': prenom,
            'nom': nom,
            'genre': genre,
            'email': email,
            'telephone': telephone,
            'type_compteur': type_compteur,
            'numero_compteur': numero_compteur,
            'zone_id': zone['zone_id'],
            'region': zone['region'],
            'commune': zone['commune'],
            'type_zone': zone['type_zone'],
            'date_inscription': date_inscription,
            'conso_moyenne_jour': round(conso_moyenne_jour, 2),
            'objectif_mensuel': objectif_mensuel,
            'actif': actif
        }
        
        users.append(user)
    
    df = pd.DataFrame(users)
    
    # Sauvegarder
    df.to_csv('data/raw/users.csv', index=False, encoding='utf-8')
    
    print(f"\n✅ {len(df):,} utilisateurs générés → data/raw/users.csv")
    
    # Statistiques
    print("\n📊 STATISTIQUES :")
    print(f"   • Hommes : {(df['genre']=='M').sum():,} ({(df['genre']=='M').sum()/len(df)*100:.1f}%)")
    print(f"   • Femmes : {(df['genre']=='F').sum():,} ({(df['genre']=='F').sum()/len(df)*100:.1f}%)")
    print(f"   • DPP (domestique) : {(df['type_compteur']=='DPP').sum():,} ({(df['type_compteur']=='DPP').sum()/len(df)*100:.1f}%)")
    print(f"   • PPP (professionnel) : {(df['type_compteur']=='PPP').sum():,} ({(df['type_compteur']=='PPP').sum()/len(df)*100:.1f}%)")
    print(f"   • Conso moyenne : {df['conso_moyenne_jour'].mean():.2f} kWh/jour")
    print(f"   • Régions représentées : {df['region'].nunique()}")
    print(f"   • Emails : {df['email'].notna().sum():,} ({df['email'].notna().sum()/len(df)*100:.1f}%)")
    
    # Exemples de noms générés
    print("\n📋 Exemples d'utilisateurs générés :")
    for _, user in df.head(5).iterrows():
        print(f"   • {user['prenom']} {user['nom']} ({user['type_compteur']}) - {user['region']} - {user['telephone']}")
    
    return df

if __name__ == "__main__":
    users_df = generate_users(10000)
