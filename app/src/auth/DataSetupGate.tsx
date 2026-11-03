import { useEffect, useState } from 'react'
import { Link, Navigate, Outlet, useLocation } from 'react-router-dom'
import type { DataSetupStatus } from '../lib/cloudData'

type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; data: DataSetupStatus }
  | { status: 'error'; message: string }

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'Your account setup could not be checked.'
}

function DataSetupGate() {
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState<LoadState>({ status: 'loading' })
  const location = useLocation()

  useEffect(() => {
    let active = true
    import('../lib/cloudData')
      .then(({ getDataSetupStatus }) => getDataSetupStatus())
      .then((data) => {
        if (active) setState({ status: 'ready', data })
      })
      .catch((error: unknown) => {
        if (active) {
          setState({ status: 'error', message: getErrorMessage(error) })
        }
      })
    return () => {
      active = false
    }
  }, [attempt])

  if (state.status === 'loading') {
    return (
      <div aria-live="polite" className="route-loading" role="status">
        Checking account data setup…
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <main className="route-main">
        <section className="route-page">
          <h1>Account data setup could not be checked</h1>
          <p role="alert">{state.message}</p>
          <p>
            Private records are not opened until account storage status can be
            confirmed. You can still <Link to="/support">Get Support</Link>.
          </p>
          <p>
            <Link to="/data-setup">Open account data setup</Link> or sign out
            and contact the project team if the setup cannot be loaded.
          </p>
          <button
            onClick={() => {
              setState({ status: 'loading' })
              setAttempt((value) => value + 1)
            }}
            type="button"
          >
            Retry
          </button>
        </section>
      </main>
    )
  }

  if (!state.data.ready) {
    return (
      <Navigate
        replace
        state={{ from: `${location.pathname}${location.search}${location.hash}` }}
        to="/data-setup"
      />
    )
  }

  return <Outlet />
}

export default DataSetupGate
