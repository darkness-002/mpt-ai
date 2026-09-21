import { beforeEach, describe, expect, it } from 'vitest'
import { dailyStore } from '../src/storage/dailyStore.js'

describe('dailyStore', () => {
  beforeEach(() => {
    dailyStore.clear()
  })

  it('records today sprint result and retrieves it by date key', () => {
    expect(dailyStore.getToday()).toBeNull()

    const result = {
      score: 9,
      total: 10,
      timeSpentMs: 45000,
    }

    const saved = dailyStore.recordToday(result)
    expect(saved).not.toBeNull()
    expect(saved.score).toBe(9)
    expect(saved.total).toBe(10)
    expect(saved.date).toBe(dailyStore.getTodayKey())

    const retrieved = dailyStore.getToday()
    expect(retrieved).not.toBeNull()
    expect(retrieved.score).toBe(9)
  })
})
