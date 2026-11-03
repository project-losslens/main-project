import { createContext, useContext } from 'react'
import type { Session, SupabaseClient } from '@supabase/supabase-js'

export type AuthContextValue = {
  authClient: SupabaseClient | null
  authNotice: string
  authReady: boolean
  authUnavailable: boolean
  session: Session | null
  recoveryAvailable: boolean
  recoveryLinkError: boolean
  setRecoveryAvailable: (available: boolean) => void
  setRecoveryLinkError: (hasError: boolean) => void
  setAuthNotice: (notice: string) => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider.')
  }
  return context
}
