import { useEffect, useMemo, useState } from 'react'
import { getAllBets } from '../lib/betDatabase'
import {
  calculateFinancialMetrics,
  formatPercent,
  getReportingRange,
  resolvePossibleDuplicates,
  shouldWithholdComparisons,
} from '../lib/financialMetrics'
import {
  getCurrentGamblingFreeProgress,
} from '../lib/recoveryProgress'
import {
  loadPersonalData,
  parseStoredPaise,
  type PersonalData,
} from '../lib/personalData'
import {
  formatKes,
  getTodayInNairobi,
  type BetRecord,
} from '../lib/trueCost'

type Props = {
  onNavigate: (view: 'true-cost' | 'recovery' | 'support') => void
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Local data could not be loaded.'
}

function HomeDashboard({ onNavigate }: Props) {
  const today = getTodayInNairobi()
  const [records, setRecords] = useState<BetRecord[]>([])
  const [personalData, setPersonalData] = useState<PersonalData | null>(null)
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  )
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    let active = true
    Promise.resolve()
      .then(() => Promise.all([getAllBets(), loadPersonalData()]))
      .then(([loadedRecords, loadedPersonalData]) => {
        if (active) {
          setRecords(loadedRecords)
          setPersonalData(loadedPersonalData)
          setLoadState('ready')
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setLoadError(getErrorMessage(error))
          setLoadState('error')
        }
      })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    function reloadPersonalData() {
      try {
        setPersonalData(loadPersonalData())
      } catch (error) {
        setLoadError(getErrorMessage(error))
        setLoadState('error')
      }
    }

    window.addEventListener(
      'losslens:personal-data-updated',
      reloadPersonalData,
    )
    return () =>
      window.removeEventListener(
        'losslens:personal-data-updated',
        reloadPersonalData,
      )
  }, [])

  const range = getReportingRange('today', today, records)
  const todayRecords = useMemo(
    () => records.filter((record) => record.placedDate === today),
    [records, today],
  )
  const resolvedToday = resolvePossibleDuplicates(
    todayRecords,
    personalData?.duplicateDecisions ?? {},
  )
  const setting =
    personalData?.financialSettings[range.key] ??
    personalData?.financialSettings[`${today}:${today}`]
  const incompletePeriod = shouldWithholdComparisons(
    setting?.reviewed ?? false,
    setting?.accountingStatus,
    resolvedToday.unresolvedGroups.length > 0,
  )
  const metrics = calculateFinancialMetrics(
    resolvedToday.includedRecords,
    parseStoredPaise(setting?.incomePaise ?? null),
    parseStoredPaise(setting?.lossBudgetPaise ?? null),
    { incompletePeriod },
  )
  const progress = getCurrentGamblingFreeProgress(
    personalData?.checkIns ?? {},
    today,
  )
  const todayCheckIn = personalData?.checkIns[today]

  return (
    <div className="home-dashboard">
      {loadState === 'loading' && (
        <p aria-live="polite" className="storage-status">
          Loading today's local summary…
        </p>
      )}
      {loadState === 'error' && (
        <p className="storage-error" role="alert">
          {loadError} Some Home summaries may be unavailable.
        </p>
      )}

      <section aria-labelledby="home-today-title" className="home-summary-panel">
        <div className="home-summary-heading">
          <div>
            <p className="eyebrow">Today · {today} (EAT)</p>
            <h2 id="home-today-title">A small check-in with today</h2>
            <p>
              Your summary uses records saved on this device. No unrecorded
              activity is assumed.
            </p>
          </div>
          <button
            className="primary-button"
            onClick={() => onNavigate('true-cost')}
            type="button"
          >
            Open True Cost
          </button>
        </div>

        {loadState === 'ready' && (
          <>
            <div className="home-summary-values" aria-live="polite">
              <article>
                <span>Stakes recorded</span>
                <strong>
                  {metrics.recordCount > 0
                    ? formatKes(metrics.stakedPaise)
                    : 'No recorded entries'}
                </strong>
              </article>
              <article>
                <span>Returns recorded</span>
                <strong>
                  {metrics.recordCount > 0
                    ? formatKes(metrics.returnedPaise)
                    : '—'}
                </strong>
              </article>
              <article>
                <span>Recorded net result</span>
                <strong>
                  {resolvedToday.unresolvedGroups.length > 0
                    ? 'Awaiting duplicate review'
                    : metrics.recordCount === 0
                      ? 'No recorded result'
                      : metrics.netPaise < 0n
                        ? `Net loss ${formatKes(-metrics.netPaise)}`
                        : metrics.netPaise > 0n
                          ? `Net gain ${formatKes(metrics.netPaise)}`
                          : 'Break-even'}
                </strong>
                <small>
                  Returns minus stakes for included, non-void entries. This
                  subtotal is not a prediction or verified complete total.
                </small>
              </article>
            </div>
            {incompletePeriod && (
              <p className="record-completeness" role="status">
                {setting?.accountingStatus === 'hasUnsupportedItems'
                  ? 'You marked today as containing unsupported accounting items. The financial figures are recorded subtotals; ratios are withheld.'
                  : resolvedToday.unresolvedGroups.length > 0
                    ? 'Possible duplicate entries are awaiting review. The financial figures are recorded subtotals; ratios are withheld.'
                  : setting?.accountingStatus !== 'noKnownUnsupportedItems'
                    ? 'Accounting status for today is not confirmed. The financial figures are recorded subtotals; ratios are withheld.'
                    : 'Today’s records have not been marked as reviewed. The financial figures are recorded subtotals; ratios are withheld.'}
              </p>
            )}
            {metrics.recordCount > 0 && (
              <p className="home-exposure-note">
                Daily wagering intensity:{' '}
                {formatPercent(metrics.wageringIntensityBasisPoints)}
                {' · '}daily net-loss exposure:{' '}
                {formatPercent(metrics.incomeExposureBasisPoints)}
                {' · '}personal loss-budget usage:{' '}
                {formatPercent(metrics.budgetExposureBasisPoints)}
                {metrics.budgetRemainingPaise === null
                  ? '.'
                  : metrics.budgetRemainingPaise < 0n
                    ? ` · loss limit exceeded by ${formatKes(-metrics.budgetRemainingPaise)}.`
                    : ` · loss limit remaining ${formatKes(metrics.budgetRemainingPaise)}.`}{' '}
                {incompletePeriod
                  ? 'Percentages and the remaining loss limit are withheld because this period is incomplete.'
                  : 'An unavailable measure needs a positive amount entered for this exact date. Percentages are descriptive, not risk scores.'}
              </p>
            )}
          </>
        )}
      </section>

      <section aria-labelledby="home-recovery-title" className="home-recovery-panel">
        <div>
          <p className="eyebrow">Your plan · no combined score</p>
          <h2 id="home-recovery-title">Recovery, at your pace</h2>
          <p>
            {personalData?.goal
              ? personalData.goal.mode === 'stop'
                ? `Your current goal is to stop gambling. ${progress.days} consecutive day${progress.days === 1 ? '' : 's'} have been explicitly recorded as gambling-free.`
                : `Your current goal is to reduce gambling, with a personal target of ${personalData.goal.targetDays} days without gambling each week.`
              : 'You have not chosen a recovery goal yet. You can set one, including a goal to reduce or stop.'}
          </p>
          <p className="home-checkin-status">
            Today's check-in:{' '}
            {todayCheckIn
              ? todayCheckIn.gambled === 'yes'
                ? 'you recorded gambling today. This is information, not a failure.'
                : todayCheckIn.gambled === 'no'
                  ? 'you explicitly marked no gambling today.'
                  : 'saved, with gambling not recorded.'
              : 'not recorded. An unrecorded day is not counted as gambling-free.'}
          </p>
        </div>
        <button
          className="secondary-button"
          onClick={() => onNavigate('recovery')}
          type="button"
        >
          {todayCheckIn ? 'Open My Recovery' : 'Make an optional check-in'}
        </button>
      </section>

      <div className="home-next-step">
        <div>
          <p className="eyebrow">A useful next step</p>
          <h2>Choose what would help right now</h2>
          <p>
            Review an actual result, record a brief reflection, or open a
            self-guided support exercise. No step is required.
          </p>
        </div>
        <div className="home-actions">
          <button
            className="secondary-button"
            onClick={() => onNavigate('recovery')}
            type="button"
          >
            Open a reflection tool
          </button>
          <button
            className="text-button"
            onClick={() => onNavigate('support')}
            type="button"
          >
            View Get Support
          </button>
        </div>
      </div>
    </div>
  )
}

export default HomeDashboard
