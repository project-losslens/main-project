import { getRangeStart, type BetRecord, type Period } from './trueCost.ts'

export type DuplicateDecision =
  | { kind: 'separate' }
  | { kind: 'single'; recordId: string }

export type DuplicateGroup = {
  key: string
  records: BetRecord[]
  decision?: DuplicateDecision
}

export type ResolvedRecords = {
  includedRecords: BetRecord[]
  unresolvedGroups: DuplicateGroup[]
  reviewedGroups: DuplicateGroup[]
}

export type ReportingRange = {
  key: string
  start: string
  end: string
  label: string
}

export type FinancialMetrics = {
  recordCount: number
  stakedPaise: bigint
  returnedPaise: bigint
  netPaise: bigint
  lossPaise: bigint
  wageringIntensityBasisPoints: bigint | null
  incomeExposureBasisPoints: bigint | null
  budgetExposureBasisPoints: bigint | null
  budgetRemainingPaise: bigint | null
}

export type FinancialCalculationOptions = {
  incompletePeriod?: boolean
}

export type PeriodAccountingStatus =
  | 'notReviewed'
  | 'noKnownUnsupportedItems'
  | 'hasUnsupportedItems'

export function shouldWithholdComparisons(
  reviewed: boolean,
  accountingStatus: PeriodAccountingStatus | undefined,
  hasUnresolvedDuplicates: boolean,
): boolean {
  return (
    !reviewed ||
    accountingStatus !== 'noKnownUnsupportedItems' ||
    hasUnresolvedDuplicates
  )
}

export function getReportingRange(
  period: Period,
  today: string,
  records: BetRecord[],
): ReportingRange {
  let start = today

  if (period === 'all') {
    const earliest = records
      .filter((record) => record.placedDate <= today)
      .map((record) => record.placedDate)
      .sort()[0]
    start = earliest ?? today
  } else {
    start = getRangeStart(period, today) ?? today
  }

  const periodLabel: Record<Period, string> = {
    today: 'Today so far',
    week: 'This week to date',
    month: 'This month to date',
    '7': 'Last 7 calendar days',
    '30': 'Last 30 calendar days',
    '90': 'Last 90 calendar days',
    all: 'All recorded dates',
  }

  return {
    key: `${start}:${today}`,
    start,
    end: today,
    label: `${periodLabel[period]} · ${start} to ${today} (EAT)`,
  }
}

export function getDuplicateGroupKey(record: BetRecord): string {
  return JSON.stringify([
    record.placedDate,
    record.bookmaker.trim().toLocaleLowerCase(),
    record.betType,
    record.legs,
    record.oddsTaken,
    record.stakePaise.toString(),
    record.result,
    record.returnedPaise.toString(),
  ])
}

export function resolvePossibleDuplicates(
  records: BetRecord[],
  decisions: Record<string, DuplicateDecision>,
): ResolvedRecords {
  const groups = new Map<string, BetRecord[]>()
  const standaloneRecords: BetRecord[] = []

  for (const record of records) {
    if (record.result === 'void') {
      standaloneRecords.push(record)
      continue
    }

    const key = getDuplicateGroupKey(record)
    const group = groups.get(key)
    if (group) {
      group.push(record)
    } else {
      groups.set(key, [record])
    }
  }

  const includedRecords = [...standaloneRecords]
  const unresolvedGroups: DuplicateGroup[] = []
  const reviewedGroups: DuplicateGroup[] = []

  for (const [key, groupRecords] of groups) {
    if (groupRecords.length < 2) {
      includedRecords.push(...groupRecords)
      continue
    }

    const decision = decisions[key]
    const group = { key, records: groupRecords, decision }

    if (decision?.kind === 'separate') {
      includedRecords.push(...groupRecords)
      reviewedGroups.push(group)
    } else if (
      decision?.kind === 'single' &&
      groupRecords.some((record) => record.id === decision.recordId)
    ) {
      const selectedRecord = groupRecords.find(
        (record) => record.id === decision.recordId,
      )
      if (selectedRecord) {
        includedRecords.push(selectedRecord)
      }
      reviewedGroups.push(group)
    } else {
      unresolvedGroups.push(group)
    }
  }

  return { includedRecords, unresolvedGroups, reviewedGroups }
}

export function calculateFinancialMetrics(
  records: BetRecord[],
  incomePaise: bigint | null,
  lossBudgetPaise: bigint | null,
  options: FinancialCalculationOptions = {},
): FinancialMetrics {
  const confirmedRecords = records.filter((record) => record.result !== 'void')
  const stakedPaise = confirmedRecords.reduce(
    (total, record) => total + record.stakePaise,
    0n,
  )
  const returnedPaise = confirmedRecords.reduce(
    (total, record) => total + record.returnedPaise,
    0n,
  )
  const netPaise = returnedPaise - stakedPaise
  const lossPaise = netPaise < 0n ? -netPaise : 0n
  const validIncome =
    !options.incompletePeriod && incomePaise !== null && incomePaise > 0n
  const validBudget =
    !options.incompletePeriod && lossBudgetPaise !== null && lossBudgetPaise > 0n

  return {
    recordCount: confirmedRecords.length,
    stakedPaise,
    returnedPaise,
    netPaise,
    lossPaise,
    wageringIntensityBasisPoints: validIncome
      ? percentageBasisPoints(stakedPaise, incomePaise)
      : null,
    incomeExposureBasisPoints: validIncome
      ? percentageBasisPoints(lossPaise, incomePaise)
      : null,
    budgetExposureBasisPoints: validBudget
      ? percentageBasisPoints(lossPaise, lossBudgetPaise)
      : null,
    budgetRemainingPaise:
      options.incompletePeriod || lossBudgetPaise === null
        ? null
        : lossBudgetPaise - lossPaise,
  }
}

export function percentageBasisPoints(
  numerator: bigint,
  denominator: bigint,
): bigint | null {
  if (denominator <= 0n || numerator < 0n) {
    return null
  }

  return (numerator * 10_000n + denominator / 2n) / denominator
}

export function formatPercent(basisPoints: bigint | null): string {
  if (basisPoints === null) {
    return 'Unavailable'
  }

  const whole = basisPoints / 100n
  const fraction = (basisPoints % 100n).toString().padStart(2, '0')
  return basisPoints % 100n === 0n
    ? `${whole}%`
    : `${whole}.${fraction.replace(/0$/, '')}%`
}

export function getPeriodDescription(
  period: Period,
  range: ReportingRange,
): string {
  if (period === 'week' || period === 'month') {
    return `${range.label}. This is a partial period so far.`
  }

  if (period === 'today') {
    return `${range.label}. Today's records may still change.`
  }

  return range.label
}
