import React, { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Zap, ArrowRight, ChevronDown, ChevronUp, Calculator } from 'lucide-react'

/* ── Mini calculateur ── */
const MiniCalc = () => {
  const [montant, setMontant] = useState(5000)
  const [redevance, setRedevance] = useState(true)

  const taxe = Math.round(montant * 0.025)
  const rev = redevance ? 429 : 0
  const net = Math.max(0, montant - taxe - rev)

  // Tranche 1 : 0–150 kWh @ 82 FCFA
  const kwh_t1 = Math.min(150, net / 82)
  const reste1 = Math.max(0, net - 150 * 82)
  // Tranche 2 : 151–250 kWh @ 108 FCFA
  const kwh_t2 = Math.min(100, reste1 / 108)
  const reste2 = Math.max(0, reste1 - 100 * 108)
  // Tranche 3 : 251–400 kWh @ 136.49 FCFA
  const kwh_t3 = Math.min(150, reste2 / 136.49)
  const reste3 = Math.max(0, reste2 - 150 * 136.49)
  // Tranche 4 : >400 kWh @ 162 FCFA
  const kwh_t4 = reste3 > 0 ? reste3 / 162 : 0
  const total = kwh_t1 + kwh_t2 + kwh_t3 + kwh_t4

  // Tranche finale atteinte
  const tranche = kwh_t4 > 0 ? 4 : kwh_t3 > 0 ? 3 : kwh_t2 > 0 ? 2 : 1
  const trancheColors = { 1: 'bg-green-500', 2: 'bg-amber-400', 3: 'bg-orange-500', 4: 'bg-primary' }
  const trancheLabels = { 1: 'T1 — 82 FCFA/kWh', 2: 'T2 — 108 FCFA/kWh', 3: 'T3 — 136 FCFA/kWh', 4: 'T4 — 162 FCFA/kWh' }
  const pct = Math.min(100, (total / 150) * 100)

  return (
    <div className="bg-white/10 backdrop-blur rounded-2xl p-6 w-full max-w-xs border border-white/15">
      <p className="text-white/60 text-xs uppercase tracking-widest mb-4 font-medium">Calcul rapide</p>

      <div className="mb-5">
        <div className="flex justify-between text-xs text-white/50 mb-2">
          <span>Montant</span>
          <span className="text-white font-semibold">{montant.toLocaleString()} FCFA</span>
        </div>
        <input
          type="range" min="500" max="50000" step="500"
          value={montant} onChange={e => setMontant(+e.target.value)}
          className="w-full h-1 rounded-full accent-red-500"
        />
      </div>

      <label className="flex items-center gap-2 cursor-pointer mb-5">
        <button
          onClick={() => setRedevance(!redevance)}
          className={`w-8 h-4 rounded-full relative transition-colors ${redevance ? 'bg-primary' : 'bg-white/20'}`}
        >
          <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-all ${redevance ? 'left-4' : 'left-0.5'}`} />
        </button>
        <span className="text-white/50 text-xs">Première recharge du mois</span>
      </label>

      <div className="text-center mb-3">
        <p className="text-5xl font-bold font-display text-white">{total.toFixed(1)}</p>
        <p className="text-white/40 text-xs mt-1">kWh obtenus</p>
      </div>

      {/* Tranche atteinte */}
      <div className={`flex items-center gap-2 justify-center mb-4 px-3 py-1.5 rounded-lg bg-white/5`}>
        <span className={`w-2 h-2 rounded-full shrink-0 ${trancheColors[tranche]}`} />
        <span className="text-white/70 text-xs font-medium">Tranche {tranche} — {trancheLabels[tranche].split('—')[1].trim()}</span>
      </div>

      <div className="h-1 bg-white/10 rounded-full overflow-hidden mb-5">
        <div
          className="h-full bg-primary rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      <Link
        to="/simulateur"
        className="flex items-center justify-center gap-2 w-full bg-primary text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-red-700 transition"
      >
        Simulateur complet <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  )
}

/* ═══════════ PAGE D'ACCUEIL ═══════════ */
export default function HomePage() {
  const [faqOpen, setFaqOpen] = useState(null)

  const faqs = [
    {
      q: 'Combien de kWh pour 10 000 FCFA ?',
      a: 'Sans redevance, cumul a 0 : environ 119 kWh en Tranche 1 (82 FCFA/kWh). Notre simulateur donne le detail exact selon votre cumul mensuel.'
    },
    {
      q: "C'est quoi la redevance mensuelle ?",
      a: "429 FCFA preleves sur la premiere recharge du mois. Elle couvre la location du compteur. A partir de la 2e recharge du mois, elle ne s'applique plus."
    },
    {
      q: 'Difference DPP et PPP ?',
      a: 'DPP (Domestique) : menages, T1 a 82 FCFA/kWh. PPP (Professionnel) : entreprises, tarifs differents. Le simulateur gere les deux types.'
    },
    {
      q: 'Comment rester en Tranche 1 ?',
      a: 'Consommez moins de 150 kWh/mois. LED, debrancher les veilles, clim en mode eco. Consultez notre page Conseils pour des astuces detaillees.'
    },
    {
      q: 'Peut-on calculer kWh vers FCFA ?',
      a: "Oui, c'est notre mode Calcul inverse : entrez les kWh souhaites et obtenez le montant exact a recharger. Fonctionnalite exclusive."
    },
  ]

  return (
    <div className="min-h-screen bg-white">

      {/* HERO */}
      <section className="bg-navy text-white">
        <div className="max-w-6xl mx-auto px-6 py-20 lg:py-28 grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 text-xs text-white/50 uppercase tracking-widest mb-8 border border-white/10 rounded-full px-4 py-2">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
              Tarifs Senelec 2026 officiels
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold font-display leading-tight mb-6">
              Simulez votre recharge<br />
              <span className="text-primary">Woyofal</span> en 2 secondes
            </h1>
            <p className="text-white/50 text-base leading-relaxed mb-10 max-w-md">
              Calculez les kWh obtenus, comprenez vos tranches et optimisez vos depenses electriques avec les tarifs Senelec 2026.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/simulateur" className="inline-flex items-center gap-2 bg-primary text-white font-semibold px-6 py-3 rounded-xl hover:bg-red-700 transition">
                <Zap className="w-4 h-4" /> Simuler maintenant
              </Link>
              <Link to="/faq" className="inline-flex items-center gap-2 text-white/60 border border-white/15 font-medium px-6 py-3 rounded-xl hover:border-white/30 hover:text-white transition text-sm">
                En savoir plus
              </Link>
            </div>
          </div>
          <div className="flex justify-center lg:justify-end">
            <MiniCalc />
          </div>
        </div>
      </section>

      {/* A PROPOS */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-xs uppercase tracking-widest text-primary font-semibold mb-4">Woyofal</p>
          <h2 className="text-3xl font-bold font-display text-navy mb-5">
            Maitrisez votre electricite prepayee
          </h2>
          <p className="text-gray-500 leading-relaxed text-base">
            Woyofal est la plateforme de reference pour simuler, comprendre et optimiser vos recharges electriques au Senegal.
            Basee sur la grille tarifaire officielle Senelec 2026, elle integre un simulateur bidirectionnel, un calcul inverse exclusif et un dashboard analytique.
          </p>
        </div>
      </section>

      {/* TARIFS */}
      <section className="py-16 px-6 bg-gray-50">
        <div className="max-w-xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-xs uppercase tracking-widest text-primary font-semibold mb-3">Tarification</p>
            <h2 className="text-2xl font-bold font-display text-navy">Tarifs DPP 2026</h2>
          </div>
          <div className="space-y-2">
            {[
              { t: 'Tranche 1', range: '0 - 150 kWh / mois', prix: '82', dot: 'bg-green-500' },
              { t: 'Tranche 2', range: '151 - 250 kWh / mois', prix: '136,49', dot: 'bg-amber-400' },
              { t: 'Tranche 3', range: '> 250 kWh / mois',    prix: '136,49', dot: 'bg-primary' },
            ].map(({ t, range, prix, dot }) => (
              <div key={t} className="flex items-center justify-between bg-white rounded-xl px-5 py-4 border border-gray-100">
                <div className="flex items-center gap-3">
                  <span className={`w-2 h-2 rounded-full ${dot} shrink-0`} />
                  <div>
                    <p className="text-sm font-semibold text-navy">{t}</p>
                    <p className="text-xs text-gray-400">{range}</p>
                  </div>
                </div>
                <p className="font-bold text-navy text-lg">{prix} <span className="text-xs font-normal text-gray-400">FCFA/kWh</span></p>
              </div>
            ))}
            <div className="flex items-center justify-between bg-white rounded-xl px-5 py-3 border border-gray-100">
              <p className="text-xs text-gray-400">Redevance <span className="text-gray-300">(1ere recharge du mois)</span></p>
              <p className="text-sm font-semibold text-navy">429 FCFA</p>
            </div>
          </div>
          <div className="text-center mt-6">
            <Link to="/tarifs" className="inline-flex items-center gap-1.5 text-primary text-sm font-semibold hover:underline">
              Voir DPP + PPP <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* COMMENT CA MARCHE */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs uppercase tracking-widest text-primary font-semibold mb-3">Guide</p>
            <h2 className="text-2xl font-bold font-display text-navy">Comment ca marche ?</h2>
          </div>
          <div className="space-y-6">
            {[
              { n: '01', title: 'Entrez votre montant', desc: 'Saisissez le montant FCFA a recharger ou les kWh souhaites. Selectionnez DPP ou PPP.' },
              { n: '02', title: 'Obtenez le resultat', desc: 'Detail par tranche, deductions (redevance + taxe), kWh obtenus et tranche finale.' },
              { n: '03', title: 'Optimisez', desc: 'Utilisez nos conseils pour rester en Tranche 1 et reduire vos depenses electriques.' },
            ].map(({ n, title, desc }) => (
              <div key={n} className="flex gap-6 items-start">
                <span className="text-3xl font-bold font-display text-gray-100 shrink-0 w-10 text-right leading-tight">{n}</span>
                <div className="border-l border-gray-100 pl-6">
                  <p className="font-semibold text-navy mb-1">{title}</p>
                  <p className="text-gray-400 text-sm leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 px-6 bg-gray-50">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-xs uppercase tracking-widest text-primary font-semibold mb-3">FAQ</p>
            <h2 className="text-2xl font-bold font-display text-navy">Questions frequentes</h2>
          </div>
          <div className="space-y-2">
            {faqs.map((f, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <button
                  className="w-full flex items-center justify-between px-5 py-4 text-left"
                  onClick={() => setFaqOpen(faqOpen === i ? null : i)}
                >
                  <span className="font-medium text-navy text-sm pr-4">{f.q}</span>
                  {faqOpen === i
                    ? <ChevronUp className="w-4 h-4 text-primary shrink-0" />
                    : <ChevronDown className="w-4 h-4 text-gray-300 shrink-0" />}
                </button>
                {faqOpen === i && (
                  <div className="px-5 pb-4 text-gray-500 text-sm leading-relaxed border-t border-gray-50 pt-3">
                    {f.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="bg-navy py-20 px-6 text-center text-white">
        <div className="max-w-lg mx-auto">
          <h2 className="text-3xl font-bold font-display mb-4">Pret a simuler ?</h2>
          <p className="text-white/40 mb-8 text-sm">100% gratuit · Sans inscription · Resultat instantane</p>
          <Link
            to="/simulateur"
            className="inline-flex items-center gap-2 bg-primary text-white font-semibold px-8 py-3.5 rounded-xl hover:bg-red-700 transition"
          >
            <Calculator className="w-4 h-4" /> Lancer le simulateur
          </Link>
        </div>
      </section>

    </div>
  )
}
