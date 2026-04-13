import React, { useState } from 'react'
import { Info, TrendingUp, TrendingDown, Zap } from 'lucide-react'

const TARIFS = {
  DPP: {
    label: 'DPP — Domestique Prépayé',
    subtitle: 'Pour les ménages, appartements et villas',
    redevance: 429,
    tranches: [
      { num: 1, min: 0, max: 150, prix: 82.00, color: 'green', badge: 'Tarif social', conseil: 'Objectif à atteindre chaque mois' },
      { num: 2, min: 151, max: 250, prix: 136.49, color: 'yellow', badge: 'Intermédiaire', conseil: '+66% vs T1. Cherchez à revenir en T1' },
      { num: 3, min: 251, max: null, prix: 136.49, color: 'red', badge: 'Gros consommateur', conseil: 'Réduisez impérativement votre conso' }
    ]
  },
  PPP: {
    label: 'PPP — Professionnel Prépayé',
    subtitle: 'Pour les entreprises, commerces et bureaux',
    redevance: 429,
    tranches: [
      { num: 1, min: 0, max: 50, prix: 147.43, color: 'green', badge: 'Tarif de base', conseil: 'Plage tarifaire limitée pour le PPP' },
      { num: 2, min: 51, max: 500, prix: 189.84, color: 'yellow', badge: 'Standard', conseil: 'Tarif principal pour la plupart des pros' },
      { num: 3, min: 501, max: null, prix: 189.84, color: 'red', badge: 'Fort consommateur', conseil: 'Envisagez du matériel économe en énergie' }
    ]
  }
}

const colorMap = {
  green: { bg: 'bg-gray-600', light: 'bg-gray-50', border: 'border-gray-300', text: 'text-gray-700' },
  yellow: { bg: 'bg-gray-600', light: 'bg-gray-50', border: 'border-gray-300', text: 'text-gray-700' },
  red: { bg: 'bg-red-600', light: 'bg-red-50', border: 'border-red-300', text: 'text-red-700' }
}

/* Simulateur exemple */
const ExempleCalc = ({ type }) => {
  const [montant, setMontant] = useState(10000)
  const tarif = TARIFS[type]

  const taxe = montant * 0.025
  const net = montant - tarif.redevance - taxe
  const t = tarif.tranches

  let reste = Math.max(0, net)
  let details = []

  for (const tr of t) {
    if (reste <= 0) break
    const max_kwh = tr.max ? tr.max - (details.reduce((s, d) => s + d.kwh, 0)) : Infinity
    const max_montant = max_kwh * tr.prix
    if (reste <= max_montant) {
      const kwh = reste / tr.prix
      details.push({ tranche: tr.num, kwh: kwh.toFixed(2), montant: reste.toFixed(0), prix: tr.prix })
      reste = 0
    } else {
      const kwh = max_kwh
      details.push({ tranche: tr.num, kwh: kwh.toFixed(2), montant: max_montant.toFixed(0), prix: tr.prix })
      reste -= max_montant
    }
  }

  const totalKwh = details.reduce((s, d) => s + parseFloat(d.kwh), 0)

  return (
    <div className="bg-slate-50 rounded-2xl p-5 mt-4 border border-gray-100">
      <div className="flex items-center gap-2 mb-3">
        <Zap className="w-4 h-4 text-black" />
        <span className="text-sm font-semibold text-gray-700">Exemple de calcul (avec redevance)</span>
      </div>
      <div className="flex items-center gap-3 mb-3">
        <label className="text-xs text-gray-500">Montant :</label>
        <input
          type="range" min="1000" max="50000" step="500"
          value={montant} onChange={e => setMontant(+e.target.value)}
          className="flex-1 accent-red-600"
        />
        <span className="text-sm font-bold text-red-600 w-24 text-right">{montant.toLocaleString()} F</span>
      </div>
      <div className="text-xs text-gray-500 mb-3">
        Redevance : -{tarif.redevance} F | Taxe : -{taxe.toFixed(0)} F | Net : {Math.max(0, net).toFixed(0)} F
      </div>
      {details.map(d => (
        <div key={d.tranche} className="flex justify-between text-xs bg-white p-2.5 rounded-xl mb-1 border border-gray-100">
          <span className="font-semibold">T{d.tranche} ({d.prix} F/kWh)</span>
          <span className="text-red-600 font-bold">{d.kwh} kWh</span>
          <span className="text-gray-500">{parseFloat(d.montant).toLocaleString()} F</span>
        </div>
      ))}
      <div className="bg-red-50 rounded-2xl p-4 text-center mt-3 border border-red-200">
        <span className="text-2xl font-bold font-display text-red-600">{totalKwh.toFixed(1)} kWh</span>
        <span className="text-xs text-red-600 block mt-0.5">pour {montant.toLocaleString()} FCFA</span>
      </div>
    </div>
  )
}

const GuideTarifs = () => {
  const [activeType, setActiveType] = useState('DPP')

  return (
    <div className="max-w-5xl mx-auto px-4 py-14 bg-white min-h-screen">
      {/* Header */}
      <div className="text-center mb-12">
        <span className="section-tag">Tarification</span>
        <h1 className="section-title">Guide des Tarifs Senelec 2026</h1>
        <p className="section-subtitle">Grille tarifaire officielle Woyofal — Décret CRSE 2026</p>
        <div className="inline-flex items-center gap-2 bg-red-50 border border-red-300 text-red-600 text-sm px-4 py-2 rounded-full mt-4">
          <span className="w-2 h-2 bg-red-600 rounded-full"></span>
          Tarifs 2026 — Plus à jour que les autres calculateurs (2025)
        </div>
      </div>

      {/* Sélecteur Type */}
      <div className="flex gap-3 justify-center mb-8">
        {['DPP', 'PPP'].map(type => (
          <button
            key={type}
            onClick={() => setActiveType(type)}
            className={`px-8 py-3 rounded-xl font-semibold transition ${
              activeType === type
                ? 'bg-black text-white shadow-md'
                : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-black/30'
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Info type */}
      <div className="card mb-8 border-l-4 border-black bg-gray-50">
        <div className="font-bold text-xl mb-1">{TARIFS[activeType].label}</div>
        <div className="text-gray-600">{TARIFS[activeType].subtitle}</div>
        <div className="mt-3 text-sm text-gray-500">
          Redevance mensuelle (1ère recharge) : <strong>{TARIFS[activeType].redevance} FCFA</strong> | 
          Taxe communale : <strong>2,5%</strong> sur chaque recharge
        </div>
      </div>

      {/* Tranches */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        {TARIFS[activeType].tranches.map(t => {
          const c = colorMap[t.color]
          return (
            <div key={t.num} className={`rounded-2xl overflow-hidden border-2 ${c.border} shadow-md`}>
              <div className={`${c.bg} text-white p-6 text-center`}>
                <div className="text-xs font-semibold bg-white/20 rounded-full px-3 py-1 inline-block mb-3">
                  {t.badge}
                </div>
                <div className="text-xs mb-1 opacity-80">Tranche {t.num}</div>
                <div className="text-5xl font-bold mb-1">{t.prix.toFixed(2)}</div>
                <div className="text-sm opacity-90">FCFA / kWh</div>
              </div>
              <div className={`p-4 ${c.light}`}>
                <div className="font-semibold text-gray-800 mb-2">
                  {t.min} — {t.max ? `${t.max} kWh` : '∞ kWh'}
                </div>
                <div className={`text-sm ${c.text} flex items-start gap-1`}>
                  <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  {t.conseil}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Comparatif DPP vs PPP */}
      <div className="card mb-8">
        <h2 className="text-xl font-bold mb-4">Comparatif DPP vs PPP</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-3 text-left">Critère</th>
                <th className="p-3 text-center text-black">DPP</th>
                <th className="p-3 text-center text-gray-700">PPP</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t"><td className="p-3 text-gray-700">Usage</td><td className="p-3 text-center">Ménages</td><td className="p-3 text-center">Entreprises</td></tr>
              <tr className="border-t bg-gray-50"><td className="p-3 text-gray-700">T1 (tarif min)</td><td className="p-3 text-center font-bold text-black">82,00 F/kWh</td><td className="p-3 text-center font-bold text-gray-700">147,43 F/kWh</td></tr>
              <tr className="border-t"><td className="p-3 text-gray-700">Seuil T1</td><td className="p-3 text-center">0-150 kWh</td><td className="p-3 text-center">0-50 kWh</td></tr>
              <tr className="border-t bg-gray-50"><td className="p-3 text-gray-700">T2</td><td className="p-3 text-center">136,49 F/kWh</td><td className="p-3 text-center">189,84 F/kWh</td></tr>
              <tr className="border-t"><td className="p-3 text-gray-700">Seuil T2</td><td className="p-3 text-center">151-250 kWh</td><td className="p-3 text-center">51-500 kWh</td></tr>
              <tr className="border-t bg-gray-50"><td className="p-3 text-gray-700">Redevance mensuelle</td><td className="p-3 text-center">429 FCFA</td><td className="p-3 text-center">429 FCFA</td></tr>
              <tr className="border-t"><td className="p-3 text-gray-700">Taxe communale</td><td className="p-3 text-center">2,5%</td><td className="p-3 text-center">2,5%</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Simulateur intégré */}
      <div className="card mb-8">
        <h2 className="text-xl font-bold mb-2">Calculateur rapide — {activeType}</h2>
        <p className="text-sm text-gray-500 mb-2">Ajustez le montant pour voir l'impact sur les kWh</p>
        <ExempleCalc type={activeType} />
      </div>

      {/* Explication calcul */}
      <div className="card mb-8 bg-gray-50 border border-gray-200">
        <h2 className="text-lg font-bold text-black mb-3">Comment ça marche</h2>
        <p className="text-sm text-gray-600">Montant brut − Redevance − Taxe (2.5%) = Montant net, alors redistribué par tranche. Ex: 10 000 F = ~114 kWh en T1.</p>
      </div>


    </div>
  )
}

export default GuideTarifs
