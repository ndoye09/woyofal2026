"""
Endpoints simulation recharge
"""
from flask import Blueprint, request, jsonify
from utils.decorators import handle_errors, validate_json
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import logging

logger = logging.getLogger(__name__)

# Blueprint
simulation_bp = Blueprint('simulation', __name__, url_prefix='/api/simulation')

# Rate limiter
limiter = Limiter(key_func=get_remote_address)


# Tarifs Senelec 2026
TARIFS = {
    'DPP': {
        1: {'prix': 82.00, 'seuil_min': 0, 'seuil_max': 150},
        2: {'prix': 136.49, 'seuil_min': 151, 'seuil_max': 250},
        3: {'prix': 136.49, 'seuil_min': 251, 'seuil_max': None}
    },
    'PPP': {
        1: {'prix': 147.43, 'seuil_min': 0, 'seuil_max': 50},
        2: {'prix': 189.84, 'seuil_min': 51, 'seuil_max': 500},
        3: {'prix': 189.84, 'seuil_min': 501, 'seuil_max': None}
    }
}

REDEVANCE = 429
TAXE_COMMUNALE = 0.025


def determine_tranche(cumul, type_compteur):
    """Détermine tranche selon cumul"""
    tarifs = TARIFS[type_compteur]
    
    if cumul <= tarifs[1]['seuil_max']:
        return 1
    elif tarifs[2]['seuil_max'] and cumul <= tarifs[2]['seuil_max']:
        return 2
    else:
        return 3


def calculer_recharge(montant_brut, cumul_actuel, type_compteur, avec_redevance=False):
    """
    Calcule kWh obtenus et détail tranches
    """
    # Validation
    if type_compteur not in TARIFS:
        raise ValueError(f"Type compteur invalide : {type_compteur}")
    
    if montant_brut <= 0:
        raise ValueError("Montant doit être positif")
    
    if cumul_actuel < 0:
        raise ValueError("Cumul doit être >= 0")
    
    tarifs = TARIFS[type_compteur]
    
    # Déductions
    redevance = REDEVANCE if avec_redevance else 0
    taxe = montant_brut * TAXE_COMMUNALE
    montant_net = montant_brut - redevance - taxe
    
    if montant_net <= 0:
        return {
            'montant_brut': montant_brut,
            'deductions': {
                'redevance': redevance,
                'taxe_communale': taxe,
                'montant_net': 0
            },
            'kwh_obtenus': 0,
            'detail_tranches': {},
            'cumul_final': cumul_actuel,
            'tranche_finale': determine_tranche(cumul_actuel, type_compteur),
            'message': 'Montant net insuffisant après déductions'
        }
    
    # Calcul progressif kWh
    kwh_total = 0
    detail_tranches = {}
    reste_montant = montant_net
    cumul = cumul_actuel
    
    # Phase 1 : Remplir T1
    seuil_t1 = tarifs[1]['seuil_max']
    if cumul < seuil_t1:
        kwh_disponibles = seuil_t1 - cumul
        montant_max = kwh_disponibles * tarifs[1]['prix']
        
        if reste_montant <= montant_max:
            kwh_t1 = reste_montant / tarifs[1]['prix']
            detail_tranches['T1'] = {
                'kwh': round(kwh_t1, 2),
                'prix_unitaire': tarifs[1]['prix'],
                'montant': round(reste_montant, 2)
            }
            kwh_total += kwh_t1
            cumul += kwh_t1
            reste_montant = 0
        else:
            detail_tranches['T1'] = {
                'kwh': round(kwh_disponibles, 2),
                'prix_unitaire': tarifs[1]['prix'],
                'montant': round(montant_max, 2)
            }
            kwh_total += kwh_disponibles
            cumul = seuil_t1
            reste_montant -= montant_max
    
    # Phase 2 : Remplir T2
    if reste_montant > 0:
        seuil_t2 = tarifs[2]['seuil_max'] if tarifs[2]['seuil_max'] else float('inf')
        
        if cumul < seuil_t2:
            kwh_disponibles = seuil_t2 - cumul if seuil_t2 != float('inf') else float('inf')
            montant_max = kwh_disponibles * tarifs[2]['prix'] if kwh_disponibles != float('inf') else float('inf')
            
            if reste_montant <= montant_max or kwh_disponibles == float('inf'):
                kwh_t2 = reste_montant / tarifs[2]['prix']
                detail_tranches['T2'] = {
                    'kwh': round(kwh_t2, 2),
                    'prix_unitaire': tarifs[2]['prix'],
                    'montant': round(reste_montant, 2)
                }
                kwh_total += kwh_t2
                cumul += kwh_t2
                reste_montant = 0
            else:
                detail_tranches['T2'] = {
                    'kwh': round(kwh_disponibles, 2),
                    'prix_unitaire': tarifs[2]['prix'],
                    'montant': round(montant_max, 2)
                }
                kwh_total += kwh_disponibles
                cumul = seuil_t2
                reste_montant -= montant_max
    
    # Phase 3 : T3 (reste)
    if reste_montant > 0:
        kwh_t3 = reste_montant / tarifs[3]['prix']
        detail_tranches['T3'] = {
            'kwh': round(kwh_t3, 2),
            'prix_unitaire': tarifs[3]['prix'],
            'montant': round(reste_montant, 2)
        }
        kwh_total += kwh_t3
        cumul += kwh_t3
        reste_montant = 0
    
    # Tranche finale
    tranche_finale = determine_tranche(cumul, type_compteur)
    
    # Prix moyen
    prix_moyen = montant_net / kwh_total if kwh_total > 0 else 0
    
    # Économie vs T2/T3
    economie_vs_t2 = 0
    if 'T1' in detail_tranches:
        kwh_t1 = detail_tranches['T1']['kwh']
        economie_vs_t2 = kwh_t1 * (tarifs[2]['prix'] - tarifs[1]['prix'])
    
    return {
        'montant_brut': montant_brut,
        'deductions': {
            'redevance': redevance,
            'taxe_communale': round(taxe, 2),
            'montant_net': round(montant_net, 2)
        },
        'kwh_obtenus': round(kwh_total, 2),
        'detail_tranches': detail_tranches,
        'cumul_avant': cumul_actuel,
        'cumul_final': round(cumul, 2),
        'tranche_finale': tranche_finale,
        'prix_moyen_kwh': round(prix_moyen, 2),
        'economie_vs_t2': round(economie_vs_t2, 2),
        'type_compteur': type_compteur
    }


@simulation_bp.route('/recharge', methods=['POST'])
@limiter.limit("20 per minute")
@handle_errors
@validate_json('montant_brut', 'cumul_actuel', 'type_compteur')
def simulate_recharge():
    """
    Simuler recharge
    """
    data = request.get_json()
    
    result = calculer_recharge(
        montant_brut=float(data['montant_brut']),
        cumul_actuel=float(data['cumul_actuel']),
        type_compteur=data['type_compteur'],
        avec_redevance=data.get('avec_redevance', False)
    )
    
    return jsonify({
        'success': True,
        'data': result
    }), 200


@simulation_bp.route('/recommandation', methods=['POST'])
@limiter.limit("20 per minute")
@handle_errors
@validate_json('cumul_actuel', 'conso_moy_jour', 'jours_restants', 'type_compteur')
def get_recommandation():
    """
    Obtenir recommandation montant optimal
    """
    data = request.get_json()
    
    cumul = float(data['cumul_actuel'])
    conso_moy = float(data['conso_moy_jour'])
    jours = int(data['jours_restants'])
    type_compteur = data['type_compteur']
    
    tarifs = TARIFS[type_compteur]
    seuil_t1 = tarifs[1]['seuil_max']
    
    # Projection
    conso_projetee = cumul + (conso_moy * jours)
    marge_t1 = seuil_t1 - cumul
    
    # Recommandation
    if cumul >= seuil_t1:
        message = f"❌ Vous êtes déjà en Tranche 2 (cumul: {cumul:.1f} kWh > {seuil_t1} kWh)"
        montant_rec = 5000
        risque = "Élevé"
        kwh_optimal = 0
    elif conso_projetee <= seuil_t1:
        kwh_optimal = min(marge_t1, conso_moy * jours)
        montant_rec = kwh_optimal * tarifs[1]['prix']
        message = f"✅ Vous êtes en sécurité. Vous pouvez recharger jusqu'à {montant_rec:,.0f} FCFA pour obtenir {kwh_optimal:.1f} kWh en T1"
        risque = "Faible"
    else:
        kwh_optimal = min(marge_t1 * 0.8, conso_moy * 7)
        montant_rec = kwh_optimal * tarifs[1]['prix']
        depassement = conso_projetee - seuil_t1
        message = f"⚠️  ATTENTION : Risque de dépassement T1 de {depassement:.1f} kWh. Rechargez MAX {montant_rec:,.0f} FCFA"
        risque = "Moyen"
    
    return jsonify({
        'success': True,
        'data': {
            'montant_recommande': round(montant_rec, 0),
            'kwh_optimaux': round(kwh_optimal, 1) if 'kwh_optimal' in locals() else 0,
            'message': message,
            'risque': risque,
            'cumul_actuel': cumul,
            'conso_projetee': round(conso_projetee, 1),
            'marge_t1': round(marge_t1, 1)
        }
    }), 200


@simulation_bp.route('/tarifs', methods=['GET'])
@limiter.limit("50 per minute")
@handle_errors
def get_tarifs():
    """
    Obtenir grille tarifaire
    """
    type_compteur = request.args.get('type_compteur')
    
    if type_compteur:
        if type_compteur not in TARIFS:
            return jsonify({
                'error': f"Type compteur invalide : {type_compteur}"
            }), 400
        
        tarifs_data = {type_compteur: TARIFS[type_compteur]}
    else:
        tarifs_data = TARIFS
    
    return jsonify({
        'success': True,
        'data': {
            'tarifs': tarifs_data,
            'redevance': REDEVANCE,
            'taxe_communale_pct': TAXE_COMMUNALE * 100
        }
    }), 200
