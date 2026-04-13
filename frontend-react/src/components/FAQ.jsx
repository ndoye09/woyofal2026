import React, { useState } from 'react'
import { ChevronDown, ChevronUp, Search } from 'lucide-react'

const faqs = [
  {
    cat: '💰 Calcul & Tarifs',
    questions: [
      {
        q: 'Combien de kWh pour 5 000 FCFA Woyofal ?',
        a: 'Avec 5 000 FCFA sans redevance (cumul = 0) : environ 60.9 kWh. Calcul détaillé : taxe 2,5% = 125 F → net = 4 875 F → T1 : 4 875 / 82 = 59.4 kWh. Utilisez notre simulateur pour un résultat exact selon votre cumul actuel.'
      },
      {
        q: 'Combien de kWh pour 10 000 FCFA Woyofal ?',
        a: 'Sans redevance, cumul à 0 : environ 104 kWh. T1 : 150 kWh max, mais le montant net (9 750 F) suffit pour ~104 kWh en T1 (9 750 / 82 ≈ 118.9 kWh). Résultat variable selon votre cumul du mois.'
      },
      {
        q: 'Combien de kWh pour 20 000 FCFA Woyofal ?',
        a: 'Sans redevance, départ de 0 : environ 183 kWh. T1 (12 300 F / 82 = 150 kWh) + T2 (7 200 F / 136.49 ≈ 52.8 kWh). Vous passez en Tranche 2 après 150 kWh.'
      },
      {
        q: 'Quelle est la différence entre les tarifs 2025 et 2026 ?',
        a: 'La Senelec a révisé sa grille tarifaire. Les tarifs 2026 (DPP) : T1 = 82 FCFA/kWh, T2 = 136.49 FCFA/kWh. Les tarifs 2025 utilisés par d\'autres calculateurs sont obsolètes. Notre plateforme est la seule à utiliser les tarifs 2026 officiels.'
      },
      {
        q: 'Les tarifs sont-ils les mêmes dans tout le Sénégal ?',
        a: 'Oui. Les tarifs Woyofal sont uniformes sur tout le territoire sénégalais : Dakar, Thiès, Saint-Louis, Kaolack, Ziguinchor, Diourbel, Fatick, Kaffrine, Kédougou, Kolda, Louga, Matam, Sédhiou, Tambacounda. Les tarifs sont fixés par décret de la CRSE.'
      }
    ]
  },
  {
    cat: '📅 Redevance & Déductions',
    questions: [
      {
        q: 'C\'est quoi la redevance mensuelle Woyofal ?',
        a: 'La redevance est un frais fixe prélevé lors de votre première recharge du mois. Pour DPP : 429 FCFA. Elle couvre les frais de location du compteur et d\'entretien du réseau électrique. Les recharges suivantes dans le même mois ne sont pas soumises à la redevance.'
      },
      {
        q: 'Comment fonctionne la taxe communale de 2,5% ?',
        a: 'La taxe communale de 2,5% est prélevée sur CHAQUE recharge, quel que soit le montant. Exemple : pour 10 000 FCFA, la taxe = 250 FCFA. Elle est destinée aux collectivités locales.'
      },
      {
        q: 'Dans quel ordre sont prélevées les déductions ?',
        a: 'L\'ordre est : 1) Redevance mensuelle (si première recharge du mois) → 2) Taxe communale 2,5% → 3) Le reste est converti en kWh selon les tranches. Notre simulateur applique exactement cet ordre.'
      }
    ]
  },
  {
    cat: '⚡ DPP vs PPP',
    questions: [
      {
        q: 'Quelle différence entre DPP et PPP ?',
        a: 'DPP (Domestique Prépayé) : pour les ménages, appartements, villas. T1: 82 F/kWh (0-150 kWh), T2: 136.49 F/kWh (151-250 kWh). PPP (Professionnel Prépayé) : pour les entreprises, commerces, bureaux. T1: 147.43 F/kWh (0-50 kWh), T2: 189.84 F/kWh (51-500 kWh). Notre simulateur gère les deux types de compteurs.'
      },
      {
        q: 'Comment savoir si j\'ai un compteur DPP ou PPP ?',
        a: 'Regardez la plaque de votre compteur Senelec : "DPP" ou "PPP" est indiqué. Les compteurs résidentiels sont généralement DPP. Les compteurs professionnels/industriels sont PPP. Vous pouvez aussi appeler le 33 839 33 33 (Senelec).'
      },
      {
        q: 'Peut-on passer de PPP à DPP ?',
        a: 'Oui, sous conditions. Si votre consommation mensuelle descend sous un seuil défini par la Senelec et que l\'usage est résidentiel, vous pouvez demander un changement de catégorie. Contactez directement la Senelec.'
      }
    ]
  },
  {
    cat: '📊 Dashboard & Analytics',
    questions: [
      {
        q: 'D\'où viennent les données du Dashboard ?',
        a: "Le Dashboard est votre espace personnel : il affiche l'historique de vos simulations, vos statistiques de recharge (total FCFA, kWh moyen) et l'évolution de votre consommation dans le temps."
      },
      {
        q: 'Les prédictions ML sont-elles fiables ?',
        a: 'Nos modèles de machine learning (Random Forest, XGBoost) sont entraînés sur des données historiques de consommation. La précision varie selon la saison et la région. Les prédictions sont des estimations pour vous aider à planifier, pas des certitudes.'
      }
    ]
  },
  {
    cat: '🔧 Utilisation du simulateur',
    questions: [
      {
        q: 'Qu\'est-ce que le "cumul mensuel actuel" ?',
        a: 'C\'est le total de kWh déjà consommés depuis le début du mois en cours. Entrez 0 si vous venez de commencer le mois ou si vous ne savez pas. Cette valeur permet de déterminer dans quelle tranche s\'effectueront vos prochains kWh.'
      },
      {
        q: 'Comment utiliser le calcul inverse (kWh → FCFA) ?',
        a: 'Dans le simulateur, activez le mode "Calcul inverse". Entrez le nombre de kWh que vous souhaitez obtenir. Le simulateur calcule automatiquement le montant FCFA à recharger, en tenant compte des tranches et des déductions. Fonctionnalité exclusive à notre plateforme.'
      },
      {
        q: 'Peut-on simuler pour les deux types de compteurs en même temps ?',
        a: 'Vous pouvez changer le type (DPP/PPP) dans le simulateur et refaire le calcul. Pour une comparaison côte à côte, consultez notre Guide des Tarifs qui présente les deux grilles tarifaires en parallèle.'
      }
    ]
  }
]

const FAQ = () => {
  const [open, setOpen] = useState({})
  const [search, setSearch] = useState('')

  const toggle = (cat, qi) => {
    const key = `${cat}-${qi}`
    setOpen(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const filtered = faqs.map(cat => ({
    ...cat,
    questions: cat.questions.filter(
      q => !search || q.q.toLowerCase().includes(search.toLowerCase()) || q.a.toLowerCase().includes(search.toLowerCase())
    )
  })).filter(cat => cat.questions.length > 0)

  return (
    <div className="max-w-4xl mx-auto px-4 py-14">
      {/* Header */}
      <div className="text-center mb-12">
        <span className="section-tag">FAQ</span>
        <h1 className="section-title">Foire aux Questions</h1>
        <p className="section-subtitle">Toutes les réponses sur Woyofal, les tarifs Senelec et notre plateforme</p>
      </div>

      {/* Recherche */}
      <div className="relative mb-8">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Rechercher une question..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black/30 focus:border-black/40 text-black bg-white shadow-sm"
        />
      </div>

      {/* Questions par catégorie */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-5xl mb-4">🔍</div>
          <p>Aucune question trouvée pour "{search}"</p>
        </div>
      ) : (
        filtered.map((cat, ci) => (
          <div key={ci} className="mb-8">
            <h2 className="text-base font-semibold font-display text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
              {cat.cat}
            </h2>
            <div className="space-y-2">
              {cat.questions.map((q, qi) => {
                const key = `${ci}-${qi}`
                return (
                  <div key={qi} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:border-black/20 transition-colors">
                    <button
                      className="w-full flex items-center justify-between p-5 text-left hover:bg-slate-50/80 transition"
                      onClick={() => toggle(ci, qi)}
                    >
                      <span className="font-semibold text-slate-800 text-sm pr-4">{q.q}</span>
                      {open[key]
                        ? <ChevronUp className="w-4 h-4 text-primary flex-shrink-0" />
                        : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      }
                    </button>
                    {open[key] && (
                      <div className="px-5 pb-5 text-gray-600 text-sm leading-relaxed border-t border-gray-100 pt-4">
                        {q.a}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))
      )}

      {/* CTA bas */}
      <div className="mt-12 rounded-3xl p-10 text-white text-center" style={{ background: '#020C1B' }}>
        <h3 className="text-2xl font-bold font-display mb-3">Votre question n'est pas là ?</h3>
        <p className="text-white/55 mb-6">Utilisez directement notre simulateur pour tester différents scénarios.</p>
        <a href="/simulateur" className="btn-accent inline-flex items-center gap-2">
          Essayer le simulateur
        </a>
      </div>
    </div>
  )
}

export default FAQ
