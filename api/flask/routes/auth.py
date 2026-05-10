"""
Routes d'authentification — JWT + bcrypt
Register, Login, Refresh, Me, Logout
"""

import re
import bcrypt
from flask import Blueprint, request, jsonify
from flask_jwt_extended import (
    create_access_token,
    create_refresh_token,
    jwt_required,
    get_jwt_identity,
)
from utils.db import db

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

# ─── Validation ────────────────────────────────────────────────────────────────

EMAIL_RE = re.compile(r'^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$')
MIN_PASSWORD = 8
MAX_NAME = 80
MAX_EMAIL = 254


def _hash(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt(rounds=12)).decode('utf-8')


def _verify(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))


def _validate_register(email: str, password: str, name: str) -> list[str]:
    errors = []
    if not email or len(email) > MAX_EMAIL or not EMAIL_RE.match(email):
        errors.append('Adresse email invalide.')
    if not password or len(password) < MIN_PASSWORD:
        errors.append(f'Mot de passe trop court (minimum {MIN_PASSWORD} caractères).')
    if not name or len(name.strip()) < 2 or len(name) > MAX_NAME:
        errors.append('Nom invalide (2 à 80 caractères).')
    return errors


# ─── Routes ────────────────────────────────────────────────────────────────────

@auth_bp.route('/register', methods=['POST'])
def register():
    """POST /api/auth/register — Créer un compte"""
    payload = request.get_json(silent=True)
    if not payload:
        return jsonify({'error': 'Corps JSON manquant.'}), 400

    email    = str(payload.get('email', '')).strip().lower()
    password = str(payload.get('password', ''))
    name     = str(payload.get('name', '')).strip()

    errors = _validate_register(email, password, name)
    if errors:
        return jsonify({'errors': errors}), 422

    # Vérifier unicité email
    existing = db.execute_query(
        'SELECT id FROM users WHERE email = %s',
        (email,), fetchall=False
    )
    if existing:
        return jsonify({'error': 'Cet email est déjà utilisé.'}), 409

    # Créer utilisateur
    db.execute_insert(
        'INSERT INTO users (email, password_hash, name, created_at) VALUES (%s, %s, %s, NOW())',
        (email, _hash(password), name)
    )

    user = db.execute_query(
        'SELECT id, email, name FROM users WHERE email = %s',
        (email,), fetchall=False
    )

    access_token  = create_access_token(identity=str(user['id']))
    refresh_token = create_refresh_token(identity=str(user['id']))

    return jsonify({
        'message': 'Compte créé avec succès.',
        'access_token':  access_token,
        'refresh_token': refresh_token,
        'user': {'id': user['id'], 'email': user['email'], 'name': user['name']}
    }), 201


@auth_bp.route('/login', methods=['POST'])
def login():
    """POST /api/auth/login — Connexion"""
    payload = request.get_json(silent=True)
    if not payload:
        return jsonify({'error': 'Corps JSON manquant.'}), 400

    email    = str(payload.get('email', '')).strip().lower()
    password = str(payload.get('password', ''))

    if not email or not password:
        return jsonify({'error': 'Email et mot de passe requis.'}), 400

    user = db.execute_query(
        'SELECT id, email, name, password_hash FROM users WHERE email = %s',
        (email,), fetchall=False
    )

    # Même message d'erreur pour email inconnu ou mauvais mot de passe (anti-énumération)
    if not user or not _verify(password, user['password_hash']):
        return jsonify({'error': 'Identifiants incorrects.'}), 401

    access_token  = create_access_token(identity=str(user['id']))
    refresh_token = create_refresh_token(identity=str(user['id']))

    return jsonify({
        'access_token':  access_token,
        'refresh_token': refresh_token,
        'user': {'id': user['id'], 'email': user['email'], 'name': user['name']}
    }), 200


@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    """POST /api/auth/refresh — Renouveler l'access token"""
    identity = get_jwt_identity()
    new_token = create_access_token(identity=identity)
    return jsonify({'access_token': new_token}), 200


@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def me():
    """GET /api/auth/me — Profil de l'utilisateur connecté"""
    user_id = get_jwt_identity()
    user = db.execute_query(
        'SELECT id, email, name, created_at FROM users WHERE id = %s',
        (int(user_id),), fetchall=False
    )
    if not user:
        return jsonify({'error': 'Utilisateur introuvable.'}), 404
    return jsonify({'user': dict(user)}), 200


@auth_bp.route('/logout', methods=['DELETE'])
@jwt_required()
def logout():
    """DELETE /api/auth/logout — Invalider la session (côté client)"""
    return jsonify({'message': 'Déconnexion réussie.'}), 200


# ─── Simulations personnelles ───────────────────────────────────────────────────

@auth_bp.route('/simulations', methods=['POST'])
@jwt_required()
def save_simulation():
    """POST /api/auth/simulations — Sauvegarder une simulation"""
    user_id = int(get_jwt_identity())
    payload = request.get_json(silent=True) or {}

    montant_brut   = payload.get('montant_brut')
    kwh_obtenus    = payload.get('kwh_obtenus')
    type_compteur  = payload.get('type_compteur', 'DPP')
    tranche_finale = payload.get('tranche_finale', 1)
    avec_redevance = bool(payload.get('avec_redevance', False))
    cumul_avant    = payload.get('cumul_avant', 0)
    cumul_final    = payload.get('cumul_final', 0)

    if montant_brut is None or kwh_obtenus is None:
        return jsonify({'error': 'montant_brut et kwh_obtenus sont requis.'}), 400

    db.execute_insert(
        """INSERT INTO user_simulations
           (user_id, montant_brut, kwh_obtenus, type_compteur, tranche_finale,
            avec_redevance, cumul_avant, cumul_final)
           VALUES (%s, %s, %s, %s, %s, %s, %s, %s)""",
        (user_id, float(montant_brut), float(kwh_obtenus), type_compteur,
         int(tranche_finale), avec_redevance, float(cumul_avant), float(cumul_final))
    )
    return jsonify({'message': 'Simulation sauvegardée.'}), 201


@auth_bp.route('/simulations', methods=['GET'])
@jwt_required()
def get_simulations():
    """GET /api/auth/simulations — Historique des simulations + stats personnelles"""
    user_id = int(get_jwt_identity())
    limit   = min(int(request.args.get('limit', 50)), 200)

    rows = db.execute_query(
        """SELECT id, montant_brut, kwh_obtenus, type_compteur, tranche_finale,
                  avec_redevance, cumul_avant, cumul_final,
                  to_char(created_at AT TIME ZONE 'Africa/Dakar', 'YYYY-MM-DD HH24:MI') AS date
           FROM user_simulations
           WHERE user_id = %s
           ORDER BY created_at DESC
           LIMIT %s""",
        (user_id, limit), fetchall=True
    )

    simulations = [dict(r) for r in rows] if rows else []

    # Statistiques personnelles
    stats = db.execute_query(
        """SELECT
               COUNT(*)                            AS total_simulations,
               COALESCE(SUM(montant_brut), 0)      AS total_fcfa,
               COALESCE(AVG(kwh_obtenus),  0)      AS avg_kwh,
               COALESCE(MAX(kwh_obtenus),  0)      AS max_kwh,
               COALESCE(SUM(kwh_obtenus),  0)      AS total_kwh,
               to_char(MAX(created_at) AT TIME ZONE 'Africa/Dakar',
                       'DD/MM/YYYY') AS derniere_simulation
           FROM user_simulations WHERE user_id = %s""",
        (user_id,), fetchall=False
    )

    return jsonify({
        'simulations': simulations,
        'stats': dict(stats) if stats else {}
    }), 200
