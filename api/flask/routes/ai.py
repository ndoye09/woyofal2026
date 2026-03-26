"""
Route IA — OpenRouter avec fallback local intelligent
Répond toujours, même sans API disponible
"""

import os
import re
import time
import math
import requests
from flask import Blueprint, request, jsonify, current_app

ai_bp = Blueprint('ai', __name__, url_prefix='/api/ai')

# ─── Constantes ────────────────────────────────────────────────────────────────

MAX_MESSAGE    = 1000
MAX_HISTORY    = 10
OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
MAX_RETRIES    = 1   # 1 tentative par modèle (go fast)
RETRY_DELAY    = 2

MODELS = [
    'deepseek/deepseek-r1-0528:free',        # très bon, moins rate-limité
    'qwen/qwen3-8b:free',                    # rapide, dispo
    'meta-llama/llama-3.1-8b-instruct:free', # petit, souvent dispo
    'mistralai/mistral-7b-instruct:free',    # fiable
    'google/gemma-3-12b-it:free',            # sans system role
    'meta-llama/llama-3.3-70b-instruct:free', # meilleur qualité
    'meta-llama/llama-3.2-3b-instruct:free', # ultra-light fallback
]

# ─── Tarifs Senelec 2026 ───────────────────────────────────────────────────────

DPP_TRANCHES = [
    (150,  82.00,   'Tranche 1 (0–150 kWh)'),
    (float('inf'), 136.49, 'Tranche 2/3 (>150 kWh)'),
]
PPP_TRANCHES = [
    (150,  82.00,   'Tranche 1 (0–150 kWh)'),
    (float('inf'), 136.49, 'Tranche 2 (>150 kWh)'),
]
REDEVANCE_DPP = 1500  # FCFA/mois (valeur indicative)

TARIF_T1_MAX_FCFA = 150 * 82.00  # 12 300 FCFA = border T1/T2


def _fcfa_to_kwh(montant: float, tarif: str = 'DPP') -> dict:
    """Calcule les kWh obtenus pour un montant FCFA."""
    tranches = DPP_TRANCHES if tarif == 'DPP' else PPP_TRANCHES
    remaining = montant
    kwh_total = 0.0
    detail_lines = []

    for (limit, prix, label) in tranches:
        if remaining <= 0:
            break
        max_kwh_here = limit - kwh_total
        cost_here    = max_kwh_here * prix
        if remaining >= cost_here:
            kwh_here   = max_kwh_here
            remaining -= cost_here
        else:
            kwh_here   = remaining / prix
            remaining  = 0
        if kwh_here > 0:
            kwh_total += kwh_here
            detail_lines.append(
                f"  • {label} : {kwh_here:.1f} kWh × {prix:.2f} FCFA = {kwh_here*prix:.0f} FCFA"
            )

    tranche_finale = 'Tranche 1' if kwh_total <= 150 else 'Tranche 2/3'
    return {
        'kwh': round(kwh_total, 2),
        'detail': detail_lines,
        'tranche': tranche_finale,
        'prix_moyen': round(montant / kwh_total, 2) if kwh_total > 0 else 0
    }


def _kwh_to_fcfa(kwh: float, tarif: str = 'DPP') -> dict:
    """Calcule le coût FCFA pour un nombre de kWh."""
    tranches = DPP_TRANCHES if tarif == 'DPP' else PPP_TRANCHES
    remaining = kwh
    fcfa_total = 0.0
    detail_lines = []
    prev_limit   = 0

    for (limit, prix, label) in tranches:
        if remaining <= 0:
            break
        kwh_here = min(remaining, limit - prev_limit)
        cost     = kwh_here * prix
        fcfa_total += cost
        remaining  -= kwh_here
        if kwh_here > 0:
            detail_lines.append(
                f"  • {label} : {kwh_here:.1f} kWh × {prix:.2f} FCFA = {cost:.0f} FCFA"
            )
        prev_limit = limit

    tranche_finale = 'Tranche 1' if kwh <= 150 else 'Tranche 2/3'
    return {
        'fcfa': round(fcfa_total),
        'detail': detail_lines,
        'tranche': tranche_finale,
        'prix_moyen': round(fcfa_total / kwh, 2) if kwh > 0 else 0
    }


# ─── Moteur de réponse local ───────────────────────────────────────────────────

_NUM_RE = re.compile(r'[\d\s]{1,10}(?:[.,]\d+)?')


def _extract_number(text: str) -> float | None:
    """Extrait le premier nombre significatif d'une chaîne."""
    cleaned = text.replace('\u202f', '').replace('\xa0', '').replace(' ', '')
    m = re.search(r'\d[\d.,]*', cleaned)
    if not m:
        return None
    try:
        return float(m.group().replace(',', '.'))
    except ValueError:
        return None


def _local_answer(msg: str) -> str | None:
    """
    Répond localement aux questions tarifaires fréquentes.
    Retourne None si la question est hors-domaine ou trop complexe.
    """
    low = msg.lower()

    # ── Détection du type de compteur ────────────────────────────
    tarif = 'PPP' if 'ppp' in low else 'DPP'

    # ── Intent : FCFA→kWh  ("combien de kWh pour X FCFA" / "X FCFA combien kWh") ──
    _is_fcfa_to_kwh = (
        re.search(r'combien.{0,20}kwh', low) or
        re.search(r'kwh.{0,20}(pour|avec|obtenir)', low) or
        re.search(r'(fcfa|franc|f\b).{0,30}kwh', low) or
        re.search(r'\d[\d\s]{2,}.{0,10}(fcfa|franc)', low)
    )

    # ── Intent : kWh→FCFA  ("X kWh combien ça coûte" / "prix de X kWh") ──────
    _is_kwh_to_fcfa = (
        re.search(r'\d+\s*kwh.{0,30}(coût|prix|fcfa|franc|payer|vaut)', low) or
        re.search(r'(coût|prix|payer|vaut).{0,30}\d+\s*kwh', low) or
        (re.search(r'\d+\s*kwh', low) and not _is_fcfa_to_kwh)
    )

    # ── kWh → FCFA  (ex: "combien coûte 80 kWh") ──────────────
    if _is_kwh_to_fcfa:
        n = _extract_number(msg)
        if n and 0 < n <= 10000:
            r = _kwh_to_fcfa(n, tarif)
            detail = '\n'.join(r['detail'])
            return (
                f"**{n:.0f} kWh** en {tarif} coûte **{r['fcfa']:,} FCFA**\n\n"
                f"Détail par tranche :\n{detail}\n\n"
                f"Prix moyen : **{r['prix_moyen']:.2f} FCFA/kWh** — {r['tranche']}"
            ).replace(',', '\u202f')

    # ── FCFA → kWh  (ex: "5000 FCFA combien de kWh") ─────────
    if _is_fcfa_to_kwh or re.search(r'\d{3,}\s*(fcfa|f\b|franc)', low):
        n = _extract_number(msg)
        if n and n >= 100:
            r = _fcfa_to_kwh(n, tarif)
            detail = '\n'.join(r['detail'])
            conseil = ''
            if r['kwh'] <= 150:
                conseil = f'\n\n✅ Vous restez en **Tranche 1** (prix le plus bas : 82 FCFA/kWh).'
            elif n < TARIF_T1_MAX_FCFA:
                conseil = ''
            else:
                kwh_t1 = 150
                cout_t1 = 150 * 82
                conseil = (
                    f'\n\n💡 **Conseil** : Pour rester en Tranche 1, rechargez **{cout_t1:,} FCFA** '
                    f'max ({kwh_t1} kWh). Au-delà, le kWh passe à **136,49 FCFA** (+66 %).'
                ).replace(',', '\u202f')
            return (
                f"**{n:,.0f} FCFA** en {tarif} → **{r['kwh']} kWh**\n\n"
                f"Détail :\n{detail}\n\n"
                f"Prix moyen : **{r['prix_moyen']} FCFA/kWh** — {r['tranche']}{conseil}"
            ).replace(',', '\u202f')

    # ── Redevance / abonnement ────────────────────────────────
    if re.search(r'redevanc|abonnement|frais fixe|frais mens', low):
        return (
            "**Redevance mensuelle Senelec 2026 (DPP) :**\n\n"
            "La redevance est déduite automatiquement de votre recharge prépayée. "
            "Elle est d'environ **1 500 FCFA/mois** pour un compteur résidentiel standard.\n\n"
            "💡 Elle est prélevée une fois par mois, dès la première recharge. "
            "Si votre recharge ne couvre pas la redevance, la différence sera déduite de la suivante."
        )

    # ── DPP vs PPP ───────────────────────────────────────────
    if re.search(r'diff[eé]rence.{0,20}(dpp|ppp)|dpp.{0,20}(ou|vs|versus).{0,20}ppp|'
                 r'ppp.{0,20}(ou|vs|versus).{0,20}dpp|c.{0,10}est quoi (dpp|ppp)', low):
        return (
            "**DPP vs PPP — Différence :**\n\n"
            "| | DPP | PPP |\n"
            "|---|---|---|\n"
            "| Nom complet | Domestique Prépayé | Professionnel Prépayé |\n"
            "| Pour qui | Particuliers / ménages | Professionnels / commerces |\n"
            "| Tranche 1 | 0-150 kWh à **82 FCFA** | 0-150 kWh à **82 FCFA** |\n"
            "| Tranche 2 | 151-250 kWh à 136,49 FCFA | >150 kWh à 136,49 FCFA |\n"
            "| TVA | Non (T1) | Incluse |\n\n"
            "👉 Pour un ménage, choisissez **DPP**. Les tarifs T1 sont identiques."
        )

    # ── Rester en Tranche 1 ───────────────────────────────────
    if re.search(r'(rester|garder|tranche\s*1|tranche sociale|économi|economi)', low):
        return (
            "**Comment rester en Tranche 1 (82 FCFA/kWh) :**\n\n"
            "La Tranche 1 couvre les **150 premiers kWh/mois**. "
            "Au-delà, le prix passe à **136,49 FCFA/kWh** (+66 %).\n\n"
            "**Budget max Tranche 1 = 150 × 82 = 12 300 FCFA/mois**\n\n"
            "Conseils pratiques :\n"
            "• Éteignez les veilles (TV, box, chargeurs) → -10 à -20 kWh/mois\n"
            "• Utilisez les appareils énergivores (fer à repasser, chauffe-eau) le matin\n"
            "• Préférez LED aux ampoules classiques (×7 moins énergivore)\n"
            "• Vérifiez votre compteur : rechargez **plusieurs petits montants** plutôt qu'un gros"
        )

    # ── Tarifs / grille ───────────────────────────────────────
    if re.search(r'(tarif|prix|tranch|grille|coût|kwh).{0,20}(2026|senelec|officiel)', low) or \
       re.search(r'(tarif|grille).{0,20}(dpp|ppp)', low):
        return (
            "**Grille tarifaire Senelec 2026 — DPP (Domestique Prépayé) :**\n\n"
            "| Tranche | Plage | Prix |\n"
            "|---------|-------|------|\n"
            "| T1 Sociale | 0 – 150 kWh | **82,00 FCFA/kWh** |\n"
            "| T2 | 151 – 250 kWh | 136,49 FCFA/kWh |\n"
            "| T3 | > 250 kWh | 136,49 FCFA/kWh |\n\n"
            "⚡ **Astuce** : Les 150 premiers kWh sont toujours facturés à 82 FCFA, "
            "qu'on consomme 50 ou 400 kWh au total. "
            "Mais si vous dépassez 150 kWh, **toute la consommation en T2+ est à 136,49 FCFA**."
        )

    # ── Migration compteur classique → Woyofal ───────────────
    if re.search(r'migr|passer.{0,20}(woyofal|prépay|prepay)|convert|changer.{0,20}compteur|'
                 r'woyofal.{0,20}(comment|install|obtenir|avoir|migr)|'
                 r'compteur.{0,20}(classique|postpay|woyofal)', low):
        return (
            "**Comment migrer vers un compteur Woyofal (prépayé) :**\n\n"
            "1. **Se rendre** dans une agence Senelec ou un guichet unique avec :\n"
            "   • Votre pièce d'identité (CNI / passeport)\n"
            "   • Votre contrat d'abonnement ou numéro de client\n"
            "   • Un justificatif de domicile\n\n"
            "2. **Demander** la migration vers le prépayé Woyofal (gratuit pour les ménages DPP)\n\n"
            "3. **Installation** : un technicien Senelec installe le compteur à domicile (délai 1–2 semaines)\n\n"
            "4. **Première recharge** : avec votre numéro de compteur, rechargez dans une boutique agréée "
            "ou via Wave / Orange Money / Free Money / Expresso\n\n"
            "📞 Renseignements : **33 867 66 66** (Senelec)\n"
            "📍 Guichets uniques disponibles dans toutes les régions du Sénégal"
        )

    # ── Recharge non créditée / problème de recharge ─────────
    if re.search(r'(recharge|token|crédit).{0,30}(pas|non|n.{0,3}est pas|refus|échou|probl|bug|'
                 r'erreur|crédit|apparaî|affi)|recharge.{0,20}(pas arrivé|pas reçu|perdu|disparu)', low):
        return (
            "**Que faire si votre recharge n'est pas créditée :**\n\n"
            "**Étapes immédiates :**\n"
            "1. **Attendre 15 min** — les réseaux mobile money peuvent avoir un délai\n"
            "2. **Vérifier le numéro** de compteur utilisé (18 chiffres sur l'étiquette du compteur)\n"
            "3. **Conserver le reçu** de transaction (numéro de token ou référence)\n\n"
            "**Contacter Senelec :**\n"
            "• 📞 **33 867 66 66** (service client, 7j/7)\n"
            "• 📧 contact@senelec.sn\n"
            "• Se rendre à l'agence la plus proche avec le reçu de paiement\n\n"
            "**Recours fraude / arnaque :**\n"
            "• Signaler sur le site : senelec.sn/coordonnees-fraudes\n"
            "• Garder tous les justificatifs (capture d'écran, reçu papier)\n\n"
            "⚠️ Ne jamais acheter de tokens Woyofal auprès de revendeurs non agréés"
        )

    # ── Où acheter / points de vente / recharge Woyofal ──────
    if re.search(r'(où|ou|comment).{0,20}(acheter|recharger|payer|obtenir|trouver).{0,20}'
                 r'(token|woyofal|recharge|crédit|kwh)|'
                 r'(boutique|agence|point.{0,10}vente|distributeur|wave|orange money|'
                 r'free money|expresso).{0,30}woyofal|'
                 r'woyofal.{0,30}(boutique|agence|wave|payer|recharger)', low):
        return (
            "**Où et comment recharger son compteur Woyofal :**\n\n"
            "**📱 Mobile Money (le plus pratique) :**\n"
            "• **Wave** : Menu → Paiement → Senelec Woyofal → entrer le n° de compteur\n"
            "• **Orange Money** : USSD *144# → Factures → Senelec Woyofal\n"
            "• **Free Money** : Application Free → Paiements → Senelec\n"
            "• **Expresso (e-Money)** : Application → Services → Électricité\n\n"
            "**🏪 Points de vente physiques :**\n"
            "• Boutiques agréées Woyofal (liste sur senelec.sn/liste-boutiques-woyofal)\n"
            "• Agences Senelec dans toutes les régions\n"
            "• Supermarchés et stations-service partenaires\n\n"
            "**💻 En ligne :**\n"
            "• Site Senelec : senelec.sn\n"
            "• Application Senelec Mobile\n\n"
            "📞 En cas de problème : **33 867 66 66**\n\n"
            "⚠️ **Attention** : Vérifiez toujours votre **numéro de compteur** (18 chiffres) "
            "avant de valider la transaction."
        )

    # ── Fraude / arnaque / sécurité ───────────────────────────
    if re.search(r'fraud|arnaque|vol|escroquer|faux.{0,10}token|pirater|signal', low):
        return (
            "**Fraudes Woyofal — Comment se protéger :**\n\n"
            "**Arnaques fréquentes :**\n"
            "• Faux revendeurs de tokens à prix bradé (tokens invalides)\n"
            "• Faux vendeurs en ligne (réseaux sociaux)\n"
            "• Compteurs trafiqués ou manipulés\n\n"
            "**Comment se protéger :**\n"
            "• Acheter uniquement via les **canaux officiels** (Wave, Orange Money, agences Senelec)\n"
            "• Ne jamais communiquer votre numéro de compteur à un inconnu\n"
            "• Vérifier l'authenticité du token avant de l'entrer\n\n"
            "**Signaler une fraude :**\n"
            "• 📞 **33 867 66 66**\n"
            "• 🌐 senelec.sn/coordonnees-fraudes\n"
            "• 📧 contact@senelec.sn\n\n"
            "⚖️ La fraude sur les compteurs est punie par la loi sénégalaise."
        )

    # ── Lire / comprendre sa consommation / relevé ───────────
    if re.search(r'(lire|comprendre|interpr[eé]t|d[eé]chiffr).{0,20}(compteur|consumm|relevé|'
                 r'affichage|écran)|affichage.{0,20}compteur|que.{0,10}signif', low):
        return (
            "**Comment lire son compteur Woyofal :**\n\n"
            "**Affichage principal :**\n"
            "• **kWh restants** : crédit d'énergie disponible (ex: 45.32 kWh)\n"
            "• **ALERTE** ou clignotement : crédit bas (généralement < 5 kWh)\n"
            "• **Code erreur** : contacter Senelec si un code s'affiche\n\n"
            "**Informations utiles sur l'étiquette du compteur :**\n"
            "• **Numéro de compteur** (18 chiffres) : indispensable pour recharger\n"
            "• **Puissance souscrite** : en kW (ne pas dépasser pour éviter les disjonctions)\n\n"
            "**Touches fréquentes :**\n"
            "• `#` ou `0` : afficher le solde kWh\n"
            "• Entrer le **token** (20 chiffres) puis valider pour créditer\n\n"
            "💡 Notez votre numéro de compteur et conservez-le précieusement."
        )

    # ── Contacts Senelec ──────────────────────────────────────
    if re.search(r'(contact|appel|joindre|t[eé]l[eé]phone|num[eé]ro|agence|adresse).{0,20}'
                 r'(senelec|woyofal|service client)|senelec.{0,20}(tel|contact|joindre)', low):
        return (
            "**Contacts Senelec :**\n\n"
            "📞 **Service Client** : 33 867 66 66 (7j/7)\n"
            "📧 **Email** : contact@senelec.sn\n"
            "📍 **Siège** : 28 Rue Vincens, Dakar\n"
            "🌐 **Site** : senelec.sn\n\n"
            "**Services en ligne :**\n"
            "• Guichet unique : senelec.sn/coordonees-guichet-unique\n"
            "• Signaler une fraude : senelec.sn/coordonnees-fraudes\n"
            "• Liste boutiques Woyofal : senelec.sn/liste-boutiques-woyofal\n\n"
            "**Horaires agences :** Lundi–Vendredi 8h–17h, Samedi 8h–13h"
        )

    # ── Question trop générale ou hors domaine ────────────────
    return None


# ─── Prompt système ───────────────────────────────────────────────────────────

SYSTEM_PROMPT = """Tu es **Woyofal Assistant**, expert Senelec 2026 au Sénégal. Réponds en français, de façon concise.

Tarifs DPP 2026 : T1 (0-150 kWh) = 82 FCFA/kWh | T2/T3 (>150 kWh) = 136,49 FCFA/kWh
Tarifs PPP 2026 : T1 (0-150 kWh) = 82 FCFA/kWh | T2 (>150 kWh) = 136,49 FCFA/kWh
Budget max T1 = 12 300 FCFA/mois. Redevance ≈ 1 500 FCFA/mois (déduite de la recharge).

Pour 5 000 FCFA → 5000÷82 = 60,97 kWh (tout T1).
Pour 15 000 FCFA → 12 300 FCFA en T1 (150 kWh) + 2 700 FCFA en T2 (2700÷136,49 = 19,78 kWh) = 169,78 kWh."""


def _sanitize_history(raw: list) -> list:
    valid_roles = {'user', 'assistant'}
    result = []
    for entry in raw[-MAX_HISTORY:]:
        if not isinstance(entry, dict):
            continue
        role    = entry.get('role', '')
        content = str(entry.get('content', ''))
        if role in valid_roles and content.strip():
            result.append({'role': role, 'content': content[:MAX_MESSAGE]})
    return result


# ─── Route ────────────────────────────────────────────────────────────────────

@ai_bp.route('/chat', methods=['POST'])
def chat():
    payload = request.get_json(silent=True)
    if not payload:
        return jsonify({'error': 'Corps JSON manquant.'}), 400

    message = str(payload.get('message', '')).strip()
    history = payload.get('history', [])

    if not message:
        return jsonify({'error': 'Message vide.'}), 400
    if len(message) > MAX_MESSAGE:
        return jsonify({'error': f'Message trop long (max {MAX_MESSAGE} caractères).'}), 400
    if not isinstance(history, list):
        history = []

    # ── 1. Réponse locale immédiate (sans API) ────────────────
    local_reply = _local_answer(message)
    if local_reply:
        return jsonify({'reply': local_reply, 'source': 'local'}), 200

    # ── 2. Fallback vers OpenRouter (si clé configurée) ───────
    openrouter_key = os.getenv('OPENROUTER_API_KEY', '').strip()
    if not openrouter_key:
        return jsonify({'error': 'Service IA non configuré.'}), 503

    messages = [
        {'role': 'system', 'content': SYSTEM_PROMPT},
        *_sanitize_history(history),
        {'role': 'user', 'content': message}
    ]

    try:
        for model in MODELS:
            if 'gemma' in model:
                model_messages = [
                    *_sanitize_history(history),
                    {'role': 'user', 'content': f"{SYSTEM_PROMPT}\n\n{message}"}
                ]
            else:
                model_messages = messages

            for attempt in range(MAX_RETRIES):
                try:
                    resp = requests.post(
                        OPENROUTER_URL,
                        headers={
                            'Authorization': f'Bearer {openrouter_key}',
                            'Content-Type': 'application/json',
                            'HTTP-Referer': 'http://localhost:5173',
                            'X-Title': 'Woyofal Assistant'
                        },
                        json={'model': model, 'messages': model_messages,
                              'max_tokens': 600, 'temperature': 0.65},
                        timeout=25
                    )
                    if resp.status_code in (429, 503):
                        if attempt < MAX_RETRIES - 1:
                            time.sleep(RETRY_DELAY)
                            continue
                        break  # modèle suivant
                    if resp.status_code == 404:
                        break  # modèle inexistant → suivant

                    resp.raise_for_status()
                    data  = resp.json()
                    reply = data['choices'][0]['message']['content'].strip()
                    return jsonify({'reply': reply, 'source': 'ai'}), 200

                except requests.exceptions.HTTPError:
                    break

        # ── 3. Fallback générique si tout a échoué ─────────────
        return jsonify({
            'reply': (
                "Je ne peux pas accéder au service IA en ce moment (serveurs surchargés), "
                "mais voici ce que je peux faire :\n\n"
                "**Posez-moi une question précise**, par exemple :\n"
                "• *\"Combien de kWh pour 10 000 FCFA ?\"*\n"
                "• *\"10 000 FCFA combien kWh ?\"*\n"
                "• *\"80 kWh combien ça coûte ?\"*\n"
                "• *\"Différence DPP et PPP ?\"*\n"
                "• *\"Comment rester en Tranche 1 ?\"*\n\n"
                "Je calcule ces réponses localement, sans délai ni surcharge."
            ),
            'source': 'fallback'
        }), 200

    except requests.exceptions.Timeout:
        return jsonify({'error': 'Délai réseau dépassé — réessayez.'}), 504
    except Exception as e:
        current_app.logger.error(f'AI route error: {e}')
        return jsonify({'error': 'Erreur interne du service IA.'}), 503

