"""
DASHBOARD STREAMLIT - Accueil
"""
import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from plotly.subplots import make_subplots
from datetime import datetime
import os
import sys
# Ensure the local `utils` directory (next to this file) is on sys.path
HERE = os.path.dirname(__file__)
sys.path.insert(0, os.path.join(HERE, 'utils'))
from db_connector import query_db, test_connection

st.set_page_config(
    page_title="Woyofal Analytics",
    page_icon="⚡",
    layout="wide",
    initial_sidebar_state="expanded"
)

st.markdown('<div style="font-size:2rem;font-weight:700;color:#1f77b4;text-align:center;padding:1rem 0;">⚡ Woyofal Analytics Dashboard</div>', unsafe_allow_html=True)
st.markdown("---")

if not test_connection():
    st.error("❌ Impossible de se connecter à la base de données")
    st.stop()

with st.sidebar:
    st.image("https://via.placeholder.com/300x100/1f77b4/ffffff?text=Woyofal", use_container_width=True)
    st.markdown("## 🎯 Filtres")
    periode = st.selectbox("📅 Période", options=['2026-01','2026-02','2026-03','2026-04'], index=0)
    type_compteur = st.multiselect("🔌 Type Compteur", options=['DPP','PPP'], default=['DPP','PPP'])
    regions_query = "SELECT DISTINCT region FROM dim_zones ORDER BY region"
    regions_df = query_db(regions_query)
    regions = st.multiselect("🗺️ Régions", options=regions_df['region'].tolist(), default=regions_df['region'].tolist()[:5])
    st.markdown("---")
    st.markdown(f"📅 **Mise à jour** : {datetime.now().strftime('%Y-%m-%d %H:%M')}")

# KPIs
st.markdown("## 📊 KPIs Globaux")
kpis_query = f"SELECT users_actifs, users_en_t1, ROUND(conso_totale_kwh,0) as conso_totale_kwh, ROUND(cout_total,0) as cout_total, ROUND(economie_totale,0) as economie_totale, nb_recharges, ROUND(montant_recharges_total,0) as montant_recharges FROM mart_kpis_globaux WHERE periode = '{periode}'"
kpis_df = query_db(kpis_query)
if not kpis_df.empty:
    kpi = kpis_df.iloc[0]
    c1,c2,c3,c4 = st.columns(4)
    with c1:
        st.metric("👥 Users Actifs", f"{int(kpi['users_actifs']):,}", delta=f"{int(kpi['users_en_t1']):,} en T1")
    with c2:
        st.metric("⚡ Consommation Totale", f"{int(kpi['conso_totale_kwh']):,} kWh", delta=f"{int(kpi['conso_totale_kwh']/kpi['users_actifs']):.1f} kWh/user")
    with c3:
        st.metric("💰 Coût Total", f"{int(kpi['cout_total']):,} FCFA", delta=f"-{int(kpi['economie_totale']):,} FCFA économisés", delta_color="inverse")
    with c4:
        st.metric("💳 Recharges", f"{int(kpi['nb_recharges']):,}", delta=f"{int(kpi['montant_recharges']):,} FCFA")

st.markdown("---")

# Evolution consommation
st.markdown("## 📈 Évolution Consommation")
evol_query = """
SELECT date, nom_jour, conso_totale_kwh, conso_moyenne_kwh, users_actifs, pct_t1, nb_recharges FROM mart_performance_journaliere ORDER BY date DESC LIMIT 30
"""
evol_df = query_db(evol_query)
if not evol_df.empty:
    evol_df = evol_df.sort_values('date')
    fig = make_subplots(rows=2, cols=1, subplot_titles=('Consommation Totale Quotidienne','Users Actifs & % Tranche 1'), vertical_spacing=0.15)
    fig.add_trace(go.Scatter(x=evol_df['date'], y=evol_df['conso_totale_kwh'], name='Conso Totale (kWh)', line=dict(color='#1f77b4',width=3), fill='tozeroy', fillcolor='rgba(31,119,180,0.2)'), row=1, col=1)
    fig.add_trace(go.Scatter(x=evol_df['date'], y=evol_df['users_actifs'], name='Users Actifs', line=dict(color='#2ca02c',width=2)), row=2, col=1)
    fig.add_trace(go.Scatter(x=evol_df['date'], y=evol_df['pct_t1'], name='% Tranche 1', line=dict(color='#ff7f0e',width=2,dash='dash')), row=2, col=1)
    fig.update_layout(height=600, showlegend=True, hovermode='x unified')
    st.plotly_chart(fig, use_container_width=True)

st.markdown("---")

# Economies post-2026
st.markdown("## 💰 Économies Post-2026 (Baisse 10%)")
col1,col2 = st.columns([2,1])
with col1:
    eco_query = f"SELECT nom_tranche, type_compteur, economie_totale_fcfa, nb_users_uniques, economie_par_user, pct_observations FROM mart_tarifs_2026 WHERE periode = '{periode}' AND beneficie_tarif_social = TRUE ORDER BY type_compteur, tranche"
    eco_df = query_db(eco_query)
    if not eco_df.empty:
        fig_eco = px.bar(eco_df, x='nom_tranche', y='economie_totale_fcfa', color='type_compteur', title=f'Économies Totales par Tranche - {periode}', text='economie_totale_fcfa', color_discrete_map={'DPP':'#90EE90','PPP':'#87CEEB'})
        fig_eco.update_traces(texttemplate='%{text:,.0f}', textposition='outside')
        fig_eco.update_layout(height=400)
        st.plotly_chart(fig_eco, use_container_width=True)
with col2:
    if not eco_df.empty:
        economie_totale = eco_df['economie_totale_fcfa'].sum()
        nb_users_total = eco_df['nb_users_uniques'].sum()
        eco_moyenne_user = economie_totale / nb_users_total if nb_users_total>0 else 0
        st.metric('💵 Économie Totale', f"{int(economie_totale):,} FCFA")
        st.metric('👥 Users Bénéficiaires', f"{int(nb_users_total):,}")
        st.metric('💰 Économie Moyenne/User', f"{int(eco_moyenne_user):,} FCFA")
        projection = economie_totale * 12
        st.markdown(f"**📈 Projection Annuelle**  \n{int(projection):,} FCFA  \n*({projection/1e9:.2f} milliards FCFA)*")

st.markdown("---")

# Répartition tranches
st.markdown("## 🎯 Répartition Tranches Tarifaires")
col1,col2 = st.columns(2)
with col1:
    tranches_dpp_query = f"SELECT nom_tranche, nb_users_uniques, pct_observations FROM mart_tarifs_2026 WHERE periode = '{periode}' AND type_compteur = 'DPP' ORDER BY tranche"
    tranches_dpp = query_db(tranches_dpp_query)
    if not tranches_dpp.empty:
        fig_dpp = px.pie(tranches_dpp, values='nb_users_uniques', names='nom_tranche', title='Répartition DPP (Domestique)', color_discrete_sequence=['#90EE90','#FFD700','#FF6B6B'], hole=0.4)
        fig_dpp.update_traces(textposition='inside', textinfo='percent+label')
        st.plotly_chart(fig_dpp, use_container_width=True)
with col2:
    tranches_ppp_query = f"SELECT nom_tranche, nb_users_uniques, pct_observations FROM mart_tarifs_2026 WHERE periode = '{periode}' AND type_compteur = 'PPP' ORDER BY tranche"
    tranches_ppp = query_db(tranches_ppp_query)
    if not tranches_ppp.empty:
        fig_ppp = px.pie(tranches_ppp, values='nb_users_uniques', names='nom_tranche', title='Répartition PPP (Professionnel)', color_discrete_sequence=['#87CEEB','#FFA07A','#CD5C5C'], hole=0.4)
        fig_ppp.update_traces(textposition='inside', textinfo='percent+label')
        st.plotly_chart(fig_ppp, use_container_width=True)

st.markdown("### 📋 Détail par Tranche")
detail_query = f"SELECT type_compteur, nom_tranche, prix_kwh_actuel, nb_users_uniques, ROUND(conso_totale_kwh,0) as conso_totale, ROUND(cout_total_fcfa,0) as cout_total, ROUND(economie_totale_fcfa,0) as economie FROM mart_tarifs_2026 WHERE periode = '{periode}' ORDER BY type_compteur, tranche"
detail_df = query_db(detail_query)
if not detail_df.empty:
    detail_df['prix_kwh_actuel'] = detail_df['prix_kwh_actuel'].apply(lambda x: f"{x:.2f} F")
    detail_df['nb_users_uniques'] = detail_df['nb_users_uniques'].apply(lambda x: f"{int(x):,}")
    detail_df['conso_totale'] = detail_df['conso_totale'].apply(lambda x: f"{int(x):,}")
    detail_df['cout_total'] = detail_df['cout_total'].apply(lambda x: f"{int(x):,}")
    detail_df['economie'] = detail_df['economie'].apply(lambda x: f"{int(x):,}")
    st.dataframe(detail_df, use_container_width=True, hide_index=True)

st.markdown("---")
st.markdown("<div style='text-align:center;color:#666;padding:2rem 0;'><p>🔋 <strong>Woyofal Data Platform</strong> - Analyse Tarifs Senelec 2026</p></div>", unsafe_allow_html=True)
