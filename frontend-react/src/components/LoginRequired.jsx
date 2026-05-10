import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ShieldCheck, LogIn, UserPlus, Zap } from 'lucide-react'
import AuthModal from './AuthModal'
import { useAuth } from '../context/AuthContext'

const LABELS = {
  '/compteur':   'Lecture de compteur',
  '/historique': 'Historique de consommation',
  '/dashboard':  'Dashboard analytique',
}

export default function LoginRequired() {
  const location  = useLocation()
  const navigate  = useNavigate()
  const { isAuth } = useAuth()
  const [showModal, setShowModal] = useState(false)
  const [modalTab, setModalTab]   = useState('login')

  const openModal = (tab) => { setModalTab(tab); setShowModal(true) }

  const from    = location.state?.from || '/'
  const pageName = LABELS[from] || 'cette page'

  // Si l'utilisateur vient de se connecter via le modal, rediriger
  if (isAuth) {
    navigate(from, { replace: true })
    return null
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">

        {/* Icône */}
        <div className="mx-auto mb-6 w-20 h-20 rounded-3xl bg-primary-gradient flex items-center justify-center shadow-glow">
          <ShieldCheck className="w-10 h-10 text-white" />
        </div>

        <h1 className="font-display text-2xl font-extrabold text-slate-900 mb-2">
          Accès réservé
        </h1>
        <p className="text-slate-500 mb-1">
          La section <span className="font-semibold text-slate-700">{pageName}</span> est réservée aux utilisateurs connectés.
        </p>
        <p className="text-slate-400 text-sm mb-8">
          Créez un compte gratuit ou connectez-vous pour continuer.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => openModal('login')}
            className="btn-primary flex items-center justify-center gap-2 py-3 px-6"
          >
            <LogIn className="w-4 h-4" />
            Se connecter
          </button>
          <button
            onClick={() => openModal('register')}
            className="flex items-center justify-center gap-2 py-3 px-6 rounded-2xl border-2 border-primary text-primary font-semibold hover:bg-primary/5 transition"
          >
            <UserPlus className="w-4 h-4" />
            Créer un compte
          </button>
        </div>

        {/* Lien retour accueil */}
        <button
          onClick={() => navigate('/')}
          className="mt-6 text-sm text-slate-400 hover:text-slate-600 underline underline-offset-2 transition"
        >
          ← Retour à l'accueil
        </button>

        {/* Features */}
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
          {[
            { icon: '⚡', title: 'Compteur', desc: 'Lisez et estimez votre compteur Woyofal' },
            { icon: '📊', title: 'Historique', desc: 'Suivez votre consommation dans le temps' },
            { icon: '📈', title: 'Dashboard', desc: 'Analyses et statistiques avancées' },
          ].map(({ icon, title, desc }) => (
            <div key={title} className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
              <div className="text-2xl mb-2">{icon}</div>
              <p className="text-sm font-semibold text-slate-800">{title}</p>
              <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {showModal && <AuthModal onClose={() => setShowModal(false)} pageToRedirect={from} defaultTab={modalTab} />}
    </div>
  )
}
