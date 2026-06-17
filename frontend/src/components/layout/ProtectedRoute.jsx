import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function ProtectedRoute({ children, requiredRole }) {
  const { isAuthenticated, loading, user } = useAuth()
  const location = useLocation()

  // Show nothing while checking auth status
  if (loading) {
    return (
      <div className="page-loader">
        <div className="spinner spinner-lg" />
      </div>
    )
  }

  // Not logged in — redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Role check if required
  if (requiredRole) {
    const roleHierarchy = {
      user:       1,
      manager:    2,
      admin:      3,
      superadmin: 4,
    }
    const userLevel     = roleHierarchy[user?.role] || 0
    const requiredLevel = roleHierarchy[requiredRole] || 0

    if (userLevel < requiredLevel) {
      return <Navigate to="/" replace />
    }
  }

  return children
}