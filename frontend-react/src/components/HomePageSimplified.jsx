import React, { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Calculator, BookOpen, Zap, ChevronDown, Sparkles, Lightbulb, MapPin, Phone } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

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

export default function HomePageSimplified() {
  const [faqOpen, setFaqOpen] = useState(null)
  const { isAuth } = useAuth()

  return (
    <div className="min-h-screen bg-white">
      {/* HERO - Titre + CTAs + Calculateur */}
      <div className="max-w-5xl mx-auto px-4 py-20 lg:py-32 text-center">
        <h1 className="text-5xl lg:text-6xl font-display font-bold text-black mb-4">
          Maîtrisez votre
          <span className="block text-red-600">consommation</span>
        </h1>

        <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto">
          Calculez les kWh, suivez votre conso avec les tarifs Senelec 2026
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-20">
          <Link to="/simulateur" className="px-8 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-all inline-flex items-center justify-center gap-2 shadow-md hover:shadow-lg">
            <Zap className="w-4 h-4" />
            Simulateur
          </Link>
          <Link to="/tarifs" className="px-8 py-3 bg-black text-white rounded-lg font-semibold hover:bg-gray-900 transition-all inline-flex items-center justify-center gap-2 shadow-md hover:shadow-lg">
            <BookOpen className="w-4 h-4" />
            Tarifs
          </Link>
          <Link to="/conseils" className="px-8 py-3 border-2 border-black text-black rounded-lg font-semibold hover:bg-black hover:text-white transition-all">
            Conseils
          </Link>
        </div>

        {/* Calculateur */}
        <div className="mb-16">
          <MiniCalcNew />
        </div>
      </div>

      {/* À PROPOS DE WOYOFAL - Masqué si connecté */}
      {!isAuth && (
      <div className="bg-gray-50 py-16 mb-8">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-black mb-12 text-center">Woyofal : Électricité Prépayée Simple & Sûre</h2>
          
          <div className="grid lg:grid-cols-2 gap-8 mb-12">
            {/* Comment recharger */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-red-600" />
                </div>
                <h3 className="font-bold text-black text-lg">Recharger en 5 étapes</h3>
              </div>
              <ol className="space-y-2 text-sm text-gray-700 list-decimal list-inside">
                <li>Assurez-vous que votre clavier est bien connecté</li>
                <li>Branchez-le sur une prise électrique</li>
                <li>Attendez 2 minutes, le message "CONNECT" s'affiche</li>
                <li>Vérifiez les 11 chiffres sur l'écran du compteur</li>
                <li>Entrez votre code de recharge pour confirmer</li>
              </ol>
            </div>

            {/* Caractéristiques */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                  <Lightbulb className="w-5 h-5 text-red-600" />
                </div>
                <h3 className="font-bold text-black text-lg">Avantages Woyofal</h3>
              </div>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex gap-2">
                  <span className="text-red-600 font-bold">✓</span>
                  <span className="font-semibold">Maîtrisez votre budget</span> — Payez comme vous consommez
                </li>
                <li className="flex gap-2">
                  <span className="text-red-600 font-bold">✓</span>
                  <span className="font-semibold">Interface simple</span> — Consultez votre consommation en temps réel
                </li>
                <li className="flex gap-2">
                  <span className="text-red-600 font-bold">✓</span>
                  <span className="font-semibold">Zéro frais sueurs</span> — Pas d'abonnement, pas de couverture, pas d'accès
                </li>
              </ul>
            </div>
          </div>

          {/* Devenir client + Où recharger */}
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Devenir client */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-all">
              <h3 className="font-bold text-black text-lg mb-4">Devenir client Woyofal</h3>
              <div className="space-y-4 text-sm">
                <div>
                  <p className="font-semibold text-black mb-2">📋 Documents requis :</p>
                  <ul className="space-y-1 text-gray-700 ml-4">
                    <li>• Attestation de conformité électrique</li>
                    <li>• Liste de vos appareils électriques</li>
                    <li>• Titre d'occupation légal</li>
                    <li>• Pièce d'identité valide</li>
                  </ul>
                </div>
                <div className="bg-red-50 border border-red-100 rounded-lg p-3">
                  <p className="text-xs text-red-700"><span className="font-bold">ℹ️ Note :</span> Une fois la demande formulée, Senelec vérifie la conformité, puis la reconversion au Woyofal est gratuite.</p>
                </div>
              </div>
            </div>

            {/* Où recharger */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-red-600" />
                </div>
                <h3 className="font-bold text-black text-lg">Où recharger ?</h3>
              </div>
              <p className="text-sm text-gray-700 mb-4">Disponible dans tous les points Senelec et chez nos partenaires agréés :</p>
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-700 font-semibold">
                <div>• POINT TOUCH</div>
                <div>• LA POSTE</div>
                <div>• Orange Money</div>
                <div>• Free Money</div>
                <div>• HEXING</div>
                <div>• Wgwe</div>
                <div>• ATPS</div>
                <div>• diotali</div>
              </div>
            </div>
          </div>

          {/* Contact */}
          <div className="mt-8 bg-black text-white rounded-xl p-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Phone className="w-5 h-5 text-red-400" />
              <span className="font-bold text-lg">Support disponible</span>
            </div>
            <p className="text-2xl font-bold text-red-400 mb-2">33 867 66 66 / 30 100 66 66</p>
            <p className="text-sm text-gray-300">28 rue Vincens, Dakar Sénégal | www.senelec.sn</p>
          </div>
        </div>
      </div>
      )}

      {/* FAQ Compact - Masqué si connecté */}
      {!isAuth && (
      <div className="max-w-4xl mx-auto px-4 py-16 border-t border-gray-200">
        <h2 className="text-2xl font-bold text-black mb-8">Questions ?</h2>
        <div className="space-y-3 max-w-2xl">
          {[
            { q: 'Combien de kWh pour 10 000 FCFA ?', a: 'Environ 91 kWh sans redevance.' },
            { q: 'DPP vs PPP ?', a: 'DPP pour ménages (82 F/kWh T1), PPP pour pros (147 F/kWh T1).' },
            { q: 'Mode inverse ?', a: 'Entrez les kWh souhaités et obtenez le montant à recharger.' },
            { q: 'Données sécurisées ?', a: 'Oui. Chiffrement SSL, authentification JWT, aucune vente.' },
          ].map((item, i) => (
            <button key={i} onClick={() => setFaqOpen(faqOpen === i ? null : i)} className="w-full text-left bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg p-4 transition-all">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-black text-sm">{item.q}</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${faqOpen === i ? 'rotate-180' : ''}`} />
              </div>
              {faqOpen === i && <p className="text-gray-600 text-sm mt-3">{item.a}</p>}
            </button>
          ))}
        </div>
      </div>
      )}

      {/* Footer CTA - Masqué si connecté */}
      {!isAuth && (
      <div className="max-w-4xl mx-auto px-4 py-12 mb-20 text-center text-gray-600 border-t border-gray-200">
        <p className="text-sm">Voir aussi : <Link to="/historique" className="underline font-semibold hover:text-black">Historique</Link> • <Link to="/lecture-compteur" className="underline font-semibold hover:text-black">Guide compteur</Link></p>
      </div>
      )}
    </div>
  )
}

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
    <div className="bg-white border-2 border-gray-200 rounded-2xl p-8 max-w-sm mx-auto hover:border-red-400 transition-all shadow-lg hover:shadow-xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <span className="font-bold text-black">Calcul Rapide</span>
      </div>

      <div className="mb-6">
        <div className="flex justify-between mb-2 text-sm">
          <span className="text-gray-700 font-semibold">Montant (FCFA)</span>
          <span className="text-black font-bold">{montant.toLocaleString()} F</span>
        </div>
        <input type="range" min="500" max="50000" step="500" value={montant} onChange={e => setMontant(+e.target.value)} className="w-full h-2 bg-gray-200 rounded-full cursor-pointer accent-red-600" />
      </div>

      <label className="flex items-center gap-3 mb-8 cursor-pointer">
        <div onClick={() => setRedevance(!redevance)} className={`relative w-10 h-5 rounded-full transition-all ${redevance ? 'bg-red-600' : 'bg-gray-300'}`}>
          <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${redevance ? 'right-0.5' : 'left-0.5'}`} />
        </div>
        <span className="text-sm text-gray-700 font-semibold">Première recharge</span>
      </label>

      <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-6 text-center">
        <div className="text-xs text-red-600 font-semibold mb-2">Vous obtiendrez</div>
        <div className="text-4xl font-bold text-red-600 mb-1">
          {total.toFixed(1)} <span className="text-lg text-red-500 font-normal">kWh</span>
        </div>
        <div className="text-xs text-gray-600">{(montant / Math.max(1, total)).toFixed(1)} FCFA/kWh</div>
      </div>

      <div className="mb-6">
        <div className="flex justify-between text-xs text-gray-600 font-semibold mb-2">
          <span>Tranche {total <= 150 ? '1' : '2+'}</span>
          <span>{pct.toFixed(0)}% / 150 kWh</span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-red-600' : 'bg-black'}`} style={{ width: `${Math.min(100, pct)}%` }} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6 text-xs">
        <div className="bg-gray-100 rounded-lg p-3 text-center">
          <div className="font-bold text-black">{kwh_t1.toFixed(1)}</div>
          <div className="text-gray-600">kWh T1</div>
        </div>
        <div className="bg-gray-100 rounded-lg p-3 text-center">
          <div className="font-bold text-black">{kwh_t2.toFixed(1)}</div>
          <div className="text-gray-600">kWh T2+</div>
        </div>
      </div>

      <Link to="/simulateur" className="block w-full text-center py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-all shadow-md hover:shadow-lg">
        Simulateur complet
      </Link>
    </div>
  )
}
