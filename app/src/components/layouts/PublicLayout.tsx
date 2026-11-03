import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/authContext'

function PublicLayout() {
  const { authClient, session, setAuthNotice } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const navigate = useNavigate()

  async function signOut() {
    if (!authClient || signingOut) return
    setSigningOut(true)
    setAuthNotice('')
    try {
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
          aria-controls="route-main-nav"
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
        <nav
          aria-label="Main navigation"
          className="main-nav"
          id="route-main-nav"
        >
          <NavLink className="nav-link" onClick={closeMenu} to="/">
            Home
          </NavLink>
          <NavLink className="nav-link" onClick={closeMenu} to="/about">
            About
          </NavLink>
          <NavLink className="nav-link" onClick={closeMenu} to="/true-cost">
            True Cost
          </NavLink>
          <NavLink className="nav-link" onClick={closeMenu} to="/recovery">
            My Recovery
          </NavLink>
          <NavLink className="nav-link" onClick={closeMenu} to="/support">
            Get Support
          </NavLink>
        </nav>
        <div className="header-actions">
          {session ? (
            <>
              <Link className="header-link" onClick={closeMenu} to="/dashboard">
                Dashboard
              </Link>
              <button
                className="header-link"
                disabled={signingOut}
                onClick={() => void signOut()}
                type="button"
              >
                {signingOut ? 'Signing out…' : 'Sign out'}
              </button>
            </>
          ) : (
            <>
              <Link className="header-link" onClick={closeMenu} to="/login">
                Login
              </Link>
              <Link className="header-link" onClick={closeMenu} to="/register">
                Create account
              </Link>
            </>
          )}
        </div>
      </header>
      <Outlet />
    </div>
  )
}

export default PublicLayout
