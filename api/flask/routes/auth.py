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
