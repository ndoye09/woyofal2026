"""
Page : Analyses Détaillées
"""
import streamlit as st
import plotly.express as px
import plotly.graph_objects as go
import sys
sys.path.append('../utils')
from db_connector import query_db

st.set_page_config(page_title="Analyses Détaillées", page_icon="📈", layout="wide")
st.title("📈 Analyses Détaillées")

tab1, tab2, tab3 = st.tabs(["🔋 Consommation", "💳 Recharges", "💰 Tarification"])

with tab1:
    st.markdown("## 🔋 Analyse Consommation")
    segment_query = """
    SELECT segment_conso, type_compteur, COUNT(*) as nb_users, ROUND(AVG(conso_totale_kwh),2) as conso_moyenne, ROUND(AVG(cout_total_fcfa),0) as cout_moyen
    FROM mart_conso_users
    WHERE periode = '2026-01'
    GROUP BY segment_conso, type_compteur
    ORDER BY segment_conso, type_compteur
    """
    segment_df = query_db(segment_query)
    if not segment_df.empty:
        fig = px.bar(segment_df, x='segment_conso', y='nb_users', color='type_compteur', title='Segmentation Users par Consommation', text='nb_users', barmode='group')
        fig.update_traces(texttemplate='%{text:,}', textposition='outside')
        st.plotly_chart(fig, use_container_width=True)

    weekend_query = """
    SELECT type_zone, ROUND(AVG(conso_moy_weekend),2) as conso_weekend, ROUND(AVG(conso_moy_semaine),2) as conso_semaine, ROUND(AVG(variation_weekend_pct),1) as variation_pct
    FROM mart_conso_users
    WHERE periode = '2026-01'
    GROUP BY type_zone
    """
    weekend_df = query_db(weekend_query)
    if not weekend_df.empty:
        fig2 = go.Figure()
        fig2.add_trace(go.Bar(name='Weekend', x=weekend_df['type_zone'], y=weekend_df['conso_weekend'], marker_color='lightcoral'))
        fig2.add_trace(go.Bar(name='Semaine', x=weekend_df['type_zone'], y=weekend_df['conso_semaine'], marker_color='lightblue'))
        fig2.update_layout(title='Consommation Moyenne : Weekend vs Semaine', xaxis_title='Type Zone', yaxis_title='kWh Moyen', barmode='group')
        st.plotly_chart(fig2, use_container_width=True)

with tab2:
    st.markdown("## 💳 Analyse Recharges")
    canal_query = """
    SELECT canal_paiement, SUM(nb_recharges) as total_recharges, ROUND(AVG(montant_moyen_brut),0) as montant_moyen, ROUND(AVG(taux_success),2) as taux_success
    FROM mart_recharges_analyse
    WHERE periode = '2026-01'
    GROUP BY canal_paiement
    ORDER BY total_recharges DESC
    """
    canal_df = query_db(canal_query)
    if not canal_df.empty:
        col1,col2 = st.columns(2)
        with col1:
            fig3 = px.pie(canal_df, values='total_recharges', names='canal_paiement', title='Répartition par Canal Paiement')
            st.plotly_chart(fig3, use_container_width=True)
        with col2:
            fig4 = px.bar(canal_df, x='canal_paiement', y='montant_moyen', title='Montant Moyen par Canal', text='montant_moyen')
            fig4.update_traces(texttemplate='%{text:,.0f} F')
            st.plotly_chart(fig4, use_container_width=True)

with tab3:
    st.markdown("## 💰 Analyse Tarification")
    prix_query = """
    SELECT type_compteur, nom_tranche, prix_kwh_actuel, prix_reel_moyen_kwh, ROUND(prix_reel_moyen_kwh - prix_kwh_actuel,2) as ecart
    FROM mart_tarifs_2026
    WHERE periode = '2026-01'
    ORDER BY type_compteur, tranche
    """
    prix_df = query_db(prix_query)
    if not prix_df.empty:
        fig5 = go.Figure()
        for compteur in prix_df['type_compteur'].unique():
            data = prix_df[prix_df['type_compteur']==compteur]
            fig5.add_trace(go.Scatter(x=data['nom_tranche'], y=data['prix_kwh_actuel'], name=f'{compteur} - Théorique', mode='lines+markers', line=dict(dash='dash')))
            fig5.add_trace(go.Scatter(x=data['nom_tranche'], y=data['prix_reel_moyen_kwh'], name=f'{compteur} - Réel', mode='lines+markers'))
        fig5.update_layout(title='Prix Théorique vs Prix Réel Moyen', xaxis_title='Tranche', yaxis_title='Prix (FCFA/kWh)')
        st.plotly_chart(fig5, use_container_width=True)
