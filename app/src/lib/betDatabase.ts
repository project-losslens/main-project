import type { BetRecord } from './trueCost'

const DATABASE_NAME = 'losslens-local-records'
const DATABASE_VERSION = 1
const STORE_NAME = 'bets'

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isBetRecord(value: unknown): value is BetRecord {
  if (!isObjectRecord(value)) {
    return false
  }

  return (
    typeof value.id === 'string' &&
    typeof value.placedDate === 'string' &&
    typeof value.bookmaker === 'string' &&
    (value.betType === 'single' || value.betType === 'multi') &&
    typeof value.legs === 'number' &&
    typeof value.oddsTaken === 'number' &&
    typeof value.stakePaise === 'bigint' &&
    (value.result === 'won' ||
      value.result === 'lost' ||
      value.result === 'cashout' ||
      value.result === 'void') &&
    typeof value.returnedPaise === 'bigint' &&
    (value.marketFamily === 'threeWay' ||
      value.marketFamily === 'twoWay' ||
      value.marketFamily === 'notSure') &&
    typeof value.note === 'string' &&
    value.inputRoute === 'manual' &&
    typeof value.createdAt === 'string' &&
    typeof value.updatedAt === 'string'
  )
}

function openDatabase(): Promise<IDBDatabase> {
  if (!('indexedDB' in window)) {
    return Promise.reject(
      new Error('This browser does not support local IndexedDB storage.'),
    )
  }

  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DATABASE_NAME, DATABASE_VERSION)
    let settled = false

    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }

    request.onsuccess = () => {
      if (settled) {
        request.result.close()
        return
      }

      settled = true
      resolve(request.result)
    }
    request.onerror = () => {
      if (settled) {
        return
      }

      settled = true
      reject(
        new Error(
          request.error?.message ?? 'Could not open local record storage.',
        ),
      )
    }
    request.onblocked = () => {
      if (settled) {
        return
      }

      settled = true
      reject(
        new Error(
          'Local record storage is blocked by another open LossLens tab. Close the other tab and retry.',
        ),
      )
    }
  })
}

function runTransaction<T>(
  database: IDBDatabase,
  mode: IDBTransactionMode,
  makeRequest: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return new Promise((resolve, reject) => {
    let transaction: IDBTransaction

    try {
      transaction = database.transaction(STORE_NAME, mode)
    } catch (error) {
      database.close()
      reject(
        new Error(
          error instanceof Error
            ? error.message
            : 'Could not start local record storage.',
        ),
      )
      return
    }

    let requestState:
      | { status: 'pending' }
      | { status: 'success'; result: T } = { status: 'pending' }
    let settled = false

    const fail = (error: Error) => {
      if (!settled) {
        settled = true
        database.close()
        reject(error)
      }
    }

    let request: IDBRequest<T>
    try {
      request = makeRequest(transaction.objectStore(STORE_NAME))
    } catch (error) {
      fail(
        new Error(
          error instanceof Error
            ? error.message
            : 'Could not access local records.',
        ),
      )
      return
    }

    request.onsuccess = () => {
      requestState = { status: 'success', result: request.result }
    }
    request.onerror = () => {
      fail(
        new Error(
          request.error?.message ?? 'Could not access local records.',
        ),
      )
    }
    transaction.oncomplete = () => {
      if (settled) {
        return
      }

      settled = true
      database.close()
      if (requestState.status === 'success') {
        resolve(requestState.result)
      } else {
        reject(new Error('Local record storage finished without a result.'))
      }
    }
    transaction.onerror = () => {
      fail(
        new Error(
          transaction.error?.message ?? 'A local record storage error occurred.',
        ),
      )
    }
    transaction.onabort = () => {
      fail(
        new Error(
          transaction.error?.message ?? 'The local record change was cancelled.',
        ),
      )
    }
  })
}

export async function getAllBets(): Promise<BetRecord[]> {
  const database = await openDatabase()
  const storedRecords: unknown[] = await runTransaction(
    database,
    'readonly',
    (store) => store.getAll(),
  )

  if (!storedRecords.every(isBetRecord)) {
    throw new Error(
      'A saved record has an unexpected format and was not loaded.',
    )
  }

  return storedRecords
}

export async function saveBet(record: BetRecord): Promise<void> {
  const database = await openDatabase()
  await runTransaction(database, 'readwrite', (store) => store.put(record))
}

export async function deleteBet(id: string): Promise<void> {
  const database = await openDatabase()
  await runTransaction(database, 'readwrite', (store) => store.delete(id))
}
