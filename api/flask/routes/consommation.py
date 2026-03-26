"""
Endpoints données consommation
"""
from flask import Blueprint, request, jsonify
from utils.db import db
from utils.decorators import handle_errors
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

# Blueprint
consommation_bp = Blueprint('consommation', __name__, url_prefix='/api/consommation')

# Rate limiter
limiter = Limiter(key_func=get_remote_address)


@consommation_bp.route('/kpis', methods=['GET'])
@limiter.limit("50 per minute")
@handle_errors
def get_kpis():
    """
    KPIs globaux
    """
    periode = request.args.get('periode', '2026-01')
    
    query = """
    SELECT 
        users_actifs,
        users_en_t1,
        conso_totale_kwh,
        cout_total,
        economie_totale,
        nb_recharges,
        montant_recharges_total
    FROM mart_kpis_globaux
    WHERE periode = %s
    """
    
    result = db.execute_query(query, (periode,), fetchall=False)
    
    if not result:
        return jsonify({
            'error': f'Aucune donnée pour période {periode}'
        }), 404
    
    return jsonify({
        'success': True,
        'data': result
    }), 200


@consommation_bp.route('/evolution', methods=['GET'])
@limiter.limit("50 per minute")
@handle_errors
def get_evolution():
    """
    Évolution consommation
    """
    limit = request.args.get('limit', 30, type=int)
    
    query = """
    SELECT 
        date,
        conso_totale_kwh,
        conso_moyenne_kwh,
        users_actifs,
        pct_t1,
        nb_recharges
    FROM mart_performance_journaliere
    ORDER BY date DESC
    LIMIT %s
    """
    
    results = db.execute_query(query, (limit,))
    
    return jsonify({
        'success': True,
        'count': len(results),
        'data': results
    }), 200


@consommation_bp.route('/tranches', methods=['GET'])
@limiter.limit("50 per minute")
@handle_errors
def get_tranches():
    """
    Répartition tranches
    """
    periode = request.args.get('periode', '2026-01')
    type_compteur = request.args.get('type_compteur')
    
    query = """
    SELECT 
        type_compteur,
        nom_tranche,
        nb_users_uniques,
        conso_totale_kwh,
        cout_total_fcfa,
        economie_totale_fcfa
    FROM mart_tarifs_2026
    WHERE periode = %s
    """
    
    params = [periode]
    
    if type_compteur:
        query += " AND type_compteur = %s"
        params.append(type_compteur)
    
    query += " ORDER BY type_compteur, tranche"
    
    results = db.execute_query(query, params)
    
    return jsonify({
        'success': True,
        'count': len(results),
        'data': results
    }), 200


@consommation_bp.route('/regions', methods=['GET'])
@limiter.limit("50 per minute")
@handle_errors
def get_regions():
    """
    Consommation par région
    """
    periode = request.args.get('periode', '2026-01')
    
    query = """
    SELECT 
        region,
        type_zone,
        nb_users_actifs,
        conso_totale_kwh,
        cout_total,
        economie_totale
    FROM mart_conso_regions_mensuel
    WHERE CONCAT(annee, '-', LPAD(mois::TEXT, 2, '0')) = %s
    ORDER BY conso_totale_kwh DESC
    """
    
    results = db.execute_query(query, (periode,))
    
    return jsonify({
        'success': True,
        'count': len(results),
        'data': results
    }), 200
