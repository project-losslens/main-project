import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { deleteBet, getAllBets, saveBet } from '../lib/betDatabase'
import FinancialInsights from './FinancialInsights'
import {
  createEmptyBetForm,
  createRecordId,
  filterRecordsByPeriod,
  formValuesFromRecord,
  formatKes,
  getTodayInNairobi,
  parseKesToPaise,
  validateBetForm,
  type BetFormErrors,
  type BetFormValues,
  type BetRecord,
  type BetResult,
  type MarketFamily,
  type Period,
} from '../lib/trueCost'

const resultOptions: { value: BetResult; label: string }[] = [
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' },
  { value: 'cashout', label: 'Cash-out' },
  { value: 'void', label: 'Void' },
]

const marketOptions: { value: MarketFamily; label: string }[] = [
  { value: 'notSure', label: 'Not sure' },
  { value: 'threeWay', label: 'Match result (3 outcomes)' },
  { value: 'twoWay', label: 'Two outcomes' },
]

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'An unexpected local storage error occurred.'
}

function formatPlacedDate(value: string): string {
  const date = new Date(`${value}T00:00:00.000Z`)
  return new Intl.DateTimeFormat('en-KE', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
    year: 'numeric',
  }).format(date)
}

function getResultLabel(result: BetResult): string {
  if (result === 'cashout') {
    return 'Cash-out'
  }
  return result.charAt(0).toUpperCase() + result.slice(1)
}

function getMarketLabel(family: MarketFamily): string {
  if (family === 'threeWay') {
    return '3-outcome market'
  }
  if (family === 'twoWay') {
    return '2-outcome market'
  }
  return 'Not sure'
}

function getRecordNet(record: BetRecord): bigint {
  return record.returnedPaise - record.stakePaise
}

function TrueCostModule() {
  const [records, setRecords] = useState<BetRecord[]>([])
  const [storageState, setStorageState] = useState<
    'loading' | 'ready' | 'error'
  >('loading')
  const [storageError, setStorageError] = useState('')
  const [period, setPeriod] = useState<Period>('today')
  const [form, setForm] = useState<BetFormValues>(createEmptyBetForm)
  const [errors, setErrors] = useState<BetFormErrors>({})
  const [editingId, setEditingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    getAllBets()
      .then((loadedRecords) => {
        if (active) {
          setRecords(loadedRecords)
          setStorageState('ready')
          setStorageError('')
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setStorageState('error')
          setStorageError(getErrorMessage(error))
        }
      })

    return () => {
      active = false
    }
  }, [])

  const today = getTodayInNairobi()
  const periodRecords = useMemo(
    () => filterRecordsByPeriod(records, period, today),
    [records, period, today],
  )
  const sortedRecords = useMemo(
    () =>
      [...periodRecords].sort(
        (first, second) =>
          second.placedDate.localeCompare(first.placedDate) ||
          second.createdAt.localeCompare(first.createdAt),
      ),
    [periodRecords],
  )
  function updateForm<K extends keyof BetFormValues>(
    key: K,
    value: BetFormValues[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: undefined }))
    setStatusMessage('')
  }

  function resetForm() {
    setForm(createEmptyBetForm())
    setErrors({})
    setEditingId(null)
    setStatusMessage('')
  }

  function startEditing(record: BetRecord) {
    setForm(formValuesFromRecord(record))
    setErrors({})
    setEditingId(record.id)
    setConfirmDeleteId(null)
    setStatusMessage('')
    document.getElementById('bet-entry-title')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
    document.getElementById('placed-date')?.focus()
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const validation = validateBetForm(form, today)
    setErrors(validation.errors)
    setStatusMessage('')

    if (!validation.value) {
      const fieldOrder: (keyof BetFormValues)[] = [
        'placedDate',
        'bookmaker',
        'betType',
        'legs',
        'result',
        'stake',
        'oddsTaken',
        'returned',
        'marketFamily',
        'note',
      ]
      const firstInvalidField = fieldOrder.find(
        (field) => validation.errors[field] !== undefined,
      )
      const fieldIds: Partial<Record<keyof BetFormValues, string>> = {
        placedDate: 'placed-date',
        bookmaker: 'bookmaker',
        betType: 'bet-type-single',
        legs: 'legs',
        result: 'result-won',
        oddsTaken: 'odds-taken',
        stake: 'stake',
        returned: 'amount-returned',
        marketFamily: 'market-family',
        note: 'private-note',
      }
      if (firstInvalidField && fieldIds[firstInvalidField]) {
        document.getElementById(fieldIds[firstInvalidField])?.focus()
      }
      return
    }

    setSaving(true)

    try {
      const now = new Date().toISOString()
      const existingRecord = records.find((record) => record.id === editingId)
      const id = existingRecord?.id ?? createRecordId()
      const record: BetRecord = {
        ...validation.value,
        id,
        inputRoute: 'manual',
        createdAt: existingRecord?.createdAt ?? now,
        updatedAt: now,
      }

      await saveBet(record)
      setRecords((current) => {
        const remainingRecords = current.filter(
          (existing) => existing.id !== record.id,
        )
        return [record, ...remainingRecords]
      })
      setStorageState('ready')
      setStorageError('')
      setStatusMessage(
        existingRecord
          ? 'Your record was updated in this browser.'
          : 'Your record was saved in this browser.',
      )
      setForm(createEmptyBetForm())
      setErrors({})
      setEditingId(null)
    } catch (error) {
      setStorageState('error')
      setStorageError(getErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    setStorageError('')

    try {
      await deleteBet(id)
      setRecords((current) => current.filter((record) => record.id !== id))
      if (editingId === id) {
        resetForm()
      }
      setConfirmDeleteId(null)
      setStatusMessage('The record was deleted from this browser.')
      setStorageState('ready')
    } catch (error) {
      setStorageState('error')
      setStorageError(getErrorMessage(error))
    } finally {
      setDeletingId(null)
    }
  }

  async function retryStorage() {
    setStorageState('loading')
    setStorageError('')

    try {
      setRecords(await getAllBets())
      setStorageState('ready')
    } catch (error) {
      setStorageState('error')
      setStorageError(getErrorMessage(error))
    }
  }

  const amountReturnedError =
    form.result === 'won' || form.result === 'cashout'
      ? errors.returned
      : undefined

  return (
    <div className="true-cost-module">
      <div className="local-storage-note">
        <span aria-hidden="true" className="local-storage-dot" />
        <p>
          Records are stored in this browser on this device. This feature does
          not send them to a LossLens server. Clearing browser data may remove
          them.
        </p>
      </div>

      {storageState === 'loading' && (
        <p aria-live="polite" className="storage-status">
          Loading records from this browser…
        </p>
      )}
      {storageState === 'error' && (
        <div className="storage-error" role="alert">
          <div>
            <strong>Local storage is unavailable.</strong>
            <p>
              {storageError} The requested operation could not be confirmed;
              retry and review the records before continuing.
            </p>
          </div>
          <button
            className="secondary-button retry-button"
            onClick={() => void retryStorage()}
            type="button"
          >
            Retry
          </button>
        </div>
      )}

      <FinancialInsights
        onPeriodChange={setPeriod}
        period={period}
        records={records}
      />

      <aside aria-label="Accounting rules and open decisions" className="accounting-notice">
        <h3>How these totals are handled</h3>
        <ul>
          <li>
            Cash-outs are included using the amount received and are flagged.
            No expected-loss estimate is calculated here.
          </li>
          <li>
            Void records are excluded from stake, return, and net totals,
            following Draft 5. The consolidated feature plan leaves final
            approval of this rule open; this implementation follows Draft 5
            provisionally.
          </li>
          <li>
            Refunds, partial settlements, promotional credits/free bets,
            missing returns, taxes, and fees are not represented separately.
            Their accounting rules remain open; affected periods may therefore
            be incomplete and must not be interpreted as verified totals. Do
            not enter a promotional credit as ordinary cash stake without
            considering this limitation.
          </li>
          <li>
            A cash-out record has one returned-amount field. If it contains
            multiple payments, a refund, or an amount already counted
            elsewhere, mark the affected reporting period as containing
            unsupported items in its financial settings.
          </li>
        </ul>
      </aside>

      <section aria-labelledby="bet-entry-title" className="bet-entry-section">
        <div className="module-section-heading">
          <div>
            <p className="eyebrow">Manual entry</p>
            <h3 id="bet-entry-title">
              {editingId ? 'Edit record' : 'Add a bet record'}
            </h3>
          </div>
          {editingId && (
            <button
              className="secondary-button"
              onClick={resetForm}
              type="button"
            >
              Cancel edit
            </button>
          )}
        </div>

        <form className="bet-form" noValidate onSubmit={(event) => void handleSubmit(event)}>
          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="placed-date">Date placed</label>
              <input
                aria-describedby={errors.placedDate ? 'placed-date-error' : undefined}
                aria-invalid={Boolean(errors.placedDate)}
                autoComplete="off"
                id="placed-date"
                max={today}
                onChange={(event) => updateForm('placedDate', event.currentTarget.value)}
                required
                type="date"
                value={form.placedDate}
              />
              {errors.placedDate && (
                <span className="field-error" id="placed-date-error">
                  {errors.placedDate}
                </span>
              )}
            </div>

            <div className="form-field">
              <label htmlFor="bookmaker">Bookmaker name</label>
              <input
                aria-describedby={errors.bookmaker ? 'bookmaker-error' : undefined}
                aria-invalid={Boolean(errors.bookmaker)}
                autoComplete="off"
                id="bookmaker"
                onChange={(event) => updateForm('bookmaker', event.currentTarget.value)}
                required
                type="text"
                value={form.bookmaker}
              />
              {errors.bookmaker && (
                <span className="field-error" id="bookmaker-error">
                  {errors.bookmaker}
                </span>
              )}
            </div>

            <fieldset
              aria-describedby={errors.betType ? 'bet-type-error' : undefined}
              aria-invalid={Boolean(errors.betType)}
              className="form-field form-field-wide"
            >
              <legend>Bet type</legend>
              <div className="choice-row">
                <label className="choice-option">
                  <input
                    checked={form.betType === 'single'}
                    id="bet-type-single"
                    name="bet-type"
                    onChange={() => updateForm('betType', 'single')}
                    type="radio"
                    value="single"
                  />
                  <span>Single</span>
                </label>
                <label className="choice-option">
                  <input
                    checked={form.betType === 'multi'}
                    id="bet-type-multi"
                    name="bet-type"
                    onChange={() => updateForm('betType', 'multi')}
                    type="radio"
                    value="multi"
                  />
                  <span>Multibet</span>
                </label>
              </div>
              {errors.betType && (
                <span className="field-error" id="bet-type-error">
                  {errors.betType}
                </span>
              )}
            </fieldset>

            {form.betType === 'multi' && (
              <div className="form-field">
                <label htmlFor="legs">Number of legs</label>
                <input
                  aria-describedby={errors.legs ? 'legs-error' : undefined}
                  aria-invalid={Boolean(errors.legs)}
                  id="legs"
                  inputMode="numeric"
                  min="2"
                  onChange={(event) => updateForm('legs', event.currentTarget.value)}
                  required
                  step="1"
                  type="number"
                  value={form.legs}
                />
                {errors.legs && (
                  <span className="field-error" id="legs-error">
                    {errors.legs}
                  </span>
                )}
              </div>
            )}

            <div className="form-field">
              <label htmlFor="stake">Stake (KES)</label>
              <input
                aria-describedby={`stake-hint${errors.stake ? ' stake-error' : ''}`}
                aria-invalid={Boolean(errors.stake)}
                autoComplete="off"
                id="stake"
                inputMode="decimal"
                onChange={(event) => updateForm('stake', event.currentTarget.value)}
                required
                type="text"
                value={form.stake}
              />
              <span className="field-hint" id="stake-hint">
                Commas may separate thousands; amounts are rounded to two decimal
                places.
              </span>
              {errors.stake && (
                <span className="field-error" id="stake-error">
                  {errors.stake}
                </span>
              )}
            </div>

            <div className="form-field">
              <label htmlFor="odds-taken">
                {form.betType === 'multi' ? 'Total odds' : 'Odds taken'}
              </label>
              <input
                aria-describedby={errors.oddsTaken ? 'odds-error' : undefined}
                aria-invalid={Boolean(errors.oddsTaken)}
                autoComplete="off"
                id="odds-taken"
                inputMode="decimal"
                onChange={(event) => updateForm('oddsTaken', event.currentTarget.value)}
                required
                type="text"
                value={form.oddsTaken}
              />
              {errors.oddsTaken && (
                <span className="field-error" id="odds-error">
                  {errors.oddsTaken}
                </span>
              )}
            </div>

            <fieldset className="form-field form-field-wide">
              <legend>
                Result <span className="required-indicator">(required)</span>
              </legend>
              <div className="choice-row result-choice-row">
                {resultOptions.map(({ value: result, label }) => (
                  <label className="choice-option" key={result}>
                    <input
                      checked={form.result === result}
                      id={`result-${result}`}
                      name="bet-result"
                      onChange={() => {
                        updateForm('result', result)
                        if (result !== 'won' && result !== 'cashout') {
                          updateForm('returned', '')
                        }
                      }}
                      type="radio"
                      value={result}
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
              {errors.result && (
                <span className="field-error" id="result-error">
                  {errors.result}
                </span>
              )}
            </fieldset>

            {(form.result === 'won' || form.result === 'cashout') && (
              <div className="form-field">
                <label htmlFor="amount-returned">Amount returned (KES)</label>
                <input
                  aria-describedby={
                    amountReturnedError ? 'amount-returned-error' : undefined
                  }
                  aria-invalid={Boolean(amountReturnedError)}
                  autoComplete="off"
                  id="amount-returned"
                  inputMode="decimal"
                  onChange={(event) =>
                    updateForm('returned', event.currentTarget.value)
                  }
                  required
                  type="text"
                  value={form.returned}
                />
                {amountReturnedError && (
                  <span className="field-error" id="amount-returned-error">
                    {amountReturnedError}
                  </span>
                )}
                {form.result === 'cashout' && (
                  <span className="field-hint">
                    Enter the cash-out amount received once. It is included in
                    recorded subtotals and flagged.
                  </span>
                )}
              </div>
            )}

            {(form.result === 'lost' || form.result === 'void') && (
              <p className="derived-return form-field">
                {form.result === 'lost'
                  ? 'Amount returned is recorded as KES 0.'
                  : `Amount returned is set to the stake (${formatKes(parseKesToPaise(form.stake) ?? 0n)}). Void records are excluded from totals.`}
              </p>
            )}

            <div className="form-field">
              <label htmlFor="market-family">Market family (optional)</label>
              <select
                aria-describedby={
                  errors.marketFamily ? 'market-family-error' : undefined
                }
                aria-invalid={Boolean(errors.marketFamily)}
                id="market-family"
                onChange={(event) => {
                  const selectedMarket = marketOptions.find(
                    (option) => option.value === event.currentTarget.value,
                  )
                  if (selectedMarket) {
                    updateForm('marketFamily', selectedMarket.value)
                  }
                }}
                value={form.marketFamily}
              >
                {marketOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {errors.marketFamily && (
                <span className="field-error" id="market-family-error">
                  {errors.marketFamily}
                </span>
              )}
            </div>

            <div className="form-field form-field-wide">
              <label htmlFor="private-note">Private note (optional)</label>
              <textarea
                aria-describedby={`note-count${errors.note ? ' note-error' : ''}`}
                aria-invalid={Boolean(errors.note)}
                id="private-note"
                maxLength={280}
                onChange={(event) => updateForm('note', event.currentTarget.value)}
                rows={3}
                value={form.note}
              />
              <span className="field-hint" id="note-count">
                {form.note.length}/280 characters
              </span>
              {errors.note && (
                <span className="field-error" id="note-error">
                  {errors.note}
                </span>
              )}
            </div>
          </div>

          {statusMessage && (
            <p aria-live="polite" className="form-status">
              {statusMessage}
            </p>
          )}

          <div className="form-actions">
            <button
              className="primary-button"
              disabled={saving || storageState !== 'ready'}
              type="submit"
            >
              {saving
                ? 'Saving…'
                : editingId
                  ? 'Save changes'
                  : 'Save bet record'}
            </button>
            {editingId && (
              <button
                className="secondary-button"
                onClick={resetForm}
                type="button"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </section>

      <section aria-labelledby="records-title" className="records-section">
        <div className="module-section-heading">
          <div>
            <p className="eyebrow">Your entries</p>
            <h3 id="records-title">Recorded bets</h3>
          </div>
          <span className="record-count">
            {periodRecords.length}{' '}
            {periodRecords.length === 1 ? 'record' : 'records'}
          </span>
        </div>

        {storageState === 'loading' ? (
          <p aria-live="polite" className="records-empty">
            Reading records from this browser…
          </p>
        ) : sortedRecords.length === 0 ? (
          <p className="records-empty">
            No manual records in this period. Add a record above when you are
            ready.
          </p>
        ) : (
          <ul className="record-list">
            {sortedRecords.map((record) => (
              <li className="record-card" key={record.id}>
                <div className="record-card-heading">
                  <div>
                    <h4>{record.bookmaker}</h4>
                    <p>
                      {formatPlacedDate(record.placedDate)} ·{' '}
                      {record.betType === 'multi'
                        ? `Multibet · ${record.legs} legs`
                        : 'Single'}{' '}
                      · Odds {record.oddsTaken}
                    </p>
                  </div>
                  <span
                    className={`result-badge result-${record.result}`}
                    title={
                      record.result === 'void'
                        ? 'Excluded from actual totals; final accounting decision remains open.'
                        : record.result === 'cashout'
                          ? 'Included in actual totals and flagged.'
                          : undefined
                    }
                  >
                    {getResultLabel(record.result)}
                    {record.result === 'void' ? ' · excluded' : ''}
                    {record.result === 'cashout' ? ' · flagged' : ''}
                  </span>
                </div>

                <dl className="record-values">
                  <div>
                    <dt>Stake</dt>
                    <dd>{formatKes(record.stakePaise)}</dd>
                  </div>
                  <div>
                    <dt>Returned</dt>
                    <dd>{formatKes(record.returnedPaise)}</dd>
                  </div>
                  <div>
                    <dt>Net</dt>
                    <dd>
                      {record.result === 'void'
                        ? 'Excluded'
                        : formatKes(getRecordNet(record))}
                    </dd>
                  </div>
                  <div>
                    <dt>Market</dt>
                    <dd>{getMarketLabel(record.marketFamily)}</dd>
                  </div>
                </dl>

                {record.note && <p className="record-note">{record.note}</p>}

                <div className="record-actions">
                  {confirmDeleteId === record.id ? (
                    <>
                      <span>Delete this record from this browser?</span>
                      <button
                        className="danger-button"
                        disabled={deletingId === record.id}
                        onClick={() => void handleDelete(record.id)}
                        type="button"
                      >
                        {deletingId === record.id ? 'Deleting…' : 'Delete record'}
                      </button>
                      <button
                        className="secondary-button"
                        onClick={() => setConfirmDeleteId(null)}
                        type="button"
                      >
                        Keep record
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        className="secondary-button"
                        onClick={() => startEditing(record)}
                        type="button"
                      >
                        Edit
                      </button>
                      <button
                        className="text-button"
                        onClick={() => setConfirmDeleteId(record.id)}
                        type="button"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="no-estimates-note">
        This view shows actual recorded stakes, returns, and net outcomes only.
        It does not show expected-loss estimates, projections, or charts.
      </p>
    </div>
  )
}

export default TrueCostModule
