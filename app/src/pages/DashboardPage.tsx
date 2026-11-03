import { useNavigate } from 'react-router-dom'
import HomeDashboard from '../components/HomeDashboard'

function DashboardPage() {
  const navigate = useNavigate()
  return (
    <section aria-labelledby="dashboard-route-title" className="route-page">
      <h1 className="visually-hidden" id="dashboard-route-title" tabIndex={-1}>
        Dashboard
      </h1>
      <HomeDashboard
        onNavigate={(target) => {
          if (target === 'true-cost') navigate('/true-cost')
          else if (target === 'recovery') navigate('/recovery')
          else navigate('/support')
        }}
      />
    </section>
  )
}

export default DashboardPage
