import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/authContext'
import type { DataSetupStatus } from '../lib/cloudData'

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Account setup could not be completed.'
}

function DataSetupPage() {
  const { authClient } = useAuth()
  const navigate = useNavigate()
  const [status, setStatus] = useState<DataSetupStatus | null>(null)
  const [accepted, setAccepted] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    import('../lib/cloudData')
      .then(({ getDataSetupStatus }) => getDataSetupStatus())
      .then((loaded) => {
        if (active) setStatus(loaded)
      })
      .catch((cause: unknown) => {
        if (active) setError(getErrorMessage(cause))
      })
    return () => {
      active = false
    }
  }, [attempt])

  async function continueSetup() {
    if (!status || busy) return
    if (!status.hasConsent && !accepted) {
      setError('Review the disclosure and select the consent checkbox to continue.')
      return
    }

    setBusy(true)
    setError('')
    setMessage('')
    try {
      const { getDataSetupStatus, saveCloudStorageConsent } = await import('../lib/cloudData')
      if (!status.hasConsent) {
        await saveCloudStorageConsent()
      }

      const refreshedStatus = await getDataSetupStatus()
      setStatus(refreshedStatus)
      if (refreshedStatus.ready) {
        navigate('/dashboard', { replace: true })
      } else {
        setMessage('Setup is not complete yet. Review the remaining status above.')
      }
    } catch (cause) {
      setError(getErrorMessage(cause))
    } finally {
      setBusy(false)
    }
  }

  async function signOut() {
    if (!authClient || busy) return
    setBusy(true)
    setError('')
    try {
      const { error: signOutError } = await authClient.auth.signOut()
      if (signOutError) {
        setError(`Could not sign out: ${signOutError.message}`)
        setBusy(false)
      } else {
        navigate('/', { replace: true })
      }
    } catch (cause) {
      setError(getErrorMessage(cause))
      setBusy(false)
    }
  }

  if (!status && !error) {
    return (
      <main className="route-main">
        <p aria-live="polite" className="route-loading" role="status">
          Checking your account data setup…
        </p>
      </main>
    )
  }

  return (
    <main className="route-main">
      <section aria-labelledby="data-setup-title" className="route-page data-setup-page">
        <p className="eyebrow">Account data setup</p>
        <h1 id="data-setup-title">Choose how your personal data is stored</h1>
        <p>
          Before opening your private LossLens sections, review the privacy
          notice and choose whether to store your personal records in the
          LossLens Supabase account.
        </p>

        <div className="privacy-notice" role="note">
          <h2>What would be stored</h2>
          <p>
            True Cost records, period financial settings, duplicate decisions,
            My Recovery check-ins, diary entries, monthly reflections and
            future-self notes, goals, reflections, alternative activities and
            reasons-to-pause notes.
          </p>
          <h2>Who receives the data and why</h2>
          <p>
            Data is sent to the Supabase backend configured for LossLens to
            provide account-based storage across sessions and devices. Supabase
            authentication is also used to identify your account.
          </p>
          <h2>Retention and deletion limits</h2>
          <p>
            Active database rows are associated with your account. Backup
            retention and deletion from backups have not been verified, so
            LossLens cannot promise immediate or complete erasure from backups.
            An in-app deletion request does not itself delete your account.
          </p>
          <p>
            There is no browser-local fallback for personal records. Personal
            data is stored in the LossLens Supabase account only. No analytics,
            advertising, or AI provider receives these records through this
            flow.
          </p>
        </div>

        {status && (
          <div className="data-setup-status">
            <h2>Account storage status</h2>
            <ul>
              <li>Cloud storage consent: {status.hasConsent ? 'active' : 'not yet granted'}</li>
            </ul>
            {!status.hasConsent && (
              <label className="checkbox-row">
                <input
                  checked={accepted}
                  onChange={(event) => setAccepted(event.target.checked)}
                  type="checkbox"
                />
                <span>
                  I have read this notice and consent to storing the listed
                  personal records in the LossLens Supabase account when I
                  continue.
                </span>
              </label>
            )}
          </div>
        )}

        {error && <p className="error-message" role="alert">{error}</p>}
        {message && <p aria-live="polite" className="status-message" role="status">{message}</p>}
        {error && (
          <button
            disabled={busy}
            onClick={() => {
              setError('')
              setAttempt((value) => value + 1)
            }}
            type="button"
          >
            Retry setup check
          </button>
        )}

        <div className="data-setup-actions">
          <button
            disabled={busy || !status || (!status.hasConsent && !accepted)}
            onClick={() => void continueSetup()}
            type="button"
          >
            {busy ? 'Saving…' : 'Save choice and continue'}
          </button>
          <button disabled={busy} onClick={() => void signOut()} type="button">
            Sign out
          </button>
        </div>
        <p>
          You can still <Link to="/support">Get Support</Link> without staying
          signed in.
        </p>
      </section>
    </main>
  )
}

export default DataSetupPage
