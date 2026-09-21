import { beforeEach, describe, expect, it } from 'vitest'
import { focusStore } from '../src/storage/focusStore.js'

describe('focusStore', () => {
  beforeEach(() => {
    focusStore.clear()
  })

  it('initializes and records completed focus pomodoros', () => {
    const initial = focusStore.load()
    expect(initial.completedSessions).toBe(0)
    expect(initial.totalMinutes).toBe(0)

    const updated = focusStore.recordSession(25)
    expect(updated.completedSessions).toBe(1)
    expect(updated.totalMinutes).toBe(25)

    const second = focusStore.recordSession(50)
    expect(second.completedSessions).toBe(2)
    expect(second.totalMinutes).toBe(75)
  })
})
