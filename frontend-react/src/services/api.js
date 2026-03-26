import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' }
})

// ─── Intercepteur de requête : injection du JWT ───────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('woyofal_token')
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
  },
  (error) => Promise.reject(error)
)

// ─── Intercepteur de réponse : refresh automatique du token ──────────────────
let isRefreshing = false
let failedQueue = []

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => error ? prom.reject(error) : prom.resolve(token))
  failedQueue = []
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then(token => {
          original.headers.Authorization = `Bearer ${token}`
          return api(original)
        })
      }
      original._retry = true
      isRefreshing = true
      const refreshToken = localStorage.getItem('woyofal_refresh')
      if (!refreshToken) {
        isRefreshing = false
        return Promise.reject(error)
      }
      try {
        const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, null, {
          headers: { Authorization: `Bearer ${refreshToken}` }
        })
        const newToken = data.access_token
        localStorage.setItem('woyofal_token', newToken)
        api.defaults.headers.common.Authorization = `Bearer ${newToken}`
        processQueue(null, newToken)
        original.headers.Authorization = `Bearer ${newToken}`
        return api(original)
      } catch (refreshErr) {
        processQueue(refreshErr, null)
        localStorage.removeItem('woyofal_token')
        localStorage.removeItem('woyofal_refresh')
        localStorage.removeItem('woyofal_user')
        return Promise.reject(refreshErr)
      } finally {
        isRefreshing = false
      }
    }
    return Promise.reject(error)
  }
)

export default api

// ─── Raccourcis métier ────────────────────────────────────────────────────────

export const simulateRecharge = async (data) => {
  const response = await api.post('/simulation/recharge', data)
  return response.data
}

export const getRecommandation = async (data) => {
  const response = await api.post('/simulation/recommandation', data)
  return response.data
}

export const getTarifs = async (typeCompteur = null) => {
  const url = typeCompteur ? `/simulation/tarifs?type_compteur=${typeCompteur}` : '/simulation/tarifs'
  const response = await api.get(url)
  return response.data
}

export const getKPIs = async (periode = '2026-01') => {
  const response = await api.get(`/consommation/kpis?periode=${periode}`)
  return response.data
}

export const getEvolution = async (limit = 30) => {
  const response = await api.get(`/consommation/evolution?limit=${limit}`)
  return response.data
}

export const getTranches = async (periode = '2026-01', typeCompteur = null) => {
  const url = typeCompteur
    ? `/consommation/tranches?periode=${periode}&type_compteur=${typeCompteur}`
    : `/consommation/tranches?periode=${periode}`
  const response = await api.get(url)
  return response.data
}

export const getRegions = async (periode = '2026-01') => {
  const response = await api.get(`/consommation/regions?periode=${periode}`)
  return response.data
}

export const healthCheck = async () => {
  const response = await api.get('/health', { baseURL: 'http://localhost:5000' })
  return response.data
}
