import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  calculateFinancialMetrics,
  resolvePossibleDuplicates,
} from '../lib/financialMetrics'
import { getAllBets } from '../lib/betDatabase'
import {
  loadPersonalData,
  updatePersonalDataAndWait,
  type DiaryEntry,
  type PersonalData,
} from '../lib/personalData'
import { formatKes, getTodayInNairobi, type BetRecord } from '../lib/trueCost'

const moods = ['Calm', 'Hopeful', 'Low', 'Anxious', 'Frustrated', 'Tired', 'Other']
const triggerOptions = [
  'Stress',
  'Boredom',
  'Loneliness',
  'A gambling promotion',
  'A recent win or loss',
  'Other',
]
const copingOptions = [
  'Stepped away',
  'Contacted someone I trust',
  'Used a pause tool',
  'Did something else',
  'Other',
]

type DiaryForm = Omit<DiaryEntry, 'id' | 'date' | 'updatedAt'>

const emptyForm: DiaryForm = {
  mood: '',
  triggers: [],
  copingStrategies: [],
  note: '',
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Your diary could not be saved.'
}

function formatDate(value: string): string {
  const date = new Date(`${value}T00:00:00.000Z`)
  return new Intl.DateTimeFormat('en-KE', {
    dateStyle: 'medium',
    timeZone: 'UTC',
  }).format(date)
}

function DiaryModule() {
  const today = getTodayInNairobi()
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
  const [storageError, setStorageError] = useState(initialState.error)
  const [selectedDate, setSelectedDate] = useState(today)
  const [form, setForm] = useState<DiaryForm>(() => {
    const saved = initialState.data?.diaryEntries?.find(
      (entry) => entry.date === today,
    )
    return saved
      ? {
          mood: saved.mood,
          triggers: [...saved.triggers],
          copingStrategies: [...saved.copingStrategies],
          note: saved.note,
        }
      : { ...emptyForm, triggers: [], copingStrategies: [] }
  })
  const [records, setRecords] = useState<BetRecord[]>([])
  const [recordsState, setRecordsState] = useState<
    'loading' | 'ready' | 'error'
  >('loading')
  const [recordsError, setRecordsError] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const loadRecords = useCallback(async () => {
    setRecordsState('loading')
    setRecordsError('')
    try {
      setRecords(await getAllBets())
      setRecordsState('ready')
    } catch (cause) {
      setRecordsError(getErrorMessage(cause))
      setRecordsState('error')
    }
  }, [])

  function reloadPersonalData() {
    try {
      const loaded = loadPersonalData()
      setPersonalData(loaded)
      setStorageError('')
      setFormForDate(loaded, selectedDate)
    } catch (cause) {
      setStorageError(getErrorMessage(cause))
    }
  }

  function setFormForDate(data: PersonalData, date: string) {
    const saved = data.diaryEntries?.find((entry) => entry.date === date)
    setForm(
      saved
        ? {
            mood: saved.mood,
            triggers: [...saved.triggers],
            copingStrategies: [...saved.copingStrategies],
            note: saved.note,
          }
        : { ...emptyForm, triggers: [], copingStrategies: [] },
    )
    setConfirmDelete(false)
  }

  useEffect(() => {
    let active = true
    getAllBets()
      .then((loaded) => {
        if (active) {
          setRecords(loaded)
          setRecordsState('ready')
          setRecordsError('')
        }
      })
      .catch((cause: unknown) => {
        if (active) {
          setRecordsError(getErrorMessage(cause))
          setRecordsState('error')
        }
      })
    return () => {
      active = false
    }
  }, [])

  const selectedEntry = personalData?.diaryEntries?.find(
    (entry) => entry.date === selectedDate,
  )
  const selectedRecords = useMemo(
    () => records.filter((record) => record.placedDate === selectedDate),
    [records, selectedDate],
  )
  const resolvedRecords = useMemo(
    () =>
      resolvePossibleDuplicates(
        selectedRecords,
        personalData?.duplicateDecisions ?? {},
      ),
    [personalData?.duplicateDecisions, selectedRecords],
  )
  const metrics = calculateFinancialMetrics(
    resolvedRecords.includedRecords,
    null,
    null,
    { incompletePeriod: resolvedRecords.unresolvedGroups.length > 0 },
  )
  const diaryEntries = useMemo(
    () =>
      [...(personalData?.diaryEntries ?? [])].sort((a, b) =>
        b.date.localeCompare(a.date),
      ),
    [personalData?.diaryEntries],
  )

  function changeDate(date: string) {
    const parsedDate = new Date(`${date}T00:00:00.000Z`)
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !Number.isFinite(parsedDate.getTime()) ||
      parsedDate.toISOString().slice(0, 10) !== date ||
      date > today
    ) {
      setError('Choose a valid date no later than today.')
      return
    }
    setSelectedDate(date)
    if (personalData) setFormForDate(personalData, date)
    setError('')
    setMessage('')
  }

  async function saveEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setMessage('')
    if (!personalData) {
      setError(storageError || 'Diary data is unavailable. Retry loading it.')
      return
    }
    if (form.note.length > 2000) {
      setError('Keep your reflection to 2,000 characters or fewer.')
      return
    }
    if (form.triggers.length > 20 || form.copingStrategies.length > 20) {
      setError('Choose no more than 20 items in each list.')
      return
    }

    setBusy(true)
    try {
      const existing = personalData.diaryEntries?.find(
        (entry) => entry.date === selectedDate,
      )
      const entry: DiaryEntry = {
        ...form,
        id: existing?.id ?? window.crypto.randomUUID(),
        date: selectedDate,
        mood: form.mood.trim(),
        note: form.note.trim(),
        updatedAt: new Date().toISOString(),
      }
      const updated = await updatePersonalDataAndWait((current) => ({
        ...current,
        diaryEntries: [
          ...(current.diaryEntries ?? []).filter(
            (saved) => saved.date !== selectedDate,
          ),
          entry,
        ],
      }))
      setPersonalData(updated)
      setMessage(`Your diary entry for ${formatDate(selectedDate)} was saved.`)
    } catch (cause) {
      setError(getErrorMessage(cause))
    } finally {
      setBusy(false)
    }
  }

  async function deleteEntry() {
    if (!selectedEntry || busy) return
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const updated = await updatePersonalDataAndWait((current) => ({
        ...current,
        diaryEntries: (current.diaryEntries ?? []).filter(
          (entry) => entry.id !== selectedEntry.id,
        ),
      }))
      setPersonalData(updated)
      setForm({ ...emptyForm, triggers: [], copingStrategies: [] })
      setConfirmDelete(false)
      setMessage('The diary entry was deleted.')
    } catch (cause) {
      setError(getErrorMessage(cause))
    } finally {
      setBusy(false)
    }
  }

  function toggleChoice(
    field: 'triggers' | 'copingStrategies',
    value: string,
    checked: boolean,
  ) {
    setForm((current) => ({
      ...current,
      [field]: checked
        ? [...current[field], value]
        : current[field].filter((item) => item !== value),
    }))
  }

  return (
    <div className="diary-module">
      <p className="local-storage-note">
        Diary entries are saved with your LossLens account after the account
        storage setup. They are separate from True Cost records. Recorded
        amounts below are read from True Cost and are not copied into the diary.
      </p>

      {storageError && (
        <div className="storage-error" role="alert">
          <p>{storageError} Your saved information has not been overwritten.</p>
          <button className="secondary-button" onClick={reloadPersonalData} type="button">
            Retry loading diary
          </button>
        </div>
      )}

      <section aria-labelledby="diary-entry-title" className="support-card">
        <div className="module-section-heading">
          <div>
            <p className="eyebrow">Private reflection · optional</p>
            <h2 id="diary-entry-title">Daily diary</h2>
          </div>
          <label className="period-control" htmlFor="diary-date">
            <span>Entry date</span>
            <input
              id="diary-date"
              max={today}
              onChange={(event) => changeDate(event.currentTarget.value)}
              type="date"
              value={selectedDate}
            />
          </label>
        </div>
        <p>
          Record only what feels useful. Mood, triggers, coping strategies, and
          notes are optional. These entries are for personal reflection and do
          not provide a diagnosis.
        </p>

        <section aria-label={`True Cost records for ${selectedDate}`} className="ledger-context">
          <h3>Recorded amounts for this date</h3>
          {recordsState === 'loading' && (
            <p aria-live="polite" role="status">Loading True Cost records…</p>
          )}
          {recordsState === 'error' && (
            <div role="alert">
              <p>{recordsError} Diary entry saving remains available.</p>
              <button className="text-button" onClick={() => void loadRecords()} type="button">
                Retry loading amounts
              </button>
            </div>
          )}
          {recordsState === 'ready' &&
            (resolvedRecords.unresolvedGroups.length > 0 ? (
              <p>Possible duplicate records are awaiting review in True Cost; amounts are not shown here.</p>
            ) : metrics.recordCount === 0 ? (
              <p>No non-void True Cost records are saved for this date.</p>
            ) : (
              <dl className="ledger-context-values">
                <div><dt>Stakes recorded</dt><dd>{formatKes(metrics.stakedPaise)}</dd></div>
                <div><dt>Returns recorded</dt><dd>{formatKes(metrics.returnedPaise)}</dd></div>
                <div>
                  <dt>Recorded net result</dt>
                  <dd>
                    {metrics.netPaise < 0n
                      ? `Net loss ${formatKes(-metrics.netPaise)}`
                      : metrics.netPaise > 0n
                        ? `Net gain ${formatKes(metrics.netPaise)}`
                        : 'Break-even'}
                  </dd>
                </div>
              </dl>
            ))}
          <p>
            These are recorded subtotals, not verified complete totals. No
            money amount is entered or counted again in this diary.
          </p>
        </section>

        <form className="support-form" onSubmit={(event) => void saveEntry(event)}>
          <div className="form-field">
            <label htmlFor="diary-mood">Mood (optional)</label>
            <select
              id="diary-mood"
              onChange={(event) =>
                setForm((current) => ({ ...current, mood: event.currentTarget.value }))
              }
              value={form.mood}
            >
              <option value="">Not recorded</option>
              {moods.map((mood) => <option key={mood} value={mood}>{mood}</option>)}
            </select>
          </div>

          <fieldset className="trigger-fieldset">
            <legend>Anything that may have influenced the day? (optional)</legend>
            <div className="choice-row trigger-choice-row">
              {triggerOptions.map((trigger) => (
                <label className="choice-option" key={trigger}>
                  <input
                    checked={form.triggers.includes(trigger)}
                    onChange={(event) =>
                      toggleChoice('triggers', trigger, event.currentTarget.checked)
                    }
                    type="checkbox"
                  />
                  <span>{trigger}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="trigger-fieldset">
            <legend>What did you try that helped? (optional)</legend>
            <div className="choice-row trigger-choice-row">
              {copingOptions.map((strategy) => (
                <label className="choice-option" key={strategy}>
                  <input
                    checked={form.copingStrategies.includes(strategy)}
                    onChange={(event) =>
                      toggleChoice('copingStrategies', strategy, event.currentTarget.checked)
                    }
                    type="checkbox"
                  />
                  <span>{strategy}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="form-field">
            <label htmlFor="diary-note">Reflection or notes (optional)</label>
            <textarea
              id="diary-note"
              maxLength={2000}
              onChange={(event) =>
                setForm((current) => ({ ...current, note: event.currentTarget.value }))
              }
              rows={5}
              value={form.note}
            />
            <span className="field-hint">{form.note.length}/2,000 characters</span>
          </div>

          {error && <p className="field-error" role="alert">{error}</p>}
          {message && <p aria-live="polite" className="form-status" role="status">{message}</p>}
          <div className="form-actions">
            <button className="primary-button" disabled={busy || !personalData} type="submit">
              {busy ? 'Saving…' : selectedEntry ? 'Update diary entry' : 'Save diary entry'}
            </button>
            {selectedEntry && (
              confirmDelete ? (
                <>
                  <span>Delete this diary entry?</span>
                  <button className="danger-button" disabled={busy} onClick={() => void deleteEntry()} type="button">
                    {busy ? 'Deleting…' : 'Confirm delete'}
                  </button>
                  <button className="secondary-button" disabled={busy} onClick={() => setConfirmDelete(false)} type="button">
                    Keep entry
                  </button>
                </>
              ) : (
                <button className="text-button" disabled={busy} onClick={() => setConfirmDelete(true)} type="button">
                  Delete entry
                </button>
              )
            )}
          </div>
        </form>
      </section>

      <section aria-labelledby="diary-history-title" className="support-card">
        <div className="module-section-heading">
          <div>
            <p className="eyebrow">Your saved entries</p>
            <h2 id="diary-history-title">Diary history</h2>
          </div>
          <Link className="text-button" to="/recovery">Back to My Recovery</Link>
        </div>
        {diaryEntries.length === 0 ? (
          <p className="records-empty">No diary entries yet. You can add one whenever you choose.</p>
        ) : (
          <ul className="recent-checkins">
            {diaryEntries.map((entry) => (
              <li key={entry.id}>
                <div>
                  <strong>{formatDate(entry.date)}</strong>
                  <span>
                    {entry.mood || 'Mood not recorded'}
                    {entry.triggers.length > 0 && ` · ${entry.triggers.join(', ')}`}
                  </span>
                  {entry.note && <p>{entry.note}</p>}
                </div>
                <button
                  className="text-button"
                  onClick={() => changeDate(entry.date)}
                  type="button"
                >
                  Edit
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

export default DiaryModule
