export type CloudBetStorage = {
  load: () => Promise<BetRecord[]>
  save: (record: BetRecord) => Promise<void>
  delete: (id: string) => Promise<void>
}

import type { BetRecord } from './trueCost'

let cloudBetStorage: CloudBetStorage | null = null

export async function getLocalBets(): Promise<BetRecord[]> {
  throw new Error(
    'LossLens stores True Cost records in Supabase only. Sign in to continue.',
  )
}

export async function getAllBets(): Promise<BetRecord[]> {
  if (!cloudBetStorage) {
    throw new Error(
      'LossLens stores True Cost records in Supabase only. Sign in to continue.',
    )
  }
  return cloudBetStorage.load()
}

export async function saveBet(record: BetRecord): Promise<void> {
  if (!cloudBetStorage) {
    throw new Error(
      'LossLens stores True Cost records in Supabase only. Sign in to continue.',
    )
  }
  await cloudBetStorage.save(record)
}

export async function deleteBet(id: string): Promise<void> {
  if (!cloudBetStorage) {
    throw new Error(
      'LossLens stores True Cost records in Supabase only. Sign in to continue.',
    )
  }
  await cloudBetStorage.delete(id)
}

export function configureCloudBetStorage(
  storage: CloudBetStorage | null,
): void {
  cloudBetStorage = storage
}
