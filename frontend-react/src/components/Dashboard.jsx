import React, { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Zap, TrendingUp, Calendar, BarChart3, Calculator } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getMySimulations } from '../services/api'
import { useAuth } from '../context/AuthContext'

const fmt = (n) => Math.round(n).toLocaleString('fr-FR')
const fmtKwh = (n) => parseFloat(n).toFixed(2)
const fmtDate = (iso) => {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

const TRANCHE_STYLES = {
  1: 'bg-green-100 text-green-800',
  2: 'bg-amber-100 text-amber-800',
  3: 'bg-red-100 text-red-800',
}

const KpiCard = ({ icon: Icon, label, value, sub, color }) => (
  <div className={`card bg-gradient-to-br ${color} border-0`}>
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide opacity-70 mb-1">{label}</p>
        <p className="text-2xl font-extrabold">{value}</p>
        {sub && <p className="text-xs opacity-60 mt-1">{sub}</p>}
      </div>
      <Icon className="w-9 h-9 opacity-30" />
    </div>
  </div>
)

const Dashboard = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [simulations, setSimulations] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getMySimulations(50)
      setSimulations(data.simulations || [])
      setStats(data.stats || null)
    } catch (e) {
      console.error(e)
      setError('Impossible de charger vos données.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto mt-20 text-center">
        <p className="text-red-500 mb-4">{error}</p>
        <button onClick={loadData} className="btn-primary">Réessayer</button>
      </div>
    )
  }

  const chartData = [...simulations]
    .reverse()
    .map((s) => ({
      date: fmtDate(s.date),
      kWh: parseFloat(s.kwh_obtenus),
      FCFA: parseFloat(s.montant_brut),
    }))

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      {/* En-tête personnel */}
      <div className="mb-8 flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-slate-900">
            Bonjour {user?.name || user?.email} 👋
          </h1>
          <p className="text-slate-500 mt-1">Votre espace personnel Woyofal</p>
        </div>
        <button
          onClick={() => navigate('/simulateur')}
          className="btn-primary flex items-center gap-2 text-sm"
        >
          <Calculator className="w-4 h-4" />
          Nouvelle simulation
        </button>
      </div>

      {/* KPI cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <KpiCard
            icon={BarChart3}
            label="Simulations"
            value={fmt(stats.total_simulations)}
            sub="au total"
            color="from-blue-50 to-blue-100 text-blue-900"
          />
          <KpiCard
            icon={TrendingUp}
            label="Total simulé"
            value={`${fmt(stats.total_fcfa)} F`}
            sub="FCFA cumulés"
            color="from-purple-50 to-purple-100 text-purple-900"
          />
          <KpiCard
            icon={Zap}
            label="Moy. par recharge"
            value={`${fmtKwh(stats.avg_kwh)} kWh`}
            sub="kWh en moyenne"
            color="from-green-50 to-green-100 text-green-900"
          />
          <KpiCard
            icon={Calendar}
            label="Dernière simulation"
            value={fmtDate(stats.derniere_simulation)}
            color="from-amber-50 to-amber-100 text-amber-900"
          />
        </div>
      )}

      {/* État vide */}
      {simulations.length === 0 && (
        <div className="text-center py-24">
          <Calculator className="w-16 h-16 mx-auto text-slate-200 mb-4" />
          <p className="text-slate-500 mb-6 text-lg">Aucune simulation sauvegardée pour l'instant.</p>
          <button
            onClick={() => navigate('/simulateur')}
            className="btn-primary"
          >
            Faire ma première simulation
          </button>
        </div>
      )}

      {simulations.length > 0 && (
        <>
          {/* Graphique évolution */}
          <div className="card mb-6">
            <h3 className="text-lg font-semibold mb-4 text-slate-800">📈 Mes recharges dans le temps</h3>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: 12 }}
                  formatter={(val, name) => name === 'kWh' ? [`${val} kWh`, 'kWh'] : [`${fmt(val)} FCFA`, 'Montant']}
                />
                <Line type="monotone" dataKey="kWh" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} name="kWh" />
                <Line type="monotone" dataKey="FCFA" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} name="FCFA" yAxisId={0} hide />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Table des dernières simulations */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4 text-slate-800">📋 Mes dernières simulations</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="pb-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">Date</th>
                    <th className="pb-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wide">Montant</th>
                    <th className="pb-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wide">kWh</th>
                    <th className="pb-3 text-center text-xs font-semibold text-slate-400 uppercase tracking-wide">Type</th>
                    <th className="pb-3 text-center text-xs font-semibold text-slate-400 uppercase tracking-wide">Tranche</th>
                  </tr>
                </thead>
                <tbody>
                  {simulations.map((s, idx) => (
                    <tr key={s.id ?? idx} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                      <td className="py-3 text-slate-600">{fmtDate(s.date)}</td>
                      <td className="py-3 text-right font-semibold text-slate-800">{fmt(s.montant_brut)} F</td>
                      <td className="py-3 text-right text-green-700 font-medium">{fmtKwh(s.kwh_obtenus)}</td>
                      <td className="py-3 text-center">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-xs font-semibold">
                          {s.type_compteur}
                        </span>
                      </td>
                      <td className="py-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${TRANCHE_STYLES[s.tranche_finale] || 'bg-slate-100 text-slate-600'}`}>
                          T{s.tranche_finale}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default Dashboard
