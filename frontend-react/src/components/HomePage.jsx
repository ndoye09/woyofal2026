import React, { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  Calculator, BarChart3, TrendingUp, Zap, Shield,
  ArrowRight, Check, ChevronDown, ChevronUp, BookOpen,
  Lightbulb, MapPin, RefreshCw, Database, Sparkles,
  ArrowUpRight, Star, CheckCircle
} from 'lucide-react'

/* ─────────────────────────────
   Hook : compteur animé
───────────────────────────── */
function useCounter(target, duration = 1400) {
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

/* ─────────────────────────────
   Mini calculateur (hero)
───────────────────────────── */
const MiniCalc = () => {
  const [montant, setMontant] = useState(5000)
  const [redevance, setRedevance] = useState(true)

  const taxe = Math.round(montant * 0.04)
  const rev = redevance ? 429 : 0
  const net = montant - taxe - rev
  const kwh_t1 = Math.min(150, Math.max(0, net / 82))
  const reste = Math.max(0, net - 150 * 82)
  const kwh_t2 = reste > 0 ? Math.min(reste / 136.49, 100) : 0
  const total = kwh_t1 + kwh_t2
  const tranche = kwh_t1 + kwh_t2 <= 150 ? 1 : 2
  const pct = Math.min(100, ((kwh_t1 + kwh_t2) / 150) * 100)

  return (
    <div className="card-glass rounded-3xl p-6 w-full max-w-sm mx-auto">
      {/* header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <Zap className="w-4 h-4 text-accent" />
          </div>
          <span className="text-white font-semibold font-display text-sm">Calcul rapide</span>
        </div>
        <span className="badge-live text-xs px-2 py-1">LIVE</span>
      </div>

      {/* slider */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-white/60 mb-1">
          <span>Montant (FCFA)</span>
          <span className="text-white font-bold">{montant.toLocaleString()} F</span>
        </div>
        <input
          type="range" min="500" max="50000" step="500"
          value={montant} onChange={e => setMontant(+e.target.value)}
          className="w-full accent-primary h-1.5 rounded-full"
        />
      </div>

      {/* toggle redevance */}
      <label className="flex items-center gap-2 mb-5 cursor-pointer">
        <div
          onClick={() => setRedevance(!redevance)}
          className={`relative w-9 h-5 rounded-full transition-colors ${redevance ? 'bg-primary' : 'bg-white/20'}`}
        >
          <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${redevance ? 'left-4' : 'left-0.5'}`} />
        </div>
        <span className="text-white/70 text-xs">Première recharge du mois</span>
      </label>

      {/* résultat */}
      <div className="bg-white/10 rounded-2xl p-4 text-center mb-4">
        <div className="text-white/60 text-xs mb-1">Vous obtiendrez</div>
        <div className="text-4xl font-bold font-display text-white">{total.toFixed(1)}<span className="text-xl font-normal text-white/70 ml-1">kWh</span></div>
        <div className="text-white/50 text-xs mt-1">{(montant / Math.max(1, total)).toFixed(1)} FCFA / kWh</div>
      </div>

      {/* barre tranche */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-white/50 mb-1">
          <span>Tranche {tranche}</span>
          <span>{pct.toFixed(0)}% de T1 (150 kWh)</span>
        </div>
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${pct >= 100 ? 'bg-danger' : 'bg-success'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <Link
        to="/simulateur"
        className="block text-center bg-primary text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 transition"
      >
        Simulateur complet <ArrowRight className="inline w-4 h-4 ml-1" />
      </Link>
    </div>
  )
}

/* ─────────────────────────────
   Feature card
───────────────────────────── */
const FeatureCard = ({ icon: Icon, title, desc, gradient, tag }) => (
  <div className="card group hover:shadow-card-hover hover:-translate-y-1 transition-all duration-300 relative overflow-hidden">
    {tag && (
      <span className="absolute top-4 right-4 text-[10px] font-bold bg-accent/15 text-accent px-2 py-0.5 rounded-full uppercase tracking-wider">
        {tag}
      </span>
    )}
    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 bg-gradient-to-br ${gradient}`}>
      <Icon className="w-6 h-6 text-white" />
    </div>
    <h3 className="text-base font-semibold font-display mb-2 text-slate-800">{title}</h3>
    <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary/0 via-primary/40 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity" />
  </div>
)

/* ─────────────────────────────
   Comparatif row
───────────────────────────── */
const CompareRow = ({ feature, nous, eux }) => (
  <tr className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
    <td className="py-3 px-5 text-slate-700 text-sm">{feature}</td>
    <td className="py-3 px-5 text-center">
      {nous === true
        ? <CheckCircle className="w-5 h-5 text-success mx-auto" />
        : nous === false
        ? <span className="text-slate-300 text-lg">—</span>
        : <span className="inline-block bg-primary/10 text-primary text-xs font-semibold px-2.5 py-1 rounded-full">{nous}</span>
      }
    </td>
    <td className="py-3 px-5 text-center">
      {eux === true
        ? <CheckCircle className="w-4 h-4 text-slate-400 mx-auto" />
        : eux === false
        ? <span className="text-slate-300 text-lg">—</span>
        : <span className="text-slate-400 text-xs">{eux}</span>
      }
    </td>
  </tr>
)

/* ─────────────────────────────
   Stat item
───────────────────────────── */
const StatItem = ({ value, label }) => (
  <div className="text-center px-6 py-2">
    <div className="text-2xl font-bold font-display gradient-text">{value}</div>
    <div className="text-slate-500 text-xs mt-0.5">{label}</div>
  </div>
)

/* ═══════════════════════════════════════
   PAGE PRINCIPALE
═══════════════════════════════════════ */
export default function HomePage() {
  const [faqOpen, setFaqOpen] = useState(null)

  const faqs = [
    {
      q: 'Combien de kWh pour 10 000 FCFA ?',
      a: 'Avec 10 000 FCFA sans redevance : environ 91 kWh (30 kWh en T1 à 82 F/kWh + 61 kWh en T2 à 136.49 F/kWh). Notre simulateur donne le détail exact selon votre cumul mensuel actuel.'
    },
    {
      q: "C'est quoi la redevance mensuelle ?",
      a: "La redevance (429 FCFA pour DPP) est prélevée sur la première recharge du mois. Elle couvre les frais de location du compteur et d'entretien du réseau. À partir du 2ème recharge, elle ne s'applique plus."
    },
    {
      q: 'Quelle différence entre DPP et PPP ?',
      a: 'DPP (Domestique Prépayé) : pour les ménages. T1 (0-150 kWh) à 82 FCFA/kWh, T2 (151-250 kWh) à 136.49 FCFA/kWh. PPP (Professionnel Prépayé) : pour les entreprises, tarifs différents. Notre simulateur gère les deux !'
    },
    {
      q: 'Comment rester en Tranche 1 ?',
      a: 'Restez sous 150 kWh/mois. Astuces : ampoules LED (5W vs 60W), débranchez les veilles, climatiseur en mode éco. Notre page Conseils vous guide en détail.'
    },
    {
      q: 'Gli tarifs 2026 sont différents de 2025 ?',
      a: 'Oui ! Notre plateforme utilise les tarifs officiels Senelec 2026 (décret CRSE). Les autres calculateurs utilisent encore les tarifs 2025. Fiez-vous à notre grille tarifaire.'
    },
    {
      q: 'Peut-on calculer en sens inverse (kWh → FCFA) ?',
      a: 'Oui ! Mode exclusif : entrez les kWh souhaités et obtenez le montant exact à recharger. Aucun autre calculateur Woyofal ne propose cette fonctionnalité.'
    },
  ]

  return (
    <div className="min-h-screen">

      {/* ══════════════════════════════════
          HERO — dark navy + glassmorphisme
      ══════════════════════════════════ */}
      <section className="relative overflow-hidden text-white" style={{ background: 'radial-gradient(ellipse 80% 60% at 50% -10%, #1a3bff22, transparent), #020C1B' }}>
        {/* blobs décoratifs */}
        <div className="absolute top-20 -left-32 w-96 h-96 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-accent/10 rounded-full blur-3xl pointer-events-none" />
        {/* grille */}
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.3) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.3) 1px,transparent 1px)', backgroundSize: '40px 40px' }}
        />

        <div className="relative max-w-7xl mx-auto px-4 py-24 lg:py-32 grid lg:grid-cols-2 gap-14 items-center">
          {/* texte */}
          <div className="animate-fade-in">
            {/* badge */}
            <div className="inline-flex items-center gap-2 bg-white/8 border border-white/12 rounded-full px-4 py-1.5 text-sm text-white/80 mb-8">
              <span className="w-2 h-2 rounded-full bg-success animate-ping-slow" />
              <Sparkles className="w-3.5 h-3.5 text-accent" />
              Tarifs Senelec 2026 — mis à jour
            </div>

            <h1 className="text-5xl lg:text-6xl font-bold font-display leading-tight mb-6">
              Le calculateur
              <span className="block gradient-text-accent">Woyofal le plus</span>
              <span className="block">complet du Sénégal</span>
            </h1>

            <p className="text-white/60 text-lg leading-relaxed mb-10 max-w-lg">
              Simulateur FCFA&harr;kWh, calcul inverse exclusif, dashboard analytique,
              prédictions ML et tarifs 2026 officiels. Bien plus qu'un simple calculateur.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap gap-3 mb-10">
              <Link to="/simulateur" className="btn-accent flex items-center gap-2">
                <Calculator className="w-5 h-5" />
                Simuler maintenant
              </Link>
              <Link to="/dashboard" className="btn-ghost-dark flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Voir le Dashboard
              </Link>
            </div>

            {/* checklist */}
            <div className="flex flex-wrap gap-5 text-sm text-white/55">
              {['100% Gratuit', 'DPP & PPP', 'Tarifs 2026', 'Calcul inverse'].map(item => (
                <span key={item} className="flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-success/80" />
                  {item}
                </span>
              ))}
            </div>
          </div>

          {/* mini calc desktop */}
          <div className="hidden lg:flex justify-center">
            <MiniCalc />
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════
          STATS BAR
      ══════════════════════════════════ */}
      <section className="bg-white border-b border-slate-100">
        <div className="max-w-5xl mx-auto px-4 py-8 grid grid-cols-2 md:grid-cols-4 divide-x divide-slate-100">
          <StatItem value="2026" label="Tarifs officiels CRSE" />
          <StatItem value="DPP + PPP" label="Types de compteurs" />
          <StatItem value="FCFA ↔ kWh" label="Calcul double sens" />
          <StatItem value="14 régions" label="Couverture Sénégal" />
        </div>
      </section>

      {/* ══════════════════════════════════
          MINI CALC MOBILE
      ══════════════════════════════════ */}
      <section className="lg:hidden px-4 py-10" style={{ background: '#020C1B' }}>
        <MiniCalc />
      </section>

      {/* ══════════════════════════════════
          FEATURES
      ══════════════════════════════════ */}
      <section className="py-24 px-4 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <span className="section-tag">Fonctionnalités</span>
            <h2 className="section-title">Tout ce dont vous avez besoin</h2>
            <p className="section-subtitle">
              Une plateforme complète qui va bien au-delà du simple calculateur kWh
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon={Calculator}
              gradient="from-primary to-blue-400"
              title="Simulateur FCFA ↔ kWh"
              desc="Convertissez dans les deux sens. Entrez un montant FCFA ou des kWh. Détail complet par tranche, DPP et PPP supportés."
            />
            <FeatureCard
              icon={RefreshCw}
              gradient="from-violet-500 to-purple-400"
              title="Calcul inverse exclusif"
              tag="Exclusif"
              desc="Entrez les kWh souhaités → obtenez le montant exact à recharger. Aucun autre calculateur Woyofal ne propose ça."
            />
            <FeatureCard
              icon={BarChart3}
              gradient="from-success to-emerald-400"
              title="Dashboard Analytics"
              desc="KPIs temps réel, graphiques d'évolution, répartition par tranches. Données de consommation au niveau national."
            />
            <FeatureCard
              icon={TrendingUp}
              gradient="from-orange-500 to-amber-400"
              title="Prédictions ML"
              tag="IA"
              desc="Intelligence artificielle pour prédire votre consommation et vous alerter avant de passer en tranche supérieure."
            />
            <FeatureCard
              icon={MapPin}
              gradient="from-danger to-rose-400"
              title="14 Régions du Sénégal"
              desc="Données par région : Dakar, Thiès, Saint-Louis, Kaolack, Ziguinchor et plus. Analyse géographique complète."
            />
            <FeatureCard
              icon={Database}
              gradient="from-teal-500 to-cyan-400"
              title="Tarifs 2026 officiels"
              desc="Grille CRSE 2026. Mise à jour automatique. Plus fiable que les calculateurs qui utilisent encore les tarifs 2025."
            />
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════
          COMPARATIF
      ══════════════════════════════════ */}
      <section className="py-24 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <span className="section-tag">Comparatif</span>
            <h2 className="section-title">Pourquoi nous sommes différents</h2>
            <p className="section-subtitle">Comparaison avec les autres calculateurs disponibles au Sénégal</p>
          </div>
          <div className="overflow-hidden rounded-3xl border border-slate-200 shadow-card">
            <table className="w-full">
              <thead>
                <tr style={{ background: '#020C1B' }} className="text-white">
                  <th className="py-4 px-5 text-left text-sm font-medium text-white/70">Fonctionnalité</th>
                  <th className="py-4 px-5 text-center text-sm">
                    <span className="flex items-center justify-center gap-1.5">
                      <Zap className="w-4 h-4 text-accent" />
                      <span className="font-semibold">Notre plateforme</span>
                    </span>
                  </th>
                  <th className="py-4 px-5 text-center text-sm font-medium text-white/50">Autres</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                <CompareRow feature="Simulateur FCFA → kWh" nous={true} eux={true} />
                <CompareRow feature="Calculateur inverse kWh → FCFA" nous={true} eux={false} />
                <CompareRow feature="Support DPP + PPP" nous={true} eux="DPP seulement" />
                <CompareRow feature="Tarifs 2026 (CRSE)" nous={true} eux="Tarifs 2025" />
                <CompareRow feature="Dashboard Analytics" nous={true} eux={false} />
                <CompareRow feature="Prédictions ML" nous={true} eux={false} />
                <CompareRow feature="Données par région" nous="14 régions" eux={false} />
                <CompareRow feature="Détail par tranche" nous={true} eux={true} />
                <CompareRow feature="Conseils économies" nous={true} eux="Basique" />
                <CompareRow feature="Redevance configurable" nous={true} eux="Fixe" />
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════
          COMMENT ÇA MARCHE
      ══════════════════════════════════ */}
      <section className="py-24 px-4 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <span className="section-tag">Guide</span>
            <h2 className="section-title">Comment ça marche ?</h2>
            <p className="section-subtitle">Simple et immédiat, sans inscription requise</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { n: '01', icon: Calculator, title: 'Entrez votre montant', desc: 'Saisissez le montant FCFA que vous voulez recharger, ou les kWh souhaités. Choisissez DPP ou PPP.', gradient: 'from-primary to-blue-400' },
              { n: '02', icon: Zap, title: 'Obtenez le résultat', desc: 'Le simulateur calcule instantanément les kWh, le détail par tranche, les déductions et votre tranche finale.', gradient: 'from-accent to-yellow-300' },
              { n: '03', icon: TrendingUp, title: 'Optimisez vos recharges', desc: 'Utilisez nos conseils et prédictions pour rester en Tranche 1 et économiser sur vos dépenses électriques.', gradient: 'from-success to-emerald-400' },
            ].map(({ n, icon: Icon, title, desc, gradient }) => (
              <div key={n} className="card text-center group hover:shadow-card-hover hover:-translate-y-1 transition-all duration-300">
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center mx-auto mb-5 group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className="w-8 h-8 text-white" />
                </div>
                <div className="text-4xl font-bold font-display gradient-text mb-3 opacity-20">{n}</div>
                <h3 className="text-lg font-semibold font-display mb-2 text-slate-800">{title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════
          TARIFS RAPIDES
      ══════════════════════════════════ */}
      <section className="py-24 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <span className="section-tag">Tarification</span>
            <h2 className="section-title">Tarifs Senelec 2026 — DPP</h2>
            <p className="section-subtitle">Grille officielle pour compteurs Domestiques Prépayés</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 mb-10">
            {[
              { t: 'Tranche 1', range: '0 – 150 kWh/mois', prix: '82,00', gradient: 'from-success to-emerald-400', badge: 'Tarif social', note: 'Pas de TVA. Le plus économique — visez cette tranche !' },
              { t: 'Tranche 2', range: '151 – 250 kWh/mois', prix: '136,49', gradient: 'from-accent to-yellow-400', badge: 'Intermédiaire', note: '+66% vs T1. Réduisez votre consommation.' },
              { t: 'Tranche 3', range: '> 250 kWh/mois', prix: '136,49', gradient: 'from-danger to-rose-500', badge: 'Gros consommateur', note: 'Tarif plein. Évitez cette tranche.' },
            ].map(({ t, range, prix, gradient, badge, note }) => (
              <div key={t} className="card overflow-hidden p-0 hover:shadow-card-hover hover:-translate-y-1 transition-all duration-300">
                <div className={`bg-gradient-to-br ${gradient} p-6 text-white text-center`}>
                  <span className="text-xs font-bold bg-white/20 rounded-full px-3 py-1 inline-block mb-3 uppercase tracking-wider">{badge}</span>
                  <div className="text-4xl font-bold font-display mb-1">{prix}</div>
                  <div className="text-sm text-white/80">FCFA / kWh</div>
                </div>
                <div className="p-5">
                  <div className="font-semibold font-display text-slate-800 mb-1">{t}</div>
                  <div className="text-sm text-slate-500 mb-3">{range}</div>
                  <div className="text-xs text-slate-400 leading-relaxed">{note}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center">
            <Link to="/tarifs" className="inline-flex items-center gap-2 text-primary font-semibold hover:underline text-sm">
              Voir la grille complète DPP + PPP <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════
          FAQ
      ══════════════════════════════════ */}
      <section className="py-24 px-4 bg-slate-50">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-14">
            <span className="section-tag">FAQ</span>
            <h2 className="section-title">Questions fréquentes</h2>
            <p className="section-subtitle">Les réponses aux questions les plus posées sur Woyofal</p>
          </div>
          <div className="space-y-2">
            {faqs.map((f, i) => (
              <div
                key={i}
                className={`bg-white rounded-2xl border overflow-hidden transition-all duration-200 ${faqOpen === i ? 'border-primary/30 shadow-card' : 'border-slate-100'}`}
              >
                <button
                  className="w-full flex items-center justify-between p-5 text-left hover:bg-slate-50/80 transition"
                  onClick={() => setFaqOpen(faqOpen === i ? null : i)}
                >
                  <span className="font-semibold text-slate-800 text-sm pr-4">{f.q}</span>
                  {faqOpen === i
                    ? <ChevronUp className="w-4 h-4 text-primary flex-shrink-0" />
                    : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />}
                </button>
                {faqOpen === i && (
                  <div className="px-5 pb-5 text-slate-600 text-sm leading-relaxed border-t border-slate-100 pt-4">
                    {f.a}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link
              to="/faq"
              className="inline-flex items-center gap-2 btn-ghost rounded-xl text-sm"
            >
              <BookOpen className="w-4 h-4" /> Voir toutes les questions
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════
          CTA FINAL — dark navy
      ══════════════════════════════════ */}
      <section className="py-24 px-4 text-white text-center" style={{ background: '#020C1B' }}>
        <div className="max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-white/8 border border-white/12 rounded-full px-4 py-1.5 text-sm text-white/70 mb-8">
            <Star className="w-3.5 h-3.5 text-accent" />
            Le simulateur numéro 1 au Sénégal
          </div>
          <h2 className="text-4xl font-bold font-display mb-4">
            Prêt à optimiser<br />
            <span className="gradient-text-accent">vos recharges ?</span>
          </h2>
          <p className="text-white/55 text-lg mb-10 max-w-md mx-auto">
            100% gratuit, sans inscription, résultat instantané.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/simulateur" className="btn-accent flex items-center gap-2">
              <Calculator className="w-5 h-5" />
              Simuler maintenant
            </Link>
            <Link to="/conseils" className="btn-ghost-dark flex items-center gap-2">
              <Lightbulb className="w-5 h-5" />
              Conseils économies
            </Link>
          </div>
          <p className="text-white/30 text-xs mt-8">
            Aucun compte requis &bull; Calcul instantané &bull; Tarifs 2026 officiels
          </p>
        </div>
      </section>

    </div>
  )
}
