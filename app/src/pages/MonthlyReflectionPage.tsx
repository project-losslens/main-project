import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  loadPersonalData,
  updatePersonalDataAndWait,
  type MonthlyReflection,
  type PersonalData,
} from '../lib/personalData'
import { getTodayInNairobi } from '../lib/trueCost'

type ReflectionForm = Omit<MonthlyReflection, 'monthStart' | 'updatedAt'>

const emptyForm: ReflectionForm = {
  achievements: '',
  difficulties: '',
  lessons: '',
  futureIntention: '',
}

function currentMonthStart(): string {
  return `${getTodayInNairobi().slice(0, 7)}-01`
}

function formForMonth(
  data: PersonalData,
  monthStart: string,
): ReflectionForm {
  const reflection = data.monthlyReflections?.[monthStart]
  return reflection
    ? {
        achievements: reflection.achievements,
        difficulties: reflection.difficulties,
        lessons: reflection.lessons,
        futureIntention: reflection.futureIntention,
      }
    : { ...emptyForm }
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'Your monthly reflection could not be loaded.'
}

function formatMonth(monthStart: string): string {
  return new Intl.DateTimeFormat('en-KE', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${monthStart}T00:00:00.000Z`))
}

function MonthlyReflectionPage() {
  const today = getTodayInNairobi()
  const currentMonth = currentMonthStart()
  const [initialState] = useState(() => {
    try {
      return { data: loadPersonalData(), error: '' }
    } catch (error) {
      return { data: null, error: getErrorMessage(error) }
    }
  })
  const [personalData, setPersonalData] = useState<PersonalData | null>(
    initialState.data,
  )
  const [selectedMonth, setSelectedMonth] = useState(currentMonth)
  const [form, setForm] = useState<ReflectionForm>(() =>
    initialState.data
      ? formForMonth(initialState.data, currentMonth)
      : { ...emptyForm },
  )
  const [loadError, setLoadError] = useState(initialState.error)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)

  function retryLoad() {
    try {
      const loaded = loadPersonalData()
      setPersonalData(loaded)
      setForm(formForMonth(loaded, selectedMonth))
      setLoadError('')
    } catch (cause) {
      setLoadError(getErrorMessage(cause))
    }
  }

  function changeMonth(month: string) {
    if (!/^\d{4}-\d{2}$/.test(month) || month > today.slice(0, 7)) {
      setError('Choose a valid month no later than the current month.')
      return
    }
    const monthStart = `${month}-01`
    setSelectedMonth(monthStart)
    if (personalData) setForm(formForMonth(personalData, monthStart))
    setError('')
    setStatus('')
  }

  function updateField(field: keyof ReflectionForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
    setError('')
    setStatus('')
  }

  async function saveReflection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!personalData || busy) return

    const fields = Object.values(form)
    if (fields.some((value) => value.length > 5000)) {
      setError('Keep each section to 5,000 characters or fewer.')
      return
    }

    setBusy(true)
    setError('')
    setStatus('')
    try {
      const reflection: MonthlyReflection = {
        monthStart: selectedMonth,
        achievements: form.achievements.trim(),
        difficulties: form.difficulties.trim(),
        lessons: form.lessons.trim(),
        futureIntention: form.futureIntention.trim(),
        updatedAt: new Date().toISOString(),
      }
      const updated = await updatePersonalDataAndWait((current) => ({
        ...current,
        monthlyReflections: {
          ...(current.monthlyReflections ?? {}),
          [selectedMonth]: reflection,
        },
      }))
      setPersonalData(updated)
      setStatus(`Your reflection for ${formatMonth(selectedMonth)} was saved.`)
    } catch (cause) {
      setError(getErrorMessage(cause))
    } finally {
      setBusy(false)
    }
  }

  const history = Object.values(personalData?.monthlyReflections ?? {}).sort(
    (first, second) => second.monthStart.localeCompare(first.monthStart),
  )

  return (
    <section
      aria-labelledby="monthly-reflection-title"
      className="route-page monthly-reflection-page"
    >
      <p className="eyebrow">My Recovery · private reflection</p>
      <h1 id="monthly-reflection-title" tabIndex={-1}>
        Monthly reflection
      </h1>
      <p className="section-description">
        Review what you noticed, what felt difficult, and what you may want to
        carry forward. This is optional and is not a clinical assessment.
      </p>
      <p>
        <Link className="text-button" to="/recovery">
          Return to My Recovery
        </Link>
      </p>

      <div className="local-storage-note" role="note">
        Your reflections are account-backed after the separate account-storage
        setup. They are not sent to an AI service.
      </div>

      {loadError && (
        <div className="storage-error" role="alert">
          <p>{loadError} No saved reflection has been overwritten.</p>
          <button className="secondary-button" onClick={retryLoad} type="button">
            Retry loading
          </button>
        </div>
      )}

      <section aria-labelledby="monthly-form-title" className="support-card">
        <div className="module-section-heading">
          <div>
            <p className="eyebrow">A few prompts · all optional</p>
            <h2 id="monthly-form-title">{formatMonth(selectedMonth)}</h2>
          </div>
          <label className="period-control" htmlFor="reflection-month">
            <span>Reflection month</span>
            <input
              id="reflection-month"
              max={today.slice(0, 7)}
              onChange={(event) => changeMonth(event.currentTarget.value)}
              type="month"
              value={selectedMonth.slice(0, 7)}
            />
          </label>
        </div>
        <form className="reflection-form" onSubmit={(event) => void saveReflection(event)}>
          <div className="form-field">
            <label htmlFor="monthly-achievements">
              What would you like to acknowledge from this month?
            </label>
            <textarea
              id="monthly-achievements"
              maxLength={5000}
              onChange={(event) => updateField('achievements', event.currentTarget.value)}
              rows={3}
              value={form.achievements}
            />
            <span className="field-hint">{form.achievements.length}/5,000 characters</span>
          </div>
          <div className="form-field">
            <label htmlFor="monthly-difficulties">
              What felt difficult or worth noticing?
            </label>
            <textarea
              id="monthly-difficulties"
              maxLength={5000}
              onChange={(event) => updateField('difficulties', event.currentTarget.value)}
              rows={3}
              value={form.difficulties}
            />
            <span className="field-hint">{form.difficulties.length}/5,000 characters</span>
          </div>
          <div className="form-field">
            <label htmlFor="monthly-lessons">
              What helped, or what did you learn about your needs?
            </label>
            <textarea
              id="monthly-lessons"
              maxLength={5000}
              onChange={(event) => updateField('lessons', event.currentTarget.value)}
              rows={3}
              value={form.lessons}
            />
            <span className="field-hint">{form.lessons.length}/5,000 characters</span>
          </div>
          <div className="form-field">
            <label htmlFor="future-intention">
              A note to your future self (optional)
            </label>
            <textarea
              id="future-intention"
              maxLength={5000}
              onChange={(event) => updateField('futureIntention', event.currentTarget.value)}
              rows={3}
              value={form.futureIntention}
            />
            <span className="field-hint">
              This note is saved with the month. Return here when you choose to
              read it; LossLens does not send reminders.
            </span>
          </div>
          {error && <p className="field-error" role="alert">{error}</p>}
          {status && <p aria-live="polite" className="form-status" role="status">{status}</p>}
          <button className="primary-button" disabled={busy || !personalData} type="submit">
            {busy ? 'Saving…' : 'Save monthly reflection'}
          </button>
        </form>
      </section>

      <section aria-labelledby="monthly-history-title" className="support-card">
        <h2 id="monthly-history-title">Previous reflections</h2>
        {history.length === 0 ? (
          <p className="records-empty">No monthly reflections saved yet.</p>
        ) : (
          <ul className="recent-checkins">
            {history.map((reflection) => (
              <li key={reflection.monthStart}>
                <div>
                  <strong>{formatMonth(reflection.monthStart)}</strong>
                  {reflection.futureIntention && (
                    <p>
                      <strong>Note to future self:</strong>{' '}
                      {reflection.futureIntention}
                    </p>
                  )}
                  {reflection.lessons && <span>{reflection.lessons}</span>}
                </div>
                <button
                  className="text-button"
                  onClick={() => changeMonth(reflection.monthStart.slice(0, 7))}
                  type="button"
                >
                  Open
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  )
}

export default MonthlyReflectionPage
