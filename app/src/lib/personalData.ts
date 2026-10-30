import type {
  DuplicateDecision,
  PeriodAccountingStatus,
} from './financialMetrics.ts'

const STORAGE_KEY = 'losslens-personal-data-v1'

export type PeriodFinancialSetting = {
  incomePaise: string | null
  lossBudgetPaise: string | null
  reviewed: boolean
  accountingStatus?: PeriodAccountingStatus
  updatedAt: string
}

export type DailyCheckIn = {
  date: string
  gambled: 'yes' | 'no' | 'notRecorded'
  durationMinutes: number | null
  urgeLevel: number | null
  mood: string
  triggers: string[]
  note: string
  updatedAt: string
}

export type RecoveryGoal = {
  mode: 'reduce' | 'stop'
  targetDays: number
  updatedAt: string
}

export type ToolReflection = {
  trigger: string
  thought: string
  alternativeThought: string
  updatedAt: string
}

export type PersonalData = {
  version: 1
  financialSettings: Record<string, PeriodFinancialSetting>
  duplicateDecisions: Record<string, DuplicateDecision>
  checkIns: Record<string, DailyCheckIn>
  goal: RecoveryGoal | null
  alternativeActivities: string[]
  reasonsToPause: string
  toolReflections: Record<string, ToolReflection>
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isPeriodSetting(value: unknown): value is PeriodFinancialSetting {
  if (!isObjectRecord(value)) {
    return false
  }

  return (
    (value.incomePaise === null ||
      (typeof value.incomePaise === 'string' &&
        /^\d+$/.test(value.incomePaise))) &&
    (value.lossBudgetPaise === null ||
      (typeof value.lossBudgetPaise === 'string' &&
        /^\d+$/.test(value.lossBudgetPaise))) &&
    typeof value.reviewed === 'boolean' &&
    (value.accountingStatus === undefined ||
      value.accountingStatus === 'notReviewed' ||
      value.accountingStatus === 'noKnownUnsupportedItems' ||
      value.accountingStatus === 'hasUnsupportedItems') &&
    typeof value.updatedAt === 'string'
  )
}

function isDuplicateDecision(value: unknown): value is DuplicateDecision {
  return (
    isObjectRecord(value) &&
    (value.kind === 'separate' ||
      (value.kind === 'single' && typeof value.recordId === 'string'))
  )
}

function isCheckIn(value: unknown): value is DailyCheckIn {
  return (
    isObjectRecord(value) &&
    typeof value.date === 'string' &&
    (value.gambled === 'yes' ||
      value.gambled === 'no' ||
      value.gambled === 'notRecorded') &&
    (value.durationMinutes === null ||
      (typeof value.durationMinutes === 'number' &&
        Number.isInteger(value.durationMinutes) &&
        value.durationMinutes >= 0 &&
        value.durationMinutes <= 1440)) &&
    (value.urgeLevel === null ||
      (typeof value.urgeLevel === 'number' &&
        Number.isInteger(value.urgeLevel) &&
        value.urgeLevel >= 0 &&
        value.urgeLevel <= 4)) &&
    typeof value.mood === 'string' &&
    Array.isArray(value.triggers) &&
    value.triggers.every((trigger) => typeof trigger === 'string') &&
    typeof value.note === 'string' &&
    typeof value.updatedAt === 'string'
  )
}

function isRecoveryGoal(value: unknown): value is RecoveryGoal {
  return (
    isObjectRecord(value) &&
    (value.mode === 'reduce' || value.mode === 'stop') &&
    typeof value.targetDays === 'number' &&
    Number.isInteger(value.targetDays) &&
    value.targetDays >= 1 &&
    value.targetDays <= 365 &&
    typeof value.updatedAt === 'string'
  )
}

function isToolReflection(value: unknown): value is ToolReflection {
  return (
    isObjectRecord(value) &&
    typeof value.trigger === 'string' &&
    typeof value.thought === 'string' &&
    typeof value.alternativeThought === 'string' &&
    typeof value.updatedAt === 'string'
  )
}

function isPersonalData(value: unknown): value is PersonalData {
  if (!isObjectRecord(value) || value.version !== 1) {
    return false
  }

  return (
    isObjectRecord(value.financialSettings) &&
    Object.values(value.financialSettings).every(isPeriodSetting) &&
    isObjectRecord(value.duplicateDecisions) &&
    Object.values(value.duplicateDecisions).every(isDuplicateDecision) &&
    isObjectRecord(value.checkIns) &&
    Object.values(value.checkIns).every(isCheckIn) &&
    (value.goal === null || isRecoveryGoal(value.goal)) &&
    Array.isArray(value.alternativeActivities) &&
    value.alternativeActivities.every((activity) => typeof activity === 'string') &&
    typeof value.reasonsToPause === 'string' &&
    isObjectRecord(value.toolReflections) &&
    Object.values(value.toolReflections).every(isToolReflection)
  )
}

export function createEmptyPersonalData(): PersonalData {
  return {
    version: 1,
    financialSettings: {},
    duplicateDecisions: {},
    checkIns: {},
    goal: null,
    alternativeActivities: [],
    reasonsToPause: '',
    toolReflections: {},
  }
}

function getLocalStorage(): Storage {
  if (typeof window === 'undefined' || !window.localStorage) {
    throw new Error('This browser does not support local personal storage.')
  }
  return window.localStorage
}

export function loadPersonalData(): PersonalData {
  const raw = getLocalStorage().getItem(STORAGE_KEY)
  if (raw === null) {
    return createEmptyPersonalData()
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error(
      'Saved personal support data could not be read. It has not been overwritten.',
    )
  }

  if (!isPersonalData(parsed)) {
    throw new Error(
      'Saved personal support data has an unexpected format. It has not been overwritten.',
    )
  }

  return parsed
}

export function updatePersonalData(
  update: (current: PersonalData) => PersonalData,
): PersonalData {
  const storage = getLocalStorage()
  const current = loadPersonalData()
  const updated = update(current)

  if (!isPersonalData(updated)) {
    throw new Error('The personal data change did not pass validation.')
  }

  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(updated))
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? `Could not save personal data on this device: ${error.message}`
        : 'Could not save personal data on this device.',
    )
  }

  window.dispatchEvent(new Event('losslens:personal-data-updated'))
  return updated
}

export function parseStoredPaise(value: string | null): bigint | null {
  if (value === null || !/^\d+$/.test(value)) {
    return null
  }
  return BigInt(value)
}
