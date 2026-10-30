import assert from 'node:assert/strict'
import test from 'node:test'
import { loadPersonalData } from '../src/lib/personalData.ts'

test('loads existing settings without the optional accounting-status field', () => {
  const legacyData = {
    version: 1,
    financialSettings: {
      '2026-10-29:2026-10-29': {
        incomePaise: '500000',
        lossBudgetPaise: '100000',
        reviewed: true,
        updatedAt: '2026-10-29T12:00:00.000Z',
      },
    },
    duplicateDecisions: {},
    checkIns: {},
    goal: null,
    alternativeActivities: [],
    reasonsToPause: '',
    toolReflections: {},
  }
  const previousWindow = globalThis.window
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      localStorage: {
        getItem: (key) =>
          key === 'losslens-personal-data-v1'
            ? JSON.stringify(legacyData)
            : null,
      },
    },
    writable: true,
  })

  try {
    const loaded = loadPersonalData()
    assert.deepEqual(loaded, legacyData)
    assert.equal(
      loaded.financialSettings['2026-10-29:2026-10-29'].accountingStatus,
      undefined,
    )
  } finally {
    if (previousWindow === undefined) {
      delete globalThis.window
    } else {
      Object.defineProperty(globalThis, 'window', {
        configurable: true,
        value: previousWindow,
        writable: true,
      })
    }
  }
})
