function TermsPage() {
  return (
    <section aria-labelledby="terms-page-title" className="section-block route-page">
      <p className="eyebrow">Terms information · review required</p>
      <h1 id="terms-page-title" tabIndex={-1}>Using LossLens</h1>
      <p className="route-review-notice" role="note">
        This draft information is not reviewed legal advice or a finalized
        agreement. Qualified Kenyan legal review is required before public
        release.
      </p>
      <div className="route-policy-content">
        <h2>Purpose</h2>
        <p>
          LossLens provides financial-awareness tools, personal reflection
          features and support information. It is not a medical diagnostic
          service or a replacement for professional care.
        </p>
        <h2>Financial information</h2>
        <p>
          True Cost summaries are based on records entered by the user. They
          may be incomplete and are not predictions or guarantees.
        </p>
        <h2>Support resources</h2>
        <p>
          Support information is provided for general awareness. Verify
          current service details with the authoritative provider.
        </p>
      </div>
    </section>
  )
}

export default TermsPage
