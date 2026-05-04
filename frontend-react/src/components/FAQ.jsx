import React, { useState } from 'react'
import { ChevronDown, ChevronUp, Search } from 'lucide-react'

export const faqs = [
  {
    cat: '💰 Calcul & Tarifs',
    questions: [
      {
        q: 'C\'est quoi Woyofal ?',
        a: 'Woyofal est le système de compteur prépayé intelligent (compteur à crédit) de la SENELEC (Société Nationale d\'Électricité du Sénégal). Avec un compteur Woyofal, vous achetez de l\'électricité à l\'avance : le montant rechargé est converti en kWh après déduction de la redevance mensuelle et de la taxe communale de 2,5%. Cette plateforme couvre 4 types de compteurs : DPP (Domestique Prépayé), PPP (Professionnel Prépayé), DMP et PMP (Moyennes Puissances).'
      },
      {
        q: 'Combien de kWh pour 5 000 FCFA Woyofal ?',
        a: 'Avec 5 000 FCFA (première recharge du mois, cumul = 0, compteur monophasé DPP) : environ 54,2 kWh. Calcul détaillé : redevance 429 F + taxe 2,5% (125 F) = 554 F déduits → net = 4 446 F → T1 : 4 446 / 82 ≈ 54,2 kWh. Sans redevance (recharge suivante du même mois) : net = 4 875 F → 59,4 kWh. Note : les dettes présentes sur le compteur ne sont pas prises en compte dans cette simulation.'
      },
      {
        q: 'Combien de kWh pour 10 000 FCFA Woyofal ?',
        a: 'Avec 10 000 FCFA (première recharge du mois, cumul = 0, compteur monophasé DPP) : environ 113,7 kWh. Calcul : redevance 429 F + taxe 250 F = 679 F déduits → net = 9 321 F → T1 : 9 321 / 82 ≈ 113,7 kWh. Sans redevance : net = 9 750 F → 118,9 kWh. Note : les dettes ne sont pas incluses dans la simulation.'
      },
      {
        q: 'Combien de kWh pour 20 000 FCFA Woyofal ?',
        a: 'Avec 20 000 FCFA (première recharge du mois, cumul = 0) : environ 199,6 kWh. Calcul : redevance 429 F + taxe 500 F = 929 F déduits → net = 19 071 F → T1 : 150 kWh (12 300 F) + T2 : 6 771 F / 136,49 ≈ 49,6 kWh = 199,6 kWh au total. Sans redevance : net = 19 500 F → ≈204,6 kWh. Vous passez en Tranche 2 après 150 kWh.'
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
        a: 'La redevance est un frais fixe lié au compteur. Son montant varie selon le type de branchement : 429 FCFA pour un compteur monophasé (DPP, PPP), 1 427 FCFA pour un compteur triphasé (DMP, PMP). Attention : si vous n\'avez pas rechargé depuis plusieurs mois, la redevance est multipliée par le nombre de mois écoulés (ex. : 3 mois → redevance × 3).'
      },
      {
        q: 'La redevance est-elle la même pour tous les compteurs ?',
        a: 'Non. La redevance mensuelle dépend du type de branchement : monophasé = 429 FCFA, triphasé = 1 427 FCFA. De plus, si vous n\'avez pas rechargé depuis N mois, la redevance due est : redevance_base × N. Dans le simulateur, sélectionnez « Première recharge du mois » puis indiquez depuis combien de mois vous n\'avez pas rechargé.'
      },
      {
        q: 'Comment fonctionne la taxe communale de 2,5% ?',
        a: 'La taxe communale de 2,5% est prélevée sur CHAQUE recharge, quel que soit le montant. Exemple : pour 10 000 FCFA, la taxe = 250 FCFA. Elle est destinée aux collectivités locales.'
      },
      {
        q: 'Dans quel ordre sont prélevées les déductions ?',
        a: 'L\'ordre est : 1) Redevance mensuelle (selon phase et mois écoulés) → 2) Taxe communale 2,5% → 3) Le reste est converti en kWh selon les tranches. Notre simulateur applique exactement cet ordre.'
      },
      {
        q: 'Le simulateur prend-il en compte les dettes sur le compteur ?',
        a: 'Non. Ce simulateur ne prend pas en compte les éventuelles dettes présentes sur votre compteur. Les kWh calculés représentent uniquement ce que vous obtiendrez après déduction de la redevance et de la taxe communale. Si vous avez une dette, une partie du crédit rechargé sera affectée au remboursement avant que les kWh soient disponibles.'
      }
    ]
  },
  {
    cat: '⚡ DPP vs PPP vs DMP vs PMP',
    questions: [
      {
        q: 'Quelle différence entre DPP et PPP ?',
        a: 'DPP (Domestique Prépayé) : pour les ménages, appartements, villas. T1: 82 F/kWh (0-150 kWh), T2: 136.49 F/kWh (151-250 kWh). PPP (Professionnel Prépayé) : pour les entreprises, commerces, bureaux. T1: 147.43 F/kWh (0-50 kWh), T2: 189.84 F/kWh (51-500 kWh). Notre simulateur gère les quatre types de compteurs.'
      },
      {
        q: 'C\'est quoi le DMP (Domestique Moyenne Puissance) ?',
        a: 'Le DMP est destiné aux ménages avec une consommation plus élevée (branchements 7-36 kVA). Grille Woyofal 2026 : T1 : 0-150 kWh → 111,23 FCFA/kWh | T2 : 151-400 kWh → 143,54 FCFA/kWh | T3 : >400 kWh → 143,54 FCFA/kWh (même tarif que T2 en prépayé). La redevance est de 429 FCFA pour un monophasé ou 1 427 FCFA pour un triphasé, multipliée par le nombre de mois sans recharge.'
      },
      {
        q: 'C\'est quoi le PMP (Professionnel Moyenne Puissance) ?',
        a: 'Le PMP est le tarif des professionnels à forte consommation (branchements triphasés 7-36 kVA). Grille Woyofal 2026 : T1 : 0-100 kWh → 165,01 FCFA/kWh | T2 : 101-500 kWh → 191,01 FCFA/kWh | T3 : >500 kWh → 191,01 FCFA/kWh (même tarif que T2 en prépayé). Redevance triphasée : 1 427 FCFA par mois écoulé depuis la dernière recharge.'
      },
      {
        q: 'Woyofal prépayé est-il moins cher que l\'abonnement classique (postpayé) ?',
        a: 'Oui, pour les gros consommateurs ! En Woyofal prépayé, la 3e tranche (T3) est facturée au même prix que la T2, ce qui n\'est pas le cas en postpayé. Économies sur la T3 : DPP : 22,87 F/kWh de moins | DMP : 14,92 F/kWh de moins | PPP : 18,79 F/kWh de moins | PMP : 19,80 F/kWh de moins. Pour les petits consommateurs (en T1 uniquement), les tarifs sont identiques.'
      },
      {
        q: 'Comment savoir si j\'ai un compteur DPP ou PPP ?',
        a: 'Regardez la plaque de votre compteur Senelec : "DPP" ou "PPP" est indiqué. Les compteurs résidentiels sont généralement DPP. Les compteurs professionnels/industriels sont PPP. Vous pouvez aussi appeler le 33 839 33 33 (Senelec).'
      },
      {
        q: 'C\'est quoi monophasé et triphasé ? Comment le savoir ?',
        a: 'Un compteur monophasé a 2 fils (phase + neutre) et est courant pour les logements. Un compteur triphasé a 4 fils (3 phases + neutre) et est utilisé pour les grosses installations. La plaque du compteur indique "1φ" (monophasé) ou "3φ" (triphasé). La redevance est de 429 FCFA pour monophasé et 1 427 FCFA pour triphasé.'
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
        q: 'C\'est quoi le cumul mensuel dans le simulateur ?',
        a: 'C\'est le total de kWh déjà consommés depuis le début du mois en cours. Entrez 0 si vous venez de commencer le mois ou si vous ne savez pas. Cette valeur permet de déterminer dans quelle tranche s\'effectueront vos prochains kWh.'
      },
      {
        q: 'C\'est la première recharge du mois, que mettre dans le cumul ?',
        a: 'Si c\'est votre première recharge du mois, laissez le cumul à 0. Votre simulation commencera depuis la T1 (tarif le plus avantageux). Si vous avez déjà consommé des kWh ce mois-ci, consultez votre compteur avec le code 814 pour connaître votre cumul actuel.'
      },
      {
        q: 'Comment lire le cumul sur mon compteur ?',
        a: 'Tapez le code 814 sur votre compteur Woyofal. Il affiche votre consommation cumulée depuis le début du mois en kWh. C\'est cette valeur à saisir dans le champ "Cumul mensuel actuel" du simulateur. Si c\'est votre première recharge du mois, ce chiffre est 0.'
      },
      {
        q: 'Comment indiquer la redevance dans le simulateur ?',
        a: 'Le simulateur propose deux boutons : « Déjà rechargé ce mois » (redevance non déduite car déjà prélevée) ou « Première recharge du mois » (redevance déduite). Si vous choisissez « Première recharge », un curseur apparaît pour préciser depuis combien de mois vous n\'avez pas rechargé (1 = cas habituel, N = redevance × N pour rattrapage).'
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
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-14">
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
      <div className="mt-12 rounded-3xl p-6 sm:p-10 text-white text-center" style={{ background: '#020C1B' }}>
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
