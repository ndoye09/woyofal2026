"""
Streamlit App - Version corrigée pour Windows
"""

import streamlit as st
import psycopg2
from psycopg2.extras import RealDictCursor
import pandas as pd

# Configuration page
st.set_page_config(
    page_title="Woyofal DWH Explorer",
    page_icon="⚡",
    layout="wide"
)

st.title("⚡ Woyofal — Data Warehouse Explorer")

# Sidebar pour connexion
with st.sidebar:
    st.header("🔌 Connexion PostgreSQL")
    
    host = st.text_input("Host", value="localhost")
    port = st.text_input("Port", value="5432")
    database = st.text_input("Database", value="woyofal_dwh")
    user = st.text_input("User", value="woyofal_user")
    password = st.text_input("Password", value="woyofal2026", type="password")
    
    connect_btn = st.button("🔗 Connecter", type="primary")

# Fonction connexion avec gestion encodage
def get_connection(host, port, database, user, password):
    """Connexion PostgreSQL avec gestion encodage Windows"""
    try:
        conn = psycopg2.connect(
            host=host,
            port=port,
            database=database,
            user=user,
            password=password,
            client_encoding='UTF8',
            options='-c client_encoding=UTF8'
        )
        return conn, None
    except psycopg2.OperationalError as e:
        error_msg = str(e)
        if "authentification" in error_msg or "authentication" in error_msg:
            return None, "❌ Mot de passe incorrect ou utilisateur inexistant"
        elif "n'existe pas" in error_msg or "does not exist" in error_msg:
            return None, f"❌ Base de données '{database}' introuvable"
        elif "refus" in error_msg or "refused" in error_msg:
            return None, "❌ PostgreSQL n'est pas démarré ou refuse la connexion"
        else:
            return None, f"❌ Erreur connexion : {error_msg}"
    except Exception as e:
        return None, f"❌ Erreur inattendue : {str(e)}"

# Test connexion
if connect_btn:
    with st.spinner("Connexion en cours..."):
        conn, error = get_connection(host, port, database, user, password)
        
        if conn:
            st.sidebar.success("✅ Connexion réussie !")
            st.session_state['conn'] = conn
            st.session_state['connected'] = True
        else:
            st.sidebar.error(error)
            st.session_state['connected'] = False

# Interface principale
if st.session_state.get('connected', False):
    conn = st.session_state['conn']
    
    st.success("✅ Connecté à PostgreSQL")
    
    # Tabs
    tab1, tab2, tab3 = st.tabs(["📊 Tables", "🔍 Requêtes", "📈 Stats"])
    
    with tab1:
        st.subheader("📊 Tables disponibles")
        
        try:
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            cursor.execute("""
                SELECT 
                    tablename,
                    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as taille
                FROM pg_tables
                WHERE schemaname = 'public'
                ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
            """)
            
            tables = cursor.fetchall()
            df_tables = pd.DataFrame(tables)
            
            st.dataframe(df_tables, use_container_width=True)
            
            selected_table = st.selectbox(
                "Sélectionner une table",
                options=df_tables['tablename'].tolist() if not df_tables.empty else []
            )
            
            if st.button("📄 Afficher données"):
                cursor.execute(f"SELECT * FROM {selected_table} LIMIT 100")
                data = cursor.fetchall()
                df_data = pd.DataFrame(data)
                
                st.write(f"**Aperçu de {selected_table}** (100 premières lignes)")
                st.dataframe(df_data, use_container_width=True)
            
        except Exception as e:
            st.error(f"Erreur : {e}")
    
    with tab2:
        st.subheader("🔍 Exécuter requête SQL")
        
        query = st.text_area(
            "Requête SQL",
            value="SELECT * FROM mart_kpis_globaux LIMIT 10;",
            height=150
        )
        
        if st.button("▶️ Exécuter"):
            try:
                df_result = pd.read_sql_query(query, conn)
                st.success(f"✅ {len(df_result)} lignes retournées")
                st.dataframe(df_result, use_container_width=True)
                
                csv = df_result.to_csv(index=False)
                st.download_button(
                    label="📥 Télécharger CSV",
                    data=csv,
                    file_name="export.csv",
                    mime="text/csv"
                )
                
            except Exception as e:
                st.error(f"❌ Erreur : {e}")
    
    with tab3:
        st.subheader("📈 Statistiques DWH")
        
        try:
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            
            cursor.execute("""
                SELECT 
                    COUNT(*) as nb_tables,
                    pg_size_pretty(SUM(pg_total_relation_size(schemaname||'.'||tablename))) as taille_totale
                FROM pg_tables
                WHERE schemaname = 'public'
            """)
            
            stats = cursor.fetchone() or {'nb_tables': 0, 'taille_totale': '0'}
            
            col1, col2 = st.columns(2)
            
            with col1:
                st.metric("Nombre de tables", stats.get('nb_tables', 0))
            
            with col2:
                st.metric("Taille totale", stats.get('taille_totale', '0'))
            
            st.subheader("Top 5 tables les plus volumineuses")
            
            cursor.execute("""
                SELECT 
                    tablename,
                    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as taille,
                    n_live_tup as nb_lignes
                FROM pg_tables
                JOIN pg_stat_user_tables USING (tablename)
                WHERE schemaname = 'public'
                ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
                LIMIT 5
            """)
            
            top_tables = cursor.fetchall()
            df_top = pd.DataFrame(top_tables)
            
            st.dataframe(df_top, use_container_width=True)
            
        except Exception as e:
            st.error(f"Erreur : {e}")
    
else:
    st.info("👈 Remplissez le formulaire de connexion dans la barre latérale et cliquez sur **Connecter**")
    
    with st.expander("📖 Instructions de connexion"):
        st.markdown("""
        ### Configuration PostgreSQL requise :
        
        1. **Créer l'utilisateur** (si inexistant) :
        ```sql
        CREATE USER woyofal_user WITH PASSWORD 'woyofal2026';
        ```
        
        2. **Créer la base** (si inexistante) :
        ```sql
        CREATE DATABASE woyofal_dwh OWNER woyofal_user ENCODING 'UTF8';
        ```
        
        3. **Donner les droits** :
        ```sql
        GRANT ALL PRIVILEGES ON DATABASE woyofal_dwh TO woyofal_user;
        ```
        
        4. **Modifier pg_hba.conf** :
        ```
        host    all    all    127.0.0.1/32    md5
        ```
        
        5. **Redémarrer PostgreSQL**
        """)