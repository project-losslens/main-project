import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/authContext'
import CloudDataProvider from '../CloudDataProvider'
import { flushCloudPersonalData } from '../../lib/personalData'

function ApplicationLayout() {
  const { authClient, session, setAuthNotice } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [cloudSaveError, setCloudSaveError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    function handleCloudSaveState(event: Event) {
      const detail = (event as CustomEvent<{ error: string | null }>).detail
      setCloudSaveError(detail.error ?? '')
    }

    window.addEventListener('losslens:cloud-save-state', handleCloudSaveState)
    return () =>
      window.removeEventListener(
        'losslens:cloud-save-state',
        handleCloudSaveState,
      )
  }, [])

  async function signOut() {
    if (!authClient || signingOut) return
    setSigningOut(true)
    setAuthNotice('')
    try {
      await flushCloudPersonalData()
      const { error } = await authClient.auth.signOut()
      if (error) {
        setAuthNotice(`Could not sign out: ${error.message}`)
        return
      }
      navigate('/', { replace: true })
    } catch (error) {
      setAuthNotice(
        error instanceof Error
          ? `Could not sign out: ${error.message}`
          : 'Could not sign out. Please try again.',
      )
    } finally {
      setSigningOut(false)
    }
  }

  function closeMenu() {
    setMenuOpen(false)
  }

  return (
    <div className="app-shell route-shell">
      <header className={`site-header${menuOpen ? ' menu-open' : ''}`}>
        <Link aria-label="LossLens home" className="brand" onClick={closeMenu} to="/">
          <img
            alt="LossLens"
            className="brand-logo"
            height="750"
            src="/losslens-logo-dark.png"
            width="1700"
          />
        </Link>
        <button
          aria-controls="route-app-nav"
          aria-expanded={menuOpen}
          aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          className="mobile-menu-toggle"
          onClick={() => setMenuOpen((open) => !open)}
          type="button"
        >
          <span />
          <span />
          <span />
        </button>
        <nav aria-label="Application navigation" className="main-nav" id="route-app-nav">
          <NavLink className="nav-link" onClick={closeMenu} to="/dashboard">
            Dashboard
          </NavLink>
          <NavLink className="nav-link" onClick={closeMenu} to="/true-cost">
            True Cost
          </NavLink>
          <NavLink className="nav-link" onClick={closeMenu} to="/recovery">
            My Recovery
          </NavLink>
          <NavLink className="nav-link" onClick={closeMenu} to="/recovery/diary">
            Diary
          </NavLink>
          <NavLink className="nav-link" onClick={closeMenu} to="/support">
            Get Support
          </NavLink>
          <NavLink className="nav-link" onClick={closeMenu} to="/settings">
            Settings
          </NavLink>
        </nav>
        <div className="header-actions">
          {session?.user.email && (
            <span className="account-email" title={session.user.email}>
              {session.user.email}
            </span>
          )}
          <button
            className="header-link"
            disabled={signingOut}
            onClick={() => void signOut()}
            type="button"
          >
            {signingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      </header>
      <main className="route-main">
        {cloudSaveError && (
          <p aria-live="assertive" className="error-message" role="alert">
            Your latest recovery change could not be saved to your account:{' '}
            {cloudSaveError}
          </p>
        )}
        <CloudDataProvider>
          <Outlet />
        </CloudDataProvider>
      </main>
    </div>
  )
}

export default ApplicationLayout
