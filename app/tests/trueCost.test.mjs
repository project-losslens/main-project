import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createEmptyBetForm,
  validateBetForm,
} from '../src/lib/trueCost.ts'

function validForm(overrides = {}) {
  return {
    ...createEmptyBetForm(),
    placedDate: '2026-10-29',
    bookmaker: 'Example',
    betType: 'single',
    oddsTaken: '2.10',
    stake: '100',
    result: 'lost',
    ...overrides,
  }
}

test('validates supported settled-bet outcomes without adding unsupported accounting rules', () => {
  const lost = validateBetForm(validForm(), '2026-10-29')
  assert.equal(lost.value?.result, 'lost')
  assert.equal(lost.value?.returnedPaise, 0n)

  const won = validateBetForm(
    validForm({ result: 'won', returned: '250' }),
    '2026-10-29',
  )
  assert.equal(won.value?.returnedPaise, 25_000n)
})

test('cash-outs accept one entered return amount; a missing amount is invalid', () => {
  const cashout = validateBetForm(
    validForm({ result: 'cashout', returned: '75.50' }),
    '2026-10-29',
  )
  assert.equal(cashout.value?.returnedPaise, 7_550n)

  const missingReturn = validateBetForm(
    validForm({ result: 'cashout', returned: '' }),
    '2026-10-29',
  )
  assert.equal(missingReturn.value, undefined)
  assert.match(missingReturn.errors.returned, /amount you received/i)
})

test('void records keep the entered stake but use Draft 5 provisional returned stake', () => {
  const voidBet = validateBetForm(
    validForm({ result: 'void' }),
    '2026-10-29',
  )
  assert.equal(voidBet.value?.stakePaise, 10_000n)
  assert.equal(voidBet.value?.returnedPaise, 10_000n)
})

test('unsupported result and market categories are rejected instead of saved as settled bets', () => {
  for (const result of ['refund', 'bonus', 'partialSettlement']) {
    const invalid = validateBetForm(
      validForm({ result }),
      '2026-10-29',
    )
    assert.equal(invalid.value, undefined)
    assert.match(invalid.errors.result, /supported bet result/i)
  }

  const invalidMarket = validateBetForm(
    validForm({ marketFamily: 'promotionalCredit' }),
    '2026-10-29',
  )
  assert.equal(invalidMarket.value, undefined)
  assert.match(invalidMarket.errors.marketFamily, /supported market family/i)

  const invalidBetType = validateBetForm(
    validForm({ betType: 'parlay' }),
    '2026-10-29',
  )
  assert.equal(invalidBetType.value, undefined)
  assert.match(invalidBetType.errors.betType, /select single or multibet/i)
})

test('rejects invalid stakes, odds, and impossible multibet counts', () => {
  const invalidStake = validateBetForm(
    validForm({ stake: '0' }),
    '2026-10-29',
  )
  assert.equal(invalidStake.value, undefined)
  assert.match(invalidStake.errors.stake, /above 0/i)

  const invalidOdds = validateBetForm(
    validForm({ oddsTaken: '1' }),
    '2026-10-29',
  )
  assert.equal(invalidOdds.value, undefined)
  assert.match(invalidOdds.errors.oddsTaken, /above 1\.00/i)

  const invalidLegs = validateBetForm(
    validForm({ betType: 'multi', legs: '1' }),
    '2026-10-29',
  )
  assert.equal(invalidLegs.value, undefined)
  assert.match(invalidLegs.errors.legs, /at least 2/i)
})
