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
let cache = null
const ONE_DAY_MS = 86_400_000

async function readAll() {
  if (cache) return [...cache.values()]
  if (!idbSupported) {
    cache = memory
    return [...memory.values()]
  }
  try {
    const records = await idbMistakes.getAll()
    cache = new Map()
    records.forEach((r) => cache.set(r.id, r))
    return records
  } catch {
    cache = memory
    return [...memory.values()]
  }
}

async function write(record) {
  if (cache) cache.set(record.id, record)
  memory.set(record.id, record)
  if (!idbSupported) return record
  try {
    await idbMistakes.put(record)
  } catch {
    /* memory/cache already updated */
  }
  return record
}

export const mistakesStore = {
  async getAll() {
    return await readAll()
  },

  /** Returns all unmastered mistakes regardless of due date */
  async getActive() {
    const all = await readAll()
    return all.filter((item) => !item.mastered)
  },

  /** Returns mistakes currently due for Spaced Repetition review (nextReviewAt <= now) */
  async getDue() {
    const all = await readAll()
    const now = Date.now()
    return all.filter((item) => !item.mastered && (item.nextReviewAt ?? 0) <= now)
  },

  async count() {
    const all = await readAll()
    const active = all.filter((item) => !item.mastered)
    const due = active.filter((item) => (item.nextReviewAt ?? 0) <= Date.now())
    return {
      total: all.length,
      active: active.length,
      due: due.length,
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
    if (cache) cache.delete(id)
    memory.delete(id)
    if (idbSupported) {
      try {
        await idbMistakes.delete(id)
      } catch {
        /* deleted from memory/cache */
      }
    }
  },

  async clear() {
    if (cache) cache.clear()
    memory.clear()
    if (idbSupported) {
      try {
        await idbMistakes.clear()
      } catch {
        /* cleared from memory/cache */
      }
    }
  },
}
