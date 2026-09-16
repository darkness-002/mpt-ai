import { beforeEach, describe, expect, it } from 'vitest'
import { mistakesStore } from '../src/storage/mistakesStore.js'

describe('mistakesStore and Spaced Repetition (SRS)', () => {
  beforeEach(async () => {
    await mistakesStore.clear()
  })

  it('records a new mistake with immediate due review status', async () => {
    const question = {
      id: 'q-srs-1',
      prompt: 'Which is the largest ocean?',
      choices: ['Atlantic', 'Indian', 'Pacific', 'Arctic'],
      answer: 2,
    }

    const recorded = await mistakesStore.recordMistake(question, { trackId: 'css-mpt', unitId: 'gk' })
    expect(recorded).toBeDefined()
    expect(recorded.id).toBe('q-srs-1')
    expect(recorded.wrongCount).toBe(1)
    expect(recorded.streak).toBe(0)
    expect(recorded.mastered).toBe(false)
    expect(recorded.nextReviewAt).toBeLessThanOrEqual(Date.now())

    const due = await mistakesStore.getDue()
    expect(due).toHaveLength(1)
    expect(due[0].id).toBe('q-srs-1')
  })

  it('advances SRS streak and schedules next review in the future on correct review', async () => {
    const question = {
      id: 'q-srs-2',
      prompt: 'What is the speed of light?',
      choices: ['3x10^8 m/s', '3x10^6 m/s'],
      answer: 0,
    }

    await mistakesStore.recordMistake(question)

    // First correct review: streak = 1, interval = 1 day, mastered = false
    const firstReview = await mistakesStore.recordReviewResult('q-srs-2', true)
    expect(firstReview.streak).toBe(1)
    expect(firstReview.intervalDays).toBe(1)
    expect(firstReview.mastered).toBe(false)
    expect(firstReview.nextReviewAt).toBeGreaterThan(Date.now())

    // Because nextReviewAt is in the future, it should NOT be in getDue() right now
    const dueImmediatelyAfter = await mistakesStore.getDue()
    expect(dueImmediatelyAfter).toHaveLength(0)

    // But it SHOULD still be in getActive() because it's not yet mastered
    const active = await mistakesStore.getActive()
    expect(active).toHaveLength(1)

    // Second correct review: streak = 2, interval = 3 days, mastered = true
    const secondReview = await mistakesStore.recordReviewResult('q-srs-2', true)
    expect(secondReview.streak).toBe(2)
    expect(secondReview.intervalDays).toBe(3)
    expect(secondReview.mastered).toBe(true)

    const count = await mistakesStore.count()
    expect(count.total).toBe(1)
    expect(count.active).toBe(0)
    expect(count.mastered).toBe(1)
  })

  it('resets streak and interval on wrong review attempt', async () => {
    const question = {
      id: 'q-srs-3',
      prompt: 'Capital of Australia?',
      choices: ['Sydney', 'Melbourne', 'Canberra'],
      answer: 2,
    }

    await mistakesStore.recordMistake(question)
    await mistakesStore.recordReviewResult('q-srs-3', true) // streak 1

    // Failed review: streak resets to 0, nextReviewAt is now
    const failedReview = await mistakesStore.recordReviewResult('q-srs-3', false)
    expect(failedReview.streak).toBe(0)
    expect(failedReview.intervalDays).toBe(1)
    expect(failedReview.mastered).toBe(false)
    expect(failedReview.wrongCount).toBe(2)

    const due = await mistakesStore.getDue()
    expect(due).toHaveLength(1)
  })
})
