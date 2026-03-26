import { createContext, useContext, useState, useEffect } from 'react'

/** AuthContext — gestion JWT côté React
 *  - token stocké dans localStorage
 *  - user = { id, email, name }
 */
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]   = useState(null)
  const [token, setToken] = useState(() => localStorage.getItem('woyofal_token'))

  // Au montage : tenter de restaurer l'utilisateur depuis le token stocké
  useEffect(() => {
    if (token) {
      const stored = localStorage.getItem('woyofal_user')
      if (stored) {
        try { setUser(JSON.parse(stored)) } catch { logout() }
      }
    }
  }, [])

  const login = (userData, accessToken, refreshToken) => {
    setUser(userData)
    setToken(accessToken)
    localStorage.setItem('woyofal_token',   accessToken)
    localStorage.setItem('woyofal_refresh', refreshToken)
    localStorage.setItem('woyofal_user',    JSON.stringify(userData))
  }

  const logout = () => {
    setUser(null)
    setToken(null)
    localStorage.removeItem('woyofal_token')
    localStorage.removeItem('woyofal_refresh')
    localStorage.removeItem('woyofal_user')
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuth: !!token }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth doit être utilisé dans <AuthProvider>')
  return ctx
}
