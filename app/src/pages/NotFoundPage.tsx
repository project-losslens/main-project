import { Link } from 'react-router-dom'

function NotFoundPage() {
  return (
    <section aria-labelledby="not-found-title" className="section-block route-page">
      <p className="eyebrow">Page not found</p>
      <h1 id="not-found-title" tabIndex={-1}>That page isn’t here</h1>
      <p className="section-description">
        The address may have changed, or the page may not exist.
      </p>
      <Link className="primary-button" to="/">
        Return to LossLens
      </Link>
    </section>
  )
}

export default NotFoundPage
