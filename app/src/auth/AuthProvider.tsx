import {
  useEffect,
  useMemo,
  useState,
} from 'react'
import type { ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AuthContext } from './authContext'
import type { AuthContextValue } from './authContext'
import type { Session, SupabaseClient } from '@supabase/supabase-js'

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [authClient, setAuthClient] = useState<SupabaseClient | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [authUnavailable, setAuthUnavailable] = useState(false)
  const [session, setSession] = useState<Session | null>(null)
  const [recoveryAvailable, setRecoveryAvailable] = useState(false)
  const [recoveryLinkError, setRecoveryLinkError] = useState(false)
  const [authNotice, setAuthNotice] = useState('')

  useEffect(() => {
    let active = true
    let unsubscribe: (() => void) | undefined
    const hashParams = new URLSearchParams(window.location.hash.slice(1))
    const queryParams = new URLSearchParams(window.location.search)
    const recoveryLinkRequested =
      hashParams.get('type') === 'recovery' ||
      queryParams.get('type') === 'recovery'
    const authenticationLinkErrorRequested =
      hashParams.has('error') ||
      hashParams.has('error_code') ||
      queryParams.has('error') ||
      queryParams.has('error_code')
    const confirmationLinkRequested =
      hashParams.get('type') === 'signup' ||
      hashParams.get('type') === 'email' ||
      queryParams.get('type') === 'signup' ||
      queryParams.get('type') === 'email'

    async function restoreSession() {
      try {
        const { supabase } = await import('../lib/supabase')
        if (!active) return

        setAuthClient(supabase)
        const { data } = supabase.auth.onAuthStateChange(
          (event, nextSession) => {
            if (!active) return
            setSession(nextSession)
            if (event === 'PASSWORD_RECOVERY') {
              setRecoveryAvailable(true)
              setRecoveryLinkError(false)
              setAuthNotice('')
              navigate('/update-password', { replace: true })
            } else if (event === 'SIGNED_IN') {
              setRecoveryLinkError(false)
              setAuthNotice('')
              if (confirmationLinkRequested) {
                navigate('/login?confirmed=1', { replace: true })
                void supabase.auth.signOut()
              }
            } else if (event === 'SIGNED_OUT') {
              setRecoveryAvailable(false)
              setRecoveryLinkError(false)
            }
          },
        )
        unsubscribe = () => data.subscription.unsubscribe()

        const sessionResult = await supabase.auth.getSession()
        if (!active) return
        if (sessionResult.error) {
          setAuthNotice(
            'Your sign-in session could not be restored. Sign in again to continue. Get Support remains available without an account.',
          )
        } else {
          setSession(sessionResult.data.session)
          if (
            authenticationLinkErrorRequested ||
            (recoveryLinkRequested && !sessionResult.data.session)
          ) {
            setRecoveryLinkError(true)
            navigate('/update-password', { replace: true })
          }
        }
      } catch {
        if (active) setAuthUnavailable(true)
      } finally {
        if (active) setAuthReady(true)
      }
    }

    void restoreSession()

    return () => {
      active = false
      unsubscribe?.()
    }
  }, [navigate])

  const value = useMemo<AuthContextValue>(
    () => ({
      authClient,
      authNotice,
      authReady,
      authUnavailable,
      session,
      recoveryAvailable,
      recoveryLinkError,
      setRecoveryAvailable,
      setRecoveryLinkError,
      setAuthNotice,
    }),
    [
      authClient,
      authNotice,
      authReady,
      authUnavailable,
      session,
      recoveryAvailable,
      recoveryLinkError,
    ],
  )

  useEffect(() => {
    if (recoveryAvailable && location.pathname !== '/update-password') {
      navigate('/update-password', { replace: true })
    }
  }, [location.pathname, navigate, recoveryAvailable])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
