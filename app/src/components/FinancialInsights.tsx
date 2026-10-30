import { useMemo, useState, type FormEvent } from 'react'
import {
  calculateFinancialMetrics,
  formatPercent,
  getPeriodDescription,
  getReportingRange,
  resolvePossibleDuplicates,
  shouldWithholdComparisons,
  type DuplicateDecision,
} from '../lib/financialMetrics'
import {
  formatKes,
  formatPaiseForInput,
  getTodayInNairobi,
  parseKesToPaise,
  type BetRecord,
  type Period,
} from '../lib/trueCost'
import {
  loadPersonalData,
  parseStoredPaise,
  updatePersonalData,
  type PersonalData,
  type PeriodFinancialSetting,
} from '../lib/personalData'

const periodOptions: { value: Period; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
  { value: 'all', label: 'All time' },
]

type Props = {
  records: BetRecord[]
  period: Period
  onPeriodChange: (period: Period) => void
}

type SettingForm = {
  income: string
  lossBudget: string
  reviewed: boolean
  accountingStatus:
    | 'notReviewed'
    | 'noKnownUnsupportedItems'
    | 'hasUnsupportedItems'
}

type HistoryView = 'daily' | 'weekly' | 'monthly'

type HistoryRange = {
  key: string
  start: string
  end: string
  label: string
}

function shiftDate(value: string, days: number): string {
  const date = new Date(`${value}T00:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

function getHistoryRanges(
  view: HistoryView,
  today: string,
): HistoryRange[] {
  const todayDate = new Date(`${today}T00:00:00.000Z`)
  const ranges: HistoryRange[] = []

  if (view === 'daily') {
    for (let offset = 13; offset >= 0; offset -= 1) {
      const date = shiftDate(today, -offset)
      ranges.push({ key: `${date}:${date}`, start: date, end: date, label: date })
    }
    return ranges
  }

  if (view === 'weekly') {
    const mondayOffset = (todayDate.getUTCDay() + 6) % 7
    const thisMonday = shiftDate(today, -mondayOffset)
    for (let offset = 7; offset >= 0; offset -= 1) {
      const start = shiftDate(thisMonday, -offset * 7)
      const end =
        offset === 0
          ? today
          : shiftDate(start, 6)
      ranges.push({
        key: `${start}:${end}`,
        start,
        end,
        label: `${start} to ${end}`,
      })
    }
    return ranges
  }

  const thisMonth = new Date(
    Date.UTC(todayDate.getUTCFullYear(), todayDate.getUTCMonth(), 1),
  )
  for (let offset = 5; offset >= 0; offset -= 1) {
    const monthStart = new Date(
      Date.UTC(
        thisMonth.getUTCFullYear(),
        thisMonth.getUTCMonth() - offset,
        1,
      ),
    )
    const nextMonthStart = new Date(
      Date.UTC(
        monthStart.getUTCFullYear(),
        monthStart.getUTCMonth() + 1,
        1,
      ),
    )
    const start = monthStart.toISOString().slice(0, 10)
    const end =
      offset === 0
        ? today
        : shiftDate(nextMonthStart.toISOString().slice(0, 10), -1)
    ranges.push({
      key: `${start}:${end}`,
      start,
      end,
      label: start.slice(0, 7),
    })
  }
  return ranges
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'An unexpected local storage error occurred.'
}

function formatRecordedDateTime(value: string): string {
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) {
    return 'saved at an unknown time'
  }
  return `saved at ${new Intl.DateTimeFormat('en-KE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)}`
}

function financialSettingFor(
  personalData: PersonalData | null,
  rangeKey: string,
): PeriodFinancialSetting | undefined {
  return personalData?.financialSettings[rangeKey]
}

function settingHasUnsupportedItems(
  setting: PeriodFinancialSetting | undefined,
): boolean {
  return setting?.accountingStatus === 'hasUnsupportedItems'
}

function settingAccountingIsUnresolved(
  setting: PeriodFinancialSetting | undefined,
): boolean {
  return setting?.accountingStatus !== 'noKnownUnsupportedItems'
}

function formValuesForSetting(
  setting: PeriodFinancialSetting | undefined,
): SettingForm {
  return {
    income:
      setting?.incomePaise === null || setting?.incomePaise === undefined
        ? ''
        : formatPaiseForInput(BigInt(setting.incomePaise)),
    lossBudget:
      setting?.lossBudgetPaise === null ||
      setting?.lossBudgetPaise === undefined
        ? ''
        : formatPaiseForInput(BigInt(setting.lossBudgetPaise)),
    reviewed: setting?.reviewed ?? false,
    accountingStatus: setting?.accountingStatus ?? 'notReviewed',
  }
}

function FinancialInsights({ records, period, onPeriodChange }: Props) {
  const today = getTodayInNairobi()
  const range = useMemo(
    () => getReportingRange(period, today, records),
    [period, today, records],
  )
  const [initialStorage] = useState(() => {
    try {
      return { data: loadPersonalData(), error: '' }
    } catch (error) {
      return { data: null, error: getErrorMessage(error) }
    }
  })
  const [personalData, setPersonalData] = useState<PersonalData | null>(
    initialStorage.data,
  )
  const [storageState, setStorageState] = useState<'ready' | 'error'>(
    initialStorage.error ? 'error' : 'ready',
  )
  const [storageError, setStorageError] = useState(initialStorage.error)
  const [settingFormState, setSettingFormState] = useState<{
    rangeKey: string
    value: SettingForm
  }>({
    rangeKey: range.key,
    value: formValuesForSetting(
      financialSettingFor(initialStorage.data, range.key),
    ),
  })
  const [settingError, setSettingError] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [historyView, setHistoryView] = useState<HistoryView>('daily')
  const [selectedDuplicateIds, setSelectedDuplicateIds] = useState<
    Record<string, string>
  >({})

  function loadSavedData() {
    setStorageError('')
    try {
      const loaded = loadPersonalData()
      setPersonalData(loaded)
      setStorageState('ready')
      setSettingFormState({
        rangeKey: range.key,
        value: formValuesForSetting(
          financialSettingFor(loaded, range.key),
        ),
      })
    } catch (error) {
      setStorageState('error')
      setStorageError(getErrorMessage(error))
    }
  }

  const savedSetting = financialSettingFor(personalData, range.key)
  const settingForm =
    settingFormState.rangeKey === range.key
      ? settingFormState.value
      : formValuesForSetting(savedSetting)

  function updateSettingForm(update: (current: SettingForm) => SettingForm) {
    setSettingFormState((current) => ({
      rangeKey: range.key,
      value: update(
        current.rangeKey === range.key
          ? current.value
          : formValuesForSetting(savedSetting),
      ),
    }))
    setSettingError('')
    setStatusMessage('')
  }

  const periodRecords = useMemo(() => {
    const start = range.start
    return records.filter(
      (record) => record.placedDate >= start && record.placedDate <= range.end,
    )
  }, [records, range.end, range.start])
  const resolvedRecords = useMemo(
    () =>
      resolvePossibleDuplicates(
        periodRecords,
        personalData?.duplicateDecisions ?? {},
      ),
    [periodRecords, personalData],
  )
  const confirmedRecords = resolvedRecords.includedRecords.filter(
    (record) => record.result !== 'void',
  )
  const incomePaise = parseStoredPaise(savedSetting?.incomePaise ?? null)
  const lossBudgetPaise = parseStoredPaise(
    savedSetting?.lossBudgetPaise ?? null,
  )
  const hasUnresolvedDuplicates = resolvedRecords.unresolvedGroups.length > 0
  const hasUnsupportedAccounting = settingHasUnsupportedItems(savedSetting)
  const accountingStatusUnresolved =
    settingAccountingIsUnresolved(savedSetting)
  const comparisonsWithheld = shouldWithholdComparisons(
    savedSetting?.reviewed ?? false,
    savedSetting?.accountingStatus,
    hasUnresolvedDuplicates,
  )
  const metrics = calculateFinancialMetrics(
    resolvedRecords.includedRecords,
    incomePaise,
    lossBudgetPaise,
    { incompletePeriod: comparisonsWithheld },
  )
  const hasConfirmedRecords = confirmedRecords.length > 0
  const allResolvedRecords = useMemo(
    () =>
      resolvePossibleDuplicates(
        records.filter((record) => record.placedDate <= today),
        personalData?.duplicateDecisions ?? {},
      ),
    [records, personalData, today],
  )
  const historyRanges = useMemo(
    () => getHistoryRanges(historyView, today),
    [historyView, today],
  )

  function persistPersonalData(
    update: (current: PersonalData) => PersonalData,
  ): boolean {
    try {
      const updated = updatePersonalData(update)
      setPersonalData(updated)
      setStorageState('ready')
      setStorageError('')
      return true
    } catch (error) {
      setStorageError(getErrorMessage(error))
      setStorageState('error')
      return false
    }
  }

  function handleSaveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSettingError('')

    const incomeInput = settingForm.income.trim()
    const budgetInput = settingForm.lossBudget.trim()
    const parsedIncome =
      incomeInput === '' ? null : parseKesToPaise(incomeInput)
    const parsedBudget =
      budgetInput === '' ? null : parseKesToPaise(budgetInput)

    if (incomeInput !== '' && parsedIncome === null) {
      setSettingError('Enter available income as a valid KES amount or leave it blank.')
      return
    }
    if (budgetInput !== '' && parsedBudget === null) {
      setSettingError('Enter the loss limit as a valid KES amount or leave it blank.')
      return
    }

    const setting: PeriodFinancialSetting = {
      incomePaise: parsedIncome?.toString() ?? null,
      lossBudgetPaise: parsedBudget?.toString() ?? null,
      reviewed: settingForm.reviewed,
      accountingStatus: settingForm.accountingStatus,
      updatedAt: new Date().toISOString(),
    }
    const saved = persistPersonalData((current) => ({
      ...current,
      financialSettings: {
        ...current.financialSettings,
        [range.key]: setting,
      },
    }))
    if (saved) {
      setStatusMessage('These financial settings were saved on this device for the displayed dates.')
    }
  }

  function setDuplicateDecision(
    key: string,
    decision: DuplicateDecision | null,
  ) {
    persistPersonalData((current) => {
      const duplicateDecisions = { ...current.duplicateDecisions }
      if (decision === null) {
        delete duplicateDecisions[key]
      } else {
        duplicateDecisions[key] = decision
      }
      return { ...current, duplicateDecisions }
    })
  }

  const incomeUnavailableReason =
    incomePaise === null
      ? 'Enter available income for this exact date range.'
      : incomePaise === 0n
        ? 'Available income is zero, so a percentage cannot be calculated.'
        : 'Income does not have a valid amount for this exact date range.'
  const budgetUnavailableReason =
    lossBudgetPaise === null
      ? 'Enter a personal net-loss limit for this exact date range.'
      : lossBudgetPaise === 0n
        ? 'The loss limit is zero, so a percentage cannot be calculated.'
        : 'The loss limit does not have a valid amount for this exact date range.'
  const incompletePeriodReason =
    hasUnsupportedAccounting
      ? 'This date range is marked as containing unsupported accounting items, so percentages and the remaining loss limit are withheld.'
      : hasUnresolvedDuplicates
        ? 'Possible duplicate entries remain unresolved, so percentages and the remaining loss limit are withheld.'
        : accountingStatusUnresolved
          ? 'Accounting status for this date range is not confirmed, so percentages and the remaining loss limit are withheld.'
          : 'This date range has not been marked as reviewed, so percentages and the remaining loss limit are withheld.'

  const totalStakedText = hasConfirmedRecords
    ? formatKes(metrics.stakedPaise)
    : '—'
  const totalReturnedText = hasConfirmedRecords
    ? formatKes(metrics.returnedPaise)
    : '—'
  const netResultText = !hasConfirmedRecords
    ? '—'
    : metrics.netPaise < 0n
      ? `Net loss: ${formatKes(-metrics.netPaise)}`
      : metrics.netPaise > 0n
        ? `Net gain: ${formatKes(metrics.netPaise)}`
        : 'Break-even'
  const recordCoverageMessage = hasUnsupportedAccounting
    ? 'You marked this period as containing unsupported accounting items. Totals below are recorded subtotals; related ratios and the remaining loss limit are withheld.'
    : hasUnresolvedDuplicates
      ? 'Possible duplicates are awaiting review. The totals may be incomplete.'
      : accountingStatusUnresolved
        ? 'Accounting status for this date range is not confirmed. Totals are recorded subtotals; percentages and the remaining loss limit are withheld.'
        : savedSetting?.reviewed
          ? 'You marked this period as reviewed. LossLens cannot independently verify that no transactions are missing.'
          : 'Not marked as reviewed. Totals are entered-record subtotals; percentages and the remaining loss limit are withheld.'

  return (
    <section
      aria-labelledby="actual-totals-title"
      className="actual-totals financial-insights"
      id="today-financial-summary"
    >
      <div className="module-section-heading">
        <div>
          <p className="eyebrow">Recorded activity only</p>
          <h3 id="actual-totals-title">
            {period === 'today' ? 'Today’s recorded results' : 'Recorded results'}
          </h3>
        </div>
        <label className="period-control">
          <span>Period</span>
          <select
            aria-label="Select reporting period"
            onChange={(event) => {
              const nextPeriod = periodOptions.find(
                (option) => option.value === event.currentTarget.value,
              )
              if (nextPeriod) {
                onPeriodChange(nextPeriod.value)
              }
            }}
            value={period}
          >
            {periodOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="period-description">
        {getPeriodDescription(period, range)}
        {periodRecords.length > 0 &&
          ` · ${periodRecords.length} manual ${periodRecords.length === 1 ? 'record' : 'records'}`}
      </p>
      <p className="money-rounding-note">
        Amounts are calculated to the saved cent and displayed to the nearest
        whole KES. These are subtotals of entries saved here, not verified
        complete financial totals.
      </p>

      {storageState === 'error' && (
        <div className="storage-error" role="alert">
          <div>
            <strong>Personal settings could not be loaded or saved.</strong>
            <p>{storageError} Financial ratios may be unavailable until local storage works.</p>
          </div>
          <button
            className="secondary-button retry-button"
            onClick={loadSavedData}
            type="button"
          >
            Retry
          </button>
        </div>
      )}

      {resolvedRecords.unresolvedGroups.length > 0 && (
        <section aria-labelledby="duplicate-review-title" className="duplicate-review">
          <h4 id="duplicate-review-title">Review possible duplicate entries</h4>
          <p>
            Matching entries are excluded from recorded totals until you
            decide whether they are separate bets or one entry recorded more
            than once. No record is deleted or merged.
          </p>
          {resolvedRecords.unresolvedGroups.map((group) => (
            <div className="duplicate-group" key={group.key}>
              <p>
                {group.records.length} entries have matching date, bookmaker,
                stake, result, and return details.
              </p>
              <label className="form-field duplicate-choice">
                <span>Entry to count if these represent one transaction</span>
                <select
                  onChange={(event) =>
                    setSelectedDuplicateIds((current) => ({
                      ...current,
                      [group.key]: event.currentTarget.value,
                    }))
                  }
                  value={
                    selectedDuplicateIds[group.key] ?? group.records[0]?.id ?? ''
                  }
                >
                  {group.records.map((record, index) => (
                    <option key={record.id} value={record.id}>
                      Entry {index + 1} — {formatRecordedDateTime(record.createdAt)}
                    </option>
                  ))}
                </select>
              </label>
              <div className="duplicate-actions">
                <button
                  className="secondary-button"
                  onClick={() =>
                    setDuplicateDecision(group.key, { kind: 'separate' })
                  }
                  type="button"
                >
                  Count all as separate bets
                </button>
                <button
                  className="secondary-button"
                  onClick={() =>
                    setDuplicateDecision(group.key, {
                      kind: 'single',
                      recordId:
                        selectedDuplicateIds[group.key] ??
                        group.records[0]?.id ??
                        '',
                    })
                  }
                  type="button"
                >
                  Count one selected entry
                </button>
              </div>
            </div>
          ))}
        </section>
      )}

      {resolvedRecords.reviewedGroups.length > 0 && (
        <section aria-label="Reviewed matching entries" className="reviewed-duplicates">
          <p>
            You reviewed {resolvedRecords.reviewedGroups.length} matching
            {resolvedRecords.reviewedGroups.length === 1 ? ' group' : ' groups'}.
            Review decisions can be changed.
          </p>
          {resolvedRecords.reviewedGroups.map((group) => (
            <button
              className="text-button"
              key={group.key}
              onClick={() => setDuplicateDecision(group.key, null)}
              type="button"
            >
              Review {group.records.length} matching entries again
            </button>
          ))}
        </section>
      )}

      <div aria-live="polite" className="totals-grid financial-metrics-grid">
        <article className="total-card">
          <span>Recorded stakes</span>
          <strong>{totalStakedText}</strong>
          <small>Stakes in saved, included records for these dates.</small>
        </article>
        <article className="total-card">
          <span>Recorded returns</span>
          <strong>{totalReturnedText}</strong>
          <small>Returns in saved, included records for these dates.</small>
        </article>
        <article className="total-card total-card-net">
          <span>Recorded net result</span>
          <strong>{netResultText}</strong>
          <small>Returns minus stakes; not an estimate or prediction.</small>
        </article>
        <article className="total-card">
          <span>Wagering intensity</span>
          <strong>
            {hasConfirmedRecords
              ? formatPercent(metrics.wageringIntensityBasisPoints)
              : '—'}
          </strong>
          <small>
            Stakes compared with available income. This is not the amount lost.
          </small>
        </article>
        <article className="total-card">
          <span>Net-loss exposure relative to income</span>
          <strong>
            {hasConfirmedRecords
              ? formatPercent(metrics.incomeExposureBasisPoints)
              : '—'}
          </strong>
          <small>A recorded loss compared with the available income you entered.</small>
        </article>
        <article className="total-card">
          <span>Loss-budget exposure</span>
          <strong>
            {hasConfirmedRecords
              ? formatPercent(metrics.budgetExposureBasisPoints)
              : '—'}
          </strong>
          <small>Recorded net loss compared with your chosen loss limit.</small>
        </article>
        <article className="total-card">
          <span>Loss budget remaining</span>
          <strong>
            {hasConfirmedRecords && metrics.budgetRemainingPaise !== null
              ? metrics.budgetRemainingPaise < 0n
                ? `Exceeded by ${formatKes(-metrics.budgetRemainingPaise)}`
                : formatKes(metrics.budgetRemainingPaise)
              : '—'}
          </strong>
          <small>Your limit is a maximum tolerable net loss, not a staking budget.</small>
        </article>
      </div>

      {!hasConfirmedRecords && (
        <p className="totals-empty">
          {resolvedRecords.unresolvedGroups.length > 0
            ? 'Potential duplicates are awaiting your review, so totals from included records are not available yet.'
            : 'No saved non-void manual records in this period, so there are no totals to show.'}
        </p>
      )}

      <div className="record-completeness" role="status">
        <strong>Record coverage:</strong> {recordCoverageMessage}
        {!hasUnsupportedAccounting &&
          ' Refunds, partial settlements, promotional credits, fees, taxes, and missing returns are not modeled separately and may make totals incomplete.'}
      </div>

      <section aria-labelledby="financial-settings-title" className="financial-settings">
        <div>
          <p className="eyebrow">Optional · stored on this device</p>
          <h4 id="financial-settings-title">Add context for this exact period</h4>
          <p>
            Enter amounts that cover {range.start} to {range.end} only. No
            weekly or monthly conversions are made. Leave an amount blank if
            you do not want to record it.
          </p>
        </div>
        <form className="financial-settings-form" onSubmit={handleSaveSettings}>
          <div className="form-field">
            <label htmlFor="available-income">
              Income remaining after essential expenses (KES)
            </label>
            <input
              autoComplete="off"
              id="available-income"
              inputMode="decimal"
              onChange={(event) =>
                updateSettingForm((current) => ({
                  ...current,
                  income: event.currentTarget.value,
                }))
              }
              type="text"
              value={settingForm.income}
            />
            <span className="field-hint">
              Used only for this exact date range. Zero or missing income makes
              income-based percentages unavailable.
            </span>
          </div>
          <div className="form-field">
            <label htmlFor="loss-budget">
              Maximum tolerable net gambling loss (KES)
            </label>
            <input
              autoComplete="off"
              id="loss-budget"
              inputMode="decimal"
              onChange={(event) =>
                updateSettingForm((current) => ({
                  ...current,
                  lossBudget: event.currentTarget.value,
                }))
              }
              type="text"
              value={settingForm.lossBudget}
            />
            <span className="field-hint">
              This is your personal loss limit, not a staking budget. Remaining
              budget is not a reason to continue gambling.
            </span>
          </div>
          <fieldset className="form-field form-field-wide accounting-status-field">
            <legend>Do these dates include an item this ledger cannot account for?</legend>
            <p className="field-hint">
              This includes refunds, partial settlements, promotional credits,
              fees, taxes, missing returns, or cash-out amounts counted
              elsewhere. These treatments are not supported yet.
            </p>
            <div className="choice-row">
              <label className="choice-option">
                <input
                  checked={settingForm.accountingStatus === 'notReviewed'}
                  name="accounting-status"
                  onChange={() =>
                    updateSettingForm((current) => ({
                      ...current,
                      accountingStatus: 'notReviewed',
                    }))
                  }
                  type="radio"
                />
                <span>Not sure / not reviewed</span>
              </label>
              <label className="choice-option">
                <input
                  checked={
                    settingForm.accountingStatus ===
                    'noKnownUnsupportedItems'
                  }
                  name="accounting-status"
                  onChange={() =>
                    updateSettingForm((current) => ({
                      ...current,
                      accountingStatus: 'noKnownUnsupportedItems',
                    }))
                  }
                  type="radio"
                />
                <span>No known unsupported items</span>
              </label>
              <label className="choice-option">
                <input
                  checked={
                    settingForm.accountingStatus === 'hasUnsupportedItems'
                  }
                  name="accounting-status"
                  onChange={() =>
                    updateSettingForm((current) => ({
                      ...current,
                      accountingStatus: 'hasUnsupportedItems',
                    }))
                  }
                  type="radio"
                />
                <span>This period includes unsupported items</span>
              </label>
            </div>
            <span className="field-hint">
              “No known unsupported items” is your review only; it does not
              prove that all transactions are recorded.
            </span>
          </fieldset>
          <label className="reviewed-checkbox">
            <input
              checked={settingForm.reviewed}
              onChange={(event) =>
                updateSettingForm((current) => ({
                  ...current,
                  reviewed: event.currentTarget.checked,
                }))
              }
              type="checkbox"
            />
            <span>I have reviewed the records entered for this date range</span>
          </label>
          <p className="field-hint">
            This records your review only; the app cannot verify that all
            transactions are present.
          </p>
          {settingError && (
            <p className="field-error" role="alert">
              {settingError}
            </p>
          )}
          {statusMessage && (
            <p aria-live="polite" className="form-status">
              {statusMessage}
            </p>
          )}
          <button
            className="primary-button"
            disabled={storageState !== 'ready'}
            type="submit"
          >
            Save period settings
          </button>
        </form>
      </section>

      <ul className="unavailable-reasons" aria-label="Unavailable metric explanations">
        <li>
          <strong>Wagering intensity:</strong>{' '}
          {!hasConfirmedRecords
            ? 'No saved non-void records in this range; no ratio is shown.'
            : comparisonsWithheld
              ? incompletePeriodReason
            : formatPercent(metrics.wageringIntensityBasisPoints) === 'Unavailable'
            ? incomeUnavailableReason
            : 'Measures how much was staked relative to reported available income; it does not measure losses or predict harm.'}
        </li>
        <li>
          <strong>Income-relative net-loss exposure:</strong>{' '}
          {!hasConfirmedRecords
            ? 'No saved non-void records in this range; no ratio is shown.'
            : comparisonsWithheld
              ? incompletePeriodReason
            : formatPercent(metrics.incomeExposureBasisPoints) === 'Unavailable'
            ? incomeUnavailableReason
            : 'Shows recorded net loss as a share of the reported available income for the same dates.'}
        </li>
        <li>
          <strong>Loss-budget exposure:</strong>{' '}
          {!hasConfirmedRecords
            ? 'No saved non-void records in this range; no ratio is shown.'
            : comparisonsWithheld
              ? incompletePeriodReason
            : formatPercent(metrics.budgetExposureBasisPoints) === 'Unavailable'
            ? budgetUnavailableReason
            : 'Compares recorded net loss with your stated personal loss limit; it is not a harm threshold.'}
        </li>
      </ul>

      <button
        aria-controls="financial-explanation"
        aria-expanded={detailsOpen}
        className="secondary-button know-more-button"
        onClick={() => setDetailsOpen((open) => !open)}
        type="button"
      >
        {detailsOpen ? 'Hide number explanations' : 'Know more about your numbers'}
      </button>
      {detailsOpen && (
        <section
          aria-labelledby="financial-explanation-title"
          className="financial-explanation"
          id="financial-explanation"
        >
          <h4 id="financial-explanation-title">How these figures are worked out</h4>
          <p>
            The calculations use non-void recorded entries currently included
            for {range.start} to {range.end}. They do not prove that the period
            contains every transaction. Money calculations retain paise; values
            below are rounded for display.
          </p>
          <dl>
            <div>
              <dt>Recorded net result</dt>
              <dd>
                Formula: N = R − S. These totals use entered records only.{' '}
                {hasConfirmedRecords
                  ? `For this period, ${formatKes(metrics.returnedPaise)} returns − ${formatKes(metrics.stakedPaise)} stakes = ${netResultText}.`
                  : 'There are no saved non-void records in this period, so a net result is not available.'}{' '}
                A negative result is a recorded net loss; zero is break-even;
                a positive result is a recorded net gain. It is not expected
                loss or a prediction.
              </dd>
            </div>
            <div>
              <dt>Wagering intensity relative to available income</dt>
              <dd>
                Formula: Wᵢ = (S ÷ I) × 100%. This is how much was staked
                relative to income remaining after essential expenses for the
                same dates. Current inputs:{' '}
                {hasConfirmedRecords
                  ? `stakes ${formatKes(metrics.stakedPaise)}`
                  : 'no saved non-void entries'};{' '}
                available income {incomePaise === null ? 'not entered' : formatKes(incomePaise)}.
                Result:{' '}
                {hasConfirmedRecords
                  ? formatPercent(metrics.wageringIntensityBasisPoints)
                  : 'not available without confirmed records'}.
                {comparisonsWithheld
                  ? ` ${incompletePeriodReason}`
                  : ''}
                This does not measure money lost and is not a validated risk
                score.
              </dd>
            </div>
            <div>
              <dt>Net-loss exposure relative to available income</dt>
              <dd>
                Formula: Fᵢ = (L ÷ I) × 100%. Current inputs: recorded net loss{' '}
                {hasConfirmedRecords
                  ? formatKes(metrics.lossPaise)
                  : 'not available without confirmed records'}{' '}
                and available income
                {incomePaise === null ? ' not entered' : ` ${formatKes(incomePaise)}`}.
                Result:{' '}
                {hasConfirmedRecords
                  ? formatPercent(metrics.incomeExposureBasisPoints)
                  : 'not available without confirmed records'}. It
                describes the recorded loss compared with the amount you
                reported; it is not a probability or diagnosis.
                {comparisonsWithheld
                  ? ` ${incompletePeriodReason}`
                  : ''}
              </dd>
            </div>
            <div>
              <dt>Net-loss exposure relative to your loss limit</dt>
              <dd>
                Formula: Fᴮ = (L ÷ B) × 100%; remaining = B − L. Current
                inputs: recorded net loss{' '}
                {hasConfirmedRecords
                  ? formatKes(metrics.lossPaise)
                  : 'not available without confirmed records'}{' '}
                and
                personal loss limit{' '}
                {lossBudgetPaise === null
                  ? 'not entered'
                  : formatKes(lossBudgetPaise)}
                . Result:{' '}
                {hasConfirmedRecords
                  ? formatPercent(metrics.budgetExposureBasisPoints)
                  : 'not available without confirmed records'};{' '}
                {!hasConfirmedRecords || metrics.budgetRemainingPaise === null
                  ? 'remaining amount unavailable.'
                  : metrics.budgetRemainingPaise < 0n
                    ? `limit exceeded by ${formatKes(-metrics.budgetRemainingPaise)}.`
                    : `${formatKes(metrics.budgetRemainingPaise)} remaining.`}
                Your limit is not a staking budget or a validated harm threshold.
                {comparisonsWithheld
                  ? ` ${incompletePeriodReason}`
                  : ''}
              </dd>
            </div>
          </dl>
          <p>
            If income or a loss limit is missing, zero, invalid, or for
            different dates, the related percentage is unavailable rather than
            divided by zero or converted from another period. Actual net
            results remain available. These descriptive measures are not
            validated actuarial or clinical measures, do not predict future
            harm, and should not be combined into a risk score.
          </p>
          <p>
            Reflection: Did the recorded spending fit what you could afford
            during these dates? Does the personal limit you chose still feel
            right for you?
          </p>
        </section>
      )}

      <section aria-labelledby="financial-history-title" className="financial-history">
        <div>
          <p className="eyebrow">Recorded patterns · no projections</p>
          <h4 id="financial-history-title">Your recorded history</h4>
          <p>
            Actual stakes, returns, and net results for the dates shown.
            Periods without saved records are still shown as no recorded
            activity, not as verified no gambling.
          </p>
        </div>
        <div aria-label="History period" className="history-view-switch" role="group">
          {([
            ['daily', 'Daily · 14 days'],
            ['weekly', 'Weekly · 8 weeks'],
            ['monthly', 'Monthly · 6 months'],
          ] as const).map(([value, label]) => (
            <button
              aria-pressed={historyView === value}
              className="secondary-button"
              key={value}
              onClick={() => setHistoryView(value)}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>
        <div className="history-table-wrap">
          <table className="history-table">
            <caption>
              Recorded financial results by {historyView} period
            </caption>
            <thead>
              <tr>
                <th scope="col">Period</th>
                <th scope="col">Stakes</th>
                <th scope="col">Returns</th>
                <th scope="col">Net result</th>
                <th scope="col">Income exposure</th>
                <th scope="col">Loss-budget usage</th>
                <th scope="col">Coverage</th>
              </tr>
            </thead>
            <tbody>
              {historyRanges.map((historyRange) => {
                const bucketRecords = allResolvedRecords.includedRecords.filter(
                  (record) =>
                    record.placedDate >= historyRange.start &&
                    record.placedDate <= historyRange.end,
                )
                const setting =
                  personalData?.financialSettings[historyRange.key]
                const unresolvedCount =
                  allResolvedRecords.unresolvedGroups.filter((group) =>
                    group.records.some(
                      (record) =>
                        record.placedDate >= historyRange.start &&
                        record.placedDate <= historyRange.end,
                    ),
                  ).length
                const hasUnsupportedItems = settingHasUnsupportedItems(setting)
                const accountingStatusUnresolved =
                  settingAccountingIsUnresolved(setting)
                const incompletePeriod = shouldWithholdComparisons(
                  setting?.reviewed ?? false,
                  setting?.accountingStatus,
                  unresolvedCount > 0,
                )
                const bucketMetrics = calculateFinancialMetrics(
                  bucketRecords,
                  parseStoredPaise(setting?.incomePaise ?? null),
                  parseStoredPaise(setting?.lossBudgetPaise ?? null),
                  { incompletePeriod },
                )
                const cumulativeRecords =
                  allResolvedRecords.includedRecords.filter(
                    (record) => record.placedDate <= historyRange.end,
                  )
                const cumulativeNet =
                  calculateFinancialMetrics(cumulativeRecords, null, null)
                    .netPaise
                const completeness = hasUnsupportedItems
                  ? 'Unsupported accounting items reported; subtotal only'
                  : unresolvedCount > 0
                    ? `${unresolvedCount} possible duplicate group${unresolvedCount === 1 ? '' : 's'}`
                    : accountingStatusUnresolved
                      ? 'Accounting status not confirmed; entered subtotal only'
                      : setting?.reviewed
                        ? 'Reviewed by you; completeness not verified'
                        : 'Not reviewed; entered subtotal only'

                return (
                  <tr key={historyRange.key}>
                    <th scope="row">
                      {historyRange.label}
                      {historyRange.end === today &&
                        historyRange.start !== historyRange.end &&
                        ' · to date'}
                      <small>
                        Cumulative recorded net subtotal through period end:{' '}
                        {formatKes(cumulativeNet)}
                      </small>
                    </th>
                    <td>
                      {bucketMetrics.recordCount > 0
                        ? formatKes(bucketMetrics.stakedPaise)
                        : 'No recorded activity'}
                    </td>
                    <td>
                      {bucketMetrics.recordCount > 0
                        ? formatKes(bucketMetrics.returnedPaise)
                        : '—'}
                    </td>
                    <td>
                      {bucketMetrics.recordCount === 0
                        ? '—'
                        : bucketMetrics.netPaise < 0n
                          ? `Net loss ${formatKes(-bucketMetrics.netPaise)}`
                          : bucketMetrics.netPaise > 0n
                            ? `Net gain ${formatKes(bucketMetrics.netPaise)}`
                            : 'Break-even'}
                    </td>
                    <td>
                      {bucketMetrics.recordCount === 0
                        ? '—'
                        : formatPercent(bucketMetrics.incomeExposureBasisPoints)}
                    </td>
                    <td>
                      {bucketMetrics.recordCount === 0
                        ? '—'
                        : formatPercent(bucketMetrics.budgetExposureBasisPoints)}
                    </td>
                    <td>{completeness}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="history-limit-note">
          Exposure percentages appear only when income or a loss limit was
          entered for the exact date range in that row. No monthly-to-weekly
          conversions are used.           The cumulative column totals included,
          non-void recorded entries; it does not establish a
          complete transaction history.
        </p>
      </section>
    </section>
  )
}

export default FinancialInsights
