import { isDiaryEntry, type DiaryEntry } from './personalData.ts'

export type CloudDiaryRow = Record<string, unknown>

function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false
  }
  const date = new Date(`${value}T00:00:00.000Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}

export function diaryEntryToCloudRow(entry: DiaryEntry): CloudDiaryRow {
  if (!isCalendarDate(entry.date)) {
    throw new Error('A diary entry has an invalid date.')
  }
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      entry.id,
    )
  ) {
    throw new Error('A diary entry has an invalid record ID.')
  }

  const occurredAt = `${entry.date}T12:00:00.000Z`
  return {
    id: entry.id,
    occurred_at: occurredAt,
    mood: entry.mood,
    triggers: entry.triggers,
    coping_strategies: entry.copingStrategies,
    note: entry.note,
    updated_at: entry.updatedAt,
  }
}

export function diaryEntryFromCloudRow(row: CloudDiaryRow): DiaryEntry {
  if (
    typeof row.id !== 'string' ||
    typeof row.occurred_at !== 'string' ||
    !isCalendarDate(row.occurred_at.slice(0, 10)) ||
    typeof row.mood !== 'string' ||
    !Array.isArray(row.triggers) ||
    !row.triggers.every((item) => typeof item === 'string') ||
    !Array.isArray(row.coping_strategies) ||
    !row.coping_strategies.every((item) => typeof item === 'string') ||
    typeof row.note !== 'string' ||
    typeof row.updated_at !== 'string'
  ) {
    throw new Error('A cloud diary entry has an unexpected format.')
  }

  const entry = {
    id: row.id,
    date: row.occurred_at.slice(0, 10),
    mood: row.mood,
    triggers: row.triggers,
    copingStrategies: row.coping_strategies,
    note: row.note,
    updatedAt: row.updated_at,
  }
  if (!isDiaryEntry(entry)) {
    throw new Error('A cloud diary entry has an unexpected format.')
  }
  return entry
}
