import React, { useState, useEffect } from 'react'
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Users, Zap, DollarSign, TrendingUp } from 'lucide-react'
import { getKPIs, getEvolution, getTranches } from '../services/api'

const Dashboard = () => {
  const [kpis, setKpis] = useState(null)
  const [evolution, setEvolution] = useState([])
  const [tranches, setTranches] = useState([])
  const [loading, setLoading] = useState(true)
  const [periode, setPeriode] = useState('2026-01')

  useEffect(() => {
    loadData()
  }, [periode])

  const loadData = async () => {
    setLoading(true)
    try {
      const [kpisData, evolData, tranchesData] = await Promise.all([
        getKPIs(periode),
        getEvolution(30),
        getTranches(periode)
      ])
      setKpis(kpisData.data)
      setEvolution(evolData.data.reverse())
      setTranches(tranchesData.data)
    } catch (error) {
      console.error('Erreur chargement données:', error)
    } finally {
      setLoading(false)
    }
  }

  const COLORS = ['#90EE90', '#FFD700', '#FF6B6B']

  if (loading) {
    return <div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div></div>
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-primary mb-2">📊 Dashboard Analytics</h1>
        <p className="text-gray-600">Vue d'ensemble de la consommation électrique - Période : {periode}</p>
      </div>

      {kpis && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="card bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Users Actifs</p>
                <p className="text-3xl font-bold text-blue-900">{kpis.users_actifs?.toLocaleString()}</p>
                <p className="text-xs text-blue-700 mt-1">{kpis.users_en_t1?.toLocaleString()} en T1</p>
              </div>
              <Users className="w-12 h-12 text-blue-400" />
            </div>
          </div>

          <div className="card bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">Consommation</p>
                <p className="text-3xl font-bold text-green-900">{(kpis.conso_totale_kwh / 1000).toFixed(1)}k</p>
                <p className="text-xs text-green-700 mt-1">kWh totaux</p>
              </div>
              <Zap className="w-12 h-12 text-green-400" />
            </div>
          </div>

          <div className="card bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 font-medium">Coût Total</p>
                <p className="text-3xl font-bold text-purple-900">{(kpis.cout_total / 1e6).toFixed(1)}M</p>
                <p className="text-xs text-purple-700 mt-1">FCFA</p>
              </div>
              <DollarSign className="w-12 h-12 text-purple-400" />
            </div>
          </div>

          <div className="card bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600 font-medium">Économies</p>
                <p className="text-3xl font-bold text-orange-900">{(kpis.economie_totale / 1e6).toFixed(2)}M</p>
                <p className="text-xs text-orange-700 mt-1">FCFA économisés</p>
              </div>
              <TrendingUp className="w-12 h-12 text-orange-400" />
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-xl font-semibold mb-4">📈 Évolution Consommation</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={evolution}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="conso_totale_kwh" stroke="#1f77b4" name="Conso (kWh)" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 className="text-xl font-semibold mb-4">🎯 Répartition Tranches</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={tranches.filter(t => t.type_compteur === 'DPP')} dataKey="nb_users_uniques" nameKey="nom_tranche" cx="50%" cy="50%" outerRadius={100} label>
                {tranches.filter(t => t.type_compteur === 'DPP').map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card mt-6">
        <h3 className="text-xl font-semibold mb-4">📋 Détail Tranches</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-100"><th className="p-3 text-left">Type</th><th className="p-3 text-left">Tranche</th><th className="p-3 text-right">Users</th><th className="p-3 text-right">Conso (kWh)</th><th className="p-3 text-right">Coût (FCFA)</th><th className="p-3 text-right">Économies</th></tr>
            </thead>
            <tbody>
              {tranches.map((t, idx) => (
                <tr key={idx} className="border-t hover:bg-gray-50">
                  <td className="p-3 font-semibold">{t.type_compteur}</td>
                  <td className="p-3">{t.nom_tranche}</td>
                  <td className="p-3 text-right">{t.nb_users_uniques?.toLocaleString()}</td>
                  <td className="p-3 text-right">{t.conso_totale_kwh?.toLocaleString()}</td>
                  <td className="p-3 text-right">{t.cout_total_fcfa?.toLocaleString()}</td>
                  <td className="p-3 text-right text-green-600 font-semibold">{t.economie_totale_fcfa?.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
