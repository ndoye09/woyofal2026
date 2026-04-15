import React, { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Zap, TrendingUp, Calendar, BarChart3, Calculator } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getMySimulations } from '../services/api'
import { useAuth } from '../context/AuthContext'

/* ── Calcul jours restants dans le mois ── */
function joursRestantsMois() {
  const now = new Date()
  const fin = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return fin.getDate() - now.getDate()
}

/* ── Widget Budget Fin de Mois ── */
const BudgetFinDeMois = () => {
  const [consoDernier, setConsoDernier] = useState(5)
  const [cumulActuel, setCumulActuel] = useState(60)
  const [soldeCompteur, setSoldeCompteur] = useState(10)
  const joursRestants = joursRestantsMois()

  const kwhBesoin = +(consoDernier * joursRestants).toFixed(1)
  const kwhARecharger = Math.max(0, +(kwhBesoin - soldeCompteur).toFixed(1))

  const t1Dispo = Math.max(0, 150 - cumulActuel)
  const kwhT1 = Math.min(kwhARecharger, t1Dispo)
  const kwhT2plus = Math.max(0, kwhARecharger - kwhT1)
  const coutElec = kwhT1 * 82 + kwhT2plus * 136.49
  const montantEstime = kwhARecharger === 0 ? 0 : Math.round(coutElec / 0.975)

  const cumulFinal = cumulActuel + kwhBesoin
  const tranche = cumulFinal <= 150 ? 1 : cumulFinal <= 250 ? 2 : 3
  const trancheColors = { 1: 'bg-green-500', 2: 'bg-amber-400', 3: 'bg-red-500' }
  const trancheLabels = { 1: 'T1 — 82 FCFA/kWh', 2: 'T2 — 136,49 FCFA/kWh', 3: 'T3 — 136,49 FCFA/kWh' }
  const pct = Math.min(100, (cumulFinal / 250) * 100)

  return (
    <div className="bg-gradient-to-br from-navy to-gray-900 rounded-2xl p-6 border border-gray-800 mb-8">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-white font-bold text-base">Budget fin de mois</h3>
          <p className="text-white/40 text-xs mt-0.5">Basé sur votre conso journalière (*813)</p>
        </div>
        <span className="text-white/20 text-xs bg-white/5 px-2 py-1 rounded-lg">{joursRestants} jours restants</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
        {/* Conso hier */}
        <div>
          <div className="flex justify-between text-xs text-white/50 mb-2">
            <span>Conso hier <span className="text-white/25">(*813)</span></span>
            <span className="text-white font-semibold">{consoDernier} kWh/j</span>
          </div>
          <input type="range" min="0.5" max="20" step="0.5"
            value={consoDernier} onChange={e => setConsoDernier(+e.target.value)}
            className="w-full h-1 rounded-full accent-red-500" />
        </div>
        {/* Cumul ce mois */}
        <div>
          <div className="flex justify-between text-xs text-white/50 mb-2">
            <span>Cumul ce mois <span className="text-white/25">(*814)</span></span>
            <span className="text-white font-semibold">{cumulActuel} kWh</span>
          </div>
          <input type="range" min="0" max="249" step="1"
            value={cumulActuel} onChange={e => setCumulActuel(+e.target.value)}
            className="w-full h-1 rounded-full accent-red-500" />
        </div>
        {/* Solde compteur */}
        <div>
          <div className="flex justify-between text-xs text-white/50 mb-2">
            <span>Solde compteur</span>
            <span className="text-white font-semibold">{soldeCompteur} kWh</span>
          </div>
          <input type="range" min="0" max="100" step="0.5"
            value={soldeCompteur} onChange={e => setSoldeCompteur(+e.target.value)}
            className="w-full h-1 rounded-full accent-green-400" />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          {montantEstime === 0 ? (
            <>
              <p className="text-green-400 text-2xl font-bold font-display">Solde suffisant</p>
              <p className="text-white/30 text-xs mt-0.5">Votre compteur couvre la fin du mois</p>
            </>
          ) : (
            <>
              <p className="text-white text-3xl font-bold font-display">{montantEstime.toLocaleString('fr-FR')} <span className="text-white/40 text-base font-normal">FCFA</span></p>
              <p className="text-white/30 text-xs mt-0.5">à recharger · ≈ {kwhARecharger} kWh</p>
            </>
          )}
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1.5 justify-end mb-1">
            <span className={`w-2 h-2 rounded-full ${trancheColors[tranche]}`} />
            <span className="text-white/60 text-xs">{trancheLabels[tranche]}</span>
          </div>
          <div className="w-32 h-1 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>
          <p className="text-white/20 text-[10px] mt-1">{cumulFinal.toFixed(0)} / 250 kWh</p>
        </div>
      </div>
    </div>
  )
}

const fmt = (n) => Math.round(n).toLocaleString('fr-FR')
const fmtKwh = (n) => parseFloat(n).toFixed(2)
const fmtDate = (iso) => {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

const TRANCHE_STYLES = {
  1: 'bg-green-100 text-green-800 border border-green-300 font-bold',
  2: 'bg-yellow-100 text-yellow-800 border border-yellow-300 font-bold',
  3: 'bg-red-100 text-red-800 border border-red-300 font-bold',
}

const KpiCard = ({ icon: Icon, label, value, sub, color }) => (
  <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl p-6 border border-gray-200 hover:border-gray-300 hover:shadow-lg transition-all">
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-2">{label}</p>
        <p className="text-3xl font-extrabold text-black mb-1">{value}</p>
        {sub && <p className="text-xs text-gray-500 font-medium">{sub}</p>}
      </div>
      <div className={`${color} opacity-10`}>
        <Icon className="w-12 h-12" />
      </div>
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black" />
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
    <div className="max-w-5xl mx-auto px-4 py-12 bg-white min-h-screen">
      {/* En-tête personnel */}
      <div className="mb-8 flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-black">
            Bonjour {user?.name || user?.email} 👋
          </h1>
          <p className="text-gray-500 mt-1">Votre espace personnel Woyofal</p>
        </div>
        <button
          onClick={() => navigate('/simulateur')}
          className="btn-primary flex items-center gap-2 text-sm"
        >
          <Calculator className="w-4 h-4" />
          Nouvelle simulation
        </button>
      </div>

      {/* Budget fin de mois */}
      <BudgetFinDeMois />

      {simulations.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <KpiCard
            icon={Zap}
            label="Total kWh"
            value={fmt(simulations.reduce((sum, s) => sum + parseFloat(s.kwh_obtenus), 0))}
            sub={`${simulations.length} recharges`}
            color="text-yellow-600"
          />
          <KpiCard
            icon={TrendingUp}
            label="Total dépensé"
            value={`${fmt(simulations.reduce((sum, s) => sum + parseFloat(s.montant_brut || 0), 0))} F`}
            sub={`Moy. ${fmt(simulations.reduce((sum, s) => sum + parseFloat(s.montant_brut || 0), 0) / simulations.length)} F`}
            color="text-red-600"
          />
          <KpiCard
            icon={Calculator}
            label="kWh moyen"
            value={fmtKwh(simulations.reduce((sum, s) => sum + parseFloat(s.kwh_obtenus), 0) / simulations.length)}
            sub="Par recharge"
            color="text-primary"
          />
          <KpiCard
            icon={BarChart3}
            label="Économie potentielle"
            value={`${fmt(simulations.reduce((sum, s) => sum + parseFloat(s.kwh_obtenus) * 10, 0))} F`}
            sub="vs consommation classique"
            color="text-green-600"
          />
        </div>
      )}

      {/* État vide */}
      {simulations.length === 0 && (
        <div className="text-center py-24">
          <Calculator className="w-16 h-16 mx-auto text-gray-200 mb-4" />
          <p className="text-gray-500 mb-6 text-lg">Aucune simulation sauvegardée pour l'instant.</p>
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
          <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl p-6 border border-gray-200 mb-8 hover:shadow-lg transition-all">
            <div className="mb-6">
              <h3 className="text-lg font-bold text-black">📊 Mes recharges dans le temps</h3>
              <p className="text-xs text-gray-500 mt-1">Évolution de vos montants et consommations</p>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: '1px solid #f3f4f6', fontSize: 12 }}
                  formatter={(val, name) => name === 'kWh' ? [`${val} kWh`, 'kWh'] : [`${fmt(val)} FCFA`, 'Montant']}
                />
                <Line type="monotone" dataKey="kWh" stroke="#000000" strokeWidth={2} dot={{ r: 3 }} name="kWh" />
                <Line type="monotone" dataKey="FCFA" stroke="#DC2626" strokeWidth={2} dot={{ r: 3 }} name="FCFA" yAxisId={0} hide />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Table des dernières simulations */}
          <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl p-6 border border-gray-200 hover:shadow-lg transition-all">
            <div className="mb-6">
              <h3 className="text-lg font-bold text-black">⚡ Mes dernières simulations</h3>
              <p className="text-xs text-gray-500 mt-1">Historique détaillé de vos recharges</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="pb-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Date</th>
                    <th className="pb-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide">Montant</th>
                    <th className="pb-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide">kWh</th>
                    <th className="pb-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wide">Type</th>
                    <th className="pb-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wide">Tranche</th>
                  </tr>
                </thead>
                <tbody>
                  {simulations.map((s, idx) => (
                    <tr key={s.id ?? idx} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="py-3 text-gray-600">{fmtDate(s.date)}</td>
                      <td className="py-3 text-right font-semibold text-black">{fmt(s.montant_brut)} F</td>
                      <td className="py-3 text-right text-black font-medium">{fmtKwh(s.kwh_obtenus)}</td>
                      <td className="py-3 text-center">
                        <span className="px-3 py-1 rounded-full bg-red-100 text-primary text-xs font-semibold border border-red-200">
                          {s.type_compteur}
                        </span>
                      </td>
                      <td className="py-3 text-center">
                        <span className={`px-3 py-1 rounded-full text-xs ${TRANCHE_STYLES[s.tranche_finale] || 'bg-gray-100 text-gray-600'}`}>
                          Tranche {s.tranche_finale}
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
