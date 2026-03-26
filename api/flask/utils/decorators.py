"""
Décorateurs personnalisés
"""
from functools import wraps
from flask import jsonify, request
import logging

logger = logging.getLogger(__name__)


def handle_errors(f):
    """Gestionnaire erreurs global"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            return f(*args, **kwargs)
        except ValueError as e:
            logger.warning(f"ValueError : {e}")
            return jsonify({
                'error': 'Paramètres invalides',
                'message': str(e)
            }), 400
        except Exception as e:
            logger.error(f"Erreur : {e}", exc_info=True)
            return jsonify({
                'error': 'Erreur serveur',
                'message': 'Une erreur est survenue'
            }), 500

    return decorated_function


def validate_json(*required_fields):
    """Valider présence champs requis dans JSON"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if not request.is_json:
                return jsonify({
                    'error': 'Content-Type doit être application/json'
                }), 400

            data = request.get_json()
            missing = [field for field in required_fields if field not in data]

            if missing:
                return jsonify({
                    'error': 'Champs manquants',
                    'missing_fields': missing
                }), 400

            return f(*args, **kwargs)

        return decorated_function
    return decorator
