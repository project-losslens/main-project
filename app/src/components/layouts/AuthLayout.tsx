import { Link, Outlet } from 'react-router-dom'

function AuthLayout() {
  return (
    <div className="app-shell route-shell">
      <header className="site-header auth-route-header">
        <Link aria-label="Return to LossLens home" className="brand" to="/">
          <img
            alt="LossLens"
            className="brand-logo"
            height="750"
            src="/losslens-logo-dark.png"
            width="1700"
          />
        </Link>
        <nav aria-label="Public navigation" className="main-nav">
          <Link className="nav-link" to="/support">
            Get Support
          </Link>
        </nav>
        <Link className="header-link" to="/">
          Back to home
        </Link>
      </header>
      <main className="route-main">
        <Outlet />
      </main>
    </div>
  )
}

export default AuthLayout
