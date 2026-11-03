import type { MonthlyReflection } from './personalData.ts'

export type CloudMonthlyReflectionRow = Record<string, unknown>

export function monthlyReflectionFromCloudRow(
  row: CloudMonthlyReflectionRow,
): MonthlyReflection {
  if (
    typeof row.month_start !== 'string' ||
    !/^\d{4}-\d{2}-01$/.test(row.month_start) ||
    typeof row.achievements !== 'string' ||
    typeof row.difficulties !== 'string' ||
    typeof row.lessons !== 'string' ||
    typeof row.future_intentions !== 'string' ||
    typeof row.updated_at !== 'string'
  ) {
    throw new Error('A cloud monthly reflection has an unexpected format.')
  }

  const date = new Date(`${row.month_start}T00:00:00.000Z`)
  if (
    !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 10) !== row.month_start
  ) {
    throw new Error('A cloud monthly reflection has an invalid month.')
  }

  return {
    monthStart: row.month_start,
    achievements: row.achievements,
    difficulties: row.difficulties,
    lessons: row.lessons,
    futureIntention: row.future_intentions,
    updatedAt: row.updated_at,
  }
}

export function monthlyReflectionToCloudRow(
  reflection: MonthlyReflection,
): CloudMonthlyReflectionRow {
  return {
    month_start: reflection.monthStart,
    achievements: reflection.achievements,
    difficulties: reflection.difficulties,
    lessons: reflection.lessons,
    future_intentions: reflection.futureIntention,
    updated_at: reflection.updatedAt,
  }
}
