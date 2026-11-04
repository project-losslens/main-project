import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

type Props = {
  onLogin: () => void
  onNavigate: (destination: string) => void
  onSignup: () => void
}

function PublicHomePage(_props: Props) {
  const [showBackToTop, setShowBackToTop] = useState(false)

  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 560)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="public-home">
      <section aria-labelledby="home-title" className="public-hero">
        <div className="public-section-inner">
          <h1 id="home-title">
            Understand your gambling spending and reflect on your choices.
          </h1>
          <p className="public-hero-description">
            LossLens helps you record gambling activity and review what you
            choose to track.
          </p>
          <p aria-label="Understand, reflect, take action" className="public-steps-row">
            <span>Understand</span>
            <span>Reflect</span>
            <span>Take action</span>
          </p>
          <div className="public-hero-actions">
            <Link className="public-button public-button-primary" to="/register">
              Create account
            </Link>
            <Link className="public-button public-button-quiet" to="/support">
              Get support
            </Link>
          </div>
        </div>
      </section>

      <section aria-label="Support information" className="public-support-strip">
        <div className="public-section-inner">
          <p>
            If gambling is causing worry right now, you can find self-guided
            support information <Link to="/support">here</Link>.
          </p>
        </div>
      </section>

      <section aria-labelledby="features-title" className="public-section">
        <div className="public-section-inner">
          <h2 id="features-title">What you can do here</h2>
          <div className="public-feature-grid">
            <article className="public-feature-card">
              <h3>True Cost</h3>
              <p>Record bets and review recorded stakes, returns and net results.</p>
            </article>
            <article className="public-feature-card">
              <h3>Daily check-ins</h3>
              <p>Record optional check-ins about gambling, mood and triggers.</p>
            </article>
            <article className="public-feature-card">
              <h3>Goals</h3>
              <p>Set a personal goal to stop or reduce gambling.</p>
            </article>
            <article className="public-feature-card">
              <h3>Diary</h3>
              <p>Write optional diary entries about your experiences.</p>
            </article>
            <article className="public-feature-card">
              <h3>Monthly reflection</h3>
              <p>
                Review a month and save optional reflections and a note to your
                future self.
              </p>
            </article>
            <article className="public-feature-card">
              <h3>Reflection tools</h3>
              <p>Use prompts to note thoughts, triggers and possible alternatives.</p>
            </article>
            <article className="public-feature-card">
              <h3>Data export</h3>
              <p>Download an export of account data from Settings.</p>
            </article>
          </div>
        </div>
      </section>

      <section aria-labelledby="how-title" className="public-section">
        <div className="public-section-inner">
          <h2 id="how-title">How LossLens works</h2>
          <ol className="public-steps">
            <li>Create an account and review the data-storage notice.</li>
            <li>Choose whether to agree to account storage before opening private pages.</li>
            <li>Record activity or use optional check-ins, goals and reflections.</li>
            <li>Review summaries or export account records in Settings.</li>
          </ol>
        </div>
      </section>

      <section aria-labelledby="example-title" className="public-section">
        <div className="public-section-inner">
          <h2 id="example-title">See how True Cost works</h2>
          <div className="public-example-box">
            <p className="public-example-label">Example only, not real data</p>
            <div className="public-example-table-wrap">
              <table className="public-example-table">
                <caption>Example recorded stakes, returns and net results</caption>
                <thead>
                  <tr>
                    <th scope="col">Entry</th>
                    <th scope="col">Stake</th>
                    <th scope="col">Returned</th>
                    <th scope="col">Net result</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <th scope="row">Bet 1</th>
                    <td data-label="Stake">KES 100</td>
                    <td data-label="Returned">KES 0</td>
                    <td data-label="Net result">-KES 100</td>
                  </tr>
                  <tr>
                    <th scope="row">Bet 2</th>
                    <td data-label="Stake">KES 200</td>
                    <td data-label="Returned">KES 150</td>
                    <td data-label="Net result">-KES 50</td>
                  </tr>
                  <tr className="public-example-total">
                    <th scope="row">Total</th>
                    <td data-label="Stake">KES 300</td>
                    <td data-label="Returned">KES 150</td>
                    <td data-label="Net result">-KES 150</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="who-title" className="public-section">
        <div className="public-section-inner">
          <h2 id="who-title">Who it is for</h2>
          <div className="public-columns">
            <div className="public-column">
              <h3>LossLens may help if</h3>
              <ul>
                <li>You want to record gambling spending.</li>
                <li>You want to notice patterns in the records you enter.</li>
                <li>You want prompts for personal reflection.</li>
              </ul>
            </div>
            <div className="public-column">
              <h3>LossLens is not</h3>
              <ul>
                <li>A replacement for professional support.</li>
                <li>A clinical or medical service.</li>
                <li>A guarantee that you will stop gambling.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="privacy-title" className="public-section">
        <div className="public-section-inner">
          <h2 id="privacy-title">Your privacy in plain words</h2>
          <ul className="public-privacy-list">
            <li>Personal records are stored in your account after you agree to account storage.</li>
            <li>Records are not used for advertising or analytics in this application.</li>
            <li>Deletion requests need project-team review; submitting one does not delete your account or records.</li>
            <li>LossLens cannot promise immediate or complete deletion from backups.</li>
          </ul>
          <p>
            <Link to="/privacy">Read the privacy policy</Link>
          </p>
        </div>
      </section>

      <section aria-labelledby="faq-title" className="public-section">
        <div className="public-section-inner">
          <h2 id="faq-title">Frequently asked questions</h2>
          <div className="public-faq-list">
            <details className="public-faq-item">
              <summary>What is LossLens?</summary>
              <p>
                LossLens is a tool for recording gambling costs and reflecting
                on the activity you choose to track.
              </p>
            </details>
            <details className="public-faq-item">
              <summary>Who is it for?</summary>
              <p>
                It is for people who want to record gambling spending, review
                their entries or use optional reflection tools.
              </p>
            </details>
            <details className="public-faq-item">
              <summary>How are my records stored?</summary>
              <p>
                Private records are stored in your account after you agree to
                the storage notice. See the privacy policy for details.
              </p>
            </details>
            <details className="public-faq-item">
              <summary>How can I get support?</summary>
              <p>
                Visit <Link to="/support">Get Support</Link> for self-guided
                reflection material. It is not a crisis service or a
                replacement for professional help.
              </p>
            </details>
          </div>
        </div>
      </section>

      <section aria-labelledby="contact-title" className="public-section">
        <div className="public-section-inner">
          <h2 id="contact-title">Get in touch</h2>
          <div className="public-contact-list">
            {/* Add verified contact details here when approved. */}
            <p>Contact email: coming soon</p>
            <p>Phone: coming soon</p>
          </div>
        </div>
      </section>

      {showBackToTop && (
        <button
          aria-label="Back to top"
          className="back-to-top"
          onClick={() => window.scrollTo({ top: 0, behavior: 'auto' })}
          type="button"
        >
          ↑
        </button>
      )}
    </div>
  )
}

export default PublicHomePage
