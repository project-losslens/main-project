import TrueCostModule from '../components/TrueCostModule'

function TrueCostPage() {
  return (
    <section aria-labelledby="true-cost-title" className="section-block route-page">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Recorded activity · no expected-loss estimates</p>
          <h1 id="true-cost-title" tabIndex={-1}>True Cost</h1>
          <p className="section-description">
            Record transactions and understand the actual results for clearly
            defined dates.
          </p>
        </div>
      </div>
      <TrueCostModule />
    </section>
  )
}

export default TrueCostPage
