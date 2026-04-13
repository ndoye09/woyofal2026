import React, { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  Calculator, BarChart3, TrendingUp, Zap, Shield,
  ArrowRight, Check, BookOpen, Lightbulb, Sparkles,
  ChevronDown, ChevronUp
} from 'lucide-react'

/* ─────────────────────────────
   Hook : compteur animé
───────────────────────────── */
function useCounter(target, duration = 1000) {
  const [count, setCount] = useState(0)
  const ref = useRef(false)
  useEffect(() => {
    if (ref.current) return
    ref.current = true
    const step = target / (duration / 16)
    let current = 0
    const timer = setInterval(() => {
      current += step
      if (current >= target) { setCount(target); clearInterval(timer) }
      else setCount(Math.floor(current))
    }, 16)
    return () => clearInterval(timer)
  }, [target, duration])
  return count
}

/* ═══════════════════════════════════════
   DESIGNER ÉNERGÉTIQUE - BASÉ SUR LOGO WOYOFAL
   Couleurs : Bleu (ampoule) + Rouge (texte)
═══════════════════════════════════════ */
export default function HomePageNew() {
  const [faqOpen, setFaqOpen] = useState(null)

  return (
    <div className="min-h-screen bg-white relative overflow-hidden">
      
      {/* ═══════════════════════════════════
          EFFETS DE LUMIÈRE - AMPOULE ILLUMINÉE
      ═══════════════════════════════════ */}
      {/* Lumière blanche (ampoule) */}
      <div className="absolute top-32 right-1/3 w-96 h-96 bg-white opacity-10 rounded-full blur-3xl animate-pulse"></div>
      {/* Lumière rouge (accent) */}
      <div className="absolute bottom-32 left-1/4 w-80 h-80 bg-red-500 opacity-10 rounded-full blur-3xl" style={{ animation: 'pulse 4s ease-in-out infinite', animationDelay: '1s' }}></div>
      {/* Grille subtile */}
      <div className="absolute inset-0 opacity-5 pointer-events-none" style={{
        backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.8) 1px, transparent 1px)',
        backgroundSize: '50px 50px'
      }}></div>

      {/* ═══════════════════════════════════
          HERO SECTION
      ═══════════════════════════════════ */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 py-24 lg:py-32">
        <div className="grid lg:grid-cols-2 gap-16 items-start mb-32">
          
          {/* COLONNE GAUCHE - TEXTE */}
          <div className="text-slate-900 pt-8">
            {/* Badge */}
            <div className="inline-flex items-center gap-3 bg-gradient-to-r from-red-50 to-orange-50 px-4 py-2.5 rounded-full border border-red-200 mb-8">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
              <span className="text-sm font-semibold text-red-700">Énergie Prépayée Intelligente</span>
            </div>

            {/* Titre principal */}
            <h1 className="text-6xl lg:text-7xl font-display font-extrabold leading-tight mb-8 text-slate-900">
              Maîtrisez votre
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 via-red-700 to-orange-600">consommation</span>
              <br />
              Woyofal
            </h1>

            {/* Sous-titre */}
            <p className="text-xl text-slate-600 leading-relaxed mb-10 max-w-lg">
              Calculez les kWh obtenus, suivez votre consommation en temps réel et optimisez vos recharges avec les tarifs Senelec 2026.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 mb-12">
              <Link to="/simulateur"
                className="group px-8 py-4 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl font-bold text-lg transition-all hover:shadow-[0_0_40px_rgba(220,38,38,0.5)] hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
              >
                <Zap className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                Simulateur
              </Link>
              <Link to="/tarifs"
                className="px-8 py-4 bg-slate-200 hover:bg-slate-300 border border-slate-300 text-slate-900 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2"
              >
                <BookOpen className="w-5 h-5" />
                Tarifs 2026
              </Link>
            </div>

            {/* Stats Rapides */}
            <div className="grid grid-cols-2 gap-6">
              <div className="group relative">
                <div className="absolute inset-0 bg-gradient-to-r from-red-600/20 to-red-600/0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity blur"></div>
                <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 group-hover:border-red-400/30 transition-all">
                  <div className="text-4xl font-bold text-red-500 mb-2">{useCounter(5000)}</div>
                  <div className="text-sm text-slate-400">Simulations/jour</div>
                </div>
              </div>
              <div className="group relative">
                <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-white/0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity blur"></div>
                <div className="relative bg-slate-100 backdrop-blur-xl border border-slate-300 rounded-xl p-6 group-hover:border-slate-400 transition-all">
                  <div className="text-4xl font-bold text-slate-900 mb-2">{useCounter(2026)}</div>
                  <div className="text-sm text-slate-600">Utilisateurs</div>
                </div>
              </div>
            </div>
          </div>

          {/* COLONNE DROITE - MINI CALC + AMPOULE */}
          <div className="relative flex items-center justify-center">
            {/* Ampoule SVG - Fond */}
            <svg className="absolute w-64 h-64 opacity-10 pointer-events-none" viewBox="0 0 100 120" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M50 10c15 0 25 10 25 25h-50c0-15 10-25 25-25z" fill="#ffffff" stroke="#ffffff" strokeWidth="2"/>
              <circle cx="50" cy="30" r="25" fill="none" stroke="#ffffff" strokeWidth="2"/>
              <path d="M35 55h30v8H35z" fill="#ffffff"/>
              <rect x="45" y="63" width="10" height="15" fill="#ffffff"/>
              <path d="M42 90 L42 110 L58 110 L58 90" stroke="#ffffff" strokeWidth="2" fill="none"/>
            </svg>

            {/* Mini Calculateur */}
            <div className="relative z-10 w-full max-w-sm">
              <MiniCalcNew />
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════
          SECTION FEATURES
      ═══════════════════════════════════ */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 py-20 mb-20">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-display font-bold text-slate-900 mb-4">Pourquoi nous choisir ?</h2>
          <p className="text-xl text-slate-600">Fonctionnalités exclusives</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: Zap,
              title: 'Calcul Temps Réel',
              desc: 'FCFA ↔ kWh instantanément avec tarifs 2026',
              gradient: 'from-red-600 to-orange-500',
              hoverGlow: 'hover:shadow-[0_0_40px_rgba(220,38,38,0.3)]'
            },
            {
              icon: TrendingUp,
              title: 'Suivi Intelligent',
              desc: 'Dashboard complet + historique détaillé',
              gradient: 'from-white to-slate-300',
              hoverGlow: 'hover:shadow-[0_0_40px_rgba(255,255,255,0.2)]'
            },
            {
              icon: Lightbulb,
              title: 'Prédictions ML',
              desc: 'Consommation future + conseils personnalisés',
              gradient: 'from-yellow-500 to-amber-500',
              hoverGlow: 'hover:shadow-[0_0_40px_rgba(234,179,8,0.3)]'
            },
          ].map((feature, i) => {
            const Icon = feature.icon
            return (
              <div key={i} className={`group relative bg-slate-50 backdrop-blur-xl border border-slate-200 rounded-2xl p-8 transition-all ${feature.hoverGlow} hover:border-slate-300 hover:bg-slate-100 cursor-pointer`}>
                {/* Glow effect */}
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-10 rounded-2xl transition-all blur-lg`}></div>
                
                <div className={`relative w-14 h-14 rounded-xl bg-gradient-to-br ${feature.gradient} p-3 mb-4 group-hover:scale-110 transition-transform`}>
                  <Icon className="w-full h-full text-white" />
                </div>
                
                <h3 className="text-xl font-bold text-slate-900 mb-3 relative">{feature.title}</h3>
                <p className="text-slate-600 relative">{feature.desc}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* ═══════════════════════════════════
          FAQ SECTION
      ═══════════════════════════════════ */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-display font-bold text-slate-900 mb-3">Questions Fréquentes</h2>
          <p className="text-slate-600">Tout ce que vous devez savoir</p>
        </div>

        <div className="space-y-4">
          {[
            {
              q: '💰 Combien de kWh pour 10 000 FCFA ?',
              a: 'Environ 91 kWh sans redevance. Notre simulateur calcule le montant exact selon votre cumul actuel du mois.'
            },
            {
              q: '📅 Différence DPP et PPP ?',
              a: 'DPP = Domestique (ménages). PPP = Professionnel (entreprises). Tarifs différents selon usage.'
            },
            {
              q: '⚡ Mode inverse (kWh → FCFA) ?',
              a: 'Oui ! Fonctionnalité exclusive : entrez les kWh souhaités et obtenez le montant à recharger.'
            },
            {
              q: '🔐 Vos données sont sécurisées ?',
              a: '100% sécurisé. Chiffrement SSL, authentification JWT, aucune donnée vendue.'
            },
          ].map((item, i) => (
            <button
              key={i}
              onClick={() => setFaqOpen(faqOpen === i ? null : i)}
              className="w-full text-left bg-slate-50 hover:bg-slate-100 backdrop-blur-xl border border-slate-200 hover:border-slate-300 rounded-xl p-6 transition-all group"
            >
              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold text-slate-900">{item.q}</span>
                <ChevronDown className={`w-5 h-5 text-slate-500 transition-transform ${faqOpen === i ? 'rotate-180' : ''}`} />
              </div>
              {faqOpen === i && (
                <p className="text-slate-700 mt-4 text-base leading-relaxed">{item.a}</p>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ═══════════════════════════════════
          CTA FOOTER
      ═══════════════════════════════════ */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 py-24">
        <div className="relative bg-gradient-to-r from-red-50 to-orange-50 backdrop-blur-xl border border-red-200 rounded-3xl overflow-hidden p-12 text-center">
          <div className="absolute inset-0 bg-gradient-to-r from-red-600/10 to-blue-600/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          
          <h2 className="text-4xl font-bold text-slate-900 mb-4 relative">Prêt à maîtriser ton consom' ?</h2>
          <p className="text-xl text-slate-700 mb-8 max-w-2xl mx-auto relative">
            Rejoins dès maintenant les milliers d'utilisateurs qui optimisent leur facture électrique
          </p>
          <Link to="/simulateur" className="inline-block px-10 py-4 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl font-bold text-lg hover:shadow-[0_0_40px_rgba(220,38,38,0.5)] hover:scale-105 transition-all relative">
            Commencer maintenant
          </Link>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────
   Mini Calculateur Énergétique
───────────────────────────── */
function MiniCalcNew() {
  const [montant, setMontant] = useState(5000)
  const [redevance, setRedevance] = useState(true)

  const taxe = Math.round(montant * 0.025)
  const red = redevance ? 429 : 0
  const net = montant - taxe - red
  const kwh_t1 = Math.min(150, Math.max(0, net / 82))
  const reste = Math.max(0, net - 150 * 82)
  const kwh_t2 = reste > 0 ? Math.min(reste / 136.49, 100) : 0
  const total = kwh_t1 + kwh_t2
  const pct = Math.min(100, (total / 150) * 100)

  return (
    <div className="group relative bg-gradient-to-br from-slate-50 to-white backdrop-blur-2xl border border-slate-200 rounded-3xl p-8 shadow-lg hover:shadow-[0_0_60px_rgba(220,38,38,0.15)] transition-all">
      {/* Glow dynamique */}
      <div className="absolute -inset-0.5 bg-gradient-to-r from-red-600 to-white rounded-3xl opacity-0 group-hover:opacity-20 blur transition-opacity -z-10"></div>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-orange-500 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-slate-900 text-lg">Calcul Rapide</span>
        </div>
        <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full">LIVE</span>
      </div>

      {/* Slider Montant */}
      <div className="mb-6">
        <div className="flex justify-between mb-2">
          <span className="text-sm text-slate-700 font-semibold">Montant (FCFA)</span>
          <span className="text-lg font-bold text-red-600">{montant.toLocaleString()} F</span>
        </div>
        <input
          type="range" min="500" max="50000" step="500"
          value={montant} onChange={e => setMontant(+e.target.value)}
          className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer accent-red-600"
        />
      </div>

      {/* Toggle Redevance */}
      <label className="flex items-center gap-3 mb-8 cursor-pointer group/toggle">
        <div
          onClick={() => setRedevance(!redevance)}
          className={`relative w-12 h-6 rounded-full transition-all ${redevance ? 'bg-gradient-to-r from-red-600 to-red-700' : 'bg-white/10'}`}
        >
          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-lg transition-all ${redevance ? 'right-1' : 'left-1'}`} />
        </div>
        <span className="text-sm text-slate-700 font-semibold">Première recharge</span>
      </label>

      {/* Résultat Principal */}
      <div className="bg-gradient-to-br from-red-100 to-orange-50 border border-red-300 rounded-2xl p-6 mb-6 text-center">
        <div className="text-sm text-slate-700 font-semibold mb-2">Vous obtiendrez</div>
        <div className="text-5xl font-bold text-red-600 mb-1">
          {total.toFixed(1)}
          <span className="text-2xl text-slate-600 font-normal ml-2">kWh</span>
        </div>
        <div className="text-sm text-slate-600">{(montant / Math.max(1, total)).toFixed(1)} FCFA/kWh</div>
      </div>

      {/* Barre Tranche */}
      <div className="mb-8">
        <div className="flex justify-between text-xs text-slate-600 font-semibold mb-2">
          <span>Tranche {total <= 150 ? '1' : '2'}</span>
          <span>{pct.toFixed(0)}% / T1 (150 kWh)</span>
        </div>
        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${pct >= 100 ? 'bg-gradient-to-r from-orange-500 to-red-600' : 'bg-gradient-to-r from-blue-500 to-cyan-400'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Détail */}
      <div className="grid grid-cols-2 gap-3 mb-8 text-xs">
        <div className="bg-slate-100 rounded-lg p-3 text-center">
          <div className="text-red-600 font-bold">{kwh_t1.toFixed(1)}</div>
          <div className="text-slate-600">kWh T1</div>
        </div>
        <div className="bg-slate-100 rounded-lg p-3 text-center">
          <div className="text-slate-700 font-bold">{kwh_t2.toFixed(1)}</div>
          <div className="text-slate-600">kWh T2</div>
        </div>
      </div>

      {/* CTA */}
      <Link
        to="/simulateur"
        className="block w-full text-center py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl font-bold hover:shadow-[0_0_30px_rgba(220,38,38,0.4)] hover:scale-105 transition-all active:scale-95"
      >
        Simulateur complet →
      </Link>
    </div>
  )
}
