import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import {
  monthlyReflectionFromCloudRow,
  monthlyReflectionToCloudRow,
} from '../src/lib/monthlyReflectionData.ts'

const reflection = {
  monthStart: '2026-10-01',
  achievements: 'Paused when I needed space.',
  difficulties: 'Stressful days.',
  lessons: 'Taking a walk helped.',
  futureIntention: 'Remember to ask for support.',
  updatedAt: '2026-11-02T18:00:00.000Z',
}

test('monthly reflection maps to monthly_reviews fields and round-trips', () => {
  const row = monthlyReflectionToCloudRow(reflection)
  assert.deepEqual(
    monthlyReflectionFromCloudRow(row),
    reflection,
  )
})

test('monthly reflection rejects invalid month values', () => {
  assert.throws(
    () => monthlyReflectionFromCloudRow({
      ...monthlyReflectionToCloudRow(reflection),
      month_start: '2026-02-31',
    }),
    /unexpected format|invalid month/i,
  )
})

test('monthly reflection mapper columns exist in the proposed SQL table', async () => {
  const sql = await readFile(
    new URL(
      '../../supabase/migrations/20261030000000_losslens_personal_data.sql',
      import.meta.url,
    ),
    'utf8',
  )
  const table = sql.match(
    /create table if not exists public\.monthly_reviews \(([\s\S]*?)\n\);/i,
  )?.[1]
  assert.ok(table, 'monthly_reviews table should exist in the migration')
  const columns = new Set(
    [...table.matchAll(/^\s{2}([a-z_]+)\s+/gm)].map((match) => match[1]),
  )
  assert.deepEqual(
    Object.keys(monthlyReflectionToCloudRow(reflection)).filter(
      (column) => !columns.has(column),
    ),
    [],
  )
})
