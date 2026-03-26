import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom'
import { Home, Calculator, BarChart3, Zap, BookOpen, HelpCircle, Lightbulb, Menu, X, LogIn, LogOut, User, Cpu, History } from 'lucide-react'
import SimulateurRecharge from './components/SimulateurRecharge'
import Dashboard from './components/Dashboard'
import HomePage from './components/HomePage'
import FAQ from './components/FAQ'
import GuideTarifs from './components/GuideTarifs'
import Conseils from './components/Conseils'
import AIChat from './components/AIChat'
import AuthModal from './components/AuthModal'
import LectureCompteur from './components/LectureCompteur'
import HistoriqueConsommation from './components/HistoriqueConsommation'
import { AuthProvider, useAuth } from './context/AuthContext'

const NAV_LINKS = [
  { to: '/', label: 'Accueil', icon: Home },
  { to: '/compteur', label: 'Compteur', icon: Cpu },
  { to: '/simulateur', label: 'Simulateur', icon: Calculator },
  { to: '/historique', label: 'Historique', icon: History },
  { to: '/tarifs', label: 'Tarifs 2026', icon: BookOpen },
  { to: '/conseils', label: 'Conseils', icon: Lightbulb },
  { to: '/faq', label: 'FAQ', icon: HelpCircle },
  { to: '/dashboard', label: 'Dashboard', icon: BarChart3 },
]

function NavBar() {
  const location = useLocation()
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => { setMobileOpen(false) }, [location.pathname])

  return (
    <nav className={`sticky top-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/95 backdrop-blur-md shadow-card border-b border-slate-100' : 'bg-white shadow-sm border-b border-slate-100'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-[62px]">

          {/* ── Logo ── */}
          <Link to="/" className="flex items-center gap-2.5 group shrink-0">
            <div className="w-8 h-8 rounded-xl bg-primary-gradient flex items-center justify-center shadow-[0_2px_10px_rgba(0,87,255,0.4)] group-hover:shadow-glow transition-all">
              <Zap className="w-4.5 h-4.5 text-white" strokeWidth={2.5} />
            </div>
            <span className="font-display text-lg font-extrabold text-slate-900 tracking-tight">
              Woyofal
            </span>
            <span className="hidden sm:flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block"></span>
              2026
            </span>
          </Link>

          {/* ── Desktop links ── */}
          <div className="hidden md:flex items-center gap-0.5">
            {NAV_LINKS.map(({ to, label, icon: Icon }) => {
              const active = location.pathname === to
              return (
                <Link
                  key={to}
                  to={to}
                  className={`relative flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                    active
                      ? 'text-primary bg-primary/8 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
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
          </div>

          {/* ── CTA + Auth + Mobile toggle ── */}
          <div className="flex items-center gap-2">
            <Link
              to="/simulateur"
              className="hidden sm:flex btn-primary py-2 px-4 text-sm"
            >
              <Calculator className="w-3.5 h-3.5" />
              Simuler
            </Link>
            <AuthButton />
            <button
              onClick={() => setMobileOpen(o => !o)}
              className="md:hidden p-2 rounded-xl hover:bg-slate-100 text-slate-600 transition"
              aria-label="Menu"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* ── Mobile menu ── */}
      {mobileOpen && (
        <div className="md:hidden bg-white border-t border-slate-100 px-4 pb-4 pt-2 animate-in shadow-lg">
          {NAV_LINKS.map(({ to, label, icon: Icon }) => {
            const active = location.pathname === to
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium mb-0.5 transition ${
                  active ? 'bg-primary/8 text-primary font-semibold' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            )
          })}
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
        className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:border-primary/40 hover:bg-primary/4 text-sm font-medium text-slate-700 transition"
      >
        <LogIn size={14} /> Connexion
      </button>
      {showModal && <AuthModal onClose={() => setShowModal(false)} />}
    </>
  )
}

function Footer() {
  return (
    <footer className="bg-navy text-slate-400 mt-16">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row items-start gap-8 mb-8">
          <div className="flex-1">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-7 h-7 rounded-lg bg-primary-gradient flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" strokeWidth={2.5} />
              </div>
              <span className="font-display font-extrabold text-white text-lg">Woyofal</span>
            </div>
            <p className="text-sm max-w-sm leading-relaxed">
              La plateforme de simulation la plus complète pour les tarifs Sénelec 2026. DPP, PPP, calcul inverse, dashboard analytique.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-x-12 gap-y-2 text-sm">
            {NAV_LINKS.map(({ to, label }) => (
              <Link key={to} to={to} className="hover:text-white transition py-1">{label}</Link>
            ))}
          </div>
        </div>
        <div className="border-t border-white/8 pt-6 flex flex-col sm:flex-row justify-between items-center gap-2 text-xs">
          <span>© 2026 Woyofal — Tarifs Sénelec officiels</span>
          <span className="text-slate-500">Données indicatives. Vérifiez auprès de Sénelec.</span>
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
              <Route path="/" element={<HomePage />} />
              <Route path="/compteur" element={<LectureCompteur />} />
              <Route path="/simulateur" element={<SimulateurRecharge />} />
              <Route path="/historique" element={<HistoriqueConsommation />} />
              <Route path="/tarifs" element={<GuideTarifs />} />
              <Route path="/conseils" element={<Conseils />} />
              <Route path="/faq" element={<FAQ />} />
              <Route path="/dashboard" element={<Dashboard />} />
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
