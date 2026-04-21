import React, { useState, useEffect } from 'react'
import { Calculator, AlertCircle, TrendingUp, Zap, ArrowLeftRight, Save, CheckCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

/* ── Calcul local (offline) — miroir de api-mock-server ── */
const TARIFS_SIM = {
  DPP: { 1: { prix: 82.00, max: 150 }, 2: { prix: 136.49, max: 250 }, 3: { prix: 136.49, max: null } },
  PPP: { 1: { prix: 147.43, max: 50 },  2: { prix: 189.84, max: 500 }, 3: { prix: 189.84, max: null } }
}

const simulerRechargeLocal = (montant, typeCompteur = 'DPP', cumulActuel = 0, avecRedevance = true) => {
  const tarifs = TARIFS_SIM[typeCompteur]
  const redevance = avecRedevance ? 429 : 0
  const taxe = Math.round(montant * 0.025)
  let montantReste = montant - redevance - taxe
  let cumul = cumulActuel
  let kwhTotal = 0
  const detailTranches = {}

  for (let t = 1; t <= 3; t++) {
    if (montantReste <= 0) break
    const maxTranche = tarifs[t].max
    const minTranche = t === 1 ? 0 : tarifs[t - 1].max
    if (cumul < minTranche) continue
    if (maxTranche !== null && cumul >= maxTranche) continue
    const disponible = maxTranche ? maxTranche - cumul : Number.MAX_SAFE_INTEGER
    if (disponible <= 0) continue
    const kwhDansTranche = Math.min(montantReste / tarifs[t].prix, disponible)
    const montantTranche = kwhDansTranche * tarifs[t].prix
    if (kwhDansTranche > 0) {
      detailTranches[`T${t}`] = {
        kwh: parseFloat(kwhDansTranche.toFixed(2)),
        prix_unitaire: tarifs[t].prix,
        montant: Math.round(montantTranche)
      }
      kwhTotal += kwhDansTranche
      cumul += kwhDansTranche
      montantReste -= montantTranche
    }
  }

  const trancheFinal = cumul <= 150 ? 1 : cumul <= 250 ? 2 : 3
  return {
    montant_brut: montant,
    montant_redevance: redevance,
    taxe,
    montant_net: montant - redevance - taxe,
    kwh_obtenus: parseFloat(kwhTotal.toFixed(2)),
    tranche_finale: trancheFinal,
    detail_tranches: detailTranches,
    type_compteur: typeCompteur,
    cumul_initial: cumulActuel,
    cumul_final: parseFloat(cumul.toFixed(2)),
    timestamp: new Date().toISOString()
  }
}

/* ── Sauvegarder une recharge dans localStorage ── */
const sauvegarderRecharge = (data, typeCompteur) => {
  const entree = {
    date: new Date().toISOString(),
    montant_brut: data.montant_brut,
    montant_net: data.montant_net,
    montant_redevance: data.montant_redevance || 0,
    kwh_obtenus: data.kwh_obtenus,
    tranche_finale: data.tranche_finale,
    detail_tranches: data.detail_tranches,
    type_compteur: typeCompteur,
  }
  const historique = JSON.parse(localStorage.getItem('woyofal_recharges') || '[]')
  historique.unshift(entree)
  localStorage.setItem('woyofal_recharges', JSON.stringify(historique.slice(0, 100)))
}

/* ═══ Tarifs locaux pour calcul inverse offline ═══ */
const TARIFS_LOCAL = {
  DPP: { 1: { prix: 82.00, max: 150 }, 2: { prix: 136.49, max: 250 }, 3: { prix: 136.49, max: null } },
  PPP: { 1: { prix: 147.43, max: 50 }, 2: { prix: 189.84, max: 500 }, 3: { prix: 189.84, max: null } }
}

/* ─── Calcul inverse : kWh souhaités → montant FCFA ─── */
const calculerMontantPourKwh = (kwhVoulus, cumulActuel, typeCompteur, avecRedevance) => {
  const tarifs = TARIFS_LOCAL[typeCompteur]
  const redevance = avecRedevance ? 429 : 0
  let cumul = cumulActuel
  let montantNet = 0
  let details = {}
  let kwhReste = kwhVoulus

  for (let t = 1; t <= 3; t++) {
    if (kwhReste <= 0) break
    const maxTranche = tarifs[t].max
    const dejaEnTranche = Math.max(0, cumul - (t > 1 ? tarifs[t - 1].max : 0))
    const disponible = maxTranche ? Math.max(0, maxTranche - Math.max(cumul, t > 1 ? tarifs[t - 1].max : 0)) : Infinity
    if (disponible <= 0) continue
    const kwhDansTranche = Math.min(kwhReste, disponible)
    const montantTranche = kwhDansTranche * tarifs[t].prix
    details[`T${t}`] = { kwh: kwhDansTranche.toFixed(2), prix_unitaire: tarifs[t].prix, montant: montantTranche.toFixed(0) }
    montantNet += montantTranche
    cumul += kwhDansTranche
    kwhReste -= kwhDansTranche
  }

  const montantAvantTaxe = montantNet + redevance
  const montantBrut = montantAvantTaxe / (1 - 0.025)
  const taxe = montantBrut * 0.025

  return {
    kwh_voulus: kwhVoulus,
    montant_brut: Math.ceil(montantBrut / 100) * 100,
    montant_net: montantNet.toFixed(0),
    redevance,
    taxe: taxe.toFixed(0),
    detail_tranches: details,
    cumul_final: cumulActuel + kwhVoulus
  }
}

/* ─── Composant Calcul Inverse ─── */
const CalculateurInverse = ({ typeCompteur }) => {
  const [kwhVoulus, setKwhVoulus] = useState(50)
  const [cumulActuel, setCumulActuel] = useState(0)
  const [avecRedevance, setAvecRedevance] = useState(false)
  const cumulPourCalcul = avecRedevance ? 0 : parseFloat(cumulActuel) || 0
  const result = calculerMontantPourKwh(parseFloat(kwhVoulus) || 0, cumulPourCalcul, typeCompteur, avecRedevance)

  return (
    <div className="space-y-4">
      <div>
        <label className="label">kWh souhaités</label>
        <input type="number" value={kwhVoulus} onChange={e => setKwhVoulus(e.target.value)} min="1" step="1" className="input-field" />
      </div>
      {!avecRedevance && (
      <div>
        <div className="flex justify-between items-baseline mb-2">
          <label className="label">Cumul mensuel actuel (kWh)</label>
          <span className="text-xs text-blue-600 font-semibold">À vérifier au compteur avec le code : 814</span>
        </div>
        <input type="number" value={cumulActuel} onChange={e => setCumulActuel(e.target.value)} min="0" step="0.1" className="input-field" />
      </div>
      )}
      <div className="flex items-center gap-2">
        <input type="checkbox" checked={avecRedevance} onChange={e => setAvecRedevance(e.target.checked)} className="w-4 h-4 accent-primary" />
        <label className="text-sm text-gray-700">Appliquer redevance (429 FCFA) — 1ère recharge du mois</label>
      </div>
      {result && (
        <div className="space-y-3 mt-4">
          <div className="bg-gradient-to-r from-violet-50 to-violet-100 p-6 rounded-2xl border border-violet-200 text-center">
            <div className="text-sm text-violet-600 font-medium mb-1">💳 Montant à recharger</div>
            <div className="text-4xl font-bold font-display text-violet-900">{result.montant_brut.toLocaleString()} FCFA</div>
            <div className="text-xs text-violet-700 mt-2">Pour obtenir {kwhVoulus} kWh</div>
          </div>
          <div className="bg-slate-50 p-4 rounded-2xl text-sm border border-slate-100">
            <div className="font-semibold text-slate-700 mb-2">Détail</div>
            <div className="space-y-1">
              <div className="flex justify-between"><span>Montant kWh net</span><span className="font-bold">{parseFloat(result.montant_net).toLocaleString()} F</span></div>
              {result.redevance > 0 && <div className="flex justify-between text-gray-500"><span>+ Redevance</span><span>{result.redevance} F</span></div>}
              <div className="flex justify-between text-gray-500"><span>+ Taxe (2,5%)</span><span>{parseFloat(result.taxe).toLocaleString()} F</span></div>
              <div className="flex justify-between font-bold text-primary border-t pt-1"><span>= Total</span><span>{result.montant_brut.toLocaleString()} F</span></div>
            </div>
          </div>
          {Object.keys(result.detail_tranches).length > 0 && (
          <div className="bg-slate-50 p-4 rounded-2xl text-sm border border-slate-100">
            <div className="font-semibold text-slate-700 mb-2">⚡ Détail par tranche</div>
              {Object.entries(result.detail_tranches).map(([t, d]) => (
                <div key={t} className="flex justify-between bg-white p-2.5 rounded-xl border-l-4 border-primary mb-1">
                  <span className="font-semibold">{t} ({d.prix_unitaire} F/kWh)</span>
                  <span className="text-primary font-bold">{d.kwh} kWh</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const SimulateurRecharge = () => {
  const { isAuth } = useAuth()
  const [mode, setMode] = useState('direct') // 'direct' | 'inverse'
  const [formData, setFormData] = useState({
    montant_brut: 10000,
    cumul_actuel: 0,
    type_compteur: 'DPP',
    avecRedevance: false
  })

  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [savedMsg, setSavedMsg] = useState(false)

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const data = simulerRechargeLocal(
        parseFloat(formData.montant_brut),
        formData.type_compteur,
        formData.avecRedevance ? 0 : parseFloat(formData.cumul_actuel) || 0,
        formData.avecRedevance
      )
      setResult(data)
      if (isAuth) sauvegarderRecharge(data, formData.type_compteur)
    } catch (err) {
      setError(err.message || 'Erreur lors de la simulation')
    } finally {
      setLoading(false)
    }
  }

  const getTrancheColor = (tranche) => {
    switch (tranche) {
      case 1:
        return 'bg-green-100 text-green-800 border-green-300'
      case 2:
        return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 3:
        return 'bg-red-100 text-red-800 border-red-300'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 sm:py-14 bg-white min-h-screen">
      <div className="text-center mb-10">
        <span className="section-tag">Outil</span>
        <h1 className="section-title">Simulateur de Recharge</h1>
        <p className="section-subtitle">Calculez les kWh obtenus pour votre recharge Woyofal</p>
      </div>

      {/* ─── Sélecteur de mode ─── */}
      <div className="mb-8 px-0">
        <div className="bg-slate-100 rounded-2xl p-1 flex flex-col sm:flex-row gap-1 w-full sm:w-auto sm:max-w-fit sm:mx-auto">
          <button
            onClick={() => setMode('direct')}
            className={`flex items-center justify-center gap-2 px-4 py-3 sm:py-2.5 rounded-xl font-semibold text-sm transition ${mode === 'direct' ? 'bg-primary text-white shadow-glow' : 'text-slate-600 hover:bg-slate-200'}`}
          >
            <Zap className="w-4 h-4" /> FCFA → kWh
          </button>
          <button
            onClick={() => setMode('inverse')}
            className={`flex items-center justify-center gap-2 px-4 py-3 sm:py-2.5 rounded-xl font-semibold text-sm transition ${mode === 'inverse' ? 'bg-violet-600 text-white shadow-[0_0_24px_rgba(139,92,246,0.4)]' : 'text-slate-600 hover:bg-slate-200'}`}
          >
            <ArrowLeftRight className="w-4 h-4" /> kWh → FCFA
            <span className="bg-accent text-navy text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">Exclusif</span>
          </button>
        </div>
      </div>

      {mode === 'inverse' ? (
        /* ─── Mode inverse ─── */
        <div className="grid md:grid-cols-2 gap-6">
          <div className="card border-violet-200/60">
            <h2 className="text-xl font-semibold font-display mb-2 flex items-center gap-2">
              <ArrowLeftRight className="w-5 h-5 text-violet-600" /> Calcul Inverse
            </h2>
            <p className="text-sm text-slate-500 mb-6">Entrez les kWh souhaités → obtenez le montant exact à recharger</p>
            <div className="mb-4">
              <label className="label">Type de Compteur</label>
              <select value={formData.type_compteur} onChange={e => setFormData(p => ({...p, type_compteur: e.target.value}))} className="input-field">
                <option value="DPP">DPP (Domestique)</option>
                <option value="PPP">PPP (Professionnel)</option>
              </select>
            </div>
            <CalculateurInverse typeCompteur={formData.type_compteur} />
          </div>
          <div className="card bg-violet-50/50 border-violet-200">
            <h3 className="font-semibold font-display text-violet-800 mb-3 flex items-center gap-2">
              <ArrowLeftRight className="w-5 h-5" /> Fonctionnalité exclusive
            </h3>
            <p className="text-sm text-violet-700 mb-4">
              Le calcul inverse vous permet de savoir <strong>exactement combien recharger</strong> pour obtenir un nombre précis de kWh.
            </p>
            <div className="space-y-2 text-sm text-violet-700">
              <div className="flex items-start gap-2"><span>✓</span><span>Utile pour rester sous le seuil de la Tranche 1 (150 kWh)</span></div>
              <div className="flex items-start gap-2"><span>✓</span><span>Planifiez votre budget électricité avec précision</span></div>
              <div className="flex items-start gap-2"><span>✓</span><span>Calcul instantané, sans connexion API</span></div>
            </div>
            <div className="mt-4 bg-violet-100 rounded-xl p-3 text-xs text-violet-600">
              💡 Astuce : pour rester en T1 avec cumul à 0, entrez 150 kWh pour savoir combien recharger exactement.
            </div>
          </div>
        </div>
      ) : (
      /* ─── Mode direct ─── */
      <div className="grid md:grid-cols-2 gap-6">
          <div className="card">
            <h2 className="text-xl font-semibold font-display mb-6 flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" /> Paramètres
            </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Type de Compteur</label>
              <select name="type_compteur" value={formData.type_compteur} onChange={handleChange} className="input-field">
                <option value="DPP">DPP (Domestique)</option>
                <option value="PPP">PPP (Professionnel)</option>
              </select>
            </div>

            <div>
              <label className="label">Montant à Recharger (FCFA)</label>
              <input type="number" name="montant_brut" value={formData.montant_brut} onChange={handleChange} min="100" step="100" className="input-field" required />
            </div>

            {!formData.avecRedevance && (
            <div>
              <div className="flex justify-between items-baseline mb-2">
                <label className="label">Cumul Mensuel Actuel (kWh)</label>
                <span className="text-xs text-primary font-semibold">À vérifier au compteur avec le code : 814</span>
              </div>
              <input type="number" name="cumul_actuel" value={formData.cumul_actuel} onChange={handleChange} min="0" step="0.1" className="input-field" required />
              {/* Info cumul */}
              <div className="mt-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
                <p className="text-xs font-semibold text-amber-800 mb-1">💡 Pourquoi ce champ est important ?</p>
                <p className="text-xs text-amber-700 leading-relaxed">
                  Deux recharges du même montant donnent des kWh différents selon votre cumul.
                </p>
                <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
                  <div className="bg-white rounded-lg p-2 border border-amber-100">
                    <span className="font-bold text-green-700">Cumul = 0</span><br />
                    <span className="text-gray-600">10 000 F → ~104 kWh</span><br />
                    <span className="text-green-600 font-medium">T1 à 82 F/kWh</span>
                  </div>
                  <div className="bg-white rounded-lg p-2 border border-amber-100">
                    <span className="font-bold text-orange-700">Cumul = 200</span><br />
                    <span className="text-gray-600">10 000 F → ~73 kWh</span><br />
                    <span className="text-orange-600 font-medium">T2 à 136,49 F/kWh</span>
                  </div>
                </div>
              </div>
            </div>
            )}

            <div className="flex items-center gap-2">
              <input type="checkbox" name="avecRedevance" checked={formData.avecRedevance} onChange={handleChange} className="w-4 h-4 text-primary" />
              <label className="text-sm text-gray-700">Appliquer redevance (429 FCFA) - Début de mois</label>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Calcul en cours...
                </>
              ) : (
                <>
                  <Calculator className="w-5 h-5" />
                  Calculer
                </>
              )}
            </button>
          </form>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              <div className="text-red-700 text-sm">{error}</div>
            </div>
          )}
        </div>

          <div className="card">
            <h2 className="text-xl font-semibold font-display mb-6 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-success" /> Résultats
            </h2>

          {result ? (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-primary/10 to-blue-100 p-6 rounded-2xl border border-primary/20">
                <div className="text-sm text-primary font-medium mb-1">kWh Obtenus</div>
                <div className="text-4xl font-bold font-display gradient-text">{result.kwh_obtenus.toFixed(2)} kWh</div>
                <div className="text-sm text-slate-600 mt-2">Prix moyen : {(result.montant_net / result.kwh_obtenus).toFixed(2)} FCFA/kWh</div>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="text-sm font-semibold text-slate-700 mb-2">Déductions</div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between"><span className="text-gray-600">Montant brut</span><span className="font-semibold">{result.montant_brut.toLocaleString()} FCFA</span></div>
                  {result.montant_redevance > 0 && (<div className="flex justify-between text-red-600"><span>- Redevance</span><span>{result.montant_redevance} FCFA</span></div>)}
                  <div className="flex justify-between text-red-600"><span>- Taxe communale (2.5%)</span><span>{result.taxe.toFixed(0)} FCFA</span></div>
                  <div className="flex justify-between font-bold text-success border-t pt-1"><span>Montant net</span><span>{result.montant_net.toLocaleString()} FCFA</span></div>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="text-sm font-semibold text-slate-700 mb-3">⚡ Détail par Tranche</div>
                <div className="space-y-2">
                  {Object.entries(result.detail_tranches).map(([tranche, data]) => (
                    <div key={tranche} className="bg-white p-3 rounded-xl border-l-4 border-primary">
                      <div className="flex justify-between items-center mb-1"><span className="font-semibold text-slate-800">{tranche}</span><span className="text-lg font-bold text-primary">{data.kwh.toFixed(2)} kWh</span></div>
                      <div className="text-xs text-gray-600 flex justify-between"><span>Prix : {data.prix_unitaire} FCFA/kWh</span><span>Total : {data.montant.toLocaleString()} FCFA</span></div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-red-50 p-3 rounded-xl border border-red-100"><div className="text-xs text-primary mb-1">Cumul Avant</div><div className="text-lg sm:text-xl font-bold font-display text-navy">{result.cumul_initial.toFixed(1)} kWh</div></div>
                <div className="bg-success/10 p-3 rounded-xl border border-success/20"><div className="text-xs text-success mb-1">Cumul Final</div><div className="text-lg sm:text-xl font-bold font-display text-success">{result.cumul_final.toFixed(1)} kWh</div></div>
              </div>

              <div className={`p-4 rounded-2xl border-2 text-center ${getTrancheColor(result.tranche_finale)}`}>
                <div className="text-sm font-medium mb-1">Vous serez en</div>
                <div className="text-2xl font-bold">Tranche {result.tranche_finale}</div>
                {result.tranche_finale === 1 && (<div className="text-xs mt-1">✅ Tarif social préservé</div>)}
                {result.tranche_finale > 1 && (<div className="text-xs mt-1">⚠️ Hors tarif social</div>)}
              </div>

              {/* ── Bouton Sauvegarder ── */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                {isAuth ? (
                  <button
                    onClick={() => {
                      sauvegarderRecharge(result, formData.type_compteur)
                      setSavedMsg(true)
                      setTimeout(() => setSavedMsg(false), 3000)
                    }}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-primary/30 bg-primary/5 text-primary text-sm font-semibold hover:bg-primary/10 transition"
                  >
                    <Save className="w-4 h-4" /> Sauvegarder dans l'historique
                  </button>
                ) : (
                  <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-slate-200 bg-slate-50 text-slate-400 text-sm cursor-not-allowed" title="Connectez-vous pour sauvegarder">
                    <Save className="w-4 h-4" />
                    <span>Sauvegarder dans l'historique</span>
                    <span className="ml-1 text-xs bg-slate-200 text-slate-500 px-2 py-0.5 rounded-full font-medium">Connexion requise</span>
                  </div>
                )}
                {savedMsg && (
                  <span className="text-emerald-600 text-sm font-semibold flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" /> Enregistré !
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-slate-300">
              <Calculator className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p className="text-slate-400 text-sm">Remplissez le formulaire et cliquez sur Calculer</p>
            </div>
          )}
        </div>
      </div>
      )}
    </div>
  )
}

export default SimulateurRecharge
