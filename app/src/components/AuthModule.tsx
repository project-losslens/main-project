import { useState } from 'react'
import type { FormEvent } from 'react'
import type { Session, SupabaseClient } from '@supabase/supabase-js'

type AuthMode = 'login' | 'signup' | 'forgot-password' | 'reset-password'
type Message = { tone: 'error' | 'success'; text: string }

type Props = {
  authClient: SupabaseClient | null
  authNotice: string
  authReady: boolean
  authUnavailable: boolean
  onRecoveryComplete: () => void
  onReturnHome: () => void
  recoveryAvailable: boolean
  recoveryLinkError: boolean
  session: Session | null
}

function AuthModule({
  authClient,
  authNotice,
  authReady,
  authUnavailable,
  onRecoveryComplete,
  onReturnHome,
  recoveryAvailable,
  recoveryLinkError,
  session,
}: Props) {
  const [mode, setMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState<Message | null>(null)
  const activeMode = recoveryAvailable ? 'reset-password' : mode
  const visibleMessage =
    message ??
    (recoveryLinkError
      ? {
          tone: 'error' as const,
          text: 'This email link could not be validated. Try signing in or request a new password-reset email.',
        }
      : null)

  function changeMode(nextMode: AuthMode) {
    setMode(nextMode)
    setPassword('')
    setConfirmPassword('')
    setMessage(null)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!authClient || pending) return
    setMessage(null)

    const normalizedEmail = email.trim()
    if (activeMode === 'signup' || activeMode === 'reset-password') {
      if (password !== confirmPassword) {
        setMessage({ tone: 'error', text: 'The passwords do not match.' })
        return
      }
    }

    setPending(true)
    try {
      if (activeMode === 'login') {
        const { error } = await authClient.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        })
        if (error) {
          setMessage({
            tone: 'error',
            text: 'We could not sign you in with those details. Check your email and password, or request a password reset.',
          })
          return
        }
        setPassword('')
        setMessage({
          tone: 'success',
          text: 'You are signed in. Your personal records remain on this device and are not synced by signing in.',
        })
      } else if (activeMode === 'signup') {
        const { data, error } = await authClient.auth.signUp({
          email: normalizedEmail,
          password,
          options: { emailRedirectTo: window.location.origin },
        })
        if (error) {
          setMessage({
            tone: 'error',
            text: 'We could not create the account. Try signing in or resetting the password if you may already have an account.',
          })
          return
        }
        setPassword('')
        setConfirmPassword('')
        setMessage({
          tone: 'success',
          text: data.session
            ? 'Your account is ready and you are signed in. Your personal records remain on this device.'
            : 'Your account request was received. If email confirmation is enabled, verify your address using the email before signing in. If you do not receive a message, try signing in or resetting your password.',
        })
      } else if (activeMode === 'forgot-password') {
        const { error } = await authClient.auth.resetPasswordForEmail(
          normalizedEmail,
          { redirectTo: window.location.origin },
        )
        if (error) {
          setMessage({
            tone: 'error',
            text: 'We could not request a reset email. Check your connection and try again.',
          })
          return
        }
        setMessage({
          tone: 'success',
          text: 'If an account exists for this address, password-reset instructions will be emailed.',
        })
      } else {
        const { error } = await authClient.auth.updateUser({ password })
        if (error) {
          setMessage({
            tone: 'error',
            text: 'The password could not be updated. The reset link may have expired; request a new one and try again.',
          })
          return
        }
        setPassword('')
        setConfirmPassword('')
        setMode('login')
        onRecoveryComplete()
        setMessage({
          tone: 'success',
          text: 'Your password has been updated. You can continue to your local LossLens screens.',
        })
      }
    } catch {
      setMessage({
        tone: 'error',
        text: 'The request could not be completed. Check your connection and try again.',
      })
    } finally {
      setPending(false)
    }
  }

  const title =
    activeMode === 'signup'
      ? 'Create an account'
      : activeMode === 'forgot-password'
        ? 'Reset your password'
        : activeMode === 'reset-password'
          ? 'Choose a new password'
          : 'Sign in'

  return (
    <section aria-labelledby="auth-title" className="section-block auth-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Optional account · local records stay local</p>
          <h1 id="auth-title" tabIndex={-1}>
            {session && !recoveryAvailable ? 'Your account' : title}
          </h1>
          <p className="section-description">
            Account sign-in is handled by your configured Supabase project.
            Your True Cost and recovery records remain on this device and are
            not uploaded or synced.
          </p>
        </div>
      </div>

      <div className="auth-card">
        {!authReady ? (
          <p aria-live="polite" className="auth-info" role="status">
            Checking account availability…
          </p>
        ) : authUnavailable || !authClient ? (
          <p className="auth-info" role="status">
            Supabase account services could not be initialized. Check the
            project URL and publishable-key configuration. Local LossLens
            features remain available.
          </p>
        ) : session && !recoveryAvailable ? (
          <div className="auth-account">
            {visibleMessage && (
              <p
                className={`auth-message auth-message-${visibleMessage.tone}`}
                role={visibleMessage.tone === 'error' ? 'alert' : 'status'}
              >
                {visibleMessage.text}
              </p>
            )}
            {authNotice && (
              <p className="auth-message auth-message-error" role="alert">
                {authNotice}
              </p>
            )}
            <p className="auth-info">
              Signed in as <strong>{session.user.email}</strong>.
            </p>
            <p className="auth-info">
              Your financial and recovery information remains stored locally in
              this browser. No records are being synced.
            </p>
            <button
              className="secondary-button"
              onClick={onReturnHome}
              type="button"
            >
              Return to LossLens
            </button>
          </div>
        ) : (
          <>
            {authNotice && (
              <p className="auth-message auth-message-error" role="alert">
                {authNotice}
              </p>
            )}
            {message && (
              <p
                className={`auth-message auth-message-${message.tone}`}
                role={message.tone === 'error' ? 'alert' : 'status'}
              >
                {message.text}
              </p>
            )}
            <form
              aria-busy={pending}
              className="auth-form"
              onSubmit={(event) => void handleSubmit(event)}
            >
              <div className="form-field">
                <label htmlFor="auth-email">Email address</label>
                <input
                  autoComplete="email"
                  disabled={pending || activeMode === 'reset-password'}
                  id="auth-email"
                  name="email"
                  onChange={(event) => setEmail(event.currentTarget.value)}
                  required
                  type="email"
                  value={email}
                />
              </div>

              {(activeMode === 'login' ||
                activeMode === 'signup' ||
                activeMode === 'reset-password') && (
                <div className="form-field">
                  <label htmlFor="auth-password">
                    {activeMode === 'reset-password'
                      ? 'New password'
                      : 'Password'}
                  </label>
                  <input
                    autoComplete={
                      activeMode === 'login'
                        ? 'current-password'
                        : 'new-password'
                    }
                    disabled={pending}
                    id="auth-password"
                    name="password"
                    onChange={(event) => setPassword(event.currentTarget.value)}
                    required
                    type="password"
                    value={password}
                  />
                </div>
              )}

              {(activeMode === 'signup' ||
                activeMode === 'reset-password') && (
                <div className="form-field">
                  <label htmlFor="auth-confirm-password">
                    Confirm password
                  </label>
                  <input
                    autoComplete="new-password"
                    disabled={pending}
                    id="auth-confirm-password"
                    name="confirm-password"
                    onChange={(event) =>
                      setConfirmPassword(event.currentTarget.value)
                    }
                    required
                    type="password"
                    value={confirmPassword}
                  />
                </div>
              )}

              {activeMode === 'reset-password' && (
                <p className="auth-info">
                  This form is available only through a valid password-reset
                  link.
                </p>
              )}

              <div className="auth-actions">
                <button
                  className="primary-button"
                  disabled={pending}
                  type="submit"
                >
                  {pending
                    ? 'Please wait…'
                    : activeMode === 'signup'
                      ? 'Create account'
                      : activeMode === 'forgot-password'
                        ? 'Send reset email'
                        : activeMode === 'reset-password'
                          ? 'Update password'
                          : 'Sign in'}
                </button>
                {activeMode === 'login' && (
                  <button
                    className="text-button auth-text-button"
                    disabled={pending}
                    onClick={() => changeMode('forgot-password')}
                    type="button"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
            </form>

            {activeMode !== 'reset-password' && (
              <div className="auth-mode-switch">
                {activeMode === 'signup' ? (
                  <>
                    <span>Already have an account?</span>
                    <button
                      className="text-button auth-text-button"
                      disabled={pending}
                      onClick={() => changeMode('login')}
                      type="button"
                    >
                      Sign in
                    </button>
                  </>
                ) : (
                  <>
                    <span>New to LossLens accounts?</span>
                    <button
                      className="text-button auth-text-button"
                      disabled={pending}
                      onClick={() => changeMode('signup')}
                      type="button"
                    >
                      Create an account
                    </button>
                  </>
                )}
                {activeMode === 'forgot-password' && (
                  <button
                    className="text-button auth-text-button"
                    disabled={pending}
                    onClick={() => changeMode('login')}
                    type="button"
                  >
                    Back to sign in
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  )
}

export default AuthModule
