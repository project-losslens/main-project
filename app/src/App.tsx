import { useEffect, useState } from 'react'
import type { Session, SupabaseClient } from '@supabase/supabase-js'
import './App.css'
import AuthModule from './components/AuthModule'
import GetSupportPage from './components/GetSupportPage'
import HomeDashboard from './components/HomeDashboard'
import PersonalSupportModule from './components/PersonalSupportModule'
import TrueCostModule from './components/TrueCostModule'

type IconName = 'home' | 'chart' | 'journal' | 'tools' | 'support' | 'arrow'

type View = 'landing' | 'home' | 'true-cost' | 'recovery' | 'support' | 'auth'
type PrivateView = 'home' | 'true-cost' | 'recovery'
type NavigableView = Exclude<View, 'landing'>
type AuthStartMode = 'login' | 'signup'

function isPrivateView(view: View): view is PrivateView {
  return view === 'home' || view === 'true-cost' || view === 'recovery'
}

const supportFeatures: {
  title: string
  description: string
  icon: IconName
  anchorId: string
}[] = [
  {
    title: 'Daily check-in',
    description:
      'Optional local reflection on gambling, urges, mood, triggers, and what helped.',
    icon: 'journal',
    anchorId: 'daily-check-in',
  },
  {
    title: 'Recovery progress',
    description:
      'Track your own goal using only days you explicitly record.',
    icon: 'chart',
    anchorId: 'recovery-progress',
  },
  {
    title: 'Tools for a difficult moment',
    description:
      'Use an optional pause timer, grounding exercise, or personal reflection.',
    icon: 'tools',
    anchorId: 'urge-tools',
  },
]

function Icon({ name }: { name: IconName }) {
  const paths: Record<IconName, React.ReactNode> = {
    home: (
      <>
        <path d="m3.5 10 8.5-7 8.5 7" />
        <path d="M5.5 9v10h13V9M9 19v-6h6v6" />
      </>
    ),
    chart: (
      <>
        <path d="M4 19.5h16" />
        <path d="M6.5 16v-4M12 16V6M17.5 16v-7" />
      </>
    ),
    journal: (
      <>
        <path d="M6 3.5h12a1.5 1.5 0 0 1 1.5 1.5v14a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 19V5A1.5 1.5 0 0 1 6 3.5Z" />
        <path d="M8 8h8M8 12h8M8 16h5" />
      </>
    ),
    tools: (
      <>
        <path d="M14 6.5a4.5 4.5 0 0 0-5.8 5.8L3.5 17a2.1 2.1 0 0 0 3 3l4.7-4.7A4.5 4.5 0 0 0 17 9.5l-2.7 2.7-2.5-2.5L14 6.5Z" />
      </>
    ),
    support: (
      <>
        <path d="M12 20s-7.5-4.3-7.5-10a4.2 4.2 0 0 1 7.5-2.6A4.2 4.2 0 0 1 19.5 10c0 5.7-7.5 10-7.5 10Z" />
      </>
    ),
    arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
  }

  return (
    <svg
      aria-hidden="true"
      className="icon"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.7"
      viewBox="0 0 24 24"
    >
      {paths[name]}
    </svg>
  )
}

function App() {
  const [view, setView] = useState<View>('landing')
  const [authStartMode, setAuthStartMode] = useState<AuthStartMode>('login')
  const [authClient, setAuthClient] = useState<SupabaseClient | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [authUnavailable, setAuthUnavailable] = useState(false)
  const [session, setSession] = useState<Session | null>(null)
  const [recoveryAvailable, setRecoveryAvailable] = useState(false)
  const [recoveryLinkError, setRecoveryLinkError] = useState(false)
  const [authNotice, setAuthNotice] = useState('')
  const [signingOut, setSigningOut] = useState(false)
  const authenticated = authReady && session !== null

  function openAuth(mode: AuthStartMode) {
    setAuthStartMode(mode)
    setAuthNotice('')
    setView('auth')
  }

  function navigate(nextView: NavigableView) {
    if (isPrivateView(nextView) && !authenticated) {
      setAuthStartMode('login')
      setAuthNotice(
        authReady ? 'Sign in to access your LossLens workspace.' : '',
      )
      setView('auth')
      return
    }

    setView(nextView)
  }

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

    async function restoreSession() {
      try {
        const { supabase } = await import('./lib/supabase')
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
              setView('auth')
            } else if (event === 'SIGNED_IN') {
              setRecoveryLinkError(false)
              setAuthNotice('')
            } else if (event === 'SIGNED_OUT') {
              setRecoveryAvailable(false)
              setRecoveryLinkError(false)
              setAuthNotice('Your session ended. Sign in to continue.')
              setView((currentView) =>
                isPrivateView(currentView) ? 'auth' : currentView,
              )
            }
          },
        )
        unsubscribe = () => data.subscription.unsubscribe()

        const sessionResult = await supabase.auth.getSession()
        if (!active) return
        if (sessionResult.error) {
          setAuthNotice(
            'Your sign-in session could not be restored. Sign in again to access your workspace. Get Support remains available without an account.',
          )
        } else {
          setSession(sessionResult.data.session)
          if (
            authenticationLinkErrorRequested ||
            (recoveryLinkRequested && !sessionResult.data.session)
          ) {
            setRecoveryLinkError(true)
            setView('auth')
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
  }, [])

  useEffect(() => {
    const headingId: Partial<Record<View, string>> = {
      landing: 'public-title',
      home: 'welcome-title',
      'true-cost': 'true-cost-title',
      recovery: 'personal-support-title',
      support: 'support-page-title',
      auth: 'auth-title',
    }
    const heading = headingId[view]
    if (heading) document.getElementById(heading)?.focus()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [view])

  const navigation: {
    view: NavigableView
    label: string
    icon: IconName
  }[] = authenticated
    ? [
        { view: 'home', label: 'Home', icon: 'home' },
        { view: 'true-cost', label: 'True Cost', icon: 'chart' },
        { view: 'recovery', label: 'My Recovery', icon: 'journal' },
        { view: 'support', label: 'Get Support', icon: 'support' },
      ]
    : [{ view: 'support', label: 'Get Support', icon: 'support' }]

  return (
    <div className="app-shell">
      <header className="site-header">
        <a
          aria-label="LossLens home"
          className="brand"
          href={authenticated ? '#home' : '#public-home'}
          onClick={(event) => {
            event.preventDefault()
            setView(authenticated ? 'home' : 'landing')
          }}
        >
          <img
            alt="LossLens"
            className="brand-logo"
            height="750"
            src="/losslens-logo-dark.png"
            width="1700"
          />
        </a>

        <nav aria-label="Main navigation" className="main-nav">
          {navigation.map((item) => (
            <button
              aria-current={view === item.view ? 'page' : undefined}
              className="nav-link"
              key={item.view}
              onClick={() => navigate(item.view)}
              type="button"
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="header-actions">
          {authenticated && session ? (
            <>
              <span
                className="account-email"
                title={session.user.email ?? 'Signed in'}
              >
                {session.user.email ?? 'Signed in'}
              </span>
              <button
                className="header-link"
                disabled={signingOut}
                onClick={async () => {
                  if (!authClient || signingOut) return
                  setSigningOut(true)
                  setAuthNotice('')
                  try {
                    const { error } = await authClient.auth.signOut()
                    if (error) {
                      setAuthNotice('Could not sign out. Please try again.')
                      setView('auth')
                    } else {
                      setAuthNotice('')
                      setView('landing')
                    }
                  } catch {
                    setAuthNotice('Could not sign out. Please try again.')
                    setView('auth')
                  } finally {
                    setSigningOut(false)
                  }
                }}
                type="button"
              >
                {signingOut ? 'Signing out…' : 'Sign out'}
              </button>
            </>
          ) : (
            <>
              <button
                aria-current={view === 'auth' ? 'page' : undefined}
                className="header-link"
                onClick={() => openAuth('login')}
                type="button"
              >
                Log in
              </button>
              <button
                className="header-link"
                onClick={() => openAuth('signup')}
                type="button"
              >
                Create account
              </button>
            </>
          )}
          <button
            className="header-link support-cta"
            onClick={() => navigate('support')}
            type="button"
          >
            Explore support <Icon name="arrow" />
          </button>
        </div>
      </header>

      <main id={view === 'landing' ? 'public-home' : 'home'}>
        <div className="main-content">
          {view === 'landing' && (
            <section
              aria-labelledby="public-title"
              className="welcome-panel public-landing-panel"
            >
              <div className="welcome-copy">
                <p className="eyebrow eyebrow-light">
                  A clearer place to begin
                </p>
                <h1 id="public-title" tabIndex={-1}>
                  Understand the cost.
                  <br />
                  Make room to reflect.
                </h1>
                <p className="welcome-description">
                  LossLens helps you record gambling outcomes and make space
                  for personal reflection. Your True Cost records and My
                  Recovery information stay in this browser on this device;
                  signing in does not upload or sync them.
                </p>
                <div className="public-landing-actions">
                  <button
                    className="button button-light"
                    onClick={() => openAuth('login')}
                    type="button"
                  >
                    Log in
                  </button>
                  <button
                    className="button button-outline"
                    onClick={() => openAuth('signup')}
                    type="button"
                  >
                    Create account
                  </button>
                </div>
              </div>
              <div aria-hidden="true" className="welcome-art">
                <span className="art-orbit orbit-one" />
                <span className="art-orbit orbit-two" />
                <span className="art-dot dot-one" />
                <span className="art-dot dot-two" />
                <span className="art-dot dot-three" />
                <span className="art-lens">
                  <span />
                </span>
              </div>
              <p className="welcome-note">A thoughtful space, at your pace.</p>
            </section>
          )}

          {view === 'home' && authenticated && (
            <>
              <section aria-labelledby="welcome-title" className="welcome-panel">
                <div className="welcome-copy">
                  <p className="eyebrow eyebrow-light">A clearer place to begin</p>
                  <h1 id="welcome-title" tabIndex={-1}>
                    Understand the cost.
                    <br />
                    Make room to reflect.
                  </h1>
                  <p className="welcome-description">
                    LossLens brings gambling-cost awareness and personal
                    reflection together in one considered space.
                  </p>
                  <button
                    className="button button-light"
                    onClick={() => navigate('true-cost')}
                    type="button"
                  >
                    Explore True Cost <Icon name="arrow" />
                  </button>
                </div>
                <div aria-hidden="true" className="welcome-art">
                  <span className="art-orbit orbit-one" />
                  <span className="art-orbit orbit-two" />
                  <span className="art-dot dot-one" />
                  <span className="art-dot dot-two" />
                  <span className="art-dot dot-three" />
                  <span className="art-lens">
                    <span />
                  </span>
                </div>
                <p className="welcome-note">A thoughtful space, at your pace.</p>
              </section>
              <HomeDashboard
                onNavigate={(target) => navigate(target)}
              />
            </>
          )}

          {view === 'true-cost' && authenticated && (
            <section aria-labelledby="true-cost-title" className="section-block" id="true-cost">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Recorded activity · no expected-loss estimates</p>
                  <h1 id="true-cost-title" tabIndex={-1}>True Cost</h1>
                  <p className="section-description">
                    Record transactions and understand the actual results for
                    clearly defined dates.
                  </p>
                </div>
              </div>
              <TrueCostModule />
            </section>
          )}

          {view === 'recovery' && authenticated && (
            <section
              aria-labelledby="personal-support-title"
              className="section-block support-section"
              id="personal-support"
            >
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Your choices · stored locally</p>
                  <h1 id="personal-support-title" tabIndex={-1}>My Recovery</h1>
                  <p className="section-description">
                    Optional check-ins, your personal goals, and tools for
                    difficult moments.
                  </p>
                </div>
              </div>
              <div className="recovery-quick-nav">
                {supportFeatures.map((feature) => (
                  <a
                    className="feature-card feature-card-link"
                    href={`#${feature.anchorId}`}
                    key={feature.title}
                  >
                    <div aria-hidden="true" className="feature-icon-wrap">
                      <Icon name={feature.icon} />
                    </div>
                    <div className="feature-card-content">
                      <h3>{feature.title}</h3>
                      <p>{feature.description}</p>
                    </div>
                    <Icon name="arrow" />
                  </a>
                ))}
              </div>
              <PersonalSupportModule />
            </section>
          )}

          {view === 'support' && (
            <section className="section-block" id="support-resources">
              <GetSupportPage />
            </section>
          )}

          {view === 'auth' && (
            <AuthModule
              authClient={authClient}
              authNotice={authNotice}
              authReady={authReady}
              authUnavailable={authUnavailable}
              initialMode={authStartMode}
              key={authStartMode}
              onRecoveryComplete={() => setRecoveryAvailable(false)}
              onReturnHome={() => navigate('home')}
              onReturnPublicLanding={() => setView('landing')}
              recoveryAvailable={recoveryAvailable}
              recoveryLinkError={recoveryLinkError}
              session={session}
            />
          )}

          <footer className="site-footer">
            <span className="footer-brand">LossLens</span>
            <p>
              Personal records and reflections are stored in this browser on
              this device by default.
            </p>
          </footer>
        </div>
      </main>
    </div>
  )
}

export default App
