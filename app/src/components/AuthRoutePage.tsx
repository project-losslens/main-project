import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/authContext'
import AuthModule from './AuthModule'
import type { AuthMode } from './AuthModule'

function AuthRoutePage({ mode }: { mode: AuthMode }) {
  const auth = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const routeState = location.state as
    | { from?: string; email?: string }
    | null
  const from = routeState?.from

  if (auth.session && !auth.recoveryAvailable && mode !== 'reset-password') {
    return <Navigate replace to={from ?? '/dashboard'} />
  }

  return (
    <AuthModule
      authClient={auth.authClient}
      authNotice={auth.authNotice}
      authReady={auth.authReady}
      authUnavailable={auth.authUnavailable}
      initialMode={mode}
      initialEmail={routeState?.email}
      key={location.pathname}
      onModeChange={(nextMode, email) => {
        const pathByMode: Record<AuthMode, string> = {
          login: '/login',
          signup: '/register',
          'forgot-password': '/forgot-password',
          'reset-password': '/update-password',
        }
        navigate(pathByMode[nextMode], {
          replace: true,
          state: { ...routeState, email },
        })
      }}
      onRecoveryComplete={() => {
        auth.setRecoveryAvailable(false)
        navigate('/login?passwordUpdated=1', { replace: true, state: location.state })
      }}
      onRegistrationComplete={() =>
        navigate('/login?checkEmail=1', { replace: true })
      }
      onReturnHome={() => navigate(from ?? '/dashboard', { replace: true })}
      onReturnPublicLanding={() => navigate('/', { replace: true })}
      recoveryAvailable={auth.recoveryAvailable}
      recoveryLinkError={auth.recoveryLinkError}
      session={auth.session}
    />
  )
}

export default AuthRoutePage
