import { useEffect } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import './App.css'
import ProtectedRoute from './auth/ProtectedRoute'
import DataSetupGate from './auth/DataSetupGate'
import { AuthProvider } from './auth/AuthProvider'
import AuthRoutePage from './components/AuthRoutePage'
import ApplicationLayout from './components/layouts/ApplicationLayout'
import AuthLayout from './components/layouts/AuthLayout'
import PublicLayout from './components/layouts/PublicLayout'
import AboutPage from './pages/AboutPage'
import DashboardPage from './pages/DashboardPage'
import NotFoundPage from './pages/NotFoundPage'
import PrivacyPage from './pages/PrivacyPage'
import RecoveryOverviewPage from './pages/RecoveryOverviewPage'
import TermsPage from './pages/TermsPage'
import TrueCostPage from './pages/TrueCostPage'
import DataSetupPage from './pages/DataSetupPage'
import SettingsPage from './pages/SettingsPage'
import GetSupportPage from './components/GetSupportPage'
import PublicHomePage from './components/PublicHomePage'
import DiaryPage from './pages/DiaryPage'
import MonthlyReflectionPage from './pages/MonthlyReflectionPage'

function RouteFocusManager() {
  const location = useLocation()

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      document.querySelector<HTMLElement>('main h1, main [role="heading"]')
        ?.focus({ preventScroll: true })
      const reducedMotion = window.matchMedia(
        '(prefers-reduced-motion: reduce)',
      ).matches
      window.scrollTo({ top: 0, behavior: reducedMotion ? 'instant' : 'smooth' })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [location.pathname])

  return null
}

function SupportRoute() {
  return (
    <main className="route-main">
      <section className="section-block route-page">
        <GetSupportPage />
      </section>
    </main>
  )
}

function HomeRoute() {
  const navigate = useNavigate()
  return (
    <PublicHomePage
      onLogin={() => navigate('/login')}
      onNavigate={(destination) => navigate(`/${destination}`)}
      onSignup={() => navigate('/register')}
    />
  )
}

function AppRoutes() {
  return (
    <>
      <RouteFocusManager />
      <Routes>
        <Route element={<PublicLayout />}>
          <Route element={<HomeRoute />} index />
          <Route element={<AboutPage />} path="about" />
          <Route element={<SupportRoute />} path="support" />
          <Route element={<PrivacyPage />} path="privacy" />
          <Route element={<TermsPage />} path="terms" />
        </Route>

        <Route element={<AuthLayout />}>
          <Route
            element={<AuthRoutePage mode="login" />}
            path="login"
          />
          <Route
            element={<AuthRoutePage mode="signup" />}
            path="register"
          />
          <Route
            element={<AuthRoutePage mode="forgot-password" />}
            path="forgot-password"
          />
          <Route
            element={<AuthRoutePage mode="reset-password" />}
            path="update-password"
          />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route element={<DataSetupGate />}>
            <Route element={<ApplicationLayout />}>
              <Route element={<DashboardPage />} path="dashboard" />
              <Route element={<TrueCostPage />} path="true-cost" />
              <Route element={<RecoveryOverviewPage />} path="recovery" />
              <Route element={<DiaryPage />} path="recovery/diary" />
              <Route
                element={<MonthlyReflectionPage />}
                path="recovery/monthly-reflection"
              />
              <Route element={<SettingsPage />} path="settings" />
              <Route
                element={<Navigate replace to="/dashboard" />}
                path="home"
              />
              <Route
                element={<Navigate replace to="/login" />}
                path="auth"
              />
            </Route>
          </Route>
          <Route element={<DataSetupPage />} path="data-setup" />
        </Route>

        <Route element={<NotFoundPage />} path="*" />
      </Routes>
    </>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}

export default App
