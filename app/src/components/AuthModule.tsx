import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useLocation } from 'react-router-dom'
import type { Session, SupabaseClient } from '@supabase/supabase-js'
import { normalizeInternationalPhone } from '../lib/phoneNumber'

export type AuthMode = 'login' | 'signup' | 'forgot-password' | 'reset-password'
type Message = { tone: 'error' | 'success'; text: string }
type SupabaseAuthError = { code?: string; message: string }

const MINIMUM_PASSWORD_LENGTH = 6

function getSupabaseErrorMessage(
  error: SupabaseAuthError,
  action: string,
): string {
  const code = error.code?.toLowerCase()

  if (code === 'weak_password') {
    return `${error.message} Use at least ${MINIMUM_PASSWORD_LENGTH} characters.`
  }

  if (
    action === 'sign in' &&
    (code === 'email_not_confirmed' ||
      /email.*not.*confirm/i.test(error.message))
  ) {
    return `${error.message} Check your inbox for the verification link, then try signing in again.`
  }

  if (
    action === 'sign in' &&
    (code === 'invalid_credentials' ||
      /invalid login credentials/i.test(error.message))
  ) {
    return `${error.message} Check your email and password, or request a password reset.`
  }

  return `${action} failed: ${error.message}`
}


type Props = {
  authClient: SupabaseClient | null
  authNotice: string
  authReady: boolean
  authUnavailable: boolean
  initialMode: AuthMode
  initialEmail?: string
  onModeChange: (mode: AuthMode, email: string) => void
  onRecoveryComplete: () => void
  onRegistrationComplete: () => void
  onReturnHome: () => void
  onReturnPublicLanding: () => void
  recoveryAvailable: boolean
  recoveryLinkError: boolean
  session: Session | null
}

function AuthModule({
  authClient,
  authNotice,
  authReady,
  authUnavailable,
  initialMode,
  initialEmail = '',
  onModeChange,
  onRecoveryComplete,
  onRegistrationComplete,
  onReturnHome,
  onReturnPublicLanding,
  recoveryAvailable,
  recoveryLinkError,
  session,
}: Props) {
  const location = useLocation()
  const [mode, setMode] = useState<AuthMode>(initialMode)
  const [email, setEmail] = useState(initialEmail)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState<Message | null>(null)
  const submissionInProgress = useRef(false)
  const activeMode = recoveryAvailable ? 'reset-password' : mode
  const visibleMessage =
    message ??
    (() => {
      const params = new URLSearchParams(location.search)
      if (params.has('checkEmail')) {
        return {
          tone: 'success' as const,
          text: 'Check your inbox and confirm your email address before signing in.',
        }
      }
      if (params.has('confirmed')) {
        return {
          tone: 'success' as const,
          text: 'Your email has been confirmed. You can now sign in.',
        }
      }
      if (params.has('passwordUpdated')) {
        return {
          tone: 'success' as const,
          text: 'Your password was changed successfully. You can now sign in.',
        }
      }
      return null
    })() ??
    (recoveryLinkError
      ? {
          tone: 'error' as const,
          text: 'This email link could not be validated. Try signing in or request a new password-reset email.',
        }
      : null)

  function changeMode(nextMode: AuthMode) {
    setMode(nextMode)
    onModeChange(nextMode, email)
    setPassword('')
    setConfirmPassword('')
    setMessage(null)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!authClient || submissionInProgress.current) return
    setMessage(null)

    const normalizedEmail = email.trim()
    if (
      (activeMode === 'login' ||
        activeMode === 'signup' ||
        activeMode === 'reset-password') &&
      password.length < MINIMUM_PASSWORD_LENGTH
    ) {
      setMessage({
        tone: 'error',
        text: `Use a password with at least ${MINIMUM_PASSWORD_LENGTH} characters.`,
      })
      return
    }

    const normalizedPhone =
      activeMode === 'signup'
        ? normalizeInternationalPhone(phoneNumber)
        : null
    if (activeMode === 'signup' && !normalizedPhone) {
      setMessage({
        tone: 'error',
        text: 'Enter a valid phone number, for example +254 712 345 678.',
      })
      return
    }

    if (activeMode === 'signup' || activeMode === 'reset-password') {
      if (password !== confirmPassword) {
        setMessage({ tone: 'error', text: 'The passwords do not match.' })
        return
      }
    }

    submissionInProgress.current = true
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
            text: getSupabaseErrorMessage(error, 'sign in'),
          })
          return
        }
        setPassword('')
        setMessage({
          tone: 'success',
          text: 'You are signed in. LossLens will guide you through account data setup before opening private sections.',
        })
      } else if (activeMode === 'signup') {
        const { data, error } = await authClient.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            data: { phone_number: normalizedPhone },
            emailRedirectTo: `${window.location.origin}/login`,
          },
        })
        if (error) {
          setMessage({
            tone: 'error',
            text: getSupabaseErrorMessage(error, 'account creation'),
          })
          return
        }
        if (data.session) {
          await authClient.auth.signOut()
        }
        setPassword('')
        setConfirmPassword('')
        onRegistrationComplete()
      } else if (activeMode === 'forgot-password') {
        const { error } = await authClient.auth.resetPasswordForEmail(
          normalizedEmail,
          {
            redirectTo: `${window.location.origin}/update-password`,
          },
        )
        if (error) {
          setMessage({
            tone: 'error',
            text: getSupabaseErrorMessage(error, 'Password-reset email request'),
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
            text: `${getSupabaseErrorMessage(error, 'Password update')} The reset link may have expired; request a new one and try again.`,
          })
          return
        }
        setPassword('')
        setConfirmPassword('')
        setMode('login')
        onRecoveryComplete()
      }
    } catch {
      setMessage({
        tone: 'error',
        text: 'The request could not be completed. Check your connection and try again.',
      })
    } finally {
      submissionInProgress.current = false
      setPending(false)
    }
  }

  const pendingAction =
    activeMode === 'signup'
      ? 'Creating account…'
      : activeMode === 'forgot-password'
        ? 'Sending reset email…'
        : activeMode === 'reset-password'
          ? 'Updating password…'
          : 'Signing in…'

  const title =
    activeMode === 'signup'
      ? 'Create an account'
      : activeMode === 'forgot-password'
        ? 'Reset your password'
        : activeMode === 'reset-password'
          ? 'Create a new password'
          : activeMode === 'login'
            ? 'Welcome back'
            : 'Create an account'

  return (
    <section aria-labelledby="auth-title" className="section-block auth-section">
      <div className="section-heading">
        <div>
          <h1 id="auth-title" tabIndex={-1}>
            {session && !recoveryAvailable ? 'Your account' : title}
          </h1>
          <p className="section-description">
            {activeMode === 'login'
              ? 'Your journey continues here. Sign in to access your LossLens account.'
              : activeMode === 'signup'
                ? ''
                : activeMode === 'forgot-password'
                  ? ''
                  : 'Choose a new password to secure your LossLens account.'}
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
            project URL and publishable-key configuration. Get Support remains
            available without signing in.
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
              Account data setup is required before private sections open.
              Existing browser records are not migrated until you explicitly
              confirm the backup and migration step.
            </p>
            <button
              className="secondary-button"
              onClick={onReturnHome}
              type="button"
            >
              Return to LossLens
            </button>
          </div>
        ) : activeMode === 'reset-password' && !recoveryAvailable ? (
          <div className="auth-account">
            <p className="auth-message auth-message-error" role="alert">
              {recoveryLinkError
                ? 'This password-reset link is invalid or has expired. Request a new reset email.'
                : 'Open a valid password-reset link before changing your password.'}
            </p>
            <button
              className="secondary-button"
              onClick={() => changeMode('forgot-password')}
              type="button"
            >
              Request another reset email
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
              key={activeMode}
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
                  <div className="password-input-wrap">
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
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    minLength={MINIMUM_PASSWORD_LENGTH}
                    />
                    <button
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="password-visibility-button"
                      onClick={() => setShowPassword((visible) => !visible)}
                      type="button"
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  <span className="field-hint" id="auth-password-hint">
                    Use at least {MINIMUM_PASSWORD_LENGTH} characters.
                  </span>
                </div>
              )}

              {(activeMode === 'signup' ||
                activeMode === 'reset-password') && (
                <div className="form-field">
                  <label htmlFor="auth-confirm-password">
                    Confirm password
                  </label>
                  <div className="password-input-wrap">
                    <input
                    autoComplete="new-password"
                    disabled={pending}
                    id="auth-confirm-password"
                    name="confirm-password"
                    onChange={(event) =>
                      setConfirmPassword(event.currentTarget.value)
                    }
                    required
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    />
                    <button
                      aria-label={showConfirmPassword ? 'Hide confirmed password' : 'Show confirmed password'}
                      className="password-visibility-button"
                      onClick={() =>
                        setShowConfirmPassword((visible) => !visible)
                      }
                      type="button"
                    >
                      {showConfirmPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>
              )}

              {activeMode === 'signup' && (
                <div className="form-field">
                  <label htmlFor="auth-phone">Phone number</label>
                  <input
                    autoComplete="tel"
                    disabled={pending}
                    id="auth-phone"
                    inputMode="tel"
                    name="phone"
                    onChange={(event) =>
                      setPhoneNumber(event.currentTarget.value)
                    }
                    placeholder="+254 712 345 678"
                    required
                    type="tel"
                    value={phoneNumber}
                  />
                  <span className="field-hint">
                    Kenyan and other international numbers are accepted.
                  </span>
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
                  {pending && (
                    <span aria-hidden="true" className="auth-spinner" />
                  )}
                  {pending
                    ? pendingAction
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
      <div className="auth-return">
        <button
          className="text-button auth-text-button"
          onClick={onReturnPublicLanding}
          type="button"
        >
          Back to the public home page
        </button>
      </div>
    </section>
  )
}

export default AuthModule
