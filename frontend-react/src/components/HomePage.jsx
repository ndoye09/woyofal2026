import React, { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Zap, ArrowRight, ChevronDown, ChevronUp, Calculator } from 'lucide-react'

/* ── Carte tarifaire rapide (héro) ── */
const HeroCard = () => (
  <div className="bg-white/10 backdrop-blur rounded-2xl p-5 w-full max-w-lg border border-white/15">
    <p className="text-white/60 text-xs uppercase tracking-widest mb-4 font-medium">Grille tarifaire DPP 2026</p>

    {/* Tableau */}
    <div className="w-full mb-4 overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr>
            {['Catégories', 'Tranche 1', 'Tranche 2', 'Tranche 3', 'Note'].map((h) => (
              <th key={h} className={`text-white/40 uppercase tracking-wide font-medium text-left px-2 py-1.5 border-b border-white/10${h === 'Note' ? ' hidden sm:table-cell' : ''}`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {/* Nombre de kWh */}
          <tr className="border-b border-white/5">
            <td className="text-white/50 px-2 py-2 whitespace-nowrap">Nombre de kWh</td>
            <td className="text-white font-medium px-2 py-2 text-center">0 à 150</td>
            <td className="text-white font-medium px-2 py-2 text-center">151 à 250</td>
            <td className="text-white font-medium px-2 py-2 text-center">Plus de 250</td>
            <td className="hidden sm:table-cell text-white/30 px-2 py-2 italic">—</td>
          </tr>
          {/* Prix du kWh */}
          <tr className="border-b border-white/5 bg-white/5">
            <td className="text-white/50 px-2 py-2 whitespace-nowrap">Prix du kWh</td>
            <td className="text-green-400 font-bold px-2 py-2 text-center">82 F</td>
            <td className="text-amber-400 font-bold px-2 py-2 text-center">136,49 F</td>
            <td className="text-primary font-bold px-2 py-2 text-center">136,49 F</td>
            <td className="hidden sm:table-cell text-white/30 px-2 py-2 italic">—</td>
          </tr>
          {/* Redevance */}
          <tr className="border-b border-white/5">
            <td className="text-white/50 px-2 py-2 whitespace-nowrap">Redevance (FCFA)</td>
            <td colSpan={3} className="text-white font-semibold px-2 py-2 text-center">429</td>
            <td className="hidden sm:table-cell text-yellow-300/80 px-2 py-2 text-[10px] leading-tight">Déduit à la 1ère recharge du mois</td>
          </tr>
          {/* Taxe communale */}
          <tr className="border-b border-white/5 bg-white/5">
            <td className="text-white/50 px-2 py-2 whitespace-nowrap">Taxe communale</td>
            <td colSpan={3} className="text-white font-semibold px-2 py-2 text-center">2,5 %</td>
            <td className="hidden sm:table-cell text-yellow-300/80 px-2 py-2 text-[10px] leading-tight">Déduite à chaque achat</td>
          </tr>
          {/* TVA */}
          <tr>
            <td className="text-white/50 px-2 py-2 whitespace-nowrap">TVA</td>
            <td className="px-2 py-2 text-center text-white/20">—</td>
            <td className="px-2 py-2 text-center text-white/20">—</td>
            <td className="text-white font-semibold px-2 py-2 text-center">18 %</td>
            <td className="hidden sm:table-cell text-yellow-300/80 px-2 py-2 text-[10px] leading-tight">Applicable à partir de 250 kWh</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div className="mt-3">
      <Link to="/tarifs" className="inline-flex items-center justify-center gap-2 w-full bg-white/15 hover:bg-white/25 text-white text-xs font-semibold py-2 rounded-xl border border-white/20 transition">
        Voir DPP + PPP <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  </div>
)

/* ═══════════ PAGE D'ACCUEIL ═══════════ */
export default function HomePage() {
  const [faqOpen, setFaqOpen] = useState(null)

  const faqs = [
    {
      q: 'Combien de kWh pour 10 000 FCFA ?',
      a: 'Sans redevance, cumul a zero : environ 119 kWh en Tranche 1 (82 FCFA/kWh). Au-dela de 150 kWh cumul, le reste est facture a 136,49 FCFA/kWh (T2/T3). Notre simulateur donne le detail exact selon votre cumul mensuel.'
    },
    {
      q: "C'est quoi la redevance mensuelle ?",
      a: "429 FCFA deduits automatiquement sur la premiere recharge du mois. C'est un frais fixe de maintenance du reseau Senelec. A partir de la 2e recharge du mois, elle ne s'applique plus."
    },
    {
      q: 'Difference entre DPP et PPP ?',
      a: 'DPP (Domestique Petite Puissance) : menages. T1 82 FCFA/kWh (0-150 kWh), T2/T3 136,49 FCFA/kWh. PPP (Professionnel Petite Puissance) : commerces et entreprises. T1 147,43 FCFA/kWh (0-50 kWh), T2/T3 189,84 FCFA/kWh. Le simulateur gere les deux types.'
    },
    {
      q: 'Comment rester en Tranche 1 ?',
      a: 'Consommez moins de 150 kWh/mois pour un compteur DPP. Utilisez des ampoules LED, debranchez les appareils en veille, regulez la climatisation. Consultez notre page Conseils pour des astuces detaillees.'
    },
    {
      q: 'Peut-on calculer kWh vers FCFA ?',
      a: "Oui, c'est le mode Calcul inverse de notre simulateur : entrez les kWh souhaites et obtenez le montant exact a recharger, calcul par tranche. Fonctionnalite exclusive disponible sur la page Simulateur."
    },
    {
      q: 'Que faire si la recharge affiche ECHEC ou FAILED ?',
      a: "Verifiez que les 20 chiffres du ticket sont identiques a ceux saisis. Si l'erreur persiste, appelez le service client Senelec au 33 867 66 66 ou 30 100 66 66. Ne ressaisissez pas le meme code plus de 3 fois."
    },
    {
      q: "C'est quoi le credit d'urgence (code *811) ?",
      a: "Quand votre compteur tombe a zero et que vous n'avez pas de ticket de recharge, tapez *811 + Entree sur le clavier du compteur pour activer un credit d'urgence. Ce credit est a rembourser lors de la prochaine recharge. Utilisable une seule fois par periode."
    },
  ]

  return (
    <div className="min-h-screen bg-white">

      {/* HERO */}
      <section className="bg-navy text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-20 lg:py-28 grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
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
            <HeroCard />
          </div>
        </div>
      </section>

      {/* A PROPOS */}
      <section className="py-10 sm:py-20 px-4 sm:px-6 bg-white">
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

      {/* AVANTAGES WOYOFAL */}
      <section className="py-10 sm:py-16 px-4 sm:px-6 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-xs uppercase tracking-widest text-primary font-semibold mb-3">Pourquoi Woyofal ?</p>
            <h2 className="text-2xl font-bold font-display text-navy">L'electricite prepayee sans contraintes</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {[
              { icon: '🚫', title: 'Pas de coupure', desc: 'Aucune interruption pour defaut de paiement. Vous gerez votre budget librement.' },
                { icon: '💸', title: "Pas de frais d'abonnement", desc: "Aucun frais fixe mensuel. Vous payez uniquement l'electricite que vous consommez." },
              { icon: '📄', title: 'Pas de facture bimestrielle', desc: 'Fini les mauvaises surprises. Vous rechargez selon vos moyens, quand vous voulez.' },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="bg-white rounded-2xl border border-gray-100 p-6 text-center">
                <p className="text-3xl mb-3">{icon}</p>
                <p className="font-semibold text-navy text-sm mb-2">{title}</p>
                <p className="text-gray-400 text-xs leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <p className="text-xs uppercase tracking-widest text-primary font-semibold mb-3">Prix d'acces</p>
              <p className="text-navy font-bold text-2xl mb-1">Moins de 5 000 <span className="text-base font-normal text-gray-400">FCFA</span></p>
              <p className="text-gray-400 text-sm">Pour s'equiper d'un compteur Woyofal</p>
              <div className="mt-3 h-px bg-gray-50" />
              <p className="text-navy font-bold text-xl mt-3 mb-1">A partir de 1 000 <span className="text-base font-normal text-gray-400">FCFA</span></p>
              <p className="text-gray-400 text-sm">Credit minimum de rechargement</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <p className="text-xs uppercase tracking-widest text-primary font-semibold mb-3">Alarme integree</p>
              <p className="text-navy font-semibold text-sm mb-3">3 niveaux d'alerte avant epuisement du credit</p>
              <div className="space-y-2">
                {[
                  { c: 'bg-yellow-400', l: 'Niveau 1 — Alerte visuelle faible' },
                  { c: 'bg-orange-400', l: 'Niveau 2 — Alerte visuelle + sonore' },
                  { c: 'bg-red-500', l: 'Niveau 3 — Alarme critique' },
                ].map(({ c, l }) => (
                  <div key={l} className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${c} shrink-0`} />
                    <p className="text-gray-500 text-xs">{l}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* COMMENT CA MARCHE */}
      <section className="py-10 sm:py-20 px-4 sm:px-6 bg-white">
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

      {/* CODES CLAVIER */}
      <section className="py-10 sm:py-16 px-4 sm:px-6 bg-navy text-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-xs uppercase tracking-widest text-white/40 font-semibold mb-3">Codes clavier</p>
            <h2 className="text-2xl font-bold font-display">Tapez le code adequat sur votre compteur</h2>
            <p className="text-white/40 text-sm mt-2">Codes disponibles directement sur le clavier de votre compteur Woyofal</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {[
              { code: '800', label: 'Consommation totale d\'energie' },
              { code: '801', label: 'Credit restant' },
              { code: '804', label: 'Numero du compteur' },
              { code: '808', label: 'Puissance instantanee' },
              { code: '810', label: 'Valeur du decouvert' },
              { code: '811', label: 'Credit d\'urgence (activer a ZERO)' },
              { code: '812', label: 'Desactivation de l\'alarme sonore' },
              { code: '813', label: 'Consommation de la journee precedente' },
              { code: '814', label: 'Consommation du mois en cours (kWh)' },
              { code: '815', label: 'Date de la derniere recharge' },
              { code: '816', label: 'Heure de la derniere recharge' },
              { code: '817', label: 'Montant de la derniere recharge (kWh)' },
              { code: '820', label: 'Consommation du mois precedent' },
              { code: '830', label: 'Code de la derniere recharge' },
            ].map(({ code, label }) => (
              <div key={code} className="flex items-center gap-3 bg-white/5 hover:bg-white/10 rounded-xl px-4 py-3 transition">
                <span className="font-mono font-bold text-primary text-sm shrink-0 w-8">*{code}</span>
                <span className="text-white/70 text-xs leading-snug">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PARTENAIRES RECHARGEMENT */}
      <section className="py-10 sm:py-16 px-4 sm:px-6 bg-white">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-xs uppercase tracking-widest text-primary font-semibold mb-3">Ou recharger ?</p>
            <h2 className="text-2xl font-bold font-display text-navy">Partout au Senegal</h2>
            <p className="text-gray-400 text-sm mt-2">Dans toutes les agences Senelec et chez nos partenaires agrees</p>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            {['Wave', 'Orange Money', 'Free Money', 'E-Money', 'La Poste', 'HEXING', 'Zuulupay', 'BDK', 'ATPS', 'Diotali', 'Agences Senelec'].map((p) => (
              <span key={p} className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-2 text-sm font-medium text-navy">{p}</span>
            ))}
          </div>
          <div className="mt-8 bg-red-50 border border-red-100 rounded-2xl px-6 py-4 flex flex-col sm:flex-row items-center gap-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-primary font-semibold mb-1">Service client</p>
              <p className="text-navy font-bold text-lg">33 867 66 66 <span className="text-gray-400 font-normal text-sm">/ 30 100 66 66</span></p>
              <p className="text-gray-400 text-xs mt-0.5">Depannage, dysfonctionnement, assistance</p>
            </div>
            <div className="sm:ml-auto text-sm text-gray-400 text-center sm:text-right">
              <p>28 rue Vincens — Dakar</p>
              <p>www.senelec.sn</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-10 sm:py-16 px-4 sm:px-6 bg-gray-50">
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
      <section className="bg-navy py-12 sm:py-20 px-4 sm:px-6 text-center text-white">
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
