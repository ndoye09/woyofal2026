"""Script de test rapide pour vérifier que Flask démarre correctement."""
import sys
import os

sys.path.insert(0, 'api/flask')

try:
    from app import create_app
    app = create_app()
    print("OK Flask app creee avec succes")
    
    # Vérifier que la clé OpenRouter est chargée
    key = os.getenv('OPENROUTER_API_KEY', '')
    if key:
        print(f"OK OPENROUTER_API_KEY chargee ({len(key)} chars)")
    else:
        print("ERREUR OPENROUTER_API_KEY MANQUANTE")
        
    print("Lancement du serveur Flask sur port 5000...")
    app.run(host='0.0.0.0', port=5000, debug=True)
    
except Exception as e:
    print(f"ERREUR: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
