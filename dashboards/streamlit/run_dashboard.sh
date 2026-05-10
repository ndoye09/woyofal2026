#!/usr/bin/env bash
echo "🚀 Démarrage Dashboard Streamlit..."
ROOT_DIR=$(cd "$(dirname "$0")" && pwd)
cd "$ROOT_DIR"
streamlit run "🏠_Accueil.py" --server.port 8501 --server.address 0.0.0.0
