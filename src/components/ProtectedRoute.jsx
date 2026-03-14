import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/auth-context.js'

function ProtectedRoute() {
  const location = useLocation()
  const { loading, user } = useAuth()

  if (loading) {
    return <div className="screen-message">جار التحقق من الجلسة...</div>
  }

  if (!user) {
    return <Navigate replace to="/login" state={{ from: location }} />
  }

  return <Outlet />
}

export default ProtectedRoute
