import type { DailyCheckIn, RecoveryGoal } from './personalData.ts'

export type GamblingFreeProgress = {
  days: number
  asOf: string | null
  todayRecordedAsGambled: boolean
}

export type GamblingFreePeriod = {
  start: string
  end: string
  days: number
}

export type WeeklyReductionProgress = {
  freeDays: number
  knownDays: number
  unrecordedDays: number
  targetDays: number
}

function shiftDate(dateValue: string, days: number): string {
  const date = new Date(`${dateValue}T00:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

export function getCurrentGamblingFreeProgress(
  checkIns: Record<string, DailyCheckIn>,
  today: string,
): GamblingFreeProgress {
  if (checkIns[today]?.gambled === 'yes') {
    return { days: 0, asOf: today, todayRecordedAsGambled: true }
  }

  let cursor = checkIns[today]?.gambled === 'no' ? today : shiftDate(today, -1)
  let days = 0
  let asOf: string | null = null

  while (checkIns[cursor]?.gambled === 'no') {
    days += 1
    asOf ??= cursor
    cursor = shiftDate(cursor, -1)
  }

  return { days, asOf, todayRecordedAsGambled: false }
}

export function getHistoricalGamblingFreePeriods(
  checkIns: Record<string, DailyCheckIn>,
  today: string,
): GamblingFreePeriod[] {
  const freeDates = Object.values(checkIns)
    .filter((entry) => entry.gambled === 'no' && entry.date <= today)
    .map((entry) => entry.date)
    .sort()

  if (freeDates.length === 0) {
    return []
  }

  const periods: GamblingFreePeriod[] = []
  let start = freeDates[0]
  let end = freeDates[0]
  let days = 1

  for (const date of freeDates.slice(1)) {
    if (date === shiftDate(end, 1)) {
      end = date
      days += 1
      continue
    }

    periods.push({ start, end, days })
    start = date
    end = date
    days = 1
  }

  periods.push({ start, end, days })
  return periods.reverse()
}

export function getWeeklyReductionProgress(
  checkIns: Record<string, DailyCheckIn>,
  today: string,
  goal: RecoveryGoal,
): WeeklyReductionProgress {
  const start = shiftDate(today, -6)
  let freeDays = 0
  let knownDays = 0

  for (let offset = 0; offset < 7; offset += 1) {
    const date = shiftDate(start, offset)
    const status = checkIns[date]?.gambled
    if (status === 'no') {
      freeDays += 1
      knownDays += 1
    } else if (status === 'yes') {
      knownDays += 1
    }
  }

  return {
    freeDays,
    knownDays,
    unrecordedDays: 7 - knownDays,
    targetDays: goal.targetDays,
  }
}

