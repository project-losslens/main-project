import { Link } from 'react-router-dom'
import DiaryModule from '../components/DiaryModule'

function DiaryPage() {
  return (
    <section aria-labelledby="diary-page-title" className="route-page diary-page">
      <p className="eyebrow">My Recovery · personal reflection</p>
      <h1 id="diary-page-title" tabIndex={-1}>Daily diary</h1>
      <p className="section-description">
        A private place to note what mattered to you. Every field is optional.
      </p>
      <p><Link className="text-button" to="/recovery">Return to My Recovery</Link></p>
      <DiaryModule />
    </section>
  )
}

export default DiaryPage
