import { Link } from 'react-router-dom'
import PersonalSupportModule from '../components/PersonalSupportModule'

function RecoveryOverviewPage() {
  return (
    <section
      aria-labelledby="personal-support-title"
      className="section-block support-section route-page"
    >
      <div className="section-heading">
        <div>
          <p className="eyebrow">Your choices · personal reflection</p>
          <h1 id="personal-support-title" tabIndex={-1}>My Recovery</h1>
          <p className="section-description">
            Optional check-ins, personal goals and tools for difficult moments.
          </p>
        </div>
      </div>
      <p>
        <Link className="secondary-button" to="/recovery/diary">
          Open daily diary
        </Link>
        {' '}
        <Link className="secondary-button" to="/recovery/monthly-reflection">
          Monthly reflection
        </Link>
      </p>
      <PersonalSupportModule />
    </section>
  )
}

export default RecoveryOverviewPage
