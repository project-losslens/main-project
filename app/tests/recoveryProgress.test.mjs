import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getCurrentGamblingFreeProgress,
  getHistoricalGamblingFreePeriods,
  getWeeklyReductionProgress,
} from '../src/lib/recoveryProgress.ts'

function checkIn(date, gambled) {
  return {
    date,
    gambled,
    durationMinutes: null,
    urgeLevel: null,
    mood: '',
    triggers: [],
    note: '',
    updatedAt: `${date}T12:00:00.000Z`,
  }
}

const reduceGoal = {
  mode: 'reduce',
  targetDays: 3,
  updatedAt: '2026-10-29T12:00:00.000Z',
}

test('unrecorded days are not classified as gambling-free', () => {
  const checkIns = {
    '2026-10-27': checkIn('2026-10-27', 'no'),
    '2026-10-29': checkIn('2026-10-29', 'no'),
  }

  assert.equal(getCurrentGamblingFreeProgress(checkIns, '2026-10-29').days, 1)
  assert.deepEqual(
    getWeeklyReductionProgress(checkIns, '2026-10-29', reduceGoal),
    {
      freeDays: 2,
      knownDays: 2,
      unrecordedDays: 5,
      targetDays: 3,
    },
  )
})

test('correcting a daily record updates current and historical progress', () => {
  const checkIns = {
    '2026-10-27': checkIn('2026-10-27', 'no'),
    '2026-10-28': checkIn('2026-10-28', 'no'),
    '2026-10-29': checkIn('2026-10-29', 'no'),
  }
  assert.equal(getCurrentGamblingFreeProgress(checkIns, '2026-10-29').days, 3)

  checkIns['2026-10-28'] = checkIn('2026-10-28', 'yes')

  assert.equal(getCurrentGamblingFreeProgress(checkIns, '2026-10-29').days, 1)
  assert.deepEqual(
    getHistoricalGamblingFreePeriods(checkIns, '2026-10-29'),
    [
      { start: '2026-10-29', end: '2026-10-29', days: 1 },
      { start: '2026-10-27', end: '2026-10-27', days: 1 },
    ],
  )
})

test('an explicitly recorded gambling day ends a current run without shaming', () => {
  const checkIns = {
    '2026-10-28': checkIn('2026-10-28', 'no'),
    '2026-10-29': checkIn('2026-10-29', 'yes'),
  }

  assert.deepEqual(getCurrentGamblingFreeProgress(checkIns, '2026-10-29'), {
    days: 0,
    asOf: '2026-10-29',
    todayRecordedAsGambled: true,
  })
})
