import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Lightbulb, Zap, TrendingDown, Calculator, Home, Thermometer,
  Tv, Wind, Droplets, ChevronDown, ChevronUp, AlertTriangle, CheckCircle
} from 'lucide-react'

const APPAREILS = [
  { nom: 'Ampoule LED 9W', puissance: 9, categorie: 'Éclairage', type: 'eco', conseil: 'Préférez les LED, elles consomment 5× moins que les incandescentes.' },
  { nom: 'Ampoule incandescente 60W', puissance: 60, categorie: 'Éclairage', type: 'attention', conseil: 'À remplacer absolument par des LED.' },
  { nom: 'Climatiseur 1CV (mode froid)', puissance: 750, categorie: 'Climatisation', type: 'attention', conseil: 'Réglez à 24-26°C. Chaque °C en moins = +8% de consommation.' },
  { nom: 'Ventilateur de plafond', puissance: 75, categorie: 'Climatisation', type: 'eco', conseil: 'Remplace efficacement la clim pour environ 10% du coût.' },
  { nom: 'Réfrigérateur 300L classe A++', puissance: 100, categorie: 'Cuisine', type: 'eco', conseil: 'Fonctionne 24h/24 — choisissez la classe A++ ou A+++.' },
  { nom: 'Réfrigérateur 300L classe B', puissance: 200, categorie: 'Cuisine', type: 'attention', conseil: 'Double consommation vs A++. Pensez à renouveler votre frigo.' },
  { nom: 'Télévision 43" LED', puissance: 80, categorie: 'Audiovisuel', type: 'eco', conseil: 'Éteignez complètement (pas veille) pour économiser 10-15W.' },
  { nom: 'Téléviseur 43" ancien CRT', puissance: 120, categorie: 'Audiovisuel', type: 'attention', conseil: 'Remplacez les vieux écrans cathodiques par des LED/OLED.' },
  { nom: 'Chargeur téléphone', puissance: 10, categorie: 'Audiovisuel', type: 'eco', conseil: 'Débranchez quand la charge est terminée.' },
  { nom: 'Fer à repasser', puissance: 1200, categorie: 'Entretien', type: 'attention', conseil: 'Repassez en une seule session, ne laissez pas chauffer inutilement.' },
  { nom: 'Machine à laver', puissance: 500, categorie: 'Entretien', type: 'neutre', conseil: 'Utilisez à pleine charge, préférez programmes à 30°C.' },
  { nom: 'Pompe à eau 0.5CV', puissance: 370, categorie: 'Eau', type: 'neutre', conseil: 'Installez un chronomètre pour limiter les cycles de pompage.' },
  { nom: 'Chauffe-eau électrique 100L', puissance: 2000, categorie: 'Eau', type: 'attention', conseil: 'Programmez en heures creuses. Envisagez le solaire thermique.' },
  { nom: 'Ordinateur portable', puissance: 65, categorie: 'Bureau', type: 'eco', conseil: '3× moins énergivore qu\'un PC fixe avec écran.' },
  { nom: 'PC fixe + écran', puissance: 200, categorie: 'Bureau', type: 'neutre', conseil: 'Activez la mise en veille automatique après 5 minutes.' },
]

const CATEGORIES = [...new Set(APPAREILS.map(a => a.categorie))]

const CONSEILS_SECTIONS = [
  {
    titre: 'Rester en Tranche 1 (≤ 150 kWh/mois)',
    icon: <TrendingDown className="w-6 h-6 text-gray-700" />,
    bg: 'bg-gray-50 border-gray-200',
    items: [
      'Rechargez en plusieurs petites tranches (3×5 000 F vs 1×15 000 F).',
      'Suivez votre cumul mensuel sur le Dashboard.',
    ]
  },
  {
    titre: 'Réduire la consommation au quotidien',
    icon: <Lightbulb className="w-6 h-6 text-gray-700" />,
    bg: 'bg-gray-50 border-gray-200',
    items: [
      'LED 9W au lieu de 60W (−85% conso).',
      'Clim à 24-26°C (−8% par degré).',
      'Débranchez les appareils en veille.',
    ]
  },
  {
    titre: 'Optimiser les gros appareils',
    icon: <Home className="w-6 h-6 text-gray-700" />,
    bg: 'bg-gray-50 border-gray-200',
    items: [
      'Frigo +4°C, loin des sources chaleur.',
      'Machine à laver : remplissez complètement.',
      'Pompe : stockez l\'eau (moins de cycles).',
    ]
  },
  {
    titre: 'Planifier les recharges intelligemment',
    icon: <Calculator className="w-6 h-6 text-gray-700" />,
    bg: 'bg-gray-50 border-gray-200',
    items: [
      'T1 = 150 kWh max à 82 F/kWh.',
      'Budget mensuel : 150×82 + 429 = ~13 700 F.',
      'T2+ = +66% par kWh au-delà de 150 kWh.',
    ]
  },
]

function BudgetCalculator() {
  const [heures, setHeures] = useState({ led: 8, clim: 4, frigo: 24, tv: 5, pompe: 1 })
  const jours = 30

  const conso = {
    led: (heures.led * 9 * jours) / 1000,
    clim: (heures.clim * 750 * jours) / 1000,
    frigo: (heures.frigo * 100 * jours) / 1000,
    tv: (heures.tv * 80 * jours) / 1000,
    pompe: (heures.pompe * 370 * jours) / 1000,
  }
  const totalKwh = Object.values(conso).reduce((a, b) => a + b, 0)
  const tranche = totalKwh <= 150 ? 'T1' : totalKwh <= 250 ? 'T2' : 'T3'
  const prix = totalKwh <= 150 ? totalKwh * 82 : totalKwh <= 250 ? 150 * 82 + (totalKwh - 150) * 136.49 : 150 * 82 + 100 * 136.49 + (totalKwh - 250) * 136.49
  const montantTotal = prix * 1.025 + 429

  return (
    <div className="card">
      <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
        <Calculator className="w-5 h-5 text-primary" /> Calculateur de Budget Mensuel
      </h3>
      <p className="text-sm text-gray-500 mb-6">Estimez votre consommation mensuelle selon vos habitudes (DPP)</p>
      <div className="space-y-4">
        {[
          { key: 'led', label: 'Éclairage LED (nb heures/jour)', icon: '💡', max: 24 },
          { key: 'clim', label: 'Climatiseur 1CV (heures/jour)', icon: '❄️', max: 24 },
          { key: 'frigo', label: 'Réfrigérateur (heures/jour)', icon: '🧊', max: 24 },
          { key: 'tv', label: 'Télévision (heures/jour)', icon: '📺', max: 16 },
          { key: 'pompe', label: 'Pompe à eau 0,5CV (heures/jour)', icon: '💧', max: 8 },
        ].map(({ key, label, icon, max }) => (
          <div key={key}>
            <div className="flex justify-between text-sm mb-1">
              <span>{icon} {label}</span>
              <span className="font-semibold text-primary">{heures[key]}h → {conso[key].toFixed(1)} kWh/mois</span>
            </div>
            <input
              type="range" min="0" max={max} value={heures[key]}
              onChange={e => setHeures(p => ({ ...p, [key]: Number(e.target.value) }))}
              className="w-full accent-primary"
            />
          </div>
        ))}
      </div>
      <div className="mt-6 p-4 rounded-lg bg-gray-50 border">
        <div className="grid grid-cols-3 gap-2 sm:gap-4 text-center">
          <div>
            <div className="text-xl sm:text-2xl font-bold text-primary">{totalKwh.toFixed(0)} kWh</div>
            <div className="text-xs text-gray-500">Conso estimée</div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-bold">{tranche}</div>
            <div className="text-xs text-gray-500">Tranche finale</div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-bold text-success">{montantTotal.toFixed(0)} F</div>
            <div className="text-xs text-gray-500">Budget mensuel</div>
          </div>
        </div>
        {totalKwh > 150 && (
          <div className="mt-3 bg-gray-50 border border-red-200 rounded-lg p-3 text-xs text-gray-700 text-center">
            Vous dépassez 150 kWh — réduire la clim de {Math.max(0, heures.clim - 2)}h à {Math.max(0, heures.clim - 2)}h permettrait d'économiser ~{((heures.clim > 2 ? 2 : heures.clim) * 750 * 30 / 1000 * (136.49 - 82)).toFixed(0)} FCFA/mois
          </div>
        )}
      </div>
    </div>
  )
}

export default function Conseils() {
  const [catActive, setCatActive] = useState('Tous')
  const [openSection, setOpenSection] = useState(0)

  const appareilsFiltres = catActive === 'Tous' ? APPAREILS : APPAREILS.filter(a => a.categorie === catActive)

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 sm:py-14 bg-white min-h-screen">
      {/* Header */}
      <div className="text-center mb-12">
        <span className="section-tag">Économies</span>
        <h1 className="section-title">Conseils Économie d’Énergie</h1>
        <p className="section-subtitle max-w-2xl mx-auto">
          Restez en <strong className="text-primary">Tranche 1</strong>, réduisez votre facture et préservez l’environnement grâce à nos conseils pratiques adaptés au Sénégal.
        </p>
      </div>

      {/* Chiffres clés */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
        {[
          { val: '82 F', label: 'T1 (0-150 kWh)', gradient: 'from-success/20 to-emerald-100', text: 'text-success' },
          { val: '136 F', label: 'T2 (151-250 kWh)', gradient: 'bg-gray-50', text: 'text-gray-700' },
          { val: '-66%', label: 'Économie T1 vs T2', gradient: 'bg-gray-50', text: 'text-gray-700' },
          { val: '429 F', label: 'Redevance mensuelle', gradient: 'bg-gray-50', text: 'text-gray-700' },
        ].map(({ val, label, gradient, text }) => (
          <div key={label} className={`bg-gradient-to-br ${gradient} rounded-2xl p-5 text-center border border-white`}>
            <div className={`text-2xl font-bold font-display ${text}`}>{val}</div>
            <div className="text-xs font-medium text-gray-600 mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Sections conseils */}
      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-4">Stratégies d'optimisation</h2>
        <div className="space-y-3">
          {CONSEILS_SECTIONS.map((section, i) => (
            <div key={i} className={`border rounded-2xl overflow-hidden ${section.bg}`}>
              <button
                onClick={() => setOpenSection(openSection === i ? -1 : i)}
                className="w-full flex items-center justify-between p-4 font-semibold text-left"
              >
                <span className="flex items-center gap-3">{section.icon} {section.titre}</span>
                {openSection === i ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>
              {openSection === i && (
                <div className="px-4 pb-4">
                  <ul className="space-y-2">
                    {section.items.map((item, j) => (
                      <li key={j} className="flex items-start gap-2 text-sm">
                        <CheckCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-600" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Calculateur */}
      <section className="mb-10">
        <BudgetCalculator />
      </section>

      {/* Tableau appareils */}
      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-4">Consommation des appareils courants</h2>
        {/* Filtres catégorie */}
        <div className="flex flex-wrap gap-2 mb-4">
          {['Tous', ...CATEGORIES].map(cat => (
            <button
              key={cat}
              onClick={() => setCatActive(cat)}
              className={`px-3 py-1 rounded-full text-sm font-medium border transition ${catActive === cat ? 'bg-primary text-white border-primary' : 'bg-white text-gray-600 border-gray-300 hover:border-primary'}`}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-slate-100">
              <tr>
                <th className="p-3 text-left text-slate-700">Appareil</th>
                <th className="p-3 text-right text-slate-700">Puissance</th>
                <th className="p-3 text-right text-slate-700">Conso 4h/jour (mois)</th>
                <th className="p-3 text-right text-slate-700">Coût T1/mois</th>
                <th className="p-3 text-left text-slate-700">Conseil</th>
              </tr>
            </thead>
            <tbody>
              {appareilsFiltres.map((a, i) => {
                const kwhMois = (a.puissance * 4 * 30) / 1000
                const coutT1 = kwhMois * 82
                const rowBg = a.type === 'eco' ? 'bg-gray-50' : a.type === 'attention' ? 'bg-red-50' : ''
                const badge = a.type === 'eco'
                  ? <span className="text-red-600 text-xs font-bold">ECO</span>
                  : a.type === 'attention'
                  ? <span className="text-red-600 text-xs font-bold">ÉLEVÉ</span>
                  : <span className="text-gray-500 text-xs">—</span>
                return (
                  <tr key={i} className={`border-t ${rowBg}`}>
                    <td className="p-3">
                      <div className="font-medium">{a.nom}</div>
                      <div className="text-xs text-gray-400">{a.categorie} {badge}</div>
                    </td>
                    <td className="p-3 text-right font-semibold">{a.puissance} W</td>
                    <td className="p-3 text-right">{kwhMois.toFixed(1)} kWh</td>
                    <td className="p-3 text-right font-bold text-primary">{coutT1.toFixed(0)} F</td>
                    <td className="p-3 text-xs text-gray-600 max-w-xs">{a.conseil}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-400 mt-2">* Calcul basé sur 4h/jour d'utilisation et tarif T1 (82 FCFA/kWh). Valeurs indicatives.</p>
      </section>

      {/* Alerte importante */}
      <div className="bg-gray-50 border-2 border-gray-300 rounded-xl p-5 mb-8 flex gap-4">
        <AlertTriangle className="w-8 h-8 text-red-600 shrink-0 mt-1" />
        <div>
          <h3 className="font-bold text-red-800 mb-1">Important : Tarif social DPP 2026</h3>
          <p className="text-sm text-gray-600">
            La Tranche 1 (T1) à <strong>82 FCFA/kWh</strong> s'applique aux <strong>150 premiers kWh chaque mois</strong> (compteur DPP). 
            Au-delà, le tarif passe abruptement à 136,49 FCFA/kWh (+66%). 
            Planifiez vos recharges pour rester sous ce seuil grâce au <Link to="/simulateur" className="underline text-red-900 font-semibold">simulateur</Link>.
          </p>
        </div>
      </div>

      {/* CTA */}
      <div className="text-center rounded-lg p-6 sm:p-10 text-white bg-black">
        <h3 className="text-2xl font-bold font-display mb-2">Prêt à optimiser votre consommation ?</h3>
        <p className="mb-5 text-gray-300">Utilisez notre simulateur avec le mode inverse pour budgéter vos recharges à la perfection.</p>
        <Link to="/simulateur" className="bg-red-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-red-700 transition inline-flex items-center gap-2">
          Ouvrir le Simulateur
        </Link>
    </div>
    </div>
  )
}
