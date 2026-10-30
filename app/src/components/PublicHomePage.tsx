import { useEffect, useRef, useState } from 'react'

type PublicDestination = 'true-cost' | 'recovery' | 'support'
type FeatureIcon = 'chart' | 'journal' | 'support'

type Props = {
  onNavigate: (view: PublicDestination) => void
  onLogin: () => void
  onSignup: () => void
}

const faqs = [
  {
    question: 'What is LossLens?',
    answer:
      'LossLens is a digital platform for understanding recorded gambling finances, reflecting on personal experiences, and finding support information.',
  },
  {
    question: 'Do I need an account?',
    answer:
      'An account is currently needed to open the private Dashboard, True Cost, and My Recovery sections. Get Support and this public homepage are available without signing in.',
  },
  {
    question: 'What does True Cost calculate?',
    answer:
      'True Cost summarises stakes and returns you record, including the resulting net amount for a selected period. It describes entered records, not predictions, and may be incomplete if records are missing.',
  },
  {
    question: 'What can I do in My Recovery?',
    answer:
      'My Recovery includes optional personal check-ins, goal tracking, reflections, and tools for difficult moments. It is a self-help space, not a clinical service.',
  },
  {
    question: 'Can I access Get Support without an account?',
    answer:
      'Yes. Get Support is public and does not require registration or sign-in.',
  },
  {
    question: 'Where is my personal data stored?',
    answer:
      'True Cost records are stored in this browser using IndexedDB. My Recovery records use this browser’s localStorage. Supabase is used for authentication. Personal records are not automatically synchronised between devices or accounts.',
  },
  {
    question: 'Is LossLens a medical service?',
    answer:
      'No. LossLens is an awareness and self-help platform. It does not diagnose or replace professional care.',
  },
]

function FeatureIcon({ name }: { name: FeatureIcon }) {
  const paths = {
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
    support: (
      <>
        <path d="M12 20s-7.5-4.3-7.5-10a4.2 4.2 0 0 1 7.5-2.6A4.2 4.2 0 0 1 19.5 10c0 5.7-7.5 10-7.5 10Z" />
      </>
    ),
  }

  return (
    <svg
      aria-hidden="true"
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

function scrollToSection(id: string) {
  const section = document.getElementById(id)
  if (!section) return

  const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ? 'instant'
    : 'smooth'
  section.scrollIntoView({ behavior, block: 'start' })
}

function PublicHomePage({ onNavigate, onLogin, onSignup }: Props) {
  const pageRef = useRef<HTMLDivElement>(null)
  const [showBackToTop, setShowBackToTop] = useState(false)
  const [copyrightYear, setCopyrightYear] = useState(2026)

  useEffect(() => {
    const page = pageRef.current
    if (!page) return

    const revealItems = page.querySelectorAll<HTMLElement>('.homepage-reveal')
    setCopyrightYear(new Date().getFullYear())
    if (typeof IntersectionObserver === 'undefined') {
      revealItems.forEach((item) => item.classList.add('is-visible'))
    } else {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('is-visible')
              observer.unobserve(entry.target)
            }
          })
        },
        { rootMargin: '0px 0px -8% 0px', threshold: 0.12 },
      )

      revealItems.forEach((item) => observer.observe(item))
      page.classList.add('is-ready')

      const onScroll = () => setShowBackToTop(window.scrollY > 560)
      onScroll()
      window.addEventListener('scroll', onScroll, { passive: true })

      return () => {
        observer.disconnect()
        window.removeEventListener('scroll', onScroll)
      }
    }

    page.classList.add('is-ready')
    const onScroll = () => setShowBackToTop(window.scrollY > 560)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div aria-label="LossLens public homepage" className="public-home" ref={pageRef}>
      <section aria-labelledby="public-title" className="public-hero" id="home">
        <div aria-hidden="true" className="hero-atmosphere">
          <span className="hero-orb hero-orb-teal" />
          <span className="hero-orb hero-orb-sky" />
          <span className="hero-geometry hero-geometry-one" />
          <span className="hero-geometry hero-geometry-two" />
          <span className="hero-geometry hero-geometry-three" />
        </div>
        <div className="public-hero-inner">
          <div className="public-hero-copy homepage-reveal">
            <p className="public-eyebrow">A thoughtful space, at your pace</p>
            <h1 id="public-title" tabIndex={-1}>
              See the full picture.
              <br />
              <span>Take back control.</span>
            </h1>
            <p className="public-hero-description">
              Understand the financial impact of gambling, track your recovery
              journey and find support when you need it.
            </p>
            <div className="public-hero-actions">
              <button
                className="public-button public-button-primary"
                onClick={() => scrollToSection('public-pillars')}
                type="button"
              >
                Explore LossLens <span aria-hidden="true">↓</span>
              </button>
              <button
                className="public-button public-button-quiet"
                onClick={() => onNavigate('support')}
                type="button"
              >
                Get Support <span aria-hidden="true">→</span>
              </button>
            </div>
            <p className="public-hero-note">
              Clear information. Personal choices. No judgement.
            </p>
          </div>

          <div aria-label="LossLens logo" className="public-hero-art homepage-reveal" role="img">
            <span aria-hidden="true" className="hero-logo-orbit hero-logo-orbit-outer" />
            <span aria-hidden="true" className="hero-logo-orbit hero-logo-orbit-inner" />
            <span aria-hidden="true" className="hero-logo-dot hero-logo-dot-one" />
            <span aria-hidden="true" className="hero-logo-dot hero-logo-dot-two" />
            <img
              alt=""
              className="public-hero-logo"
              height="750"
              src="/losslens-logo-dark.png"
              width="1700"
            />
            <span aria-hidden="true" className="hero-caption hero-caption-top">
              Understand
            </span>
            <span aria-hidden="true" className="hero-caption hero-caption-bottom">
              Reflect · Take action
            </span>
          </div>
        </div>
        <button
          aria-label="Scroll to About LossLens"
          className="hero-scroll-cue"
          onClick={() => scrollToSection('about-losslens')}
          type="button"
        >
          <span aria-hidden="true" />
        </button>
      </section>

      <section
        aria-labelledby="about-title"
        className="public-section public-about-section"
        id="about-losslens"
        tabIndex={-1}
      >
        <div className="public-section-inner public-about-layout">
          <div className="public-section-heading homepage-reveal">
            <p className="public-eyebrow public-eyebrow-dark">About LossLens</p>
            <h2 id="about-title">A clearer way forward</h2>
          </div>
          <div className="public-about-copy homepage-reveal">
            <p>
              LossLens is a digital platform designed to help individuals
              understand the financial impact of gambling, reflect on their
              habits and access resources that support healthier decisions.
            </p>
            <span aria-hidden="true" className="about-accent-line" />
          </div>
        </div>
      </section>

      <section
        aria-labelledby="pillars-title"
        className="public-section public-pillars-section"
        id="public-pillars"
      >
        <div className="public-section-inner">
          <div className="public-section-heading homepage-reveal">
            <p className="public-eyebrow public-eyebrow-dark">Three ways to begin</p>
            <h2 id="pillars-title">Tools for a more informed next step</h2>
            <p className="public-section-intro">
              Choose what feels useful. Each space is designed to support
              reflection, not to make decisions for you.
            </p>
          </div>

          <div className="public-feature-grid">
            <article className="public-feature-card public-feature-cost homepage-reveal">
              <div aria-hidden="true" className="public-feature-icon">
                <FeatureIcon name="chart" />
              </div>
              <p className="public-card-kicker">01 · Financial awareness</p>
              <h3>True Cost</h3>
              <p className="public-card-summary">
                Make sense of the results you choose to record.
              </p>
              <ul>
                <li>Record gambling stakes and returns.</li>
                <li>Understand recorded net losses.</li>
                <li>Explore financial exposure and spending patterns.</li>
                <li>Make more informed financial decisions.</li>
              </ul>
              <button
                className="public-card-action"
                onClick={() => onNavigate('true-cost')}
                type="button"
              >
                Explore True Cost <span aria-hidden="true">→</span>
              </button>
            </article>

            <article className="public-feature-card public-feature-recovery homepage-reveal">
              <div aria-hidden="true" className="public-feature-icon">
                <FeatureIcon name="journal" />
              </div>
              <p className="public-card-kicker">02 · Personal reflection</p>
              <h3>My Recovery</h3>
              <p className="public-card-summary">
                A private place for your own check-ins and goals.
              </p>
              <ul>
                <li>Complete daily personal check-ins.</li>
                <li>Set goals and monitor your progress.</li>
                <li>Reflect on urges and triggers.</li>
                <li>Access practical self-help tools.</li>
              </ul>
              <button
                className="public-card-action"
                onClick={() => onNavigate('recovery')}
                type="button"
              >
                Explore My Recovery <span aria-hidden="true">→</span>
              </button>
            </article>

            <article className="public-feature-card public-feature-support homepage-reveal">
              <div aria-hidden="true" className="public-feature-icon">
                <FeatureIcon name="support" />
              </div>
              <p className="public-card-kicker">03 · Support information</p>
              <h3>Get Support</h3>
              <p className="public-card-summary">
                Explore information and options for seeking help.
              </p>
              <ul>
                <li>Find guidance and educational resources.</li>
                <li>Explore ways to seek help.</li>
                <li>Access relevant support information.</li>
              </ul>
              <button
                className="public-card-action"
                onClick={() => onNavigate('support')}
                type="button"
              >
                Visit Get Support <span aria-hidden="true">→</span>
              </button>
            </article>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="how-title"
        className="public-section public-how-section"
        id="how-it-works"
      >
        <div className="public-section-inner">
          <div className="public-section-heading homepage-reveal">
            <p className="public-eyebrow">A simple place to start</p>
            <h2 id="how-title">How LossLens works</h2>
          </div>
          <ol className="public-steps">
            <li className="public-step homepage-reveal">
              <span aria-hidden="true" className="public-step-number">01</span>
              <div>
                <h3>Understand</h3>
                <p>Get a clearer picture of gambling’s financial impact.</p>
              </div>
            </li>
            <li className="public-step homepage-reveal">
              <span aria-hidden="true" className="public-step-number">02</span>
              <div>
                <h3>Reflect</h3>
                <p>Record experiences, recognise patterns and track progress.</p>
              </div>
            </li>
            <li className="public-step homepage-reveal">
              <span aria-hidden="true" className="public-step-number">03</span>
              <div>
                <h3>Take action</h3>
                <p>Use practical tools and explore available support.</p>
              </div>
            </li>
          </ol>
        </div>
      </section>

      <section
        aria-labelledby="why-title"
        className="public-section public-why-section"
        id="why-losslens"
      >
        <div className="public-section-inner public-why-layout">
          <div className="public-section-heading homepage-reveal">
            <p className="public-eyebrow public-eyebrow-dark">Why LossLens?</p>
            <h2 id="why-title">Information, without judgement</h2>
            <p className="public-section-intro">
              A considered space to learn about your own records and choices.
            </p>
          </div>
          <ul className="public-value-list">
            <li className="homepage-reveal">
              <span aria-hidden="true">01</span>
              <div>
                <h3>Transparent calculations</h3>
                <p>See summaries based on the records you enter.</p>
              </div>
            </li>
            <li className="homepage-reveal">
              <span aria-hidden="true">02</span>
              <div>
                <h3>Personal reflection tools</h3>
                <p>Check in, set goals and reflect at your own pace.</p>
              </div>
            </li>
            <li className="homepage-reveal">
              <span aria-hidden="true">03</span>
              <div>
                <h3>Accessible support information</h3>
                <p>Explore support resources without needing an account.</p>
              </div>
            </li>
            <li className="homepage-reveal">
              <span aria-hidden="true">04</span>
              <div>
                <h3>Privacy-conscious by design</h3>
                <p>Personal records stay in browser storage by default.</p>
              </div>
            </li>
            <li className="homepage-reveal">
              <span aria-hidden="true">05</span>
              <div>
                <h3>A non-judgmental experience</h3>
                <p>Supportive tools without shame or pressure.</p>
              </div>
            </li>
          </ul>
        </div>
      </section>

      <section
        aria-labelledby="privacy-title"
        className="public-section public-privacy-section"
        id="privacy"
      >
        <div className="public-section-inner public-privacy-layout">
          <div className="public-section-heading homepage-reveal">
            <p className="public-eyebrow">Your data, clearly explained</p>
            <h2 id="privacy-title">Personal by default</h2>
            <p className="public-privacy-lead">
              LossLens uses different storage for authentication and personal
              records. Signing in does not automatically move your records
              between devices or accounts.
            </p>
          </div>
          <div className="public-data-facts">
            <div className="public-data-fact homepage-reveal">
              <span className="public-data-mark">01</span>
              <div>
                <h3>True Cost</h3>
                <p>
                  Your records are stored in this browser using IndexedDB.
                </p>
              </div>
            </div>
            <div className="public-data-fact homepage-reveal">
              <span className="public-data-mark">02</span>
              <div>
                <h3>My Recovery</h3>
                <p>
                  Your personal records are stored in this browser’s
                  localStorage.
                </p>
              </div>
            </div>
            <div className="public-data-fact homepage-reveal">
              <span className="public-data-mark">03</span>
              <div>
                <h3>Supabase</h3>
                <p>Used for account authentication.</p>
              </div>
            </div>
          </div>
          <p className="public-responsible-note homepage-reveal">
            LossLens is an awareness and self-help platform. It is not a
            medical diagnostic service or a replacement for professional care.
          </p>
        </div>
      </section>

      <section
        aria-labelledby="faq-title"
        className="public-section public-faq-section"
        id="faq"
      >
        <div className="public-section-inner public-faq-layout">
          <div className="public-section-heading homepage-reveal">
            <p className="public-eyebrow public-eyebrow-dark">Good to know</p>
            <h2 id="faq-title">Frequently asked questions</h2>
            <p className="public-section-intro">
              Clear answers about what LossLens does and how it works.
            </p>
          </div>
          <div className="public-faq-list">
            {faqs.map((faq, index) => (
              <details
                className="public-faq-item homepage-reveal"
                key={faq.question}
              >
                <summary>
                  <span>{faq.question}</span>
                  <span aria-hidden="true" className="faq-toggle">
                    +
                  </span>
                </summary>
                <div className="faq-answer-clip">
                  <div className="faq-answer">
                    <p>{faq.answer}</p>
                  </div>
                </div>
                <span aria-hidden="true" className="faq-index">
                  {String(index + 1).padStart(2, '0')}
                </span>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section aria-label="Create or access your LossLens account" className="public-account-cta">
        <div>
          <p className="public-eyebrow">Take the next step that feels right</p>
          <h2>Start with a clearer picture.</h2>
        </div>
        <div className="public-account-actions">
          <button className="public-button public-button-primary" onClick={onSignup} type="button">
            Create account
          </button>
          <button className="public-button public-button-quiet" onClick={onLogin} type="button">
            Log in
          </button>
        </div>
      </section>

      <section
        aria-labelledby="contact-title"
        className="public-section public-contact-section"
        id="contact"
      >
        <div className="public-section-inner public-contact-layout homepage-reveal">
          <div className="public-section-heading">
            <p className="public-eyebrow">Get in touch</p>
            <h2 id="contact-title">Contact the LossLens project</h2>
            <p>
              For project enquiries, use the contact details below. The phone
              number is a project contact, not a gambling crisis helpline.
            </p>
          </div>
          <div className="public-contact-links">
            <a href="mailto:projectlosslens@gmail.com">
              <span className="contact-label">Email</span>
              <span>projectlosslens@gmail.com</span>
              <span aria-hidden="true">↗</span>
            </a>
            <a href="tel:+254714428882">
              <span className="contact-label">Phone</span>
              <span>+254714428882</span>
              <span aria-hidden="true">↗</span>
            </a>
          </div>
        </div>
      </section>

      <footer className="public-footer">
        <div className="public-section-inner public-footer-layout">
          <div className="public-footer-brand">
            <button
              aria-label="Back to LossLens homepage"
              className="public-footer-logo-button"
              onClick={() => scrollToSection('home')}
              type="button"
            >
              <img
                alt="LossLens"
                height="750"
                src="/losslens-logo-dark.png"
                width="1700"
              />
            </button>
            <p>
              A clearer picture of gambling’s financial impact, with space to
              reflect and find support.
            </p>
          </div>
          <div className="public-footer-nav">
            <h2>Explore</h2>
            <button onClick={() => scrollToSection('home')} type="button">Home</button>
            <button onClick={() => scrollToSection('about-losslens')} type="button">About</button>
            <button onClick={() => onNavigate('true-cost')} type="button">True Cost</button>
            <button onClick={() => onNavigate('recovery')} type="button">My Recovery</button>
            <button onClick={() => onNavigate('support')} type="button">Get Support</button>
          </div>
          <div className="public-footer-contact">
            <h2>LossLens project contact details</h2>
            <a href="mailto:projectlosslens@gmail.com">projectlosslens@gmail.com</a>
            <a href="tel:+254714428882">+254714428882</a>
          </div>
          <div className="public-footer-bottom">
            <span>© {copyrightYear} LossLens</span>
            <span>Awareness and self-help, at your pace.</span>
          </div>
        </div>
      </footer>

      <button
        aria-hidden={!showBackToTop}
        aria-label="Back to top"
        className={`back-to-top${showBackToTop ? ' is-visible' : ''}`}
        onClick={() => scrollToSection('home')}
        tabIndex={showBackToTop ? 0 : -1}
        type="button"
      >
        <span aria-hidden="true">↑</span>
      </button>
    </div>
  )
}

export default PublicHomePage
