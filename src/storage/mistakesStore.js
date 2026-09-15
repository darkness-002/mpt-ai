import { idbMistakes, idbSupported } from './idb.js'

/**
 * Mistakes Bank & Spaced Repetition (SRS) tracking.
 * Leitner-style spaced repetition: consecutive correct answers increase review intervals.
 *
 * @typedef {Object} MistakeRecord
 * @property {string} id             question id
 * @property {object} question       full question object
 * @property {string} [trackId]
 * @property {string} [unitId]
 * @property {number} wrongCount
 * @property {number} correctCount
 * @property {number} streak         consecutive correct answers in SRS review
 * @property {number} intervalDays   days until next review
 * @property {number} lastReviewedAt timestamp ms
 * @property {number} nextReviewAt   timestamp ms
 * @property {boolean} mastered      true when streak >= 2
 */

const memory = new Map()
const ONE_DAY_MS = 86_400_000

async function readAll() {
  if (!idbSupported) return [...memory.values()]
  try {
    return await idbMistakes.getAll()
  } catch {
    return [...memory.values()]
  }
}

async function write(record) {
  memory.set(record.id, record)
  if (!idbSupported) return record
  try {
    await idbMistakes.put(record)
  } catch {
    /* memory already has it */
  }
  return record
}

export const mistakesStore = {
  async getAll() {
    return await readAll()
  },

  async getDue() {
    const all = await readAll()
    const now = Date.now()
    return all.filter((item) => !item.mastered || item.nextReviewAt <= now)
  },

  async count() {
    const all = await readAll()
    const active = all.filter((item) => !item.mastered)
    return {
      total: all.length,
      active: active.length,
      mastered: all.length - active.length,
    }
  },

  async recordMistake(question, { trackId, unitId } = {}) {
    if (!question || !question.id) return null
    const all = await readAll()
    const existing = all.find((item) => item.id === question.id)
    const now = Date.now()

    const record = {
      id: question.id,
      question,
      trackId: trackId ?? existing?.trackId,
      unitId: unitId ?? existing?.unitId,
      wrongCount: (existing?.wrongCount ?? 0) + 1,
      correctCount: existing?.correctCount ?? 0,
      streak: 0,
      intervalDays: 1,
      lastReviewedAt: now,
      nextReviewAt: now,
      mastered: false,
    }

    return await write(record)
  },

  async recordReviewResult(questionId, isCorrect) {
    const all = await readAll()
    const existing = all.find((item) => item.id === questionId)
    if (!existing) return null

    const now = Date.now()
    if (isCorrect) {
      const streak = (existing.streak ?? 0) + 1
      const intervalDays = streak === 1 ? 1 : streak === 2 ? 3 : 7
      const mastered = streak >= 2
      const updated = {
        ...existing,
        correctCount: (existing.correctCount ?? 0) + 1,
        streak,
        intervalDays,
        lastReviewedAt: now,
        nextReviewAt: now + intervalDays * ONE_DAY_MS,
        mastered,
      }
      return await write(updated)
    } else {
      const updated = {
        ...existing,
        wrongCount: (existing.wrongCount ?? 0) + 1,
        streak: 0,
        intervalDays: 1,
        lastReviewedAt: now,
        nextReviewAt: now,
        mastered: false,
      }
      return await write(updated)
    }
  },

  async remove(id) {
    memory.delete(id)
    if (idbSupported) {
      try {
        await idbMistakes.delete(id)
      } catch {
        /* memory deleted */
      }
    }
  },

  async clear() {
    memory.clear()
    if (idbSupported) {
      try {
        await idbMistakes.clear()
      } catch {
        /* memory cleared */
      }
    }
  },
}
