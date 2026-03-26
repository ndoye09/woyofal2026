import React, { useState, useEffect } from 'react'
import { Calculator, AlertCircle, TrendingUp, Zap, ArrowLeftRight, Save, CheckCircle } from 'lucide-react'
import { simulateRecharge, getTarifs } from '../services/api'

/* ── Sauvegarder une recharge dans localStorage ── */
const sauvegarderRecharge = (data, typeCompteur) => {
  const entree = {
    date: new Date().toISOString(),
    montant_brut: data.montant_brut,
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
  const result = calculerMontantPourKwh(parseFloat(kwhVoulus) || 0, parseFloat(cumulActuel) || 0, typeCompteur, avecRedevance)

  return (
    <div className="space-y-4">
      <div>
        <label className="label">kWh souhaités</label>
        <input type="number" value={kwhVoulus} onChange={e => setKwhVoulus(e.target.value)} min="1" step="1" className="input-field" />
      </div>
      <div>
        <label className="label">Cumul mensuel actuel (kWh)</label>
        <input type="number" value={cumulActuel} onChange={e => setCumulActuel(e.target.value)} min="0" step="0.1" className="input-field" />
      </div>
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
  const [mode, setMode] = useState('direct') // 'direct' | 'inverse'
  const [formData, setFormData] = useState({
    montant_brut: 10000,
    cumul_actuel: 120,
    type_compteur: 'DPP',
    avec_redevance: false
  })

  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [tarifs, setTarifs] = useState(null)
  const [savedMsg, setSavedMsg] = useState(false)

  useEffect(() => {
    loadTarifs()
  }, [formData.type_compteur])

  const loadTarifs = async () => {
    try {
      const data = await getTarifs(formData.type_compteur)
      setTarifs(data.data)
    } catch (err) {
      console.error('Erreur chargement tarifs:', err)
    }
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const data = await simulateRecharge({
        ...formData,
        montant_brut: parseFloat(formData.montant_brut),
        cumul_actuel: parseFloat(formData.cumul_actuel)
      })
      setResult(data.data)
    } catch (err) {
      setError(err.message || 'Erreur lors de la simulation')
      console.error('Erreur simulation:', err)
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
    <div className="max-w-6xl mx-auto px-4 py-14">
      <div className="text-center mb-10">
        <span className="section-tag">Outil</span>
        <h1 className="section-title">Simulateur de Recharge</h1>
        <p className="section-subtitle">Calculez les kWh obtenus pour votre recharge Woyofal</p>
      </div>

      {/* ─── Sélecteur de mode ─── */}
      <div className="flex justify-center mb-8">
        <div className="bg-slate-100 rounded-2xl p-1 inline-flex gap-1">
          <button
            onClick={() => setMode('direct')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm transition ${mode === 'direct' ? 'bg-primary text-white shadow-glow' : 'text-slate-600 hover:bg-slate-200'}`}
          >
            <Zap className="w-4 h-4" /> FCFA → kWh
          </button>
          <button
            onClick={() => setMode('inverse')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm transition ${mode === 'inverse' ? 'bg-violet-600 text-white shadow-[0_0_24px_rgba(139,92,246,0.4)]' : 'text-slate-600 hover:bg-slate-200'}`}
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

            <div>
              <label className="label">Cumul Mensuel Actuel (kWh)</label>
              <input type="number" name="cumul_actuel" value={formData.cumul_actuel} onChange={handleChange} min="0" step="0.1" className="input-field" required />
            </div>

            <div className="flex items-center gap-2">
              <input type="checkbox" name="avec_redevance" checked={formData.avec_redevance} onChange={handleChange} className="w-4 h-4 text-primary" />
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
                <div className="text-sm text-slate-600 mt-2">Prix moyen : {result.prix_moyen_kwh.toFixed(2)} FCFA/kWh</div>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="text-sm font-semibold text-slate-700 mb-2">Déductions</div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between"><span className="text-gray-600">Montant brut</span><span className="font-semibold">{result.montant_brut.toLocaleString()} FCFA</span></div>
                  {result.deductions.redevance > 0 && (<div className="flex justify-between text-red-600"><span>- Redevance</span><span>{result.deductions.redevance} FCFA</span></div>)}
                  <div className="flex justify-between text-red-600"><span>- Taxe communale (2.5%)</span><span>{result.deductions.taxe_communale.toFixed(0)} FCFA</span></div>
                  <div className="flex justify-between font-bold text-success border-t pt-1"><span>Montant net</span><span>{result.deductions.montant_net.toLocaleString()} FCFA</span></div>
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
                <div className="bg-blue-50 p-3 rounded-xl border border-blue-100"><div className="text-xs text-blue-600 mb-1">Cumul Avant</div><div className="text-xl font-bold font-display text-blue-900">{result.cumul_avant.toFixed(1)} kWh</div></div>
                <div className="bg-success/10 p-3 rounded-xl border border-success/20"><div className="text-xs text-success mb-1">Cumul Final</div><div className="text-xl font-bold font-display text-success">{result.cumul_final.toFixed(1)} kWh</div></div>
              </div>

              <div className={`p-4 rounded-2xl border-2 text-center ${getTrancheColor(result.tranche_finale)}`}>
                <div className="text-sm font-medium mb-1">Vous serez en</div>
                <div className="text-2xl font-bold">Tranche {result.tranche_finale}</div>
                {result.tranche_finale === 1 && (<div className="text-xs mt-1">✅ Tarif social préservé</div>)}
                {result.tranche_finale > 1 && (<div className="text-xs mt-1">⚠️ Hors tarif social</div>)}
              </div>

              {result.economie_vs_t2 > 0 && (
              <div className="bg-success/10 p-4 rounded-2xl border border-success/20">
                <div className="text-sm text-success mb-1">Économie vs Tranche 2</div>
                <div className="text-2xl font-bold font-display text-success">{result.economie_vs_t2.toFixed(0)} FCFA</div>
                  <div className="text-xs text-green-600 mt-1">Grâce au tarif social T1</div>
                </div>
              )}

              {/* ── Bouton Sauvegarder ── */}
              <div className="flex items-center gap-3 pt-2">
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

      {tarifs && (
        <div className="card mt-6">
          <h3 className="text-lg font-semibold font-display mb-4">Grille Tarifaire {formData.type_compteur} — 2026</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="bg-slate-100"><th className="p-3 text-left text-slate-600">Tranche</th><th className="p-3 text-left text-slate-600">Seuil (kWh)</th><th className="p-3 text-right text-slate-600">Prix (FCFA/kWh)</th></tr></thead>
              <tbody>
                {Object.entries(tarifs.tarifs[formData.type_compteur]).map(([num, tarif]) => (
                  <tr key={num} className="border-t"><td className="p-3 font-semibold">T{num}</td><td className="p-3">{tarif.seuil_min} - {tarif.seuil_max || '∞'}</td><td className="p-3 text-right font-bold text-primary">{tarif.prix.toFixed(2)} F</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 text-xs text-gray-600">Redevance : {tarifs.redevance} FCFA | Taxe communale : {tarifs.taxe_communale_pct}%</div>
        </div>
      )}
    </div>
  )
}

export default SimulateurRecharge
