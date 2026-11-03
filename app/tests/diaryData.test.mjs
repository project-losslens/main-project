import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import {
  diaryEntryFromCloudRow,
  diaryEntryToCloudRow,
} from '../src/lib/diaryData.ts'

const entry = {
  id: 'a52ce35c-e7f0-47b2-90ca-8b82f619ca53',
  date: '2026-11-02',
  mood: 'Hopeful',
  triggers: ['Stress'],
  copingStrategies: ['Stepped away'],
  note: 'Took a pause and wrote down what I noticed.',
  updatedAt: '2026-11-02T18:00:00.000Z',
}

test('diary cloud mapping preserves IDs, dates, reflection and optional lists', () => {
  const row = diaryEntryToCloudRow(entry)
  assert.equal(row.id, entry.id)
  assert.equal(row.occurred_at, '2026-11-02T12:00:00.000Z')
  assert.equal(row.note, entry.note)
  assert.deepEqual(row.triggers, entry.triggers)
  assert.deepEqual(row.coping_strategies, entry.copingStrategies)
  assert.equal('stake_paise' in row, false)
  assert.equal('returned_paise' in row, false)
  assert.deepEqual(
    diaryEntryFromCloudRow({
      ...row,
      updated_at: entry.updatedAt,
    }),
    entry,
  )
})

test('diary mapping rejects invalid dates and malformed cloud rows', () => {
  assert.throws(
    () => diaryEntryToCloudRow({ ...entry, date: '2026-02-31' }),
    /invalid date/i,
  )
  assert.throws(
    () => diaryEntryFromCloudRow({ ...diaryEntryToCloudRow(entry), note: 123 }),
    /unexpected format/i,
  )
  assert.throws(
    () => diaryEntryToCloudRow({ ...entry, id: 'diary-1' }),
    /record id/i,
  )
})

test('every diary mapper column exists in the proposed SQL table', async () => {
  const sql = await readFile(
    new URL(
      '../../supabase/migrations/20261030000000_losslens_personal_data.sql',
      import.meta.url,
    ),
    'utf8',
  )
  const table = sql.match(
    /create table if not exists public\.diary_entries \(([\s\S]*?)\n\);/i,
  )?.[1]
  assert.ok(table, 'diary_entries table should exist in the migration')
  const columns = new Set(
    [...table.matchAll(/^\s{2}([a-z_]+)\s+/gm)].map((match) => match[1]),
  )
  const rowColumns = Object.keys(diaryEntryToCloudRow(entry))
  assert.deepEqual(
    rowColumns.filter((column) => !columns.has(column)),
    [],
  )
})
