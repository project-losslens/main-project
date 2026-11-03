function PrivacyPage() {
  return (
    <section aria-labelledby="privacy-page-title" className="section-block route-page">
      <p className="eyebrow">Privacy information</p>
      <h1 id="privacy-page-title" tabIndex={-1}>How LossLens handles information</h1>
      <p className="section-description">
        This notice describes the current application behavior. It is not a
        claim of legal compliance and requires qualified privacy review before
        public release.
      </p>
      <div className="route-policy-content">
        <h2>Authentication</h2>
        <p>
          Supabase is used to register and authenticate accounts. The
          application sends account credentials to the configured Supabase
          authentication service.
        </p>
        <h2>Personal records</h2>
        <p>
          Personal records are stored in the configured Supabase project for
          the active LossLens account after consent is granted. There is no
          browser localStorage or IndexedDB fallback for private data. New
          private-section changes are saved to the account and are not copied to
          browser storage as a second persistent backup.
        </p>
        <h2>Purpose and sharing</h2>
        <p>
          Account storage is intended to make records available across
          authenticated sessions and devices. This implementation does not add
          analytics, advertising, supporter sharing or AI processing of these
          records.
        </p>
        <h2>Retention and deletion</h2>
        <p>
          The project's Supabase backup-retention and deletion behavior has not
          been verified. LossLens cannot promise immediate or complete erasure
          from backups. A migration failure does not delete the original local
          data. Settings can export account records and submit a deletion
          request for project-team review, but a request does not delete the
          account or records. No automatic deletion or completion time is
          promised.
        </p>
        <h2>Review status</h2>
        <p>
          This notice describes current application behavior, but it has not
          received qualified privacy or legal review and does not establish
          compliance with any law. Do not rely on LossLens as the only copy of
          information that you need to retain.
        </p>
      </div>
    </section>
  )
}

export default PrivacyPage
