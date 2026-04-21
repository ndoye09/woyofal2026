import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, Zap, BarChart2, Trash2, RefreshCw, ShieldCheck, LogOut, TrendingUp } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const ADMIN_EMAIL = 'admin@woyofal.sn'

const getUsers = () => {
  try { return JSON.parse(localStorage.getItem('woyofal_users_db') || '{}') } catch { return {} }
}

const getRecharges = () => {
  try { return JSON.parse(localStorage.getItem('woyofal_recharges') || '[]') } catch { return [] }
}

function StatCard({ icon: Icon, label, value, color = 'blue' }) {
  const colors = {
    blue:    'bg-blue-50 text-blue-600 border-blue-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    violet:  'bg-violet-50 text-violet-600 border-violet-100',
    orange:  'bg-orange-50 text-orange-600 border-orange-100',
  }
  return (
    <div className={`rounded-2xl border p-5 flex items-center gap-4 ${colors[color]}`}>
      <div className="w-12 h-12 rounded-xl bg-white/60 flex items-center justify-center">
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-2xl font-bold font-display">{value}</p>
        <p className="text-sm font-medium opacity-80">{label}</p>
      </div>
    </div>
  )
}

export default function AdminPanel() {
  const { user, logout, token } = useAuth()
  const navigate = useNavigate()
  const [users, setUsers]       = useState({})
  const [recharges, setRecharges] = useState([])
  const [refresh, setRefresh]   = useState(0)

  // Garde admin — attendre que le token soit résolu avant de rediriger
  useEffect(() => {
    if (token !== null && (!user || user.email !== ADMIN_EMAIL)) {
      navigate('/', { replace: true })
    }
  }, [user, token])

  useEffect(() => {
    setUsers(getUsers())
    setRecharges(getRecharges())
  }, [refresh])

  const userList     = Object.values(users)
  const totalKwh     = recharges.reduce((s, r) => s + (r.kwh_obtenus || 0), 0)
  const totalFcfa    = recharges.reduce((s, r) => s + (r.montant_brut || 0), 0)

  const trancheDist = recharges.reduce((acc, r) => {
    const t = `T${r.tranche_finale}`
    acc[t] = (acc[t] || 0) + 1
    return acc
  }, {})

  const deleteUser = (email) => {
    const db = getUsers()
    delete db[email]
    localStorage.setItem('woyofal_users_db', JSON.stringify(db))
    setRefresh(r => r + 1)
  }

  const clearRecharges = () => {
    localStorage.removeItem('woyofal_recharges')
    setRefresh(r => r + 1)
  }

  if (!user || user.email !== ADMIN_EMAIL) return (
    <div className="min-h-[60vh] flex items-center justify-center text-slate-400">Chargement…</div>
  )

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary-gradient flex items-center justify-center shadow-glow">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-display text-slate-900">Panneau Admin</h1>
            <p className="text-sm text-slate-500">Connecté en tant que {user.email}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setRefresh(r => r + 1)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition"
          >
            <RefreshCw className="w-4 h-4" /> Actualiser
          </button>
          <button
            onClick={() => { logout(); navigate('/') }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-200 text-sm text-red-600 hover:bg-red-50 transition"
          >
            <LogOut className="w-4 h-4" /> Déconnexion
          </button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Users}     label="Utilisateurs inscrits" value={userList.length}              color="blue" />
        <StatCard icon={Zap}       label="Simulations sauvegardées" value={recharges.length}           color="emerald" />
        <StatCard icon={BarChart2} label="kWh simulés au total" value={totalKwh.toFixed(0)}            color="violet" />
        <StatCard icon={TrendingUp} label="FCFA simulés au total" value={`${(totalFcfa/1000).toFixed(0)}k`} color="orange" />
      </div>

      {/* Distribution tranches */}
      {recharges.length > 0 && (
        <div className="card mb-6">
          <h2 className="font-semibold font-display text-slate-800 mb-4">Distribution des tranches (simulations)</h2>
          <div className="flex gap-3 flex-wrap">
            {['T1', 'T2', 'T3'].map(t => {
              const count = trancheDist[t] || 0
              const pct   = recharges.length ? Math.round((count / recharges.length) * 100) : 0
              const colors = { T1: 'bg-emerald-100 text-emerald-700', T2: 'bg-amber-100 text-amber-700', T3: 'bg-red-100 text-red-700' }
              return (
                <div key={t} className={`flex-1 min-w-[100px] rounded-xl px-4 py-3 text-center ${colors[t]}`}>
                  <p className="text-xl font-bold">{count}</p>
                  <p className="text-xs font-semibold">{t} — {pct}%</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Utilisateurs inscrits */}
      <div className="card mb-6">
        <h2 className="font-semibold font-display text-slate-800 mb-4 flex items-center gap-2">
          <Users className="w-4 h-4" /> Utilisateurs inscrits ({userList.length})
        </h2>
        {userList.length === 0 ? (
          <p className="text-sm text-slate-400 py-4 text-center">Aucun utilisateur inscrit.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-2 px-3 font-semibold text-slate-600">Nom</th>
                  <th className="text-left py-2 px-3 font-semibold text-slate-600">Email</th>
                  <th className="text-left py-2 px-3 font-semibold text-slate-600">ID</th>
                  <th className="py-2 px-3"></th>
                </tr>
              </thead>
              <tbody>
                {userList.map(u => (
                  <tr key={u.email} className="border-b border-slate-50 hover:bg-slate-50 transition">
                    <td className="py-2 px-3 font-medium text-slate-800">{u.name}</td>
                    <td className="py-2 px-3 text-slate-600">{u.email}</td>
                    <td className="py-2 px-3 text-slate-400 font-mono text-xs">{u.id}</td>
                    <td className="py-2 px-3 text-right">
                      <button
                        onClick={() => deleteUser(u.email)}
                        className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition"
                        title="Supprimer cet utilisateur"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Dernières simulations */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold font-display text-slate-800 flex items-center gap-2">
            <Zap className="w-4 h-4" /> Dernières simulations ({recharges.length})
          </h2>
          {recharges.length > 0 && (
            <button
              onClick={clearRecharges}
              className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 border border-red-200 hover:bg-red-50 px-2.5 py-1.5 rounded-lg transition"
            >
              <Trash2 className="w-3 h-3" /> Tout effacer
            </button>
          )}
        </div>
        {recharges.length === 0 ? (
          <p className="text-sm text-slate-400 py-4 text-center">Aucune simulation enregistrée.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-2 px-3 font-semibold text-slate-600">Date</th>
                  <th className="text-left py-2 px-3 font-semibold text-slate-600">Montant</th>
                  <th className="text-left py-2 px-3 font-semibold text-slate-600">kWh</th>
                  <th className="text-left py-2 px-3 font-semibold text-slate-600">Tranche</th>
                  <th className="text-left py-2 px-3 font-semibold text-slate-600">Type</th>
                </tr>
              </thead>
              <tbody>
                {recharges.slice(0, 20).map((r, i) => {
                  const trancheColors = { 1: 'text-emerald-600', 2: 'text-amber-600', 3: 'text-red-600' }
                  return (
                    <tr key={i} className="border-b border-slate-50 hover:bg-slate-50 transition">
                      <td className="py-2 px-3 text-slate-400 text-xs">{new Date(r.date).toLocaleString('fr-SN')}</td>
                      <td className="py-2 px-3 font-medium text-slate-800">{(r.montant_brut || 0).toLocaleString()} F</td>
                      <td className="py-2 px-3 text-slate-700">{(r.kwh_obtenus || 0).toFixed(2)} kWh</td>
                      <td className={`py-2 px-3 font-bold ${trancheColors[r.tranche_finale] || ''}`}>T{r.tranche_finale}</td>
                      <td className="py-2 px-3 text-slate-500">{r.type_compteur || '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {recharges.length > 20 && (
              <p className="text-xs text-slate-400 text-center pt-3">Affichage des 20 dernières sur {recharges.length}</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
