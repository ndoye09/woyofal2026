"""
Génération des zones géographiques du Sénégal
Basé sur découpage administratif officiel
"""
import csv
from pathlib import Path


def generate_zones():
    """
    Génère les 23 zones principales du Sénégal (sans dépendances externes)
    """
    print("📍 Génération zones géographiques...")
    
    zones_data = [
        # Région Dakar (4 communes)
        {"zone_id": 1, "region": "Dakar", "commune": "Dakar Plateau", "population": 150000, "type_zone": "urbain", "densite": "très_elevee"},
        {"zone_id": 2, "region": "Dakar", "commune": "Pikine", "population": 300000, "type_zone": "urbain", "densite": "très_elevee"},
        {"zone_id": 3, "region": "Dakar", "commune": "Guédiawaye", "population": 280000, "type_zone": "urbain", "densite": "très_elevee"},
        {"zone_id": 4, "region": "Dakar", "commune": "Rufisque", "population": 180000, "type_zone": "urbain", "densite": "elevee"},
        
        # Région Thiès (3 communes)
        {"zone_id": 5, "region": "Thiès", "commune": "Thiès", "population": 250000, "type_zone": "urbain", "densite": "elevee"},
        {"zone_id": 6, "region": "Thiès", "commune": "Mbour", "population": 120000, "type_zone": "urbain", "densite": "moyenne"},
        {"zone_id": 7, "region": "Thiès", "commune": "Tivaouane", "population": 45000, "type_zone": "semi_urbain", "densite": "moyenne"},
        
        # Région Diourbel (3 communes)
        {"zone_id": 8, "region": "Diourbel", "commune": "Diourbel", "population": 100000, "type_zone": "urbain", "densite": "moyenne"},
        {"zone_id": 9, "region": "Diourbel", "commune": "Touba", "population": 750000, "type_zone": "urbain", "densite": "très_elevee"},
        {"zone_id": 10, "region": "Diourbel", "commune": "Mbacké", "population": 85000, "type_zone": "semi_urbain", "densite": "moyenne"},
        
        # Région Saint-Louis (2 communes)
        {"zone_id": 11, "region": "Saint-Louis", "commune": "Saint-Louis", "population": 180000, "type_zone": "urbain", "densite": "elevee"},
        {"zone_id": 12, "region": "Saint-Louis", "commune": "Richard Toll", "population": 65000, "type_zone": "semi_urbain", "densite": "faible"},
        
        # Région Kaolack (2 communes)
        {"zone_id": 13, "region": "Kaolack", "commune": "Kaolack", "population": 200000, "type_zone": "urbain", "densite": "elevee"},
        {"zone_id": 14, "region": "Kaolack", "commune": "Nioro du Rip", "population": 40000, "type_zone": "semi_urbain", "densite": "faible"},
        
        # Autres régions (1 commune chacune)
        {"zone_id": 15, "region": "Louga", "commune": "Louga", "population": 90000, "type_zone": "urbain", "densite": "moyenne"},
        {"zone_id": 16, "region": "Fatick", "commune": "Fatick", "population": 35000, "type_zone": "semi_urbain", "densite": "faible"},
        {"zone_id": 17, "region": "Kolda", "commune": "Kolda", "population": 70000, "type_zone": "urbain", "densite": "moyenne"},
        {"zone_id": 18, "region": "Tambacounda", "commune": "Tambacounda", "population": 85000, "type_zone": "urbain", "densite": "faible"},
        {"zone_id": 19, "region": "Ziguinchor", "commune": "Ziguinchor", "population": 160000, "type_zone": "urbain", "densite": "elevee"},
        {"zone_id": 20, "region": "Matam", "commune": "Matam", "population": 45000, "type_zone": "semi_urbain", "densite": "faible"},
        {"zone_id": 21, "region": "Kaffrine", "commune": "Kaffrine", "population": 50000, "type_zone": "semi_urbain", "densite": "faible"},
        {"zone_id": 22, "region": "Kédougou", "commune": "Kédougou", "population": 25000, "type_zone": "rural", "densite": "très_faible"},
        {"zone_id": 23, "region": "Sédhiou", "commune": "Sédhiou", "population": 35000, "type_zone": "semi_urbain", "densite": "faible"},
    ]
    
    # Sauvegarder en CSV sans pandas
    out_dir = Path('data/raw')
    out_dir.mkdir(parents=True, exist_ok=True)
    csv_path = out_dir / 'zones_senegal.csv'
    fieldnames = ['zone_id', 'region', 'commune', 'population', 'type_zone', 'densite']
    with csv_path.open('w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for z in zones_data:
            writer.writerow(z)

    regions = set(z['region'] for z in zones_data)
    total_population = sum(z['population'] for z in zones_data)

    print(f"✅ {len(zones_data)} zones générées → {csv_path}")
    print(f"   • Régions uniques : {len(regions)}")
    print(f"   • Population totale : {total_population:,}")

    return zones_data


if __name__ == "__main__":
    zones = generate_zones()
    print("\n📊 Aperçu :")
    for z in zones[:10]:
        print(', '.join(f"{k}: {v}" for k, v in z.items()))
