import React, { useState, useEffect, useCallback } from 'react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell
} from 'recharts'
import { History, Zap, DollarSign, Trash2, TrendingUp, TrendingDown, AlertCircle, CheckCircle, Cpu, Calendar } from 'lucide-react'

/* ═══ Clés localStorage ═══ */
const KEY_RECHARGES = 'woyofal_recharges'
const KEY_LECTURES  = 'woyofal_lecture_compteur'

/* ── Charger depuis localStorage ── */
const charger = (cle) => {
  try {
    return JSON.parse(localStorage.getItem(cle) || '[]')
  } catch {
    return []
  }
}

/* ── Mois format court ── */
const moisLabel = (dateStr) => {
  const d = new Date(dateStr)
  return d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })
}

/* ── Agrégation mensuelle des recharges ── */
const agregParMois = (recharges) => {
  const map = {}
  for (const r of recharges) {
    const d = new Date(r.date)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (!map[key]) map[key] = { mois: key, label: moisLabel(r.date), fcfa: 0, kwh: 0, nb: 0 }
    map[key].fcfa += r.montant_net || r.montant_brut || 0
    map[key].kwh  += r.kwh_obtenus || 0
    map[key].nb   += 1
  }
  return Object.values(map).sort((a, b) => a.mois.localeCompare(b.mois))
}

/* ── Badge tranche ── */
function BadgeTranche({ t }) {
  const styles = {
    1: 'bg-blue-100 text-blue-700 border-blue-200',
    2: 'bg-red-100 text-red-700 border-red-200',
    3: 'bg-red-100 text-red-700 border-red-200',
  }
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${styles[t] || styles[3]}`}>
      T{t}
    </span>
  )
}

/* ── Tooltip recharts personnalisé ── */
const TooltipKwh = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-4 py-3 text-sm">
      <p className="font-bold text-slate-800 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-semibold">
          {p.name} : {p.value?.toLocaleString()} {p.name === 'kWh' ? 'kWh' : 'FCFA'}
        </p>
      ))}
    </div>
  )
}

/* ════════════════════════════════
   Composant principal
   ════════════════════════════════ */
export default function HistoriqueConsommation() {
  const [onglet, setOnglet] = useState('recharges')
  const [recharges, setRecharges] = useState([])
  const [lectures, setLectures] = useState([])

  const chargerTout = useCallback(() => {
    setRecharges(charger(KEY_RECHARGES))
    setLectures(charger(KEY_LECTURES))
  }, [])

  useEffect(() => { chargerTout() }, [chargerTout])

  const supprimerRecharge = (i) => {
    const updated = recharges.filter((_, idx) => idx !== i)
    localStorage.setItem(KEY_RECHARGES, JSON.stringify(updated))
    setRecharges(updated)
  }

  const supprimerLecture = (i) => {
    const updated = lectures.filter((_, idx) => idx !== i)
    localStorage.setItem(KEY_LECTURES, JSON.stringify(updated))
    setLectures(updated)
  }

  const viderHistorique = (cle, setter) => {
    if (window.confirm('Vider tout l\'historique ?')) {
      localStorage.removeItem(cle)
      setter([])
    }
  }

  /* Stats globales */
  const totalFcfa = recharges.reduce((s, r) => s + (r.montant_net || 0), 0)
  const totalKwh  = recharges.reduce((s, r) => s + (r.kwh_obtenus || 0), 0)
  const prixMoyen = totalKwh > 0 ? totalFcfa / totalKwh : 0
  const mensuel   = agregParMois(recharges)

  /* Analyse tranche */
  const enT1 = recharges.filter(r => (r.tranche_finale || r.tranche) === 1).length
  const tauxT1 = recharges.length > 0 ? Math.round((enT1 / recharges.length) * 100) : 0

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 bg-white min-h-screen">

      {/* ── En-tête ── */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/8 rounded-full mb-4">
          <History className="w-4 h-4 text-primary" />
          <span className="text-xs font-bold text-primary uppercase tracking-wider">Historique</span>
        </div>
        <h1 className="text-3xl font-display font-extrabold text-slate-900 mb-2">
          Suivi de consommation
        </h1>
        <p className="text-slate-500 text-base leading-relaxed">
          Toutes vos recharges et lectures de compteur sauvegardées localement sur cet appareil.
        </p>
      </div>

      {/* ── KPI cards ── */}
      {recharges.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="card bg-slate-50 border-slate-200 p-4">
            <p className="text-xs font-semibold text-blue-500 uppercase tracking-wide mb-1">Recharges</p>
            <p className="text-3xl font-bold font-display text-blue-900">{recharges.length}</p>
          </div>
          <div className="card bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200 p-4">
            <div className="flex items-center gap-1 mb-1">
              <Zap className="w-3.5 h-3.5 text-blue-500" />
              <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">kWh total</p>
            </div>
            <p className="text-3xl font-bold font-display text-emerald-900">{totalKwh.toFixed(1)}</p>
          </div>
          <div className="card bg-gradient-to-br from-violet-50 to-violet-100 border-violet-200 p-4">
            <div className="flex items-center gap-1 mb-1">
              <DollarSign className="w-3.5 h-3.5 text-violet-500" />
              <p className="text-xs font-semibold text-violet-600 uppercase tracking-wide">FCFA total</p>
            </div>
            <p className="text-3xl font-bold font-display text-violet-900">{totalFcfa.toLocaleString()}</p>
          </div>
          <div className="card bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200 p-4">
            <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-1">Prix moyen/kWh</p>
            <p className="text-3xl font-bold font-display text-amber-900">{prixMoyen.toFixed(1)}</p>
            <p className="text-xs text-amber-600">FCFA</p>
          </div>
        </div>
      )}

      {/* ── Alerte T1 ── */}
      {recharges.length >= 3 && (
        <div className={`rounded-2xl border px-5 py-4 mb-8 flex gap-3 items-start ${tauxT1 >= 80 ? 'bg-emerald-50 border-emerald-200' : tauxT1 >= 50 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'}`}>
          {tauxT1 >= 80
            ? <CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
            : <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
          }
          <div>
            <p className={`font-semibold text-sm ${tauxT1 >= 80 ? 'text-emerald-800' : tauxT1 >= 50 ? 'text-amber-800' : 'text-red-800'}`}>
              {tauxT1}% de vos recharges sont restées en Tranche 1 (tarif social)
            </p>
            <p className="text-xs mt-0.5 text-slate-600">
              {tauxT1 >= 80 ? 'Excellent ! Vous optimisez bien votre consommation.' :
               tauxT1 >= 50 ? 'Vous pouvez encore améliorer — réduisez les recharges qui dépassent 150 kWh/mois.' :
               'Attention : la majorité de vos recharges vous font dépasser le tarif social. Fractionnez vos recharges.'}
            </p>
          </div>
        </div>
      )}

      {/* ── Graphique mensuel ── */}
      {mensuel.length >= 2 && (
        <div className="card mb-8">
          <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Évolution mensuelle
          </h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={mensuel} margin={{ top: 0, right: 10, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
              <Tooltip content={<TooltipKwh />} />
              <Bar dataKey="kwh" name="kWh" fill="#0057ff" radius={[6, 6, 0, 0]}>
                {mensuel.map((m, i) => (
                  <Cell key={i} fill={i === mensuel.length - 1 ? '#0057ff' : '#93c5fd'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Onglets ── */}
      <div className="flex gap-1 bg-slate-100 rounded-2xl p-1 mb-6 w-fit">
        <button
          onClick={() => setOnglet('recharges')}
          className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition ${onglet === 'recharges' ? 'bg-white text-primary shadow-sm' : 'text-slate-600 hover:bg-slate-200'}`}
        >
          <Zap className="w-4 h-4" /> Recharges ({recharges.length})
        </button>
        <button
          onClick={() => setOnglet('lectures')}
          className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition ${onglet === 'lectures' ? 'bg-white text-primary shadow-sm' : 'text-slate-600 hover:bg-slate-200'}`}
        >
          <Cpu className="w-4 h-4" /> Lectures compteur ({lectures.length})
        </button>
      </div>

      {/* ══ ONGLET RECHARGES ══ */}
      {onglet === 'recharges' && (
        <>
          {recharges.length === 0 ? (
            <EmptyState
              icon={Zap}
              titre="Aucune recharge enregistrée"
              desc='Effectuez une simulation dans le Simulateur et cliquez sur "Sauvegarder" pour constituer votre historique.'
              lien="/simulateur"
              labelLien="Aller au simulateur"
            />
          ) : (
            <>
              <div className="flex justify-end mb-3">
                <button
                  onClick={() => viderHistorique(KEY_RECHARGES, setRecharges)}
                  className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Vider l'historique
                </button>
              </div>

              <div className="space-y-3">
                {recharges.map((r, i) => (
                  <div key={i} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-primary/8 flex items-center justify-center flex-shrink-0">
                          <Zap className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-900">{(r.montant_net || r.montant_brut || 0).toLocaleString()} FCFA</span>
                            <span className="text-slate-400">→</span>
                            <span className="font-bold text-emerald-700">{(r.kwh_obtenus || 0).toFixed(2)} kWh</span>
                            <BadgeTranche t={r.tranche_finale || r.tranche || '?'} />
                          </div>
                          <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                            <Calendar className="w-3 h-3" />
                            {new Date(r.date).toLocaleDateString('fr-FR', { dateStyle: 'medium' })}
                            {r.type_compteur && <span className="ml-2 bg-slate-100 px-1.5 py-0.5 rounded-md font-medium">{r.type_compteur}</span>}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => supprimerRecharge(i)}
                        className="p-2 text-slate-300 hover:text-red-500 transition rounded-lg hover:bg-red-50"
                        aria-label="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    {r.detail_tranches && Object.keys(r.detail_tranches).length > 0 && (
                      <div className="border-t border-slate-100 px-5 py-2 flex gap-4 flex-wrap">
                        {Object.entries(r.detail_tranches).map(([t, d]) => (
                          <span key={t} className="text-xs text-slate-500">
                            <span className="font-bold text-slate-700">{t}</span> : {d.kwh?.toFixed ? d.kwh.toFixed(2) : d.kwh} kWh @ {d.prix_unitaire} F
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* ══ ONGLET LECTURES ══ */}
      {onglet === 'lectures' && (
        <>
          {lectures.length === 0 ? (
            <EmptyState
              icon={Cpu}
              titre="Aucune lecture enregistrée"
              desc='Consultez les codes de votre compteur sur la page "Compteur", saisissez les valeurs et cliquez sur "Enregistrer la lecture".'
              lien="/compteur"
              labelLien="Aller à la lecture guidée"
            />
          ) : (
            <>
              <div className="flex justify-end mb-3">
                <button
                  onClick={() => viderHistorique(KEY_LECTURES, setLectures)}
                  className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Vider l'historique
                </button>
              </div>
              <div className="space-y-3">
                {lectures.map((l, i) => (
                  <div key={i} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition">
                    <div className="flex items-center justify-between px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center flex-shrink-0">
                          <Cpu className="w-4 h-4 text-violet-600" />
                        </div>
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(l.date).toLocaleDateString('fr-FR', { dateStyle: 'full' })}
                        </span>
                      </div>
                      <button
                        onClick={() => supprimerLecture(i)}
                        className="p-2 text-slate-300 hover:text-red-500 transition rounded-lg hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="border-t border-slate-100 px-5 py-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {Object.entries(l.valeurs || {}).filter(([, v]) => v !== '').map(([code, val]) => (
                        <div key={code} className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2">
                          <span className="font-mono text-xs font-bold text-slate-600 bg-white border border-slate-200 px-1.5 py-0.5 rounded-lg">{code}</span>
                          <span className="text-sm font-bold text-slate-900">{val}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}

/* --- Empty State --- */
function EmptyState({ icon: Icon, titre, desc, lien, labelLien }) {
  return (
    <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
      <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
        <Icon className="w-7 h-7 text-slate-400" />
      </div>
      <h3 className="font-bold text-slate-700 mb-2">{titre}</h3>
      <p className="text-sm text-slate-500 max-w-sm mx-auto mb-5">{desc}</p>
      <a
        href={lien}
        className="inline-flex items-center gap-2 btn-primary text-sm"
      >
        {labelLien}
      </a>
    </div>
  )
}
