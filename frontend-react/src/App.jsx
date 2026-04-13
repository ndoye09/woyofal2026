import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom'
import { Home, Calculator, Zap, BookOpen, HelpCircle, Lightbulb, Menu, X, LogIn, LogOut, User, Cpu, History } from 'lucide-react'
import SimulateurRecharge from './components/SimulateurRecharge'
import HomePageSimplified from './components/HomePageSimplified'
import FAQ from './components/FAQ'
import GuideTarifs from './components/GuideTarifs'
import Conseils from './components/Conseils'
import AIChat from './components/AIChat'
import AuthModal from './components/AuthModal'
import LectureCompteur from './components/LectureCompteur'
import HistoriqueConsommation from './components/HistoriqueConsommation'
import ProtectedRoute from './components/ProtectedRoute'
import LoginRequired from './components/LoginRequired'
import { AuthProvider, useAuth } from './context/AuthContext'

// Liens accessibles à tous
const PUBLIC_LINKS = [
  { to: '/', label: 'Accueil', icon: Home },
  { to: '/simulateur', label: 'Simulateur', icon: Calculator },
  { to: '/faq', label: 'FAQ', icon: HelpCircle },
]

// Liens réservés aux utilisateurs connectés
const PRIVATE_LINKS = [
  { to: '/compteur', label: 'Compteur', icon: Cpu },
  { to: '/historique', label: 'Historique', icon: History },
]

function NavBar() {
  const location = useLocation()
  const { isAuth } = useAuth()
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const NAV_LINKS = isAuth ? [...PUBLIC_LINKS, ...PRIVATE_LINKS] : PUBLIC_LINKS

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => { setMobileOpen(false) }, [location.pathname])

  return (
    <nav className={`sticky top-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/95 backdrop-blur-md shadow-card border-b border-gray-200' : 'bg-white shadow-sm border-b border-gray-200'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-[62px]">

          {/* ── Logo ── */}
          <Link to="/" className="flex items-center gap-2.5 group shrink-0">
            <img src="/logo-woyofal.png" alt="Woyofal" className="h-14 w-auto drop-shadow-sm group-hover:drop-shadow-md transition-shadow" />
          </Link>

          {/* ── Desktop links ── */}
          <div className="hidden md:flex items-center gap-0.5 ml-auto mr-3">
            {/* Séparateur visuel entre public et privé */}
            {PUBLIC_LINKS.map(({ to, label, icon: Icon }) => {
              const active = location.pathname === to
              return (
                <Link
                  key={to}
                  to={to}
                  className={`relative flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                    active
                      ? 'text-red-600 bg-red-50 font-semibold'
                      : 'text-gray-600 hover:text-black hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                  {active && (
                    <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                  )}
                </Link>
              )
            })}

            {isAuth && (
              <>
                <span className="w-px h-5 bg-slate-200 mx-1" />
                {PRIVATE_LINKS.map(({ to, label, icon: Icon }) => {
                  const active = location.pathname === to
                  return (
                    <Link
                      key={to}
                      to={to}
                      className={`relative flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                        active
                          ? 'text-red-600 bg-red-50 font-semibold'
                          : 'text-gray-600 hover:text-black hover:bg-gray-100'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {label}
                      {active && (
                        <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-red-600" />
                      )}
                    </Link>
                  )
                })}
              </>
            )}
          </div>

          {/* ── Auth + Mobile toggle ── */}
          <div className="flex items-center gap-2">
            <AuthButton />
            <button
              onClick={() => setMobileOpen(o => !o)}
              className="md:hidden p-2 rounded-xl hover:bg-gray-100 text-gray-600 transition"
              aria-label="Menu"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* ── Mobile menu ── */}
      {mobileOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 px-4 pb-4 pt-2 animate-in shadow-lg">
          {/* Liens publics */}
          {PUBLIC_LINKS.map(({ to, label, icon: Icon }) => {
            const active = location.pathname === to
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium mb-0.5 transition ${
                  active ? 'bg-red-50 text-red-600 font-semibold' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            )
          })}

          {isAuth && (
            <>
              {/* Séparateur Mon espace */}
              <div className="flex items-center gap-2 my-2 px-3">
                <div className="flex-1 h-px bg-slate-100" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Mon espace</span>
                <div className="flex-1 h-px bg-slate-100" />
              </div>

              {/* Liens privés */}
              {PRIVATE_LINKS.map(({ to, label, icon: Icon }) => {
                const active = location.pathname === to
                return (
                  <Link
                    key={to}
                    to={to}
                    className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium mb-0.5 transition ${
                      active ? 'bg-red-50 text-red-600 font-semibold' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </Link>
                )
              })}
            </>
          )}
        </div>
      )}
    </nav>
  )
}

function AuthButton() {
  const { user, isAuth, logout } = useAuth()
  const [showModal, setShowModal] = useState(false)
  const [showMenu, setShowMenu]   = useState(false)

  if (isAuth && user) {
    return (
      <div className="relative">
        <button
          onClick={() => setShowMenu(m => !m)}
          className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 hover:border-primary/40 hover:bg-primary/4 text-sm font-medium text-slate-700 transition"
        >
          <div className="w-6 h-6 rounded-lg bg-primary-gradient flex items-center justify-center">
            <User size={12} className="text-white" />
          </div>
          {user.name.split(' ')[0]}
        </button>
        {showMenu && (
          <div className="absolute right-0 mt-2 w-44 bg-white rounded-2xl shadow-card-hover border border-slate-100 py-2 z-50 animate-fade-up">
            <div className="px-4 py-2 border-b border-slate-100">
              <p className="text-xs font-medium text-slate-800 truncate">{user.name}</p>
              <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
            </div>
            <button
              onClick={() => { logout(); setShowMenu(false) }}
              className="flex items-center gap-2 w-full px-4 py-2 text-sm text-danger hover:bg-danger/5 transition"
            >
              <LogOut size={14} /> Déconnexion
            </button>
          </div>
        )}
      </div>
    )
  }
  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 hover:border-black/40 hover:bg-black/4 text-sm font-medium text-gray-700 transition"
      >
        <LogIn size={14} /> Connexion
      </button>
      {showModal && <AuthModal onClose={() => setShowModal(false)} />}
    </>
  )
}

function Footer() {
  return (
    <footer className="bg-black text-white mt-16">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row items-start justify-between mb-8">
          <div className="flex-1 max-w-md">
            <span className="font-bold text-lg mb-3 block">Woyofal</span>
            <p className="text-sm text-gray-400 leading-relaxed">
              La plateforme de simulation la plus complète pour les tarifs Sénelec 2026. DPP, PPP, calcul inverse, dashboard analytique.
            </p>
          </div>
          <div className="flex gap-12 text-sm mt-6 md:mt-0">
            {PUBLIC_LINKS.map(({ to, label }) => (
              <Link key={to} to={to} className="text-gray-400 hover:text-white transition">{label}</Link>
            ))}
          </div>
        </div>
        <div className="border-t border-gray-800 pt-6 text-center text-xs text-gray-500">
          <p>© 2026 Woyofal — Tarifs Sénelec</p>
        </div>
      </div>
    </footer>
  )
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="min-h-screen bg-slate-50 flex flex-col">
          <NavBar />
          <main className="flex-1">
            <Routes>
              {/* ── Routes publiques ── */}
              <Route path="/" element={<HomePageSimplified />} />
              <Route path="/simulateur" element={<SimulateurRecharge />} />
              <Route path="/tarifs" element={<GuideTarifs />} />
              <Route path="/conseils" element={<Conseils />} />
              <Route path="/faq" element={<FAQ />} />

              {/* ── Page d'accès refusé ── */}
              <Route path="/connexion-requise" element={<LoginRequired />} />

              {/* ── Routes protégées (connexion requise) ── */}
              <Route path="/compteur" element={
                <ProtectedRoute><LectureCompteur /></ProtectedRoute>
              } />
              <Route path="/historique" element={
                <ProtectedRoute><HistoriqueConsommation /></ProtectedRoute>
              } />
            </Routes>
          </main>
          <Footer />
          <AIChat />
        </div>
      </AuthProvider>
    </Router>
  )
}

export default App
