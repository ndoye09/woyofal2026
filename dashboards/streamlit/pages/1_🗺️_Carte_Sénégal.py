"""
Page : Carte Interactive Sénégal
"""
import streamlit as st
import pandas as pd
import folium
from streamlit_folium import st_folium
import sys
sys.path.append('../utils')
from db_connector import query_db

st.set_page_config(page_title="Carte Sénégal", page_icon="🗺️", layout="wide")
st.title("🗺️ Carte Consommation Sénégal")

regions_query = """
SELECT z.region, z.latitude, z.longitude, SUM(c.conso_totale_kwh) as conso_totale, SUM(c.economie_totale_fcfa) as economie_totale, COUNT(DISTINCT c.user_hash) as nb_users
FROM mart_conso_users c
JOIN dim_users u ON c.user_id_interne = u.user_id
JOIN dim_zones z ON u.zone_id = z.zone_id
WHERE c.periode = '2026-01'
GROUP BY z.region, z.latitude, z.longitude
"""

regions_df = query_db(regions_query)

m = folium.Map(location=[14.7167, -17.4677], zoom_start=7, tiles='OpenStreetMap')
for idx, row in regions_df.iterrows():
    if pd.notna(row['latitude']) and pd.notna(row['longitude']):
        folium.CircleMarker(
            location=[row['latitude'], row['longitude']],
            radius=max(4, row['nb_users'] / 100),
            popup=f"<b>{row['region']}</b><br>Users: {int(row['nb_users']):,}<br>Conso: {int(row['conso_totale']):,} kWh<br>Économies: {int(row['economie_totale']):,} FCFA",
            color='blue', fill=True, fillColor='lightblue', fillOpacity=0.6
        ).add_to(m)

st_folium(m, width=1200, height=600)
st.markdown("### 📊 Top Régions")
st.dataframe(regions_df.sort_values('conso_totale', ascending=False), use_container_width=True)
