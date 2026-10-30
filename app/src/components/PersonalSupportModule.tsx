import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { getAllBets } from '../lib/betDatabase'
import {
  calculateFinancialMetrics,
  resolvePossibleDuplicates,
} from '../lib/financialMetrics'
import {
  loadPersonalData,
  updatePersonalData,
  type DailyCheckIn,
  type PersonalData,
  type RecoveryGoal,
  type ToolReflection,
} from '../lib/personalData'
import {
  getCurrentGamblingFreeProgress,
  getHistoricalGamblingFreePeriods,
  getWeeklyReductionProgress,
} from '../lib/recoveryProgress'
import {
  formatKes,
  getTodayInNairobi,
  type BetRecord,
} from '../lib/trueCost'

const moods = [
  'Calm',
  'Hopeful',
  'Low',
  'Anxious',
  'Frustrated',
  'Tired',
  'Other',
]

const triggerOptions = [
  'Stress',
  'Boredom',
  'Loneliness',
  'A gambling promotion',
  'A recent win or loss',
  'Other',
]

const urgeLabels = [
  'No urge',
  'Slight',
  'Moderate',
  'Strong',
  'Very strong',
]

type CheckInForm = {
  gambled: DailyCheckIn['gambled']
  durationMinutes: string
  urgeLevel: string
  mood: string
  triggers: string[]
  note: string
}

const emptyCheckInForm: CheckInForm = {
  gambled: 'notRecorded',
  durationMinutes: '',
  urgeLevel: '',
  mood: '',
  triggers: [],
  note: '',
}

const emptyReflection: ToolReflection = {
  trigger: '',
  thought: '',
  alternativeThought: '',
  updatedAt: '',
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'An unexpected local storage error occurred.'
}

function formFromCheckIn(entry: DailyCheckIn | undefined): CheckInForm {
  if (!entry) {
    return { ...emptyCheckInForm, triggers: [] }
  }
  return {
    gambled: entry.gambled,
    durationMinutes:
      entry.durationMinutes === null ? '' : String(entry.durationMinutes),
    urgeLevel: entry.urgeLevel === null ? '' : String(entry.urgeLevel),
    mood: entry.mood,
    triggers: [...entry.triggers],
    note: entry.note,
  }
}

function formatShortDate(value: string): string {
  const date = new Date(`${value}T00:00:00.000Z`)
  return new Intl.DateTimeFormat('en-KE', {
    dateStyle: 'medium',
    timeZone: 'UTC',
  }).format(date)
}

function formatTimer(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

function PersonalSupportModule() {
  const today = getTodayInNairobi()
  const [initialPersonalState] = useState(() => {
    try {
      return { data: loadPersonalData(), error: '' }
    } catch (error) {
      return { data: null, error: getErrorMessage(error) }
    }
  })
  const [personalData, setPersonalData] = useState<PersonalData | null>(
    initialPersonalState.data,
  )
  const [storageState, setStorageState] = useState<
    'loading' | 'ready' | 'error'
  >(initialPersonalState.error ? 'error' : 'ready')
  const [storageError, setStorageError] = useState(initialPersonalState.error)
  const [selectedDate, setSelectedDate] = useState(today)
  const [checkInForm, setCheckInForm] = useState<CheckInForm>(() =>
    formFromCheckIn(initialPersonalState.data?.checkIns[today]),
  )
  const [checkInError, setCheckInError] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const [records, setRecords] = useState<BetRecord[]>([])
  const [recordState, setRecordState] = useState<
    'loading' | 'ready' | 'error'
  >('loading')
  const [recordError, setRecordError] = useState('')
  const [goalMode, setGoalMode] = useState<RecoveryGoal['mode']>(
    initialPersonalState.data?.goal?.mode ?? 'stop',
  )
  const [goalTarget, setGoalTarget] = useState(
    String(initialPersonalState.data?.goal?.targetDays ?? 7),
  )
  const [goalError, setGoalError] = useState('')
  const [reflection, setReflection] = useState<ToolReflection>(
    initialPersonalState.data?.toolReflections[today] ?? emptyReflection,
  )
  const [reflectionStatus, setReflectionStatus] = useState('')
  const [activityInput, setActivityInput] = useState('')
  const [reasonInput, setReasonInput] = useState(
    initialPersonalState.data?.reasonsToPause ?? '',
  )
  const [reasonStatus, setReasonStatus] = useState('')
  const [activityError, setActivityError] = useState('')
  const [timerMinutes, setTimerMinutes] = useState('1')
  const [timerMode, setTimerMode] = useState<
    'pause' | 'grounding' | 'breathing' | null
  >(null)
  const [timerRemaining, setTimerRemaining] = useState<number | null>(null)
  const [timerMessage, setTimerMessage] = useState('')

  function loadSavedData() {
    setStorageState('loading')
    setStorageError('')
    try {
      const loaded = loadPersonalData()
      setPersonalData(loaded)
      setStorageState('ready')
      setCheckInForm(formFromCheckIn(loaded.checkIns[selectedDate]))
      setReflection(loaded.toolReflections[selectedDate] ?? emptyReflection)
      setReasonInput(loaded.reasonsToPause)
      if (loaded.goal) {
        setGoalMode(loaded.goal.mode)
        setGoalTarget(String(loaded.goal.targetDays))
      }
    } catch (error) {
      setStorageState('error')
      setStorageError(getErrorMessage(error))
    }
  }

  async function loadRecords() {
    setRecordState('loading')
    setRecordError('')
    try {
      setRecords(await getAllBets())
      setRecordState('ready')
    } catch (error) {
      setRecordState('error')
      setRecordError(getErrorMessage(error))
    }
  }

  useEffect(() => {
    let active = true
    getAllBets()
      .then((loadedRecords) => {
        if (active) {
          setRecords(loadedRecords)
          setRecordState('ready')
          setRecordError('')
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setRecordState('error')
          setRecordError(getErrorMessage(error))
        }
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    function handlePersonalDataUpdate() {
      try {
        const updated = loadPersonalData()
        setPersonalData(updated)
        setStorageState('ready')
        setStorageError('')
      } catch (error) {
        setStorageState('error')
        setStorageError(getErrorMessage(error))
      }
    }

    window.addEventListener(
      'losslens:personal-data-updated',
      handlePersonalDataUpdate,
    )
    return () =>
      window.removeEventListener(
        'losslens:personal-data-updated',
        handlePersonalDataUpdate,
      )
  }, [selectedDate])

  useEffect(() => {
    if (timerRemaining === null) {
      return
    }
    if (timerRemaining <= 0) {
      return
    }

    const timerId = window.setTimeout(() => {
      if (timerRemaining === 1) {
        setTimerRemaining(null)
        setTimerMode(null)
        setTimerMessage(
          'The timer has ended. Take the next step that feels right for you.',
        )
      } else {
        setTimerRemaining(timerRemaining - 1)
      }
    }, 1000)
    return () => window.clearTimeout(timerId)
  }, [timerRemaining])

  function persistPersonalData(
    update: (current: PersonalData) => PersonalData,
  ): PersonalData | null {
    try {
      const updated = updatePersonalData(update)
      setPersonalData(updated)
      setStorageState('ready')
      setStorageError('')
      return updated
    } catch (error) {
      setStorageError(getErrorMessage(error))
      setStorageState('error')
      return null
    }
  }

  const selectedCheckIn = personalData?.checkIns[selectedDate]
  const selectedDateRecords = useMemo(
    () => records.filter((record) => record.placedDate === selectedDate),
    [records, selectedDate],
  )
  const resolvedDayRecords = useMemo(
    () =>
      resolvePossibleDuplicates(
        selectedDateRecords,
        personalData?.duplicateDecisions ?? {},
      ),
    [personalData, selectedDateRecords],
  )
  const dayHasUnsupportedAccounting =
    personalData?.financialSettings[`${selectedDate}:${selectedDate}`]
      ?.accountingStatus === 'hasUnsupportedItems'
  const ledgerMetrics = calculateFinancialMetrics(
    resolvedDayRecords.includedRecords,
    null,
    null,
    {
      incompletePeriod:
        dayHasUnsupportedAccounting ||
        resolvedDayRecords.unresolvedGroups.length > 0,
    },
  )
  const currentProgress = useMemo(
    () =>
      getCurrentGamblingFreeProgress(personalData?.checkIns ?? {}, today),
    [personalData, today],
  )
  const historicalPeriods = useMemo(
    () => getHistoricalGamblingFreePeriods(personalData?.checkIns ?? {}, today),
    [personalData, today],
  )
  const weeklyGoalProgress =
    personalData?.goal?.mode === 'reduce'
      ? getWeeklyReductionProgress(
          personalData.checkIns,
          today,
          personalData.goal,
        )
      : null
  const recentCheckIns = useMemo(
    () =>
      Object.values(personalData?.checkIns ?? {})
        .filter((entry) => entry.date <= today)
        .sort((first, second) => second.date.localeCompare(first.date))
        .slice(0, 7),
    [personalData, today],
  )

  function changeSelectedDate(date: string) {
    const parsedDate = new Date(`${date}T00:00:00.000Z`)
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !Number.isFinite(parsedDate.getTime()) ||
      parsedDate.toISOString().slice(0, 10) !== date ||
      date > today
    ) {
      setCheckInError('Choose a valid date.')
      return
    }
    setSelectedDate(date)
    setCheckInForm(formFromCheckIn(personalData?.checkIns[date]))
    setReflection(personalData?.toolReflections[date] ?? emptyReflection)
    setCheckInError('')
    setStatusMessage('')
  }

  function handleCheckInSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setCheckInError('')

    const durationText = checkInForm.durationMinutes.trim()
    const duration = durationText === '' ? null : Number(durationText)
    if (
      duration !== null &&
      (!Number.isInteger(duration) || duration < 0 || duration > 1440)
    ) {
      setCheckInError('Enter time as a whole number of minutes from 0 to 1,440.')
      return
    }
    if (checkInForm.gambled === 'no' && duration !== null && duration > 0) {
      setCheckInError(
        'A “No” gambling check-in cannot include time spent gambling. Correct the answer or clear the time.',
      )
      return
    }
    if (
      checkInForm.gambled === 'no' &&
      resolvedDayRecords.includedRecords.some((record) => record.result !== 'void')
    ) {
      setCheckInError(
        'True Cost has a non-void bet record for this date. Review the ledger and check-in before saving conflicting answers.',
      )
      return
    }

    const urgeText = checkInForm.urgeLevel
    const urgeLevel = urgeText === '' ? null : Number(urgeText)
    if (
      urgeLevel !== null &&
      (!Number.isInteger(urgeLevel) || urgeLevel < 0 || urgeLevel > 4)
    ) {
      setCheckInError('Choose an urge level from the available options.')
      return
    }
    if (checkInForm.note.length > 500) {
      setCheckInError('Keep your note to 500 characters or fewer.')
      return
    }

    const entry: DailyCheckIn = {
      date: selectedDate,
      gambled: checkInForm.gambled,
      durationMinutes: duration,
      urgeLevel,
      mood: checkInForm.mood,
      triggers: [...checkInForm.triggers],
      note: checkInForm.note.trim(),
      updatedAt: new Date().toISOString(),
    }
    const updated = persistPersonalData((current) => ({
      ...current,
      checkIns: { ...current.checkIns, [selectedDate]: entry },
    }))
    if (updated) {
      setStatusMessage(`Your check-in for ${formatShortDate(selectedDate)} was saved on this device.`)
    }
  }

  function handleGoalSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setGoalError('')
    const target = Number(goalTarget)
    const maximum = goalMode === 'reduce' ? 7 : 365
    if (!Number.isInteger(target) || target < 1 || target > maximum) {
      setGoalError(
        goalMode === 'reduce'
          ? 'Choose a personal target from 1 to 7 days in a week.'
          : 'Choose a personal target from 1 to 365 days.',
      )
      return
    }

    const goal: RecoveryGoal = {
      mode: goalMode,
      targetDays: target,
      updatedAt: new Date().toISOString(),
    }
    const updated = persistPersonalData((current) => ({ ...current, goal }))
    if (updated) {
      setGoalError('')
    }
  }

  function saveReflection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (
      reflection.trigger.length > 300 ||
      reflection.thought.length > 300 ||
      reflection.alternativeThought.length > 300
    ) {
      setReflectionStatus('Keep each reflection to 300 characters or fewer.')
      return
    }

    const savedReflection = {
      ...reflection,
      updatedAt: new Date().toISOString(),
    }
    const updated = persistPersonalData((current) => ({
      ...current,
      toolReflections: {
        ...current.toolReflections,
        [selectedDate]: savedReflection,
      },
    }))
    if (updated) {
      setReflection(savedReflection)
      setReflectionStatus('Your reflection was saved on this device.')
    }
  }

  function addAlternativeActivity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const activity = activityInput.trim()
    if (!activity || activity.length > 100) {
      setActivityError('Enter an alternative activity of 1 to 100 characters.')
      return
    }
    const updated = persistPersonalData((current) => {
      const alreadyExists = current.alternativeActivities.some(
        (saved) => saved.toLocaleLowerCase() === activity.toLocaleLowerCase(),
      )
      return alreadyExists
        ? current
        : {
            ...current,
            alternativeActivities: [...current.alternativeActivities, activity],
          }
    })
    if (updated) {
      setActivityInput('')
      setActivityError('')
    }
  }

  function removeAlternativeActivity(activity: string) {
    persistPersonalData((current) => ({
      ...current,
      alternativeActivities: current.alternativeActivities.filter(
        (saved) => saved !== activity,
      ),
    }))
  }

  function saveReason(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (reasonInput.length > 500) {
      setReasonStatus('Keep this reminder to 500 characters or fewer.')
      return
    }
    const updated = persistPersonalData((current) => ({
      ...current,
      reasonsToPause: reasonInput.trim(),
    }))
    if (updated) {
      setReasonStatus('Your reminder was saved on this device.')
    }
  }

  function startTimer(mode: 'pause' | 'grounding' | 'breathing') {
    const seconds =
      mode === 'breathing'
        ? 60
        : mode === 'grounding'
          ? 90
          : Number(timerMinutes) * 60
    setTimerMessage('')
    setTimerMode(mode)
    setTimerRemaining(seconds)
  }

  function stopTimer() {
    setTimerMode(null)
    setTimerRemaining(null)
    setTimerMessage('Timer stopped.')
  }

  return (
    <div className="personal-support-module">
      <div className="local-storage-note">
        <span aria-hidden="true" className="local-storage-dot" />
        <p>
          Check-ins, goals, reflections, and personal activities are stored in
          this browser on this device. They are not sent to a LossLens server.
          Clearing browser data may remove them.
        </p>
      </div>

      {storageState === 'loading' && (
        <p aria-live="polite" className="storage-status">
          Loading personal support data…
        </p>
      )}
      {storageState === 'error' && (
        <div className="storage-error" role="alert">
          <div>
            <strong>Personal support storage is unavailable.</strong>
            <p>{storageError} Your saved personal information has not been confirmed.</p>
          </div>
          <button className="secondary-button" onClick={loadSavedData} type="button">
            Retry
          </button>
        </div>
      )}

      <section
        aria-labelledby="daily-check-in-title"
        className="support-card"
        id="daily-check-in"
      >
        <div className="module-section-heading">
          <div>
            <p className="eyebrow">Optional · private reflection</p>
            <h3 id="daily-check-in-title">Daily check-in</h3>
          </div>
          <label className="period-control">
            <span>Check-in date</span>
            <input
              max={today}
              onChange={(event) => changeSelectedDate(event.currentTarget.value)}
              type="date"
              value={selectedDate}
            />
          </label>
        </div>
        <p className="support-intro">
          A short check-in can help you reflect. You can leave any field blank,
          and you can return later to correct this date.
        </p>

        <section aria-label={`Ledger amounts for ${selectedDate}`} className="ledger-context">
          <h4>Bet records already saved for this date</h4>
          {recordState === 'loading' && <p>Loading local bet records…</p>}
          {recordState === 'error' && (
            <div role="alert">
              <p>{recordError} Check-in money is not added to bet totals.</p>
              <button
                className="text-button"
                onClick={() => void loadRecords()}
                type="button"
              >
                Retry loading bet records
              </button>
            </div>
          )}
          {recordState === 'ready' &&
            (resolvedDayRecords.unresolvedGroups.length > 0 ? (
              <p>
                Possible duplicate records for this date are awaiting review in
                True Cost. Ledger amounts are not shown here until then.
              </p>
            ) : ledgerMetrics.recordCount > 0 ? (
              <dl className="ledger-context-values">
                <div>
                  <dt>Stakes recorded</dt>
                  <dd>{formatKes(ledgerMetrics.stakedPaise)}</dd>
                </div>
                <div>
                  <dt>Returns recorded</dt>
                  <dd>{formatKes(ledgerMetrics.returnedPaise)}</dd>
                </div>
                <div>
                  <dt>Recorded net result</dt>
                  <dd>
                    {ledgerMetrics.netPaise < 0n
                      ? `Net loss ${formatKes(-ledgerMetrics.netPaise)}`
                      : ledgerMetrics.netPaise > 0n
                        ? `Net gain ${formatKes(ledgerMetrics.netPaise)}`
                        : 'Break-even'}
                  </dd>
                </div>
              </dl>
            ) : (
              <p>No non-void bet records are saved for this date.</p>
            ))}
          <p>
            These are subtotals from entered True Cost records, not verified
            complete totals. Check-in notes never add or duplicate money in
            financial totals.
          </p>
          {(dayHasUnsupportedAccounting ||
            resolvedDayRecords.unresolvedGroups.length > 0) && (
            <p className="record-completeness" role="status">
              {dayHasUnsupportedAccounting
                ? 'This date is marked as containing unsupported accounting items; the ledger values are recorded subtotals.'
                : 'Possible duplicate entries are awaiting review; the ledger values are recorded subtotals.'}
            </p>
          )}
        </section>

        <form className="support-form" onSubmit={handleCheckInSubmit}>
          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="checkin-gambled">Did you gamble on this date?</label>
              <select
                id="checkin-gambled"
                onChange={(event) =>
                  {
                    const selected = event.currentTarget.value
                    const gambled: DailyCheckIn['gambled'] =
                      selected === 'yes' || selected === 'no'
                        ? selected
                        : 'notRecorded'
                    setCheckInForm((current) => ({ ...current, gambled }))
                  }
                }
                value={checkInForm.gambled}
              >
                <option value="notRecorded">Not recorded / prefer not to say</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
              <span className="field-hint">
                Only an explicit “No” counts as a recorded gambling-free day.
              </span>
            </div>

            <div className="form-field">
              <label htmlFor="checkin-duration">Time spent gambling (minutes, if known)</label>
              <input
                id="checkin-duration"
                inputMode="numeric"
                max="1440"
                min="0"
                onChange={(event) =>
                  setCheckInForm((current) => ({
                    ...current,
                    durationMinutes: event.currentTarget.value,
                  }))
                }
                type="number"
                value={checkInForm.durationMinutes}
              />
            </div>

            <div className="form-field">
              <label htmlFor="checkin-urge">Urge level (your own rating)</label>
              <select
                id="checkin-urge"
                onChange={(event) =>
                  setCheckInForm((current) => ({
                    ...current,
                    urgeLevel: event.currentTarget.value,
                  }))
                }
                value={checkInForm.urgeLevel}
              >
                <option value="">Not recorded</option>
                {urgeLabels.map((label, index) => (
                  <option key={label} value={index}>
                    {index} — {label}
                  </option>
                ))}
              </select>
              <span className="field-hint">
                This is a personal reflection scale, not a clinical measure.
              </span>
            </div>

            <div className="form-field">
              <label htmlFor="checkin-mood">Mood (optional)</label>
              <select
                id="checkin-mood"
                onChange={(event) =>
                  setCheckInForm((current) => ({
                    ...current,
                    mood: event.currentTarget.value,
                  }))
                }
                value={checkInForm.mood}
              >
                <option value="">Not recorded</option>
                {moods.map((mood) => (
                  <option key={mood} value={mood}>
                    {mood}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <fieldset className="trigger-fieldset">
            <legend>Anything that may have been a trigger? (optional)</legend>
            <div className="choice-row trigger-choice-row">
              {triggerOptions.map((trigger) => (
                <label className="choice-option" key={trigger}>
                  <input
                    checked={checkInForm.triggers.includes(trigger)}
                    onChange={(event) =>
                      setCheckInForm((current) => ({
                        ...current,
                        triggers: event.currentTarget.checked
                          ? [...current.triggers, trigger]
                          : current.triggers.filter((item) => item !== trigger),
                      }))
                    }
                    type="checkbox"
                  />
                  <span>{trigger}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="form-field">
            <label htmlFor="checkin-note">What helped, or what felt difficult? (optional)</label>
            <textarea
              id="checkin-note"
              maxLength={500}
              onChange={(event) =>
                setCheckInForm((current) => ({
                  ...current,
                  note: event.currentTarget.value,
                }))
              }
              rows={3}
              value={checkInForm.note}
            />
            <span className="field-hint">{checkInForm.note.length}/500 characters</span>
          </div>
          {checkInError && (
            <p className="field-error" role="alert">
              {checkInError}
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
            {selectedCheckIn ? 'Update this check-in' : 'Save optional check-in'}
          </button>
        </form>
      </section>

      <section
        aria-labelledby="recovery-progress-title"
        className="support-card"
        id="recovery-progress"
      >
        <div className="section-heading">
          <div>
            <p className="eyebrow">Your choices · no score</p>
            <h3 id="recovery-progress-title">Recovery progress</h3>
          </div>
        </div>
        <p className="support-intro">
          Unrecorded dates are not treated as gambling-free. Progress is based
          only on your explicit check-ins, which you can correct at any time.
        </p>

        <div className="progress-summary-grid">
          <article className="progress-summary">
            <span>Consecutive days explicitly marked “No”</span>
            <strong>{currentProgress.days}</strong>
            <small>
              {currentProgress.todayRecordedAsGambled
                ? 'Your check-in says you gambled today. This is information, not a failure; you can continue with your chosen plan.'
                : currentProgress.asOf
                  ? `Counted through ${formatShortDate(currentProgress.asOf)}. Today is not assumed to be gambling-free.`
                  : 'No consecutive period has been recorded yet.'}
            </small>
          </article>
          <article className="progress-summary">
            <span>Personal goal</span>
            <strong>
              {personalData?.goal
                ? personalData.goal.mode === 'stop'
                  ? `Stop · ${personalData.goal.targetDays} days`
                  : `Reduce · ${personalData.goal.targetDays} days each week`
                : 'Not set'}
            </strong>
            <small>
              A goal is personal and does not indicate whether gambling is safe.
            </small>
          </article>
        </div>

        {personalData?.goal?.mode === 'stop' && (
          <div className="goal-progress">
            <label htmlFor="stop-goal-progress">
              Progress toward your consecutive-day goal
            </label>
            <progress
              id="stop-goal-progress"
              max={personalData.goal.targetDays}
              value={Math.min(currentProgress.days, personalData.goal.targetDays)}
            />
            <span>
              {Math.min(currentProgress.days, personalData.goal.targetDays)} of{' '}
              {personalData.goal.targetDays} days explicitly recorded
            </span>
          </div>
        )}
        {weeklyGoalProgress && personalData?.goal && (
          <div className="goal-progress">
            <label htmlFor="reduce-goal-progress">
              Your weekly goal progress
            </label>
            <progress
              id="reduce-goal-progress"
              max={weeklyGoalProgress.targetDays}
              value={Math.min(
                weeklyGoalProgress.freeDays,
                weeklyGoalProgress.targetDays,
              )}
            />
            <span>
              {weeklyGoalProgress.freeDays} explicitly recorded days without
              gambling toward your goal of {weeklyGoalProgress.targetDays};
              {' '}{weeklyGoalProgress.unrecordedDays} dates have no recorded
              yes/no answer.
            </span>
          </div>
        )}

        <form className="goal-form" onSubmit={handleGoalSubmit}>
          <div className="form-field">
            <label htmlFor="recovery-goal-mode">Choose a personal goal</label>
            <select
              id="recovery-goal-mode"
              onChange={(event) => {
                const mode: RecoveryGoal['mode'] =
                  event.currentTarget.value === 'reduce' ? 'reduce' : 'stop'
                setGoalMode(mode)
                setGoalTarget(mode === 'reduce' ? '3' : '7')
              }}
              value={goalMode}
            >
              <option value="stop">I want to stop gambling</option>
              <option value="reduce">I want to reduce gambling</option>
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="recovery-goal-days">
              {goalMode === 'stop'
                ? 'My consecutive-day goal'
                : 'Days without gambling I choose per week'}
            </label>
            <input
              id="recovery-goal-days"
              max={goalMode === 'reduce' ? 7 : 365}
              min="1"
              onChange={(event) => setGoalTarget(event.currentTarget.value)}
              type="number"
              value={goalTarget}
            />
          </div>
          {goalError && (
            <p className="field-error" role="alert">
              {goalError}
            </p>
          )}
          <button
            className="secondary-button"
            disabled={storageState !== 'ready'}
            type="submit"
          >
            Save personal goal
          </button>
        </form>

        <div className="historical-periods">
          <h4>Recorded gambling-free periods</h4>
          {historicalPeriods.length === 0 ? (
            <p>No explicitly recorded gambling-free days yet.</p>
          ) : (
            <ul>
              {historicalPeriods.slice(0, 5).map((period) => (
                <li key={`${period.start}:${period.end}`}>
                  {formatShortDate(period.start)}
                  {period.start !== period.end && ` to ${formatShortDate(period.end)}`}
                  {' · '}{period.days} {period.days === 1 ? 'day' : 'days'} explicitly marked “No”
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="recent-checkins">
          <h4>Recent check-ins</h4>
          {recentCheckIns.length === 0 ? (
            <p>Your saved check-ins will appear here.</p>
          ) : (
            <ul>
              {recentCheckIns.map((entry) => (
                <li key={entry.date}>
                  <div>
                    <strong>{formatShortDate(entry.date)}</strong>
                    <span>
                      {entry.gambled === 'yes'
                        ? 'Gambled'
                        : entry.gambled === 'no'
                          ? 'Marked no gambling'
                          : 'Gambling not recorded'}
                      {entry.urgeLevel !== null &&
                        ` · urge ${urgeLabels[entry.urgeLevel].toLowerCase()}`}
                      {entry.mood && ` · ${entry.mood.toLowerCase()}`}
                    </span>
                  </div>
                  <button
                    className="text-button"
                    onClick={() => changeSelectedDate(entry.date)}
                    type="button"
                  >
                    Edit
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section
        aria-labelledby="urge-tools-title"
        className="support-card"
        id="urge-tools"
      >
        <div className="section-heading">
          <div>
            <p className="eyebrow">Available without AI</p>
            <h3 id="urge-tools-title">Tools for a difficult moment</h3>
          </div>
        </div>
        <p className="support-intro">
          These are optional reflection and pause tools. They are not
          treatment, and you can stop any exercise whenever you want.
        </p>

        <div className="tool-grid">
          <article className="tool-card">
            <h4>Pause timer</h4>
            <p>Choose a short pause before deciding what you want to do next.</p>
            <label className="form-field" htmlFor="pause-duration">
              <span>Timer length</span>
              <select
                disabled={timerRemaining !== null}
                id="pause-duration"
                onChange={(event) => setTimerMinutes(event.currentTarget.value)}
                value={timerMinutes}
              >
                <option value="1">1 minute</option>
                <option value="3">3 minutes</option>
                <option value="5">5 minutes</option>
              </select>
            </label>
            {timerMode === 'pause' && timerRemaining !== null ? (
              <div className="timer-running">
                <strong aria-label={`${timerRemaining} seconds remaining`}>
                  {formatTimer(timerRemaining)}
                </strong>
                <button className="secondary-button" onClick={stopTimer} type="button">
                  Stop timer
                </button>
              </div>
            ) : (
              <button
                className="secondary-button"
                disabled={timerRemaining !== null}
                onClick={() => startTimer('pause')}
                type="button"
              >
                Start pause
              </button>
            )}
          </article>

          <article className="tool-card">
            <h4>Grounding exercise</h4>
            <p>
              Notice five things you can see, four you can feel, three you can
              hear, two you can smell, and one you can taste.
            </p>
            {timerMode === 'grounding' && timerRemaining !== null ? (
              <div className="timer-running">
                <strong>{formatTimer(timerRemaining)}</strong>
                <button className="secondary-button" onClick={stopTimer} type="button">
                  Stop exercise
                </button>
              </div>
            ) : (
              <button
                className="secondary-button"
                disabled={timerRemaining !== null}
                onClick={() => startTimer('grounding')}
                type="button"
              >
                Start optional timer
              </button>
            )}
          </article>

          <article className="tool-card">
            <h4>Comfortable breathing pause</h4>
            <p>
              Breathe at a comfortable pace for a short moment. There is no
              required pattern; stop if it feels uncomfortable.
            </p>
            {timerMode === 'breathing' && timerRemaining !== null ? (
              <div className="timer-running">
                <strong>{formatTimer(timerRemaining)}</strong>
                <button className="secondary-button" onClick={stopTimer} type="button">
                  Stop pause
                </button>
              </div>
            ) : (
              <button
                className="secondary-button"
                disabled={timerRemaining !== null}
                onClick={() => startTimer('breathing')}
                type="button"
              >
                Start 1-minute pause
              </button>
            )}
          </article>
        </div>
        {timerMessage && (
          <p aria-live="polite" className="form-status">
            {timerMessage}
          </p>
        )}
        {timerRemaining !== null && (
          <p aria-live="off" className="timer-status">
            {timerMode === 'pause'
              ? 'Pause timer running.'
              : timerMode === 'grounding'
                ? 'Grounding exercise timer running.'
                : 'Breathing pause timer running.'}
          </p>
        )}

        <form className="reflection-form" onSubmit={saveReflection}>
          <h4>Notice a trigger and reflect on a thought</h4>
          <div className="form-field">
            <label htmlFor="trigger-reflection">What was happening before the urge or difficult moment?</label>
            <textarea
              id="trigger-reflection"
              maxLength={300}
              onChange={(event) =>
                setReflection((current) => ({
                  ...current,
                  trigger: event.currentTarget.value,
                }))
              }
              rows={2}
              value={reflection.trigger}
            />
          </div>
          <div className="form-field">
            <label htmlFor="thought-reflection">What thought is on your mind?</label>
            <textarea
              id="thought-reflection"
              maxLength={300}
              onChange={(event) =>
                setReflection((current) => ({
                  ...current,
                  thought: event.currentTarget.value,
                }))
              }
              rows={2}
              value={reflection.thought}
            />
          </div>
          <div className="form-field">
            <label htmlFor="alternative-thought">
              What is another way to look at the situation, if any?
            </label>
            <textarea
              id="alternative-thought"
              maxLength={300}
              onChange={(event) =>
                setReflection((current) => ({
                  ...current,
                  alternativeThought: event.currentTarget.value,
                }))
              }
              rows={2}
              value={reflection.alternativeThought}
            />
          </div>
          {reflectionStatus && (
            <p aria-live="polite" className="form-status">
              {reflectionStatus}
            </p>
          )}
          <button
            className="secondary-button"
            disabled={storageState !== 'ready'}
            type="submit"
          >
            Save reflection for {formatShortDate(selectedDate)}
          </button>
        </form>

        <div className="personal-options">
          <section>
            <h4>Alternative activities you choose</h4>
            <form className="inline-add-form" onSubmit={addAlternativeActivity}>
              <label className="visually-hidden" htmlFor="alternative-activity">
                Add an alternative activity
              </label>
              <input
                id="alternative-activity"
                maxLength={100}
                onChange={(event) => setActivityInput(event.currentTarget.value)}
                placeholder="Add a walk, call, or another activity"
                value={activityInput}
              />
              <button
                className="secondary-button"
                disabled={storageState !== 'ready'}
                type="submit"
              >
                Add activity
              </button>
            </form>
            {activityError && (
              <p className="field-error" role="alert">
                {activityError}
              </p>
            )}
            {(personalData?.alternativeActivities.length ?? 0) > 0 ? (
              <ul className="personal-list">
                {personalData?.alternativeActivities.map((activity) => (
                  <li key={activity}>
                    <span>{activity}</span>
                    <button
                      aria-label={`Remove ${activity}`}
                      className="text-button"
                      onClick={() => removeAlternativeActivity(activity)}
                      type="button"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p>You have not added any activities.</p>
            )}
          </section>

          <section>
            <h4>Your own reasons to pause or change</h4>
            <form className="form-field" onSubmit={saveReason}>
              <label className="visually-hidden" htmlFor="reasons-to-pause">
                Personal reminder
              </label>
              <textarea
                id="reasons-to-pause"
                maxLength={500}
                onChange={(event) => setReasonInput(event.currentTarget.value)}
                rows={3}
                value={reasonInput}
              />
              <span className="field-hint">{reasonInput.length}/500 characters</span>
              {reasonStatus && (
                <p aria-live="polite" className="form-status">
                  {reasonStatus}
                </p>
              )}
              <button
                className="secondary-button"
                disabled={storageState !== 'ready'}
                type="submit"
              >
                Save personal reminder
              </button>
            </form>
            {personalData?.reasonsToPause && (
              <p className="personal-reminder">
                Your reminder: {personalData.reasonsToPause}
              </p>
            )}
          </section>
        </div>

        <p className="trusted-person-note">
          If you want another person alongside you, consider contacting
          someone you trust using your own contact method. This preview does
          not provide unverified service numbers.
        </p>
      </section>
    </div>
  )
}

export default PersonalSupportModule
