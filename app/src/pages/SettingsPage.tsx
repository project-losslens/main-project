import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/authContext'

type DeletionRequest = {
  id: string
  status: string
  requestedAt: string
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Settings could not be loaded.'
}

function downloadJson(value: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(value, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function SettingsPage() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [requests, setRequests] = useState<DeletionRequest[]>([])
  const [message, setMessage] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [revokeConfirmed, setRevokeConfirmed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')

  async function loadRequests() {
    try {
      const { getAccountDeletionRequests } = await import('../lib/cloudData')
      setRequests(await getAccountDeletionRequests())
      setError('')
    } catch (cause) {
      setError(getErrorMessage(cause))
    }
  }

  async function handleExport() {
    setBusy(true)
    setError('')
    setStatus('')
    try {
      const { exportCloudData } = await import('../lib/cloudData')
      const backup = await exportCloudData()
      downloadJson(
        backup,
        `losslens-account-export-${new Date().toISOString().slice(0, 10)}.json`,
      )
      setStatus(
        'Your account export download started. Keep the file somewhere private and secure; it contains sensitive personal information.',
      )
    } catch (cause) {
      setError(getErrorMessage(cause))
    } finally {
      setBusy(false)
    }
  }

  async function handleDeletionRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (confirmation !== 'REQUEST DELETION' || busy) return
    setBusy(true)
    setError('')
    setStatus('')
    try {
      const { requestAccountDeletion } = await import('../lib/cloudData')
      await requestAccountDeletion(message)
      setMessage('')
      setConfirmation('')
      setStatus(
        'Your request was recorded. This request does not delete your account or data. The LossLens project team must review and process it.',
      )
      await loadRequests()
    } catch (cause) {
      setError(getErrorMessage(cause))
    } finally {
      setBusy(false)
    }
  }

  async function handleRevokeConsent() {
    if (!revokeConfirmed || busy) return
    setBusy(true)
    setError('')
    setStatus('')
    try {
      const { revokeCloudStorageConsent } = await import('../lib/cloudData')
      await revokeCloudStorageConsent()
      navigate('/data-setup', { replace: true })
    } catch (cause) {
      setError(getErrorMessage(cause))
      setBusy(false)
    }
  }

  return (
    <section aria-labelledby="settings-title" className="route-page settings-page">
      <p className="eyebrow">Account settings</p>
      <h1 id="settings-title" tabIndex={-1}>Settings and data</h1>
      <p>
        Signed in as <strong>{session?.user.email ?? 'your account'}</strong>.
        This page can export the account data currently stored in LossLens.
      </p>

      <section aria-labelledby="export-title" className="support-card">
        <h2 id="export-title">Export account data</h2>
        <p>
          Download a JSON export of your personal records held in the LossLens
          Supabase project. The export can include financial entries, recovery
          data, preferences, and migration or deletion-request metadata. It is
          not encrypted by LossLens.
        </p>
        <button disabled={busy} onClick={() => void handleExport()} type="button">
          {busy ? 'Preparing…' : 'Download account export'}
        </button>
      </section>

      <section aria-labelledby="deletion-title" className="support-card">
        <h2 id="deletion-title">Request account deletion</h2>
        <p>
          Submitting a request records it for project-team review. It does not
          delete your Supabase Auth account or remove active records or backups.
          No automatic deletion or completion time is promised by this form.
        </p>
        <button
          disabled={busy}
          onClick={() => void loadRequests()}
          type="button"
        >
          Check deletion-request status
        </button>
        <form onSubmit={(event) => void handleDeletionRequest(event)}>
          <label htmlFor="deletion-message">
            Optional message for the LossLens project team
          </label>
          <textarea
            id="deletion-message"
            maxLength={2000}
            onChange={(event) => setMessage(event.target.value)}
            rows={4}
            value={message}
          />
          <label htmlFor="deletion-confirmation">
            Type <strong>REQUEST DELETION</strong> to confirm
          </label>
          <input
            autoComplete="off"
            id="deletion-confirmation"
            onChange={(event) => setConfirmation(event.target.value)}
            value={confirmation}
          />
          <button
            disabled={busy || confirmation !== 'REQUEST DELETION'}
            type="submit"
          >
            {busy ? 'Submitting…' : 'Submit deletion request'}
          </button>
        </form>
        {requests.length > 0 && (
          <div aria-live="polite">
            <h3>Your requests</h3>
            <ul>
              {requests.map((request) => (
                <li key={request.id}>
                  {request.status} —{' '}
                  {new Intl.DateTimeFormat('en-KE', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  }).format(new Date(request.requestedAt))}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section aria-labelledby="storage-choice-title" className="support-card">
        <h2 id="storage-choice-title">Stop using cloud storage</h2>
        <p>
          This will stop LossLens private pages from accessing account records
          until you review and accept the storage notice again. It does not
          delete records already stored in Supabase; use the deletion-request
          process above for a request to the project team.
        </p>
        <label className="checkbox-row">
          <input
            checked={revokeConfirmed}
            onChange={(event) => setRevokeConfirmed(event.target.checked)}
            type="checkbox"
          />
          <span>
            I understand this stops app access but does not erase cloud records.
          </span>
        </label>
        <button
          disabled={busy || !revokeConfirmed}
          onClick={() => void handleRevokeConsent()}
          type="button"
        >
          Stop using cloud storage
        </button>
      </section>

      {error && <p className="error-message" role="alert">{error}</p>}
      {status && <p aria-live="polite" className="status-message" role="status">{status}</p>}
    </section>
  )
}

export default SettingsPage
