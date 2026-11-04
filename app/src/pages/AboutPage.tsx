function AboutPage() {
  return (
    <section aria-labelledby="about-page-title" className="route-page public-about-page">
      <p className="eyebrow">About LossLens</p>
      <h1 id="about-page-title" tabIndex={-1}>About LossLens</h1>
      <p className="section-description">
        LossLens helps you record gambling activity, review recorded costs and
        use optional reflection tools.
      </p>
      <div className="route-card-grid">
        <article className="feature-card">
          <h2>True Cost</h2>
          <p>Record bets and review recorded stakes, returns and net results.</p>
        </article>
        <article className="feature-card">
          <h2>Check-ins and goals</h2>
          <p>Record optional check-ins and set a personal goal to stop or reduce gambling.</p>
        </article>
        <article className="feature-card">
          <h2>Diary and reflections</h2>
          <p>Write diary entries, review a month and save optional reflections.</p>
        </article>
        <article className="feature-card">
          <h2>Data export</h2>
          <p>Download an export of your account data in Settings.</p>
        </article>
        <article className="feature-card">
          <h2>Get Support</h2>
          <p>Read self-guided reflection material without signing in.</p>
        </article>
      </div>
      <p className="route-caution">
        LossLens is not a clinical or medical service and does not replace
        professional support.
      </p>
    </section>
  )
}

export default AboutPage
