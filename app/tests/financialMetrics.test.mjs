import assert from 'node:assert/strict'
import test from 'node:test'
import {
  calculateFinancialMetrics,
  formatPercent,
  getPeriodDescription,
  getReportingRange,
  resolvePossibleDuplicates,
  shouldWithholdComparisons,
} from '../src/lib/financialMetrics.ts'

function bet(
  id,
  stakePaise,
  returnedPaise,
  result = 'lost',
  placedDate = '2026-10-29',
) {
  return {
    id,
    placedDate,
    bookmaker: 'Example',
    betType: 'single',
    legs: 1,
    oddsTaken: 2,
    stakePaise,
    result,
    returnedPaise,
    marketFamily: 'notSure',
    note: '',
    inputRoute: 'manual',
    createdAt: `2026-10-29T10:00:0${id.length}.000Z`,
    updatedAt: `2026-10-29T10:00:0${id.length}.000Z`,
  }
}

test('calculates recorded net loss and gain from stakes and returns', () => {
  const loss = calculateFinancialMetrics([bet('loss', 200_000n, 60_000n)], null, null)
  const gain = calculateFinancialMetrics([bet('gain', 100_000n, 150_000n, 'won')], null, null)

  assert.equal(loss.netPaise, -140_000n)
  assert.equal(loss.lossPaise, 140_000n)
  assert.equal(gain.netPaise, 50_000n)
  assert.equal(gain.lossPaise, 0n)
})

test('break-even and net gains have zero recorded loss exposure', () => {
  const breakEven = calculateFinancialMetrics(
    [bet('even', 100_000n, 100_000n)],
    200_000n,
    50_000n,
  )
  const gain = calculateFinancialMetrics(
    [bet('gain', 100_000n, 150_000n, 'won')],
    200_000n,
    50_000n,
  )

  for (const metrics of [breakEven, gain]) {
    assert.equal(metrics.lossPaise, 0n)
    assert.equal(formatPercent(metrics.incomeExposureBasisPoints), '0%')
    assert.equal(formatPercent(metrics.budgetExposureBasisPoints), '0%')
    assert.equal(metrics.budgetRemainingPaise, 50_000n)
  }
})

test('calculates income and budget exposure from matched positive denominators', () => {
  const metrics = calculateFinancialMetrics(
    [bet('a', 200_000n, 60_000n)],
    700_000n,
    100_000n,
  )

  assert.equal(formatPercent(metrics.incomeExposureBasisPoints), '20%')
  assert.equal(formatPercent(metrics.budgetExposureBasisPoints), '140%')
  assert.equal(metrics.budgetRemainingPaise, -40_000n)
})

test('matches the approved worked example without assigning a risk category', () => {
  const metrics = calculateFinancialMetrics(
    [bet('example', 400_000n, 250_000n)],
    500_000n,
    100_000n,
  )

  assert.equal(metrics.netPaise, -150_000n)
  assert.equal(formatPercent(metrics.wageringIntensityBasisPoints), '80%')
  assert.equal(formatPercent(metrics.incomeExposureBasisPoints), '30%')
  assert.equal(formatPercent(metrics.budgetExposureBasisPoints), '150%')
  assert.equal(metrics.budgetRemainingPaise, -50_000n)
})

test('zero or missing denominators make ratios unavailable without division errors', () => {
  const noIncomeOrBudget = calculateFinancialMetrics(
    [bet('a', 200_000n, 60_000n)],
    null,
    null,
  )
  const zeroDenominators = calculateFinancialMetrics(
    [bet('b', 200_000n, 60_000n)],
    0n,
    0n,
  )

  assert.equal(noIncomeOrBudget.netPaise, -140_000n)
  assert.equal(noIncomeOrBudget.wageringIntensityBasisPoints, null)
  assert.equal(noIncomeOrBudget.incomeExposureBasisPoints, null)
  assert.equal(noIncomeOrBudget.budgetExposureBasisPoints, null)
  assert.equal(noIncomeOrBudget.budgetRemainingPaise, null)
  assert.equal(zeroDenominators.incomeExposureBasisPoints, null)
  assert.equal(zeroDenominators.budgetExposureBasisPoints, null)
  assert.equal(zeroDenominators.budgetRemainingPaise, -140_000n)
})

test('incomplete periods keep recorded arithmetic but withhold ratios and budget remainder', () => {
  const metrics = calculateFinancialMetrics(
    [bet('incomplete', 200_000n, 60_000n)],
    700_000n,
    100_000n,
    { incompletePeriod: true },
  )

  assert.equal(metrics.stakedPaise, 200_000n)
  assert.equal(metrics.returnedPaise, 60_000n)
  assert.equal(metrics.netPaise, -140_000n)
  assert.equal(metrics.lossPaise, 140_000n)
  assert.equal(metrics.wageringIntensityBasisPoints, null)
  assert.equal(metrics.incomeExposureBasisPoints, null)
  assert.equal(metrics.budgetExposureBasisPoints, null)
  assert.equal(metrics.budgetRemainingPaise, null)
})

test('comparison gating requires reviewed coverage, known accounting status, and resolved duplicates', () => {
  assert.equal(
    shouldWithholdComparisons(true, 'noKnownUnsupportedItems', false),
    false,
  )
  assert.equal(
    shouldWithholdComparisons(false, 'noKnownUnsupportedItems', false),
    true,
  )
  assert.equal(shouldWithholdComparisons(true, 'notReviewed', false), true)
  assert.equal(
    shouldWithholdComparisons(true, 'hasUnsupportedItems', false),
    true,
  )
  assert.equal(
    shouldWithholdComparisons(true, 'noKnownUnsupportedItems', true),
    true,
  )
  assert.equal(shouldWithholdComparisons(true, undefined, false), true)
})

test('voids are excluded and a cash-out return is counted once', () => {
  const metrics = calculateFinancialMetrics(
    [
      bet('void', 100_000n, 100_000n, 'void'),
      bet('cash', 200_000n, 120_000n, 'cashout'),
    ],
    null,
    null,
  )

  assert.equal(metrics.recordCount, 1)
  assert.equal(metrics.stakedPaise, 200_000n)
  assert.equal(metrics.returnedPaise, 120_000n)
  assert.equal(metrics.netPaise, -80_000n)
})

test('possible duplicates are excluded until explicitly resolved', () => {
  const entries = [
    bet('first', 200_000n, 60_000n),
    bet('second', 200_000n, 60_000n),
  ]
  const unresolved = resolvePossibleDuplicates(entries, {})
  const duplicateKey = unresolved.unresolvedGroups[0]?.key

  assert.equal(unresolved.includedRecords.length, 0)
  assert.equal(unresolved.unresolvedGroups.length, 1)
  assert.ok(duplicateKey)

  const keptSeparate = resolvePossibleDuplicates(entries, {
    [duplicateKey]: { kind: 'separate' },
  })
  assert.equal(keptSeparate.includedRecords.length, 2)

  const countedOnce = resolvePossibleDuplicates(entries, {
    [duplicateKey]: { kind: 'single', recordId: 'first' },
  })
  assert.deepEqual(
    countedOnce.includedRecords.map((record) => record.id),
    ['first'],
  )
})

test('daily, weekly, monthly, and all-time ranges use exact dates', () => {
  const records = [
    bet('old', 100n, 0n, 'lost', '2026-01-02'),
    bet('recent', 100n, 0n, 'lost', '2026-10-28'),
  ]

  assert.deepEqual(
    getReportingRange('today', '2026-10-29', records),
    {
      key: '2026-10-29:2026-10-29',
      start: '2026-10-29',
      end: '2026-10-29',
      label: 'Today so far · 2026-10-29 to 2026-10-29 (EAT)',
    },
  )
  assert.equal(getReportingRange('week', '2026-10-29', records).start, '2026-10-26')
  assert.equal(getReportingRange('month', '2026-10-29', records).start, '2026-10-01')
  assert.equal(getReportingRange('all', '2026-10-29', records).start, '2026-01-02')
  assert.match(
    getPeriodDescription('month', getReportingRange('month', '2026-10-29', records)),
    /partial period/i,
  )
})
