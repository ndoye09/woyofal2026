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
MAX_RETRIES    = 2   # 2 tentatives par modèle avant de passer au suivant
RETRY_DELAY    = 1

MODELS = [
    'meta-llama/llama-3.3-70b-instruct:free',  # meilleur qualité, recommandé principal
    'google/gemma-3-12b-it:free',               # rapide, très disponible
    'qwen/qwen3-8b:free',                       # rapide, dispo
    'meta-llama/llama-3.1-8b-instruct:free',    # petit, souvent dispo
    'mistralai/mistral-7b-instruct:free',       # fiable
    'meta-llama/llama-3.2-3b-instruct:free',    # ultra-light fallback
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
REDEVANCE_DPP = 429  # FCFA/mois (tarif officiel DPP 2026)

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


# ─── Base FAQ complète ─────────────────────────────────────────────────────────

FAQ_DB = [
    {
        'keywords': ['5000', '5 000', 'cinq mille', 'kwh', 'pour 5000', 'avec 5000'],
        'q': 'Combien de kWh pour 5 000 FCFA ?',
        'a': (
            "**5 000 FCFA** en DPP (cumul=0) :\n"
            "• Taxe 2,5% = 125 F → net = 4 875 F\n"
            "• 4 875 ÷ 82 = **59,4 kWh** (tout Tranche 1)\n\n"
            "✅ Vous restez en **Tranche 1** (82 FCFA/kWh).\n"
            "💡 Utilisez le Simulateur pour un résultat exact selon votre cumul actuel."
        )
    },
    {
        'keywords': ['10000', '10 000', 'dix mille', 'pour 10000', 'avec 10000'],
        'q': 'Combien de kWh pour 10 000 FCFA ?',
        'a': (
            "**10 000 FCFA** en DPP (cumul=0) :\n"
            "• Taxe 2,5% = 250 F → net = 9 750 F\n"
            "• 9 750 ÷ 82 = **118,9 kWh** (tout Tranche 1)\n\n"
            "✅ Vous restez en **Tranche 1** (82 FCFA/kWh).\n"
            "💡 Le résultat varie selon votre cumul du mois."
        )
    },
    {
        'keywords': ['20000', '20 000', 'vingt mille', 'pour 20000', 'avec 20000'],
        'q': 'Combien de kWh pour 20 000 FCFA ?',
        'a': (
            "**20 000 FCFA** en DPP (cumul=0) :\n"
            "• Taxe 2,5% = 500 F → net = 19 500 F\n"
            "• T1 : 150 kWh × 82 = 12 300 F\n"
            "• T2 : (19 500 - 12 300) ÷ 136,49 = 52,8 kWh\n"
            "• **Total : ≈ 202,8 kWh**\n\n"
            "⚠️ Vous passez en **Tranche 2** après 150 kWh (136,49 FCFA/kWh)."
        )
    },
    {
        'keywords': ['tarif', '2025', '2026', 'différence', 'ancien', 'nouveau', 'obsolète', 'périmé'],
        'q': 'Quelle est la différence entre les tarifs 2025 et 2026 ?',
        'a': (
            "**Tarifs Senelec 2026 (DPP officiels) :**\n"
            "• T1 = **82 FCFA/kWh** (0–150 kWh)\n"
            "• T2 = **136,49 FCFA/kWh** (>150 kWh)\n\n"
            "⚠️ Les tarifs 2025 utilisés par d'autres calculateurs sont **obsolètes**.\n"
            "La plateforme Woyofal utilise exclusivement les tarifs 2026 officiels fixés par la CRSE."
        )
    },
    {
        'keywords': ['même', 'partout', 'région', 'dakar', 'thiès', 'saint-louis', 'kaolack',
                     'ziguinchor', 'diourbel', 'sénégal', 'territoire', 'uniforme'],
        'q': 'Les tarifs sont-ils les mêmes dans tout le Sénégal ?',
        'a': (
            "✅ **Oui.** Les tarifs Woyofal sont **uniformes** dans les 14 régions :\n\n"
            "Dakar, Thiès, Saint-Louis, Kaolack, Ziguinchor, Diourbel, Fatick, "
            "Kaffrine, Kédougou, Kolda, Louga, Matam, Sédhiou, Tambacounda.\n\n"
            "Les tarifs sont fixés par décret de la **CRSE** pour l'ensemble du territoire."
        )
    },
    {
        'keywords': ['redevance', 'abonnement', 'frais fixe', 'frais mensuel', '429'],
        'q': "C'est quoi la redevance mensuelle Woyofal ?",
        'a': (
            "**Redevance mensuelle Senelec 2026 (DPP) : 429 FCFA**\n\n"
            "• Prélevée lors de votre **première recharge du mois uniquement**\n"
            "• Les recharges suivantes dans le même mois : **pas de redevance**\n\n"
            "Elle couvre les **frais de location du compteur** et l'**entretien du réseau électrique**.\n\n"
            "**Ordre de déduction :**\n"
            "1. Redevance 429 FCFA (1re recharge)\n"
            "2. Taxe communale 2,5%\n"
            "3. Reste converti en kWh selon les tranches"
        )
    },
    {
        'keywords': ['sert à quoi', 'utilité', 'pourquoi', 'à quoi ça sert', 'à quoi sert',
                     'elle sert', 'ça sert', 'utilité redevance', 'redevance sert',
                     'location', 'entretien', 'réseau', 'compteur', 'financement'],
        'q': 'À quoi sert la redevance ?',
        'a': (
            "**À quoi sert la redevance de 429 FCFA ?**\n\n"
            "Elle couvre deux choses :\n"
            "• **Frais de location du compteur** Woyofal (le compteur appartient à Senelec)\n"
            "• **Entretien du réseau électrique** (maintenance des lignes, bornes, infrastructure)\n\n"
            "Elle est prélevée **une seule fois par mois**, sur la première recharge.\n"
            "Les recharges suivantes dans le même mois en sont exemptes."
        )
    },
    {
        'keywords': ['taxe', 'communale', '2,5', '2.5', 'pourcentage', 'prélèvement'],
        'q': 'Comment fonctionne la taxe communale de 2,5% ?',
        'a': (
            "**Taxe communale = 2,5% de chaque recharge**\n\n"
            "Elle est prélevée sur **chaque recharge**, quel que soit le montant.\n\n"
            "Exemples :\n"
            "• 5 000 FCFA → taxe = **125 FCFA**\n"
            "• 10 000 FCFA → taxe = **250 FCFA**\n"
            "• 20 000 FCFA → taxe = **500 FCFA**\n\n"
            "Elle est destinée aux collectivités locales et s'applique avant le calcul des kWh."
        )
    },
    {
        'keywords': ['reste', 'suffi', 'couvrir', 'couvre', 'recharger pour', 'combien recharger',
                      'autonomie', 'dur combien', 'tenir', 'jusqu\u2019', 'fin du mois', 'mois entier'],
        'q': 'Combien recharger pour couvrir le mois ?',
        'a': (
            "**Combien recharger pour finir le mois ?**\n\n"
            "Je ne connais pas votre consommation journalière, mais voici la logique :\n\n"
            "1. Estimez vos kWh restants à couvrir (ex : 10 j × 5 kWh/j = **50 kWh**)\n"
            "2. Utilisez le **simulateur** pour convertir ce montant en FCFA\n\n"
            "**Repères rapides (Tranche 1 — 82 FCFA/kWh) :**\n"
            "• 50 kWh → ~4 100 FCFA\n"
            "• 100 kWh → ~8 200 FCFA\n"
            "• 150 kWh (max T1) → ~12 300 FCFA\n\n"
            "💡 Astuce : restez sous **12 300 FCFA** pour rester en Tranche 1 (82 FCFA/kWh)."
        )
    },
    {
        'keywords': ['ordre', 'déduction', 'prélèvement', 'comment calculé', 'comment ça marche'],
        'q': 'Dans quel ordre sont prélevées les déductions ?',
        'a': (
            "**Ordre de déduction sur votre recharge :**\n\n"
            "1. **Redevance 429 FCFA** — seulement sur la 1re recharge du mois\n"
            "2. **Taxe communale 2,5%** — sur le montant restant\n"
            "3. **kWh** — le reste est converti selon les tranches T1/T2\n\n"
            "Notre simulateur applique exactement cet ordre."
        )
    },
    {
        'keywords': ['dpp', 'ppp', 'différence', 'domestique', 'professionnel', 'ménage', 'entreprise'],
        'q': 'Quelle différence entre DPP et PPP ?',
        'a': (
            "**DPP (Domestique Prépayé)** vs **PPP (Professionnel Prépayé) :**\n\n"
            "| | DPP | PPP |\n"
            "|---|---|---|\n"
            "| Pour qui | Ménages, villas | Entreprises, commerces |\n"
            "| T1 (0–150 kWh) | 82 FCFA/kWh | 82 FCFA/kWh |\n"
            "| T2 (>150 kWh) | 136,49 FCFA/kWh | 136,49 FCFA/kWh |\n\n"
            "💡 Les tarifs T1 sont **identiques**. La différence réside dans la redevance et les conditions d'éligibilité."
        )
    },
    {
        'keywords': ['identifier', 'savoir', 'quel compteur', 'mon compteur', 'dpp ou ppp', 'plaque'],
        'q': 'Comment savoir si j\'ai un compteur DPP ou PPP ?',
        'a': (
            "**Regardez la plaque de votre compteur Senelec :**\n\n"
            "• *\"DPP\"* = Domestique Prépayé (résidentiel)\n"
            "• *\"PPP\"* = Professionnel Prépayé (commercial/industriel)\n\n"
            "Les compteurs résidentiels sont généralement **DPP**.\n"
            "En cas de doute : 📞 **33 839 33 33** (Senelec)"
        )
    },
    {
        'keywords': ['passer', 'changer', 'ppp à dpp', 'dpp à ppp', 'changer catégorie', 'migrer catégorie'],
        'q': 'Peut-on passer de PPP à DPP ?',
        'a': (
            "**Oui, sous conditions.**\n\n"
            "Si votre consommation descend sous le seuil défini par Senelec "
            "et que l'usage est résidentiel, vous pouvez demander le changement.\n\n"
            "📞 Contactez la **Senelec** : 33 867 66 66\n"
            "🏢 Ou rendez-vous en agence avec votre contrat d'abonnement."
        )
    },
    {
        'keywords': ['dashboard', 'données', 'analytics', 'statistique', 'prédiction', 'machine learning',
                     'ml', 'random forest', 'xgboost', 'base de données', 'postgresql'],
        'q': 'D\'où viennent les données du Dashboard ?',
        'a': (
            "**Dashboard Woyofal :**\n\n"
            "• Base **PostgreSQL** alimentée par un pipeline ETL\n"
            "• Couvre les **14 régions** du Sénégal\n"
            "• Visualise les tendances de consommation et les KPIs\n\n"
            "**Prédictions ML :**\n"
            "• Modèles : **Random Forest, XGBoost**\n"
            "• Entraînés sur des données historiques de consommation\n"
            "• ⚠️ Estimations pour planifier — pas des certitudes\n\n"
            "💡 Accessible depuis votre compte Woyofal (section Dashboard)."
        )
    },
    {
        'keywords': ['cumul', 'cumul mensuel', 'cumulation', 'kWh déjà', 'déjà consommé'],
        'q': "Qu'est-ce que le cumul mensuel actuel ?",
        'a': (
            "**Cumul mensuel actuel = kWh déjà consommés depuis le 1er du mois.**\n\n"
            "Entrez **0** si vous ne savez pas ou si vous débutez le mois.\n\n"
            "Pourquoi c'est important :\n"
            "• Cumul = 0 → prochains kWh en **T1** (82 FCFA/kWh)\n"
            "• Cumul = 140 → 10 kWh restants en T1, puis **T2** (136,49 FCFA)\n"
            "• Cumul ≥ 150 → tout en **T2** directement\n\n"
            "Notre simulateur applique ce calcul par tranche automatiquement."
        )
    },
    {
        'keywords': ['calcul inverse', 'inverse', 'kWh voulu', 'combien recharger pour', 'montant pour'],
        'q': 'Comment utiliser le calcul inverse (kWh → FCFA) ?',
        'a': (
            "**Mode Calcul inverse** (dans le Simulateur) :\n\n"
            "Entrez le nombre de **kWh souhaités** → le simulateur calcule "
            "automatiquement le **montant FCFA** à recharger.\n\n"
            "Exemple : 100 kWh en T1 = 100 × 82 = **8 200 FCFA** (hors taxe)\n\n"
            "💡 Fonctionnalité exclusive à la plateforme Woyofal."
        )
    },
    {
        'keywords': ['comparer', 'côte à côte', 'parallèle', 'en même temps', 'des deux types',
                     'simuler les deux'],
        'q': 'Peut-on simuler pour DPP et PPP en même temps ?',
        'a': (
            "Vous pouvez **changer le type (DPP/PPP)** dans le simulateur et relancer le calcul.\n\n"
            "Pour une comparaison **côte à côte**, consultez notre **Guide des Tarifs** "
            "qui présente les deux grilles tarifaires en parallèle.\n\n"
            "| | DPP | PPP |\n"
            "|---|---|---|\n"
            "| T1 | 82 FCFA/kWh | 82 FCFA/kWh |\n"
            "| T2 | 136,49 FCFA/kWh | 136,49 FCFA/kWh |"
        )
    },
]


def _score_faq(msg: str, entry: dict) -> int:
    """Calcule un score de correspondance entre le message et une entrée FAQ."""
    low = msg.lower()
    score = 0
    for kw in entry['keywords']:
        if kw.lower() in low:
            score += 2 if len(kw) > 5 else 1
    # bonus si la question FAQ est très proche du message
    q_words = set(entry['q'].lower().split())
    msg_words = set(low.split())
    overlap = len(q_words & msg_words)
    score += overlap
    return score


def _faq_answer(msg: str, enriched: str | None = None) -> str | None:
    """
    Cherche la meilleure correspondance dans la base FAQ.
    Score d'abord sur le message seul ; si aucun match suffisant,
    retente avec le message enrichi du contexte conversationnel.
    """
    def _best(text: str, threshold: int) -> tuple[int, str | None]:
        best_score = threshold
        best_answer = None
        for entry in FAQ_DB:
            s = _score_faq(text, entry)
            if s > best_score:
                best_score = s
                best_answer = entry['a']
        return best_score, best_answer

    # 1. Message seul — prioritaire (évite les faux positifs du contexte)
    _, answer = _best(msg, threshold=1)
    if answer:
        return answer

    # 2. Message + contexte — si le message seul ne suffit pas
    if enriched and enriched != msg:
        _, answer = _best(enriched, threshold=2)
        return answer

    return None


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

    # Mots indiquant une question de planification/consommation (pas un calcul de prix)
    _is_planning = bool(re.search(
        r'reste|suffi|couvr|dur|mois|semaine|jusqu|estimation|prévoir|autonomi', low
    ))

    # ── Intent : kWh→FCFA  ("X kWh combien ça coûte" / "prix de X kWh") ──────
    _is_kwh_to_fcfa = (
        not _is_planning and (
            re.search(r'\d+\s*kwh.{0,30}(coût|prix|fcfa|franc|payer|vaut)', low) or
            re.search(r'(coût|prix|payer|vaut).{0,30}\d+\s*kwh', low) or
            (re.search(r'\d+\s*kwh', low) and not _is_fcfa_to_kwh)
        )
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
            "**Redevance mensuelle Senelec 2026 (DPP) : 429 FCFA/mois**\n\n"
            "**À quoi ça sert ?**\n"
            "• **Location du compteur** Woyofal (le compteur appartient à Senelec)\n"
            "• **Entretien du réseau** électrique (lignes, bornes, infrastructure)\n\n"
            "**Comment ça fonctionne ?**\n"
            "• Prélevée sur la **première recharge du mois uniquement**\n"
            "• Les recharges suivantes dans le même mois : **pas de redevance**\n\n"
            "**Ordre de déduction sur chaque recharge :**\n"
            "1. Redevance 429 FCFA (1re recharge du mois uniquement)\n"
            "2. Taxe communale 2,5%\n"
            "3. Le reste est converti en kWh selon les tranches"
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

    # ── Tarifs 2025 vs 2026 ───────────────────────────────────
    if re.search(r'(diff[eé]rence|compar|chang).{0,30}(2025|2026)|(2025|2026).{0,30}(diff[eé]rence|compar|chang|tarif|prix)|'
                 r'tarif.{0,20}(ancien|nouveau|avant|maintenant|2025|2026)|obsolète|périmé', low):
        return (
            "**Tarifs Senelec : 2025 vs 2026**\n\n"
            "La Senelec a révisé sa grille tarifaire pour 2026.\n\n"
            "**Tarifs 2026 (actuels, DPP) :**\n"
            "• T1 = **82 FCFA/kWh** (0–150 kWh)\n"
            "• T2 = **136,49 FCFA/kWh** (>150 kWh)\n\n"
            "⚠️ Les tarifs 2025 utilisés par d'autres calculateurs sont **obsolètes**.\n"
            "Notre plateforme Woyofal est la seule à utiliser les **tarifs 2026 officiels** fixés par décret de la CRSE."
        )

    # ── Tarifs uniformes / régions ────────────────────────────
    if re.search(r'(même|uniform|partout|r[eé]gion|dakar|thi[eè]s|saint.louis|kaolack|ziguinchor|'
                 r'diourbel|fatick|kaffrine|k[eé]dougou|kolda|louga|matam|s[eé]dhiou|tambacounda).{0,30}tarif|'
                 r'tarif.{0,30}(même|uniform|partout|r[eé]gion)', low):
        return (
            "**Les tarifs Woyofal sont-ils les mêmes dans tout le Sénégal ?**\n\n"
            "✅ **Oui.** Les tarifs Woyofal sont **uniformes** sur l'ensemble du territoire sénégalais :\n\n"
            "Dakar, Thiès, Saint-Louis, Kaolack, Ziguinchor, Diourbel, Fatick, Kaffrine, "
            "Kédougou, Kolda, Louga, Matam, Sédhiou, Tambacounda.\n\n"
            "Les tarifs sont fixés par décret de la **CRSE** (Commission de Régulation du Secteur de l'Énergie) "
            "et s'appliquent à tous les clients prépayés du pays."
        )

    # ── Passer de PPP à DPP ───────────────────────────────────
    if re.search(r'(passer|changer|migr).{0,20}(ppp.{0,10}dpp|dpp.{0,10}ppp)|'
                 r'(changer|modifier).{0,20}cat[eé]gorie', low):
        return (
            "**Peut-on passer de PPP à DPP ?**\n\n"
            "Oui, **sous conditions**.\n\n"
            "Si votre consommation mensuelle descend sous un seuil défini par la Senelec "
            "et que l'usage est **résidentiel**, vous pouvez demander un changement de catégorie.\n\n"
            "**Démarche :**\n"
            "• Contactez directement la **Senelec** : 📞 33 867 66 66\n"
            "• Ou rendez-vous dans une agence avec votre contrat d'abonnement\n"
            "• Un technicien vérifiera l'usage et le niveau de consommation\n\n"
            "💡 Le tarif T1 est le même en DPP et PPP (82 FCFA/kWh pour les 150 premiers kWh)."
        )

    # ── Cumul mensuel ─────────────────────────────────────────
    if re.search(r'cumul|cumulation|cumul.{0,20}(mensuel|mois)|'
                 r'(qu.{0,5}est.ce|c.{0,3}est quoi|expliqu).{0,20}cumul', low):
        return (
            "**Qu'est-ce que le « cumul mensuel actuel » ?**\n\n"
            "C'est le **total de kWh déjà consommés** depuis le début du mois en cours.\n\n"
            "**Pourquoi c'est important :**\n"
            "Entrez **0** si vous venez de commencer le mois ou si vous ne savez pas.\n"
            "Cette valeur permet de déterminer dans quelle **tranche** s'effectueront vos prochains kWh.\n\n"
            "**Exemple :**\n"
            "• Cumul = 0 → les prochains kWh sont facturés en T1 (82 FCFA/kWh)\n"
            "• Cumul = 140 → il reste 10 kWh en T1, puis passage en T2 (136,49 FCFA/kWh)\n"
            "• Cumul ≥ 150 → tous les prochains kWh sont en T2\n\n"
            "Notre simulateur applique exactement ce calcul par tranche."
        )

    # ── Calcul inverse (kWh → FCFA à recharger) ───────────────
    if re.search(r'calcul.{0,15}inverse|inverse.{0,15}calcul|'
                 r'(combien|quel).{0,20}(recharger|payer|d[eé]penser).{0,20}pour.{0,20}kwh|'
                 r'kwh.{0,20}(recharger|payer|obtenir)', low):
        return (
            "**Comment utiliser le calcul inverse (kWh → FCFA) ?**\n\n"
            "Dans le simulateur, activez le mode **« Calcul inverse »**.\n\n"
            "Entrez le nombre de kWh que vous souhaitez obtenir.\n"
            "Le simulateur calcule automatiquement le **montant FCFA** à recharger, "
            "en tenant compte des tranches et des déductions.\n\n"
            "**Exemple :** pour obtenir 100 kWh en T1 :\n"
            "• Coût = 100 × 82 = **8 200 FCFA** (hors redevance et taxe)\n\n"
            "💡 Cette fonctionnalité est **exclusive** à notre plateforme Woyofal."
        )

    # ── Dashboard / données / ML / prédictions ────────────────
    if re.search(r'(dashboard|donn[eé]es|statistique|analytic|graphique|pr[eé]diction|machine learning|ml|'
                 r'random forest|xgboost|base de donn[eé]e|postgresql|pipeline)', low):
        return (
            "**Dashboard Analytics & Données :**\n\n"
            "Le Dashboard de Woyofal utilise une **base de données PostgreSQL** "
            "alimentée par notre pipeline ETL. Les données couvrent les **14 régions du Sénégal** "
            "et permettent de visualiser :\n"
            "• Tendances de consommation\n"
            "• Répartition par tranches\n"
            "• KPIs et statistiques\n\n"
            "**Prédictions ML :**\n"
            "Nos modèles (**Random Forest, XGBoost**) sont entraînés sur des données historiques. "
            "La précision varie selon la saison et la région.\n"
            "⚠️ Les prédictions sont des **estimations** pour vous aider à planifier, pas des certitudes.\n\n"
            "💡 Le Dashboard est accessible après connexion à votre compte Woyofal."
        )

    # ── Simulateur : comparaison DPP/PPP côte à côte ─────────
    if re.search(r'(simuler|comparer|simul).{0,30}(deux|dpp.{0,10}ppp|ppp.{0,10}dpp|deux types|'
                 r'c[oô]te.{0,5}c[oô]te|parall[eè]le|en même temps)', low):
        return (
            "**Simuler pour DPP et PPP en même temps :**\n\n"
            "Dans le simulateur, vous pouvez **changer le type (DPP/PPP)** et relancer le calcul.\n\n"
            "Pour une **comparaison côte à côte**, consultez notre **Guide des Tarifs** "
            "qui présente les deux grilles tarifaires en parallèle.\n\n"
            "| | DPP | PPP |\n"
            "|---|---|---|\n"
            "| T1 (0–150 kWh) | 82 FCFA/kWh | 82 FCFA/kWh |\n"
            "| T2 (>150 kWh) | 136,49 FCFA/kWh | 136,49 FCFA/kWh |\n\n"
            "Les tarifs T1 sont identiques. La différence principale réside dans la **redevance** "
            "et les conditions d'éligibilité."
        )

    # ── Question trop générale ou hors domaine ────────────────
    return None


# ─── Prompt système ───────────────────────────────────────────────────────────

SYSTEM_PROMPT = """Tu es **Woyofal Assistant**, expert Senelec 2026 au Sénégal. Réponds en français, de façon concise.

## Tarifs officiels Senelec 2026
- DPP (Domestique Prépayé) : T1 (0–150 kWh) = 82 FCFA/kWh | T2/T3 (>150 kWh) = 136,49 FCFA/kWh
- PPP (Professionnel Prépayé) : T1 (0–150 kWh) = 82 FCFA/kWh | T2 (>150 kWh) = 136,49 FCFA/kWh
- Budget max Tranche 1 = 12 300 FCFA/mois | Redevance DPP = 429 FCFA/mois | Taxe communale = 2,5% sur chaque recharge
- Ordre de déductions : 1) Redevance (1re recharge du mois) → 2) Taxe 2,5% → 3) kWh selon tranches
- Les tarifs sont uniformes dans les 14 régions du Sénégal (fixés par décret CRSE)
- Les tarifs 2025 sont obsolètes — seuls les tarifs 2026 sont valides sur cette plateforme

## Exemples de calculs FCFA → kWh
- 5 000 FCFA → ≈60,97 kWh (tout T1, 5000÷82)
- 10 000 FCFA → ≈121,95 kWh (tout T1)
- 20 000 FCFA → 150 kWh T1 + 57,26 kWh T2 = 207,26 kWh

## FAQ — Connaissances clés

### Calcul & Tarifs
- 5 000 FCFA sans redevance, cumul=0 → taxe 2,5%=125 F → net=4 875 F → 4875÷82 ≈ 59,4 kWh
- 10 000 FCFA → ≈ 104 kWh (résultat variable selon cumul du mois)
- 20 000 FCFA → T1 (12 300 F=150 kWh) + T2 (7 200÷136,49 ≈ 52,8 kWh) = ≈ 183 kWh
- Tarifs 2026 officiels, les tarifs 2025 sur d'autres outils sont obsolètes

### Redevance & Déductions
- Redevance DPP = 429 FCFA (première recharge du mois uniquement)
- Taxe communale = 2,5% sur CHAQUE recharge (ex: 10 000 FCFA → 250 FCFA de taxe)
- Ordre : redevance → taxe → kWh

### DPP vs PPP
- DPP : ménages, appartements, villas. PPP : entreprises, commerces, bureaux
- T1 identique (82 FCFA/kWh). DPP T2=136,49 FCFA/kWh sur 151–250 kWh
- Identifier son type : lire la plaque du compteur (DPP ou PPP écrit dessus), ou appeler le 33 839 33 33
- Passer de PPP à DPP : possible sous conditions (usage résidentiel + consommation sous seuil), demande à Senelec

### Dashboard & Prédictions ML
- Dashboard = base PostgreSQL + pipeline ETL, couvre 14 régions du Sénégal
- Modèles ML : Random Forest, XGBoost — entraînés sur données historiques
- Prédictions = estimations pour planifier, pas des certitudes (précision variable selon saison/région)
- Accès Dashboard : après connexion au compte Woyofal

### Utilisation du simulateur
- Cumul mensuel actuel = kWh déjà consommés depuis le 1er du mois. Mettre 0 si inconnu
- Calcul inverse : entrer le nombre de kWh souhaités → le simulateur calcule le montant FCFA à recharger
- Comparaison DPP/PPP : changer le type dans le simulateur, ou consulter le Guide des Tarifs (deux grilles côte à côte)

## Contacts Senelec
- Service client : 33 867 66 66 (7j/7)
- Email : contact@senelec.sn | Site : senelec.sn
- Recharger : Wave, Orange Money, Free Money, Expresso, boutiques agréées, site senelec.sn"""


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

    # Contexte conversationnel : dernier message du bot + question précédente
    ctx_parts = []
    clean_history = _sanitize_history(history)
    for h in clean_history[-4:]:
        ctx_parts.append(h['content'])
    context_str = ' '.join(ctx_parts).lower()
    enriched = message + ' ' + context_str  # message enrichi du contexte (FAQ seulement)

    # ── 1. Réponse locale immédiate — calculs tarifaires (regex) ──
    # On passe le message BRUT (sans contexte) pour éviter que des nombres
    # dans les réponses précédentes ne déclenchent un faux calcul.
    local_reply = _local_answer(message)
    if local_reply:
        return jsonify({'reply': local_reply, 'source': 'local'}), 200

    # ── 2. Correspondance FAQ (score par mots-clés + contexte) ───
    faq_reply = _faq_answer(message, enriched)
    if faq_reply:
        return jsonify({'reply': faq_reply, 'source': 'faq'}), 200

    # ── 3. Fallback vers OpenRouter (si clé configurée) ───────
    openrouter_key = os.getenv('OPENROUTER_API_KEY', '').strip()
    if not openrouter_key:
        return jsonify({'reply': (
            "Je réponds aux questions sur les **tarifs Senelec 2026**, la redevance, les tranches, "
            "la migration Woyofal et les contacts Senelec.\n\n"
            "Essayez : *\"Combien de kWh pour 5 000 FCFA ?\"* ou *\"C'est quoi la redevance ?\"*"
        ), 'source': 'local'}), 200

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
                "Désolé, je ne peux pas répondre à cette question pour le moment.\n\n"
                "Je réponds directement aux questions sur les tarifs Senelec 2026, par exemple :\n"
                "• *\"Combien de kWh pour 10 000 FCFA ?\"*\n"
                "• *\"80 kWh combien ça coûte ?\"*\n"
                "• *\"C'est quoi la redevance mensuelle ?\"*\n"
                "• *\"Différence DPP et PPP ?\"*\n"
                "• *\"Comment rester en Tranche 1 ?\"*"
            ),
            'source': 'fallback'
        }), 200

    except requests.exceptions.Timeout:
        return jsonify({'error': 'Délai réseau dépassé — réessayez.'}), 504
    except Exception as e:
        current_app.logger.error(f'AI route error: {e}')
        return jsonify({'error': 'Erreur interne du service IA.'}), 503

