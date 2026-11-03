import { supabase } from './supabase'
import type { DiaryEntry, PersonalData } from './personalData'
import {
  type BetRecord,
} from './trueCost'
import {
  diaryEntryFromCloudRow,
  diaryEntryToCloudRow,
} from './diaryData'
import {
  monthlyReflectionFromCloudRow,
  monthlyReflectionToCloudRow,
} from './monthlyReflectionData'

type CloudRow = Record<string, unknown>

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function toCloudRow(value: unknown): CloudRow {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('The cloud returned a row with an unexpected format.')
  }
  return Object.fromEntries(Object.entries(value))
}

function throwIfError(error: { message: string } | null): void {
  if (error) {
    throw new Error(error.message)
  }
}

export async function exportCloudData(): Promise<{
  formatVersion: 1
  exportedAt: string
  tables: Record<string, CloudRow[]>
}> {
  const userId = await getUserId()
  const [bets, personalData] = await Promise.all([
    loadCloudBets(),
    loadCloudPersonalData(),
  ])
  
  const tables: Record<string, CloudRow[]> = {}
  tables.financial_entries = bets.map((record) => ({
    id: record.id,
    user_id: userId,
    placed_date: record.placedDate,
    bookmaker: record.bookmaker,
    bet_type: record.betType,
    legs: record.legs,
    odds_taken: record.oddsTaken,
    stake_paise: record.stakePaise.toString(),
    result: record.result,
    returned_paise: record.returnedPaise.toString(),
    market_family: record.marketFamily,
    note: record.note,
    input_route: record.inputRoute,
    created_at: record.createdAt,
    updated_at: record.updatedAt,
  }))
  
  tables.financial_period_contexts = Object.entries(personalData.financialSettings).map(([key, setting]) => {
    const [periodStart, periodEnd] = key.split(':')
    return {
      user_id: userId,
      period_start: periodStart,
      period_end: periodEnd,
      income_paise: setting.incomePaise,
      loss_budget_paise: setting.lossBudgetPaise,
      reviewed: setting.reviewed,
      accounting_status: setting.accountingStatus ?? 'notReviewed',
      updated_at: setting.updatedAt,
    }
  })
  
  tables.financial_duplicate_decisions = Object.entries(personalData.duplicateDecisions).map(([key, decision]) => ({
    user_id: userId,
    duplicate_key: key,
    decision: decision.kind,
    selected_entry_id: decision.kind === 'single' ? decision.recordId : null,
    updated_at: new Date().toISOString(),
  }))
  
  tables.recovery_check_ins = Object.entries(personalData.checkIns).map(([date, checkIn]) => ({
    user_id: userId,
    entry_date: date,
    gambled: checkIn.gambled,
    duration_minutes: checkIn.durationMinutes,
    urge_level: checkIn.urgeLevel,
    mood: checkIn.mood,
    triggers: checkIn.triggers,
    note: checkIn.note,
    updated_at: checkIn.updatedAt,
  }))
  
  tables.recovery_goals = personalData.goal ? [{
    user_id: userId,
    goal_type: personalData.goal.mode === 'stop' ? 'abstinence' : 'harm_reduction',
    mode: personalData.goal.mode,
    title: personalData.goal.mode === 'stop' ? 'Personal stop goal' : 'Personal reduction goal',
    target_days: personalData.goal.targetDays,
    updated_at: personalData.goal.updatedAt,
  }] : []
  
  tables.monthly_reviews = Object.values(personalData.monthlyReflections ?? {}).map((reflection) => ({
    user_id: userId,
    month_start: reflection.monthStart,
    achievements: reflection.achievements,
    difficulties: reflection.difficulties,
    lessons: reflection.lessons,
    future_intentions: reflection.futureIntention,
    updated_at: reflection.updatedAt,
  }))
  
  tables.user_preferences = [{
    user_id: userId,
    alternative_activities: personalData.alternativeActivities,
    reasons_to_pause: personalData.reasonsToPause,
  }]
  
  tables.tool_reflections = Object.entries(personalData.toolReflections).map(([date, reflection]) => ({
    user_id: userId,
    reflection_date: date,
    trigger: reflection.trigger,
    thought: reflection.thought,
    alternative_thought: reflection.alternativeThought,
    updated_at: reflection.updatedAt,
  }))
  
  tables.diary_entries = personalData.diaryEntries?.map((entry) => ({
    user_id: userId,
    id: entry.id,
    occurred_at: entry.date,
    mood: entry.mood,
    triggers: entry.triggers,
    coping_strategies: entry.copingStrategies,
    note: entry.note,
    updated_at: entry.updatedAt,
  })) ?? []
  
  tables.account_deletion_requests = []
  
  return {
    formatVersion: 1,
    exportedAt: new Date().toISOString(),
    tables,
  }
}

export async function requestAccountDeletion(
  userMessage: string,
): Promise<void> {
  const userId = await getUserId()
  const { data: existingRequests, error: lookupError } = await supabase
    .from('account_deletion_requests')
    .select('id, status')
    .eq('user_id', userId)
    .in('status', ['pending', 'processing'])
  throwIfError(lookupError)
  if ((existingRequests ?? []).length > 0) {
    throw new Error(
      'There is already an open account-deletion request. Contact the LossLens project team for its status.',
    )
  }

  const { error } = await supabase
    .from('account_deletion_requests')
    .insert({ user_message: userMessage.trim() })
  throwIfError(error)
}

export async function getAccountDeletionRequests(): Promise<
  Array<{ id: string; status: string; requestedAt: string }>
> {
  const userId = await getUserId()
  const { data, error } = await supabase
    .from('account_deletion_requests')
    .select('id, status, requested_at')
    .eq('user_id', userId)
    .order('requested_at', { ascending: false })
  throwIfError(error)
  return (data ?? []).map((row) => {
    if (
      typeof row.id !== 'string' ||
      typeof row.status !== 'string' ||
      typeof row.requested_at !== 'string'
    ) {
      throw new Error('An account-deletion request has an unexpected format.')
    }
    return {
      id: row.id,
      status: row.status,
      requestedAt: row.requested_at,
    }
  })
}

async function getUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser()
  throwIfError(error)
  if (!data.user) {
    throw new Error('Your session has ended. Sign in again to continue.')
  }
  return data.user.id
}

function toBetRecord(row: CloudRow): BetRecord {
  if (
    typeof row.id !== 'string' ||
    typeof row.placed_date !== 'string' ||
    typeof row.bookmaker !== 'string' ||
    (row.bet_type !== 'single' && row.bet_type !== 'multi') ||
    typeof row.legs !== 'number' ||
    typeof row.odds_taken !== 'number' ||
    typeof row.stake_paise !== 'string' ||
    (row.result !== 'won' &&
      row.result !== 'lost' &&
      row.result !== 'cashout' &&
      row.result !== 'void') ||
    typeof row.returned_paise !== 'string' ||
    (row.market_family !== 'threeWay' &&
      row.market_family !== 'twoWay' &&
      row.market_family !== 'notSure') ||
    typeof row.note !== 'string' ||
    typeof row.created_at !== 'string' ||
    typeof row.updated_at !== 'string'
  ) {
    throw new Error('A cloud True Cost record has an unexpected format.')
  }

  if (!/^\d+$/.test(row.stake_paise) || !/^\d+$/.test(row.returned_paise)) {
    throw new Error('A cloud True Cost amount is not a valid paise value.')
  }

  return {
    id: row.id,
    placedDate: row.placed_date,
    bookmaker: row.bookmaker,
    betType: row.bet_type,
    legs: row.legs,
    oddsTaken: row.odds_taken,
    stakePaise: BigInt(row.stake_paise),
    result: row.result,
    returnedPaise: BigInt(row.returned_paise),
    marketFamily: row.market_family,
    note: row.note,
    inputRoute: 'manual',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function betToRow(record: BetRecord): CloudRow {
  return {
    id: record.id,
    placed_date: record.placedDate,
    bookmaker: record.bookmaker,
    bet_type: record.betType,
    legs: record.legs,
    odds_taken: record.oddsTaken,
    stake_paise: record.stakePaise.toString(),
    result: record.result,
    returned_paise: record.returnedPaise.toString(),
    market_family: record.marketFamily,
    note: record.note,
    input_route: record.inputRoute,
    created_at: record.createdAt,
    updated_at: record.updatedAt,
  }
}

export async function loadCloudBets(): Promise<BetRecord[]> {
  const userId = await getUserId()
  const { data, error } = await supabase
    .from('financial_entries')
    .select(
      'id, placed_date, bookmaker, bet_type, legs, odds_taken, stake_paise, result, returned_paise, market_family, note, input_route, created_at, updated_at',
    )
    .eq('user_id', userId)
    .order('placed_date', { ascending: false })
  throwIfError(error)
  return (data ?? []).map((row) => toBetRecord(row as CloudRow))
}

export async function saveCloudBet(record: BetRecord): Promise<void> {
  const userId = await getUserId()
  const { data: existing, error: lookupError } = await supabase
    .from('financial_entries')
    .select('id')
    .eq('user_id', userId)
    .eq('id', record.id)
    .maybeSingle()
  throwIfError(lookupError)

  const row = betToRow(record)
  delete row.id
  if (existing) {
    delete row.created_at
    delete row.updated_at
    const { error } = await supabase
      .from('financial_entries')
      .update(row)
      .eq('user_id', userId)
      .eq('id', record.id)
    throwIfError(error)
    return
  }

  const { error } = await supabase
    .from('financial_entries')
    .insert({ id: record.id, ...row })
  throwIfError(error)
}

export async function deleteCloudBet(id: string): Promise<void> {
  const userId = await getUserId()
  const { error } = await supabase
    .from('financial_entries')
    .delete()
    .eq('user_id', userId)
    .eq('id', id)
  throwIfError(error)
}

async function selectOwnedRows(
  table: string,
  userId: string,
  columns: string,
): Promise<CloudRow[]> {
  const { data, error } = await supabase
    .from(table)
    .select(columns)
    .eq('user_id', userId)
  throwIfError(error)
  return (data ?? []).map(toCloudRow)
}

function dateKey(start: unknown, end: unknown): string {
  if (typeof start !== 'string' || typeof end !== 'string') {
    throw new Error('A cloud financial period has an unexpected date range.')
  }
  return `${start}:${end}`
}

export async function loadCloudPersonalData(): Promise<PersonalData> {
  const userId = await getUserId()
  const [
    settingsRows,
    duplicateRows,
    checkInRows,
    goalRows,
    preferenceRows,
    reflectionRows,
    diaryRows,
    monthlyRows,
  ] = await Promise.all([
    selectOwnedRows('financial_period_contexts', userId, 'id, user_id, period_start, period_end, income_paise, loss_budget_paise, reviewed, accounting_status, updated_at'),
    selectOwnedRows('financial_duplicate_decisions', userId, 'id, user_id, duplicate_key, decision, selected_entry_id, updated_at'),
    selectOwnedRows('recovery_check_ins', userId, 'id, user_id, entry_date, gambled, duration_minutes, urge_level, mood, triggers, note, updated_at'),
    selectOwnedRows('recovery_goals', userId, 'id, user_id, mode, target_days, updated_at'),
    selectOwnedRows('user_preferences', userId, 'id, user_id, alternative_activities, reasons_to_pause'),
    selectOwnedRows('tool_reflections', userId, 'id, user_id, reflection_date, trigger, thought, alternative_thought, updated_at'),
    selectOwnedRows('diary_entries', userId, 'id, user_id, occurred_at, mood, triggers, coping_strategies, note, updated_at'),
    selectOwnedRows('monthly_reviews', userId, 'id, user_id, month_start, achievements, difficulties, lessons, future_intentions, updated_at'),
  ])

  const financialSettings: PersonalData['financialSettings'] = {}
  for (const row of settingsRows) {
    if (
      typeof row.income_paise !== 'string' &&
      row.income_paise !== null
    ) {
      throw new Error('A cloud financial setting has an unexpected income value.')
    }
    if (
      typeof row.loss_budget_paise !== 'string' &&
      row.loss_budget_paise !== null
    ) {
      throw new Error('A cloud financial setting has an unexpected budget value.')
    }
    if (
      typeof row.reviewed !== 'boolean' ||
      typeof row.updated_at !== 'string'
    ) {
      throw new Error('A cloud financial setting has an unexpected format.')
    }
    const accountingStatus = row.accounting_status
    if (
      accountingStatus !== 'notReviewed' &&
      accountingStatus !== 'noKnownUnsupportedItems' &&
      accountingStatus !== 'hasUnsupportedItems'
    ) {
      throw new Error('A cloud financial setting has an unexpected review status.')
    }
    financialSettings[dateKey(row.period_start, row.period_end)] = {
      incomePaise: row.income_paise,
      lossBudgetPaise: row.loss_budget_paise,
      reviewed: row.reviewed,
      accountingStatus,
      updatedAt: row.updated_at,
    }
  }

  const duplicateDecisions: PersonalData['duplicateDecisions'] = {}
  for (const row of duplicateRows) {
    if (
      typeof row.duplicate_key !== 'string' ||
      (row.decision !== 'single' && row.decision !== 'separate')
    ) {
      throw new Error('A cloud duplicate decision has an unexpected format.')
    }
    if (row.decision === 'single') {
      if (typeof row.selected_entry_id !== 'string') {
        throw new Error('A cloud duplicate decision is missing its selected record.')
      }
      duplicateDecisions[row.duplicate_key] = {
        kind: 'single',
        recordId: row.selected_entry_id,
      }
    } else {
      duplicateDecisions[row.duplicate_key] = { kind: 'separate' }
    }
  }

  const checkIns: PersonalData['checkIns'] = {}
  for (const row of checkInRows) {
    if (
      typeof row.entry_date !== 'string' ||
      typeof row.gambled !== 'string' ||
      (row.duration_minutes !== null &&
        typeof row.duration_minutes !== 'number') ||
      (row.urge_level !== null && typeof row.urge_level !== 'number') ||
      typeof row.mood !== 'string' ||
      !Array.isArray(row.triggers) ||
      !row.triggers.every((item) => typeof item === 'string') ||
      typeof row.note !== 'string' ||
      typeof row.updated_at !== 'string'
    ) {
      throw new Error('A cloud recovery check-in has an unexpected format.')
    }
    if (
      row.gambled !== 'yes' &&
      row.gambled !== 'no' &&
      row.gambled !== 'notRecorded'
    ) {
      throw new Error('A cloud recovery check-in has an unexpected gambling status.')
    }
    checkIns[row.entry_date] = {
      date: row.entry_date,
      gambled: row.gambled,
      durationMinutes: row.duration_minutes,
      urgeLevel: row.urge_level,
      mood: row.mood,
      triggers: row.triggers,
      note: row.note,
      updatedAt: row.updated_at,
    }
  }

  const userGoal = goalRows[0]
  let goal: PersonalData['goal'] = null
  if (userGoal) {
    if (
      (userGoal.mode !== 'reduce' && userGoal.mode !== 'stop') ||
      typeof userGoal.target_days !== 'number' ||
      typeof userGoal.updated_at !== 'string'
    ) {
      throw new Error('A cloud recovery goal has an unexpected format.')
    }
    goal = {
      mode: userGoal.mode,
      targetDays: userGoal.target_days,
      updatedAt: userGoal.updated_at,
    }
  }

  const preferences = preferenceRows[0]
  let alternativeActivities: string[] = []
  let reasonsToPause = ''
  if (
    preferences &&
    (!isStringArray(preferences.alternative_activities) ||
      typeof preferences.reasons_to_pause !== 'string')
  ) {
    throw new Error('Cloud recovery preferences have an unexpected format.')
  }
  if (preferences) {
    if (isStringArray(preferences.alternative_activities)) {
      alternativeActivities = preferences.alternative_activities
    }
    if (typeof preferences.reasons_to_pause === 'string') {
      reasonsToPause = preferences.reasons_to_pause
    }
  }

  const toolReflections: PersonalData['toolReflections'] = {}
  for (const row of reflectionRows) {
    if (
      typeof row.reflection_date !== 'string' ||
      typeof row.trigger !== 'string' ||
      typeof row.thought !== 'string' ||
      typeof row.alternative_thought !== 'string' ||
      typeof row.updated_at !== 'string'
    ) {
      throw new Error('A cloud tool reflection has an unexpected format.')
    }
    toolReflections[row.reflection_date] = {
      trigger: row.trigger,
      thought: row.thought,
      alternativeThought: row.alternative_thought,
      updatedAt: row.updated_at,
    }
  }

  const diaryEntries: DiaryEntry[] = diaryRows.map((row) =>
    diaryEntryFromCloudRow(row),
  )
  const monthlyReflections: NonNullable<
    PersonalData['monthlyReflections']
  > = {}
  for (const row of monthlyRows) {
    const reflection = monthlyReflectionFromCloudRow(row)
    if (monthlyReflections[reflection.monthStart]) {
      throw new Error('A cloud month has more than one reflection record.')
    }
    monthlyReflections[reflection.monthStart] = reflection
  }

  return {
    version: 1,
    financialSettings,
    duplicateDecisions,
    checkIns,
    goal,
    alternativeActivities,
    reasonsToPause,
    toolReflections,
    diaryEntries,
    monthlyReflections,
  }
}

async function saveOrUpdate(
  table: string,
  userId: string,
  match: CloudRow,
  values: CloudRow,
): Promise<void> {
  let query = supabase.from(table).select('id').eq('user_id', userId)
  for (const [column, value] of Object.entries(match)) {
    query = query.eq(column, value)
  }
  const { data: existing, error: lookupError } = await query.maybeSingle()
  throwIfError(lookupError)

  if (existing && typeof existing.id === 'string') {
    const updateValues = { ...values }
    delete updateValues.created_at
    delete updateValues.updated_at
    const { error } = await supabase
      .from(table)
      .update(updateValues)
      .eq('user_id', userId)
      .eq('id', existing.id)
    throwIfError(error)
    return
  }

  const { error } = await supabase.from(table).insert(values)
  throwIfError(error)
}

async function deleteRowsNotIn(
  table: string,
  userId: string,
  columns: string,
  keep: (row: CloudRow) => boolean,
): Promise<void> {
  const rows = await selectOwnedRows(table, userId, columns)
  for (const row of rows) {
    if (keep(row) || typeof row.id !== 'string') {
      continue
    }
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('user_id', userId)
      .eq('id', row.id)
    throwIfError(error)
  }
}

export async function saveCloudPersonalData(
  personalData: PersonalData,
): Promise<void> {
  const userId = await getUserId()

  await deleteRowsNotIn('financial_period_contexts', userId, 'id, user_id, period_start, period_end, income_paise, loss_budget_paise, reviewed, accounting_status, updated_at', (row) =>
    Object.prototype.hasOwnProperty.call(
      personalData.financialSettings,
      dateKey(row.period_start, row.period_end),
    ),
  )
  for (const [key, setting] of Object.entries(
    personalData.financialSettings,
  )) {
    const [periodStart, periodEnd] = key.split(':')
    if (!periodStart || !periodEnd) {
      throw new Error(`Financial period key "${key}" is invalid.`)
    }
    await saveOrUpdate(
      'financial_period_contexts',
      userId,
      { period_start: periodStart, period_end: periodEnd },
      {
        period_start: periodStart,
        period_end: periodEnd,
        income_paise: setting.incomePaise,
        loss_budget_paise: setting.lossBudgetPaise,
        reviewed: setting.reviewed,
        accounting_status: setting.accountingStatus ?? 'notReviewed',
        updated_at: setting.updatedAt,
      },
    )
  }

  await deleteRowsNotIn('financial_duplicate_decisions', userId, 'id, user_id, duplicate_key, decision, selected_entry_id, updated_at', (row) =>
    typeof row.duplicate_key === 'string' &&
    Object.prototype.hasOwnProperty.call(
      personalData.duplicateDecisions,
      row.duplicate_key,
    ),
  )
  for (const [key, decision] of Object.entries(
    personalData.duplicateDecisions,
  )) {
    await saveOrUpdate(
      'financial_duplicate_decisions',
      userId,
      { duplicate_key: key },
      {
        duplicate_key: key,
        decision: decision.kind,
        selected_entry_id:
          decision.kind === 'single' ? decision.recordId : null,
        updated_at: new Date().toISOString(),
      },
    )
  }

  await deleteRowsNotIn('recovery_check_ins', userId, 'id, user_id, entry_date, gambled, duration_minutes, urge_level, mood, triggers, note, updated_at', (row) =>
    typeof row.entry_date === 'string' &&
    Object.prototype.hasOwnProperty.call(personalData.checkIns, row.entry_date),
  )
  for (const [date, checkIn] of Object.entries(personalData.checkIns)) {
    await saveOrUpdate(
      'recovery_check_ins',
      userId,
      { entry_date: date },
      {
        entry_date: date,
        gambled: checkIn.gambled,
        duration_minutes: checkIn.durationMinutes,
        urge_level: checkIn.urgeLevel,
        mood: checkIn.mood,
        triggers: checkIn.triggers,
        note: checkIn.note,
        updated_at: checkIn.updatedAt,
      },
    )
  }

  if (personalData.goal) {
    const { data: existingGoal, error: lookupError } = await supabase
      .from('recovery_goals')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle()
    throwIfError(lookupError)

    if (existingGoal && typeof existingGoal.id === 'string') {
      const { error } = await supabase
        .from('recovery_goals')
        .update({
          goal_type:
            personalData.goal.mode === 'stop' ? 'abstinence' : 'harm_reduction',
          mode: personalData.goal.mode,
          title:
            personalData.goal.mode === 'stop'
              ? 'Personal stop goal'
              : 'Personal reduction goal',
          target_days: personalData.goal.targetDays,
          updated_at: personalData.goal.updatedAt,
        })
        .eq('user_id', userId)
        .eq('id', existingGoal.id)
      throwIfError(error)
    } else {
      const { error } = await supabase
        .from('recovery_goals')
        .insert({
          goal_type:
            personalData.goal.mode === 'stop' ? 'abstinence' : 'harm_reduction',
          mode: personalData.goal.mode,
          title:
            personalData.goal.mode === 'stop'
              ? 'Personal stop goal'
              : 'Personal reduction goal',
          target_days: personalData.goal.targetDays,
          updated_at: personalData.goal.updatedAt,
        })
      throwIfError(error)
    }
  } else {
    const { error } = await supabase
      .from('recovery_goals')
      .delete()
      .eq('user_id', userId)
    throwIfError(error)
  }

  await saveOrUpdate(
    'user_preferences',
    userId,
    {},
    {
      alternative_activities: personalData.alternativeActivities,
      reasons_to_pause: personalData.reasonsToPause,
    },
  )

  await deleteRowsNotIn('tool_reflections', userId, 'id, user_id, reflection_date, trigger, thought, alternative_thought, updated_at', (row) =>
    typeof row.reflection_date === 'string' &&
    Object.prototype.hasOwnProperty.call(
      personalData.toolReflections,
      row.reflection_date,
    ),
  )
  for (const [date, reflection] of Object.entries(
    personalData.toolReflections,
  )) {
    await saveOrUpdate(
      'tool_reflections',
      userId,
      { reflection_date: date },
      {
        reflection_date: date,
        trigger: reflection.trigger,
        thought: reflection.thought,
        alternative_thought: reflection.alternativeThought,
        updated_at: reflection.updatedAt,
      },
    )
  }

  const diaryEntries = personalData.diaryEntries ?? []
  const diaryEntryIds = new Set(diaryEntries.map((entry) => entry.id))
  await deleteRowsNotIn('diary_entries', userId, 'id, user_id, occurred_at, mood, triggers, coping_strategies, note, updated_at', (row) =>
    typeof row.id === 'string' && diaryEntryIds.has(row.id),
  )
  for (const entry of diaryEntries) {
    await saveOrUpdate(
      'diary_entries',
      userId,
      { id: entry.id },
      diaryEntryToCloudRow(entry),
    )
  }

  for (const reflection of Object.values(personalData.monthlyReflections ?? {})) {
    await saveOrUpdate(
      'monthly_reviews',
      userId,
      { month_start: reflection.monthStart },
      monthlyReflectionToCloudRow(reflection),
    )
  }
}

export async function getCloudUserId(): Promise<string> {
  return getUserId()
}

export type DataSetupStatus = {
  hasConsent: boolean
  ready: boolean
}

export async function getDataSetupStatus(): Promise<DataSetupStatus> {
  await getUserId()
  const { data: setupRows, error: setupError } = await supabase.rpc('get_data_setup_status')
  throwIfError(setupError)
  if (
    !Array.isArray(setupRows) ||
    setupRows.length !== 1 ||
    typeof setupRows[0].has_consent !== 'boolean'
  ) {
    throw new Error('The server returned an unexpected account setup status.')
  }

  const hasConsent = setupRows[0].has_consent
  return {
    hasConsent,
    ready: hasConsent,
  }
}

export async function saveCloudStorageConsent(): Promise<void> {
  await getUserId()
  const { error } = await supabase.rpc('record_cloud_storage_consent', {
    p_consent_version: 'cloud-storage-v1',
  })
  throwIfError(error)
}

export async function revokeCloudStorageConsent(): Promise<void> {
  await getUserId()
  const { error } = await supabase.rpc('revoke_cloud_storage_consent')
  throwIfError(error)
}
