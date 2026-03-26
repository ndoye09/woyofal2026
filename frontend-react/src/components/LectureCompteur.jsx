import React, { useState } from 'react'
import { Cpu, ChevronDown, ChevronUp, Save, Info, CheckCircle, AlertCircle, Zap, BarChart2, Clock, Calendar, TrendingDown, Hash, AlertTriangle } from 'lucide-react'

/* ═══════════════════════════════════════════════════════════
   Codes officiels du compteur Woyofal
   Source : Manuel utilisateur Woyofal / Sénelec
   ═══════════════════════════════════════════════════════════ */
const CODES = [
  {
    code: '800',
    label: 'Solde disponible (kWh)',
    icon: Zap,
    color: 'emerald',
    description: 'Affiche le crédit d\'énergie restant dans votre compteur, en kilowattheures (kWh).',
    instruction: 'Tapez 800 puis # sur le clavier du compteur. La valeur affichée correspond à votre solde en kWh.',
    unite: 'kWh',
    placeholder: 'Ex : 45.23',
    tip: 'Un solde inférieur à 5 kWh est un signal de recharge urgent.',
  },
  {
    code: '814',
    label: 'Index de consommation total (kWh)',
    icon: BarChart2,
    color: 'blue',
    description: 'Indique le total d\'énergie consommée depuis l\'installation du compteur (compteur kilométrique).',
    instruction: 'Tapez 814 puis # sur le clavier du compteur.',
    unite: 'kWh',
    placeholder: 'Ex : 3420.00',
    tip: 'Notez cet index chaque mois pour calculer votre consommation réelle.',
  },
  {
    code: '820',
    label: 'Numéro du compteur (STS)',
    icon: Cpu,
    color: 'violet',
    description: 'Affiche le numéro de série unique de votre compteur Woyofal (STS Token Meter Number).',
    instruction: 'Tapez 820 puis # sur le clavier du compteur.',
    unite: '',
    placeholder: 'Ex : 0600123456789',
    tip: 'Ce numéro est indispensable pour toute recharge ou réclamation auprès de Sénelec.',
  },
  {
    code: '817',
    label: 'Puissance actuelle (W)',
    icon: Zap,
    color: 'orange',
    description: 'Affiche la puissance électrique consommée à cet instant précis, en watts (W).',
    instruction: 'Tapez 817 puis # sur le clavier du compteur. La valeur varie en temps réel.',
    unite: 'W',
    placeholder: 'Ex : 350',
    tip: 'Si la valeur est > 2 000 W, vérifiez quel appareil est fortement consommateur.',
  },
  {
    code: '815',
    label: 'Crédit d\'urgence (kWh)',
    icon: AlertCircle,
    color: 'red',
    description: 'Indique si un crédit d\'urgence a été utilisé (valeur > 0 = crédit d\'urgence actif).',
    instruction: 'Tapez 815 puis # sur le clavier du compteur.',
    unite: 'kWh',
    placeholder: 'Ex : 0 ou 1.50',
    tip: 'Le crédit d\'urgence est déduit automatiquement de la prochaine recharge.',
  },
]

const colorMap = {
  emerald: {
    bg: 'bg-emerald-50', border: 'border-emerald-200', badge: 'bg-emerald-100 text-emerald-700',
    btn: 'bg-emerald-500 hover:bg-emerald-600', icon: 'text-emerald-600', ring: 'ring-emerald-300',
    tag: 'text-emerald-800',
  },
  blue: {
    bg: 'bg-blue-50', border: 'border-blue-200', badge: 'bg-blue-100 text-blue-700',
    btn: 'bg-blue-500 hover:bg-blue-600', icon: 'text-blue-600', ring: 'ring-blue-300',
    tag: 'text-blue-800',
  },
  violet: {
    bg: 'bg-violet-50', border: 'border-violet-200', badge: 'bg-violet-100 text-violet-700',
    btn: 'bg-violet-500 hover:bg-violet-600', icon: 'text-violet-600', ring: 'ring-violet-300',
    tag: 'text-violet-800',
  },
  orange: {
    bg: 'bg-orange-50', border: 'border-orange-200', badge: 'bg-orange-100 text-orange-700',
    btn: 'bg-orange-500 hover:bg-orange-600', icon: 'text-orange-600', ring: 'ring-orange-300',
    tag: 'text-orange-800',
  },
  red: {
    bg: 'bg-red-50', border: 'border-red-200', badge: 'bg-red-100 text-red-700',
    btn: 'bg-red-500 hover:bg-red-600', icon: 'text-red-600', ring: 'ring-red-300',
    tag: 'text-red-800',
  },
  teal: {
    bg: 'bg-teal-50', border: 'border-teal-200', badge: 'bg-teal-100 text-teal-700',
    btn: 'bg-teal-500 hover:bg-teal-600', icon: 'text-teal-600', ring: 'ring-teal-300',
    tag: 'text-teal-800',
  },
  indigo: {
    bg: 'bg-indigo-50', border: 'border-indigo-200', badge: 'bg-indigo-100 text-indigo-700',
    btn: 'bg-indigo-500 hover:bg-indigo-600', icon: 'text-indigo-600', ring: 'ring-indigo-300',
    tag: 'text-indigo-800',
  },
  slate: {
    bg: 'bg-slate-100', border: 'border-slate-200', badge: 'bg-slate-200 text-slate-700',
    btn: 'bg-slate-500 hover:bg-slate-600', icon: 'text-slate-500', ring: 'ring-slate-300',
    tag: 'text-slate-700',
  },
  cyan: {
    bg: 'bg-cyan-50', border: 'border-cyan-200', badge: 'bg-cyan-100 text-cyan-700',
    btn: 'bg-cyan-500 hover:bg-cyan-600', icon: 'text-cyan-600', ring: 'ring-cyan-300',
    tag: 'text-cyan-800',
  },
}

/* ── Analyse automatique des valeurs saisies ── */
const analyserDonnees = (valeurs) => {
  const insights = []
  const solde     = parseFloat(valeurs['801'])  // crédit restant en kWh
  const moisEnCours = parseFloat(valeurs['814']) // conso mois en cours
  const moisPrec  = parseFloat(valeurs['820'])   // conso mois précédent
  const veille    = parseFloat(valeurs['813'])   // conso veille

  // ─ Analyse solde
  if (!isNaN(solde)) {
    if (solde <= 0) insights.push({ level: 'danger', msg: `⚡ Solde épuisé ! Tapez 811 sur votre compteur pour activer le Lebalma (crédit d'urgence), puis rechargez dès que possible.` })
    else if (solde < 3) insights.push({ level: 'danger', msg: `⚡ Solde critique : ${solde} kWh restants — rechargez immédiatement. En-dessous de 3 kWh, le Lebalma peut s'activer.` })
    else if (solde < 8) insights.push({ level: 'warning', msg: `⚠️ Solde faible : ${solde} kWh — prévoyez une recharge bientôt.` })
    else if (solde >= 50) insights.push({ level: 'success', msg: `✅ Solde confortable : ${solde} kWh disponibles.` })
    else insights.push({ level: 'info', msg: `ℹ️ Solde correct : ${solde} kWh restants.` })
  }

  // ─ Analyse mois en cours vs seuil T1 (150 kWh DPP)
  if (!isNaN(moisEnCours)) {
    if (moisEnCours > 250) insights.push({ level: 'danger', msg: `📊 Mois en cours : ${moisEnCours} kWh — vous êtes en Tranche 3 (> 250 kWh). Tarif élevé.` })
    else if (moisEnCours > 150) insights.push({ level: 'warning', msg: `⚠️ Mois en cours : ${moisEnCours} kWh — vous avez dépassé la Tranche 1 (150 kWh). Tarif T2 actif.` })
    else {
      const reste = 150 - moisEnCours
      insights.push({ level: 'success', msg: `✅ Mois en cours : ${moisEnCours} kWh — vous êtes en Tranche 1 (tarif social). Il vous reste ${reste.toFixed(0)} kWh avant T2.` })
    }
  }

  // ─ Comparaison mois précédent vs mois en cours
  if (!isNaN(moisEnCours) && !isNaN(moisPrec) && moisPrec > 0) {
    const diff = moisEnCours - moisPrec
    const pct = Math.round((diff / moisPrec) * 100)
    if (diff > 20) {
      insights.push({ level: 'warning', msg: `📈 Consommation en hausse de ${pct}% vs le mois précédent (${moisPrec} kWh). Vérifiez si un appareil consomme anormalement.` })
    } else if (diff < -20) {
      insights.push({ level: 'success', msg: `📉 Consommation en baisse de ${Math.abs(pct)}% vs le mois précédent (${moisPrec} kWh). Bonne maîtrise énergétique !` })
    }
  }

  // ─ Analyse consommation veille
  if (!isNaN(veille)) {
    const rythme = veille * 30
    if (veille > 5) {
      insights.push({ level: 'warning', msg: `🕓 Hier : ${veille} kWh consommés. À ce rythme, la consommation mensuelle serait ~${rythme.toFixed(0)} kWh — bien au-delà de la Tranche 1.` })
    } else if (veille <= 2) {
      insights.push({ level: 'success', msg: `✅ Hier : ${veille} kWh consommés. Excellent rythme — la consommation mensuelle estimée est ~${rythme.toFixed(0)} kWh (T1).` })
    } else {
      insights.push({ level: 'info', msg: `ℹ️ Hier : ${veille} kWh consommés (rythme mensuel estimé : ~${rythme.toFixed(0)} kWh).` })
    }
  }

  return insights
}

const levelStyles = {
  danger: 'bg-red-50 border-red-300 text-red-800',
  warning: 'bg-amber-50 border-amber-300 text-amber-800',
  success: 'bg-emerald-50 border-emerald-300 text-emerald-700',
  info: 'bg-blue-50 border-blue-200 text-blue-700',
}

/* ── Carte d'un code ── */
function CodeCard({ code, expanded, onToggle, valeur, onValeurChange }) {
  const c = colorMap[code.color]
  const Icon = code.icon
  const hasValue = valeur !== undefined && valeur !== ''

  return (
    <div className={`rounded-2xl border-2 transition-all duration-200 ${expanded ? `${c.border} shadow-md` : 'border-slate-200 hover:border-slate-300'}`}>
      {/* ── Header ── */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 px-5 py-4 text-left"
      >
        <div className={`w-12 h-12 rounded-xl ${c.bg} flex items-center justify-center flex-shrink-0`}>
          <span className={`text-lg font-extrabold font-mono ${c.tag}`}>{code.code}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-900">{code.label}</span>
            {hasValue && (
              <span className={`text-xs font-bold ${c.badge} px-2 py-0.5 rounded-full`}>
                {valeur} {code.unite}
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-0.5 truncate">{code.description}</p>
        </div>
        <div className="flex-shrink-0 text-slate-400">
          {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </div>
      </button>

      {/* ── Body ── */}
      {expanded && (
        <div className={`px-5 pb-5 space-y-4 border-t ${c.border}`}>
          {/* Instruction */}
          <div className={`mt-4 ${c.bg} rounded-xl px-4 py-3 flex gap-3`}>
            <Info className={`w-4 h-4 mt-0.5 flex-shrink-0 ${c.icon}`} />
            <div>
              <p className="text-sm font-semibold text-slate-800 mb-1">Comment consulter ce code ?</p>
              <p className="text-sm text-slate-600">{code.instruction}</p>
            </div>
          </div>

          {/* Saisie — masquée pour les codes action (811, 812) */}
          {!code.actionOnly && (
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Valeur affichée sur votre compteur
              {code.unite && <span className="ml-1 font-normal text-slate-500">({code.unite})</span>}
            </label>
            <input
              type={['804', '830'].includes(code.code) ? 'text' : 'number'}
              value={valeur}
              onChange={e => onValeurChange(code.code, e.target.value)}
              placeholder={code.placeholder}
              className={`w-full max-w-xs px-4 py-2.5 rounded-xl border-2 font-mono text-base outline-none transition ${
                hasValue ? `${c.border} ring-2 ${c.ring}` : 'border-slate-200 focus:border-primary/40'
              }`}
            />
          </div>
          )}

          {/* Conseil */}
          <div className="flex gap-2 text-sm text-slate-600">
            <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
            <span>{code.tip}</span>
          </div>
        </div>
      )}
    </div>
  )
}

/* ════════════════════════════════
   Composant principal
   ════════════════════════════════ */
export default function LectureCompteur() {
  const [expanded, setExpanded] = useState(null)
  const [valeurs, setValeurs] = useState({})
  const [saved, setSaved] = useState(false)

  const setValeur = (code, val) => setValeurs(prev => ({ ...prev, [code]: val }))
  const toggle = (code) => setExpanded(prev => prev === code ? null : code)

  const insights = analyserDonnees(valeurs)
  // Les codes actionOnly (811, 812) n'ont pas de valeur affichée : on ne les compte pas
  const nbSaisies = Object.entries(valeurs)
    .filter(([code, v]) => v !== '' && !CODES.find(c => c.code === code)?.actionOnly)
    .length

  const sauvegarder = () => {
    const entree = {
      date: new Date().toISOString(),
      valeurs: { ...valeurs },
    }
    const historique = JSON.parse(localStorage.getItem('woyofal_lecture_compteur') || '[]')
    historique.unshift(entree)
    localStorage.setItem('woyofal_lecture_compteur', JSON.stringify(historique.slice(0, 30)))
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">

      {/* ── En-tête ── */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/8 rounded-full mb-4">
          <Cpu className="w-4 h-4 text-primary" />
          <span className="text-xs font-bold text-primary uppercase tracking-wider">Lecture guidée</span>
        </div>
        <h1 className="text-3xl font-display font-extrabold text-slate-900 mb-2">
          Votre compteur Woyofal
        </h1>
        <p className="text-slate-500 text-base leading-relaxed">
          Consultez les codes officiels de votre compteur, saisissez les valeurs affichées et obtenez une analyse instantanée de votre situation.
        </p>
      </div>

      {/* ── Guide rapide ── */}
      <div className="bg-slate-900 text-white rounded-2xl px-5 py-4 mb-6 flex gap-4 items-start">
        <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Cpu className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="font-semibold mb-1">Comment utiliser ce guide ?</p>
          <ol className="text-sm text-slate-300 space-y-1 list-decimal list-inside">
            <li>Devant votre compteur, tapez le code sur son clavier</li>
            <li>Validez avec la touche <kbd className="bg-white/20 px-1.5 py-0.5 rounded text-xs font-mono">Entrée</kbd> ou <kbd className="bg-white/20 px-1.5 py-0.5 rounded text-xs font-mono">OK</kbd></li>
            <li>Notez la valeur affichée sur l'écran LCD du compteur</li>
            <li>Saisissez-la dans le champ correspondant ci-dessous</li>
            <li>Enregistrez pour suivre votre évolution dans l'historique</li>
          </ol>
        </div>
      </div>

      {/* ── Bannière mise à jour 3 codes (oct. 2024) ── */}
      <div className="bg-amber-50 border border-amber-300 rounded-2xl px-5 py-4 mb-8 flex gap-3 items-start">
        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-amber-800 mb-1">Mise à jour STS — Nouvelles recharges en 3 codes</p>
          <p className="text-sm text-amber-700 leading-relaxed">
            Depuis octobre 2024, certains compteurs nécessitent <strong>3 codes de 20 chiffres</strong> lors du premier achat après la mise à jour :
          </p>
          <ol className="text-sm text-amber-700 mt-2 space-y-1 list-decimal list-inside">
            <li>Saisir le <strong>1er code</strong> → valider</li>
            <li>Saisir le <strong>2e code</strong> → valider</li>
            <li>Saisir le <strong>3e code</strong> (votre crédit acheté) → valider</li>
          </ol>
          <p className="text-xs text-amber-600 mt-2">En cas de problème : <strong>33 867 66 66</strong> (service client Sénelec)</p>
        </div>
      </div>

      {/* ── Codes ── */}
      <div className="space-y-3 mb-8">
        {CODES.map(code => (
          <CodeCard
            key={code.code}
            code={code}
            expanded={expanded === code.code}
            onToggle={() => toggle(code.code)}
            valeur={valeurs[code.code] ?? ''}
            onValeurChange={setValeur}
          />
        ))}
      </div>

      {/* ── Analyse ── */}
      {insights.length > 0 && (
        <div className="mb-8 space-y-2">
          <h2 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-primary" />
            Analyse de votre situation
          </h2>
          {insights.map((ins, i) => (
            <div key={i} className={`rounded-xl border px-4 py-3 text-sm font-medium ${levelStyles[ins.level]}`}>
              {ins.msg}
            </div>
          ))}
        </div>
      )}

      {/* ── Bouton Sauvegarder ── */}
      {nbSaisies > 0 && (
        <div className="flex items-center gap-3">
          <button
            onClick={sauvegarder}
            className="btn-primary flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Enregistrer la lecture ({nbSaisies} valeur{nbSaisies > 1 ? 's' : ''})
          </button>
          {saved && (
            <span className="text-emerald-600 text-sm font-semibold flex items-center gap-1">
              <CheckCircle className="w-4 h-4" /> Enregistré dans l'historique
            </span>
          )}
        </div>
      )}

      {/* ── Tableau récapitulatif ── */}
      {nbSaisies > 0 && (
        <div className="mt-8 bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="font-bold text-slate-800">Récapitulatif de la lecture</h3>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> {new Date().toLocaleDateString('fr-FR', { dateStyle: 'full' })}
            </p>
          </div>
          <div className="divide-y divide-slate-100">
            {CODES.filter(c => valeurs[c.code] && valeurs[c.code] !== '').map(c => (
              <div key={c.code} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3">
                  <span className={`font-mono text-sm font-bold px-2 py-0.5 rounded-lg ${colorMap[c.color].badge}`}>{c.code}</span>
                  <span className="text-sm text-slate-700">{c.label}</span>
                </div>
                <span className="font-mono font-bold text-slate-900">
                  {valeurs[c.code]} <span className="text-slate-400 font-normal text-xs">{c.unite}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
