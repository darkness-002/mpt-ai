import { idbBookmarks, idbSupported } from './idb.js'

/**
 * Storage for bookmarked / starred questions with in-memory caching for instant UI response.
 */

const memory = new Map()
let cache = null

async function readAll() {
  if (cache) return [...cache.values()]
  if (!idbSupported) {
    cache = memory
    return [...memory.values()]
  }
  try {
    const records = await idbBookmarks.getAll()
    cache = new Map()
    records.forEach((r) => cache.set(r.id, r))
    return records
  } catch {
    cache = memory
    return [...memory.values()]
  }
}

export const bookmarksStore = {
  async getAll() {
    return await readAll()
  },

  async isBookmarked(questionId) {
    const all = await readAll()
    return all.some((item) => item.id === questionId)
  },

  async toggleBookmark(question, { trackId, unitId } = {}) {
    if (!question || !question.id) return false
    const all = await readAll()
    const exists = all.some((item) => item.id === question.id)

    if (exists) {
      if (cache) cache.delete(question.id)
      memory.delete(question.id)
      if (idbSupported) {
        try {
          await idbBookmarks.delete(question.id)
        } catch {}
      }
      return false
    } else {
      const record = {
        id: question.id,
        question,
        trackId,
        unitId,
        savedAt: Date.now(),
      }
      if (cache) cache.set(question.id, record)
      memory.set(question.id, record)
      if (idbSupported) {
        try {
          await idbBookmarks.put(record)
        } catch {}
      }
      return true
    }
  },

  async clear() {
    if (cache) cache.clear()
    memory.clear()
    if (idbSupported) {
      try {
        await idbBookmarks.clear()
      } catch {}
    }
  },
}
