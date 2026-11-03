import assert from 'node:assert/strict'
import test from 'node:test'
import {
  clearCloudPersonalData,
  configureCloudPersonalData,
  createEmptyPersonalData,
  loadPersonalData,
} from '../src/lib/personalData.ts'

test('does not persist personal data in browser storage', () => {
  clearCloudPersonalData()
  assert.deepEqual(loadPersonalData(), createEmptyPersonalData())
})

test('uses the configured cloud snapshot instead of any browser persistence', () => {
  const cloudData = createEmptyPersonalData()
  cloudData.financialSettings['2026-10-29:2026-10-29'] = {
    incomePaise: '500000',
    lossBudgetPaise: '100000',
    reviewed: true,
    updatedAt: '2026-10-29T12:00:00.000Z',
  }
  cloudData.diaryEntries = [
    {
      id: 'a52ce35c-e7f0-47b2-90ca-8b82f619ca53',
      date: '2026-11-02',
      mood: 'Hopeful',
      triggers: ['Stress'],
      copingStrategies: ['Stepped away'],
      note: 'Paused and reflected.',
      updatedAt: '2026-11-02T18:00:00.000Z',
    },
  ]

  configureCloudPersonalData(cloudData, async () => {})
  assert.deepEqual(loadPersonalData(), cloudData)
  clearCloudPersonalData()
})
