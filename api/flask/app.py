"""
═══════════════════════════════════════════════════════════════
API FLASK - WOYOFAL DATA PLATFORM
═══════════════════════════════════════════════════════════════

API REST pour simulation recharge et analytics
"""

from flask import Flask, jsonify
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import logging
from logging.handlers import RotatingFileHandler
import os
from pathlib import Path

# Charger les variables d'environnement depuis api/flask/.env
from dotenv import load_dotenv
_env_path = Path(__file__).parent / '.env'
load_dotenv(dotenv_path=_env_path)

# Config
from config.config import config

# Utils
from utils.db import db

# Routes
from routes.simulation import simulation_bp, limiter as sim_limiter
from routes.consommation import consommation_bp, limiter as conso_limiter
from routes.auth import auth_bp
from routes.ai import ai_bp

# JWT
from flask_jwt_extended import JWTManager


def create_app(config_name='default'):
    """Factory pour créer app Flask"""
    
    app = Flask(__name__)
    
    # Charger config
    app.config.from_object(config[config_name])
    
    # CORS
    CORS(app, origins=app.config['CORS_ORIGINS'])
    
    # Database
    db.init_app(app)
    
    # Rate limiter
    limiter = Limiter(
        app=app,
        key_func=get_remote_address,
        default_limits=[app.config['RATELIMIT_DEFAULT']],
        storage_uri=app.config['RATELIMIT_STORAGE_URL']
    )
    
    # JWT
    JWTManager(app)

    # Limiter sur blueprints
    sim_limiter.init_app(app)
    conso_limiter.init_app(app)
    
    # Logging
    if not app.debug:
        if not os.path.exists('logs'):
            os.mkdir('logs')
        
        file_handler = RotatingFileHandler(
            'logs/api.log',
            maxBytes=10240000,
            backupCount=10
        )
        
        file_handler.setFormatter(logging.Formatter(
            '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
        ))
        
        file_handler.setLevel(logging.INFO)
        app.logger.addHandler(file_handler)
        app.logger.setLevel(logging.INFO)
        app.logger.info('Woyofal API startup')
    
    # Enregistrer blueprints
    app.register_blueprint(simulation_bp)
    app.register_blueprint(consommation_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(ai_bp)
    
    # Routes racine
    @app.route('/')
    def index():
        """Page d'accueil API"""
        return jsonify({
            'api': 'Woyofal Data Platform',
            'version': app.config['API_VERSION'],
            'description': app.config['API_DESCRIPTION'],
            'endpoints': {
                'simulation': {
                    'POST /api/simulation/recharge': 'Simuler recharge',
                    'POST /api/simulation/recommandation': 'Obtenir recommandation',
                    'GET /api/simulation/tarifs': 'Grille tarifaire'
                },
                'consommation': {
                    'GET /api/consommation/kpis': 'KPIs globaux',
                    'GET /api/consommation/evolution': 'Évolution conso',
                    'GET /api/consommation/tranches': 'Répartition tranches',
                    'GET /api/consommation/regions': 'Conso par région'
                }
            },
            'documentation': '/api/docs'
        }), 200
    
    @app.route('/health')
    def health():
        """Health check"""
        try:
            db.execute_query("SELECT 1", fetchall=False)
            db_status = 'ok'
        except Exception as e:
            db_status = 'error'
            app.logger.error(f"Health check DB failed: {e}")
        
        return jsonify({
            'status': 'ok' if db_status == 'ok' else 'degraded',
            'database': db_status
        }), 200 if db_status == 'ok' else 503
    
    # Error handlers
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({
            'error': 'Endpoint non trouvé',
            'message': str(error)
        }), 404
    
    @app.errorhandler(429)
    def ratelimit_handler(error):
        return jsonify({
            'error': 'Trop de requêtes',
            'message': 'Limite de requêtes atteinte. Réessayez plus tard.'
        }), 429
    
    @app.errorhandler(500)
    def internal_error(error):
        app.logger.error(f'Erreur serveur: {error}')
        return jsonify({
            'error': 'Erreur serveur',
            'message': 'Une erreur interne est survenue'
        }), 500
    
    return app


if __name__ == '__main__':
    app = create_app()
    app.run(host='0.0.0.0', port=5000, debug=True)
