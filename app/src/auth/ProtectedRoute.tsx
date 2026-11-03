import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './authContext'

function ProtectedRoute() {
  const { authReady, session } = useAuth()
  const location = useLocation()

  if (!authReady) {
    return (
      <div aria-live="polite" className="route-loading" role="status">
        Restoring your session…
      </div>
    )
  }

  if (!session) {
    return (
      <Navigate
        replace
        state={{ from: `${location.pathname}${location.search}${location.hash}` }}
        to="/login"
      />
    )
  }

  return <Outlet />
}

export default ProtectedRoute
