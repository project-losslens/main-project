function AboutPage() {
  return (
    <section aria-labelledby="about-page-title" className="section-block route-page">
      <p className="eyebrow">About LossLens</p>
      <h1 id="about-page-title" tabIndex={-1}>A clearer way forward</h1>
      <p className="section-description">
        LossLens is a digital platform designed to help people understand the
        financial impact of gambling, reflect on their experiences and access
        support information.
      </p>
      <div className="route-card-grid">
        <article className="feature-card">
          <h2>Understand</h2>
          <p>Record stakes and returns and review the actual results entered.</p>
        </article>
        <article className="feature-card">
          <h2>Reflect</h2>
          <p>Use optional check-ins, goals and personal reflections.</p>
        </article>
        <article className="feature-card">
          <h2>Find support</h2>
          <p>Explore educational information and support resources.</p>
        </article>
      </div>
      <p className="route-caution">
        LossLens is an awareness and self-help platform. It does not diagnose
        or replace professional care.
      </p>
    </section>
  )
}

export default AboutPage
