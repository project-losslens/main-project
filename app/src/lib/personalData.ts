import type {
  DuplicateDecision,
  PeriodAccountingStatus,
} from './financialMetrics.ts'

type CloudPersonalDataPersistence = (data: PersonalData) => Promise<void>

let cloudPersonalData: PersonalData | null = null
let persistCloudPersonalData: CloudPersonalDataPersistence | null = null
let cloudSaveQueue: Promise<void> = Promise.resolve()
let cloudSaveError: Error | null = null

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

export type DiaryEntry = {
  id: string
  date: string
  mood: string
  triggers: string[]
  copingStrategies: string[]
  note: string
  updatedAt: string
}

export type MonthlyReflection = {
  monthStart: string
  achievements: string
  difficulties: string
  lessons: string
  futureIntention: string
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
  diaryEntries?: DiaryEntry[]
  monthlyReflections?: Record<string, MonthlyReflection>
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
      (typeof value.incomePaise === 'string' && /^\d+$/.test(value.incomePaise))) &&
    (value.lossBudgetPaise === null ||
      (typeof value.lossBudgetPaise === 'string' && /^\d+$/.test(value.lossBudgetPaise))) &&
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

export function isDiaryEntry(value: unknown): value is DiaryEntry {
  const date =
    isObjectRecord(value) && typeof value.date === 'string'
      ? new Date(`${value.date}T00:00:00.000Z`)
      : null
  return (
    isObjectRecord(value) &&
    typeof value.id === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value.id,
    ) &&
    typeof value.date === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(value.date) &&
    date !== null &&
    Number.isFinite(date.getTime()) &&
    date.toISOString().slice(0, 10) === value.date &&
    typeof value.mood === 'string' &&
    value.mood.length <= 120 &&
    Array.isArray(value.triggers) &&
    value.triggers.every(
      (trigger) => typeof trigger === 'string' && trigger.length <= 120,
    ) &&
    Array.isArray(value.copingStrategies) &&
    value.copingStrategies.every(
      (strategy) => typeof strategy === 'string' && strategy.length <= 120,
    ) &&
    typeof value.note === 'string' &&
    value.note.length <= 20000 &&
    typeof value.updatedAt === 'string'
  )
}

function isMonthlyReflection(value: unknown): value is MonthlyReflection {
  if (!isObjectRecord(value) || typeof value.monthStart !== 'string') {
    return false
  }
  const date = new Date(`${value.monthStart}T00:00:00.000Z`)
  return (
    /^\d{4}-\d{2}-01$/.test(value.monthStart) &&
    Number.isFinite(date.getTime()) &&
    date.toISOString().slice(0, 10) === value.monthStart &&
    typeof value.achievements === 'string' &&
    value.achievements.length <= 5000 &&
    typeof value.difficulties === 'string' &&
    value.difficulties.length <= 5000 &&
    typeof value.lessons === 'string' &&
    value.lessons.length <= 5000 &&
    typeof value.futureIntention === 'string' &&
    value.futureIntention.length <= 5000 &&
    typeof value.updatedAt === 'string'
  )
}

function isPersonalData(value: unknown): value is PersonalData {
  if (!isObjectRecord(value) || value.version !== 1) {
    return false
  }

  if (value.diaryEntries !== undefined) {
    if (
      !Array.isArray(value.diaryEntries) ||
      !value.diaryEntries.every(isDiaryEntry)
    ) {
      return false
    }
    const diaryIds = value.diaryEntries.map((entry) => entry.id)
    const diaryDates = value.diaryEntries.map((entry) => entry.date)
    if (
      new Set(diaryIds).size !== diaryIds.length ||
      new Set(diaryDates).size !== diaryDates.length
    ) {
      return false
    }
  }

  if (value.monthlyReflections !== undefined) {
    if (
      !isObjectRecord(value.monthlyReflections) ||
      !Object.entries(value.monthlyReflections).every(
        ([month, reflection]) =>
          isMonthlyReflection(reflection) && reflection.monthStart === month,
      )
    ) {
      return false
    }
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
    diaryEntries: [],
    monthlyReflections: {},
  }
}

export function loadPersonalData(): PersonalData {
  return cloudPersonalData ?? createEmptyPersonalData()
}

export function updatePersonalData(
  update: (current: PersonalData) => PersonalData,
): PersonalData {
  if (!cloudPersonalData || !persistCloudPersonalData) {
    throw new Error(
      'LossLens stores personal data in Supabase only. Sign in to continue.',
    )
  }

  const current = cloudPersonalData
  const updated = update(current)

  if (!isPersonalData(updated)) {
    throw new Error('The personal data change did not pass validation.')
  }

  cloudPersonalData = updated
  dispatchPersonalDataUpdated()

  const snapshot = updated
  const persist = persistCloudPersonalData
  cloudSaveQueue = cloudSaveQueue
    .then(() => persist(snapshot))
    .then(() => {
      cloudSaveError = null
      window.dispatchEvent(
        new CustomEvent('losslens:cloud-save-state', {
          detail: { error: null },
        }),
      )
    })
    .catch((error: unknown) => {
      cloudSaveError =
        error instanceof Error
          ? error
          : new Error('Cloud recovery data could not be saved.')
      window.dispatchEvent(
        new CustomEvent('losslens:cloud-save-state', {
          detail: { error: cloudSaveError.message },
        }),
      )
    })

  return updated
}

function dispatchPersonalDataUpdated(): void {
  window.dispatchEvent(new Event('losslens:personal-data-updated'))
}

export function configureCloudPersonalData(
  data: PersonalData,
  persist: CloudPersonalDataPersistence,
): void {
  cloudPersonalData = data
  persistCloudPersonalData = persist
  cloudSaveQueue = Promise.resolve()
  cloudSaveError = null
}

export function clearCloudPersonalData(): void {
  cloudPersonalData = null
  persistCloudPersonalData = null
}

export async function flushCloudPersonalData(): Promise<void> {
  await cloudSaveQueue
  if (cloudSaveError) {
    throw cloudSaveError
  }
}

export async function updatePersonalDataAndWait(
  update: (current: PersonalData) => PersonalData,
): Promise<PersonalData> {
  const updated = updatePersonalData(update)
  await flushCloudPersonalData()
  return updated
}

export function parseStoredPaise(value: string | null): bigint | null {
  if (value === null || !/^\d+$/.test(value)) {
    return null
  }
  return BigInt(value)
}
