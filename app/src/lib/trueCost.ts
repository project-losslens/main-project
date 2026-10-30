export type BetType = 'single' | 'multi'
export type BetResult = 'won' | 'lost' | 'cashout' | 'void'
export type MarketFamily = 'threeWay' | 'twoWay' | 'notSure'
export type Period = 'today' | 'week' | 'month' | '7' | '30' | '90' | 'all'

export type BetRecord = {
  id: string
  placedDate: string
  bookmaker: string
  betType: BetType
  legs: number
  oddsTaken: number
  stakePaise: bigint
  result: BetResult
  returnedPaise: bigint
  marketFamily: MarketFamily
  note: string
  inputRoute: 'manual'
  createdAt: string
  updatedAt: string
}

export type BetFormValues = {
  placedDate: string
  bookmaker: string
  betType: BetType
  legs: string
  oddsTaken: string
  stake: string
  result: BetResult | ''
  returned: string
  marketFamily: MarketFamily
  note: string
}

export type BetFormErrors = Partial<Record<keyof BetFormValues, string>>

export type ParsedBetForm = Omit<
  BetRecord,
  'id' | 'createdAt' | 'updatedAt' | 'inputRoute'
>

export type BetFormValidation = {
  errors: BetFormErrors
  value?: ParsedBetForm
}

export type ActualTotals = {
  betCount: number
  voidCount: number
  cashoutCount: number
  stakedPaise: bigint
  returnedPaise: bigint
  netPaise: bigint
}

const moneyFormatter = new Intl.NumberFormat('en-KE')

function normalizeDecimalInput(value: string): string | null {
  const trimmed = value.trim()
  const hasThousandsSeparators = trimmed.includes(',')
  const validGrouped = /^\d{1,3}(?:,\d{3})+(?:\.\d+)?$/.test(trimmed)
  const validPlain = /^(?:\d+(?:\.\d*)?|\.\d+)$/.test(trimmed)

  if (hasThousandsSeparators && !validGrouped) {
    return null
  }
  if (!hasThousandsSeparators && !validPlain) {
    return null
  }

  return trimmed.replaceAll(',', '')
}

export function parseKesToPaise(value: string): bigint | null {
  const normalized = normalizeDecimalInput(value)
  if (normalized === null) {
    return null
  }

  const [wholeText = '0', fractionText = ''] = normalized.split('.')
  let paise =
    BigInt(wholeText || '0') * 100n +
    BigInt((fractionText + '00').slice(0, 2))

  if (fractionText.length > 2 && Number(fractionText[2]) >= 5) {
    paise += 1n
  }

  return paise
}

export function formatKes(paise: bigint): string {
  const sign = paise < 0n ? '-' : ''
  const absolutePaise = paise < 0n ? -paise : paise
  const wholeShillings = (absolutePaise + 50n) / 100n

  return `${sign}KES ${moneyFormatter.format(wholeShillings)}`
}

export function formatPaiseForInput(paise: bigint): string {
  const wholeShillings = paise / 100n
  const cents = (paise % 100n).toString().padStart(2, '0')
  return `${wholeShillings}.${cents}`
}

export function getTodayInNairobi(): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    timeZone: 'Africa/Nairobi',
    year: 'numeric',
  }).formatToParts(new Date())

  const year = parts.find((part) => part.type === 'year')?.value
  const month = parts.find((part) => part.type === 'month')?.value
  const day = parts.find((part) => part.type === 'day')?.value

  if (!year || !month || !day) {
    throw new Error('Could not determine today’s date in East Africa Time.')
  }

  return `${year}-${month}-${day}`
}

export function createEmptyBetForm(): BetFormValues {
  return {
    placedDate: getTodayInNairobi(),
    bookmaker: '',
    betType: 'single',
    legs: '',
    oddsTaken: '',
    stake: '',
    result: '',
    returned: '',
    marketFamily: 'notSure',
    note: '',
  }
}

function parseOdds(value: string): number | null {
  const normalized = normalizeDecimalInput(value)
  if (normalized === null) {
    return null
  }

  const odds = Number(normalized)
  return Number.isFinite(odds) ? odds : null
}

function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false
  }

  const date = new Date(`${value}T00:00:00.000Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}

export function validateBetForm(
  form: BetFormValues,
  today = getTodayInNairobi(),
): BetFormValidation {
  const errors: BetFormErrors = {}
  const placedDate = form.placedDate.trim()
  const bookmaker = form.bookmaker.trim()
  const note = form.note.trim()
  const result = form.result
  const stakePaise = parseKesToPaise(form.stake)
  const oddsTaken = parseOdds(form.oddsTaken)

  if (form.betType !== 'single' && form.betType !== 'multi') {
    errors.betType = 'Select single or multibet.'
  }
  if (
    form.marketFamily !== 'threeWay' &&
    form.marketFamily !== 'twoWay' &&
    form.marketFamily !== 'notSure'
  ) {
    errors.marketFamily = 'Select a supported market family.'
  }
  if (!isCalendarDate(placedDate)) {
    errors.placedDate = 'Enter a valid date.'
  } else if (placedDate > today) {
    errors.placedDate = "The date can't be in the future."
  }

  if (!bookmaker) {
    errors.bookmaker = 'Enter the bookmaker name.'
  }

  if (
    result !== 'won' &&
    result !== 'lost' &&
    result !== 'cashout' &&
    result !== 'void'
  ) {
    errors.result = 'Select a supported bet result.'
  }

  let legs = 1
  if (form.betType === 'multi') {
    const parsedLegs = Number(form.legs)
    if (!Number.isInteger(parsedLegs) || parsedLegs < 2) {
      errors.legs = 'A multibet has at least 2 legs.'
    } else {
      legs = parsedLegs
    }
  }

  if (stakePaise === null) {
    errors.stake = 'Enter a valid amount. Commas may separate thousands.'
  } else if (stakePaise <= 0n) {
    errors.stake =
      'Enter an amount above 0 after rounding to two decimal places.'
  }

  if (oddsTaken === null || oddsTaken <= 1) {
    errors.oddsTaken = 'Odds must be above 1.00. Use decimal odds like 2.10.'
  }

  let returnedPaise = 0n
  if (result === 'won' || result === 'cashout') {
    returnedPaise = parseKesToPaise(form.returned) ?? -1n
    if (returnedPaise < 0n) {
      errors.returned = 'Enter the amount you received as a valid KES amount.'
    }
  } else if (result === 'void' && stakePaise !== null && stakePaise > 0n) {
    returnedPaise = stakePaise
  }

  if (note.length > 280) {
    errors.note = 'Keep the note to 280 characters or fewer.'
  }

  if (
    Object.keys(errors).length > 0 ||
    stakePaise === null ||
    oddsTaken === null ||
    !result
  ) {
    return { errors }
  }

  return {
    errors,
    value: {
      placedDate,
      bookmaker,
      betType: form.betType,
      legs,
      oddsTaken,
      stakePaise,
      result,
      returnedPaise,
      marketFamily: form.marketFamily,
      note,
    },
  }
}

export function formValuesFromRecord(record: BetRecord): BetFormValues {
  return {
    placedDate: record.placedDate,
    bookmaker: record.bookmaker,
    betType: record.betType,
    legs: record.betType === 'multi' ? String(record.legs) : '',
    oddsTaken: record.oddsTaken.toString(),
    stake: formatPaiseForInput(record.stakePaise),
    result: record.result,
    returned:
      record.result === 'won' || record.result === 'cashout'
        ? formatPaiseForInput(record.returnedPaise)
        : '',
    marketFamily: record.marketFamily,
    note: record.note,
  }
}

export function getRangeStart(period: Period, today: string): string | null {
  if (period === 'all') {
    return null
  }

  const date = new Date(`${today}T00:00:00.000Z`)

  if (period === 'today') {
    return today
  }

  if (period === 'week') {
    const weekday = date.getUTCDay()
    date.setUTCDate(date.getUTCDate() - ((weekday + 6) % 7))
  } else if (period === 'month') {
    date.setUTCDate(1)
  } else {
    const days = Number(period)
    date.setUTCDate(date.getUTCDate() - days + 1)
  }

  return date.toISOString().slice(0, 10)
}

export function filterRecordsByPeriod(
  records: BetRecord[],
  period: Period,
  today = getTodayInNairobi(),
): BetRecord[] {
  const rangeStart = getRangeStart(period, today)
  if (rangeStart === null) {
    return records.filter((record) => record.placedDate <= today)
  }

  return records.filter(
    (record) => record.placedDate >= rangeStart && record.placedDate <= today,
  )
}

export function calculateActualTotals(records: BetRecord[]): ActualTotals {
  const includedRecords = records.filter((record) => record.result !== 'void')
  const stakedPaise = includedRecords.reduce(
    (total, record) => total + record.stakePaise,
    0n,
  )
  const returnedPaise = includedRecords.reduce(
    (total, record) => total + record.returnedPaise,
    0n,
  )

  return {
    betCount: includedRecords.length,
    voidCount: records.length - includedRecords.length,
    cashoutCount: includedRecords.filter(
      (record) => record.result === 'cashout',
    ).length,
    stakedPaise,
    returnedPaise,
    netPaise: returnedPaise - stakedPaise,
  }
}

export function createRecordId(): string {
  if (typeof window.crypto?.randomUUID !== 'function') {
    throw new Error(
      'This browser cannot create a secure local record identifier.',
    )
  }

  return window.crypto.randomUUID()
}
