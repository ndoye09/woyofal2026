import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Mail, Lock, User, LogIn, UserPlus, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

/* ── Auth client-side (pas de backend requis) ── */
const USERS_KEY = 'woyofal_users_db'
const genToken  = () => Math.random().toString(36).slice(2) + Date.now().toString(36)

const getUsers = () => {
  try { return JSON.parse(localStorage.getItem(USERS_KEY) || '{}') } catch { return {} }
}
const saveUsers = (db) => localStorage.setItem(USERS_KEY, JSON.stringify(db))

const mockLogin = (email, password) => {
  const db = getUsers()
  // Compte démo par défaut
  const defaults = {
    'demo@woyofal.sn':  { id: '1', name: 'Utilisateur Démo', email: 'demo@woyofal.sn',  password: 'woyofal2026' },
    'test@woyofal.sn':  { id: '2', name: 'Test User',        email: 'test@woyofal.sn',  password: 'password123' },
    'admin@woyofal.sn': { id: '0', name: 'Administrateur',   email: 'admin@woyofal.sn', password: 'admin2026!!' },
  }
  const user = db[email] || defaults[email]
  if (!user || user.password !== password) return null
  return { user: { id: user.id, name: user.name, email: user.email }, token: genToken(), refresh: genToken() }
}

const mockRegister = (email, password, name) => {
  const db = getUsers()
  if (db[email]) return { error: 'Cet email est déjà utilisé.' }
  const newUser = { id: String(Date.now()), name, email, password }
  db[email] = newUser
  saveUsers(db)
  return { user: { id: newUser.id, name: newUser.name, email: newUser.email }, token: genToken(), refresh: genToken() }
}

export default function AuthModal({ onClose, pageToRedirect, defaultTab = 'login' }) {
  const { login } = useAuth()
  const navigate  = useNavigate()
  const [tab, setTab]       = useState(defaultTab)   // 'login' | 'register'
  const [loading, setLoading] = useState(false)
  const [showPwd, setShowPwd] = useState(false)
  const [error, setError]   = useState(null)
  const [success, setSuccess] = useState(null)

  const [form, setForm] = useState({ email: '', password: '', name: '' })
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const reset = () => {
    setError(null); setSuccess(null)
    setForm({ email: '', password: '', name: '' })
  }

  const switchTab = (t) => { setTab(t); reset() }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null); setLoading(true)
    try {
      const email = form.email.trim().toLowerCase()
      let result

      if (tab === 'login') {
        result = mockLogin(email, form.password)
        if (!result) { setError('Email ou mot de passe incorrect.'); setLoading(false); return }
        login(result.user, result.token, result.refresh)
        setSuccess(`Bienvenue ${result.user.name} !`)
        setTimeout(() => {
          onClose()
          if (pageToRedirect) navigate(pageToRedirect, { replace: true })
        }, 900)
      } else {
        if (!form.name.trim()) { setError('Veuillez entrer votre nom.'); setLoading(false); return }
        result = mockRegister(email, form.password, form.name.trim())
        if (result.error) { setError(result.error); setLoading(false); return }
        setSuccess('Compte créé avec succès ! Connectez-vous pour accéder à votre espace.')
        setTimeout(() => {
          reset()
          setTab('login')
        }, 1800)
      }
    } catch {
      setError('Une erreur est survenue.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-card-hover overflow-hidden animate-fade-up">

        {/* Header */}
        <div className="bg-primary-gradient px-8 pt-8 pb-6 text-white">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-xl bg-white/15 hover:bg-white/25 transition"
            aria-label="Fermer"
          >
            <X size={18} />
          </button>
          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center mb-4">
            <span className="text-2xl">⚡</span>
          </div>
          <h2 className="text-xl font-display font-bold">
            {tab === 'login' ? 'Connexion' : 'Créer un compte'}
          </h2>
          <p className="text-white/70 text-sm mt-1">
            {tab === 'login' ? 'Accédez à votre espace Woyofal' : 'Rejoignez la plateforme Woyofal'}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100">
          {['login', 'register'].map(t => (
            <button
              key={t}
              onClick={() => switchTab(t)}
              className={`flex-1 py-3 text-sm font-medium transition ${
                tab === t
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t === 'login' ? 'Connexion' : 'Inscription'}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-8 space-y-4">
          {success && (
            <div className="flex items-center gap-2 text-sm text-success bg-success/10 rounded-xl px-4 py-3">
              <CheckCircle size={16} />{success}
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 text-sm text-danger bg-danger/10 rounded-xl px-4 py-3">
              <AlertCircle size={16} />{error}
            </div>
          )}

          {tab === 'register' && (
            <div>
              <label className="label">Nom complet</label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={set('name')}
                  placeholder="Ex : Awa Diallo"
                  className="input-field pl-9"
                  maxLength={80}
                />
              </div>
            </div>
          )}

          <div>
            <label className="label">Email</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                required
                value={form.email}
                onChange={set('email')}
                placeholder="vous@example.com"
                className="input-field pl-9"
                autoComplete="email"
                maxLength={254}
              />
            </div>
          </div>

          <div>
            <label className="label">Mot de passe</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type={showPwd ? 'text' : 'password'}
                required
                value={form.password}
                onChange={set('password')}
                placeholder={tab === 'register' ? '8 caractères minimum' : '••••••••'}
                className="input-field pl-9 pr-10"
                autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
                minLength={tab === 'register' ? 8 : undefined}
              />
              <button
                type="button"
                onClick={() => setShowPwd(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                tabIndex={-1}
              >
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full mt-2 flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : tab === 'login' ? (
              <><LogIn size={16} /> Connexion</>
            ) : (
              <><UserPlus size={16} /> Créer mon compte</>
            )}
          </button>

          <p className="text-center text-xs text-gray-500 mt-2">
            {tab === 'login' ? "Pas encore de compte ? " : "Déjà inscrit ? "}
            <button
              type="button"
              onClick={() => switchTab(tab === 'login' ? 'register' : 'login')}
              className="text-primary font-medium hover:underline"
            >
              {tab === 'login' ? "S'inscrire" : 'Se connecter'}
            </button>
          </p>
        </form>
      </div>
    </div>
  )
}
