import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children }) {
  const { isAuth } = useAuth()
  const location = useLocation()

  if (!isAuth) {
    return <Navigate to="/connexion-requise" state={{ from: location.pathname }} replace />
  }

  return children
}
