import { idbBookmarks, idbSupported } from './idb.js'

/**
 * Storage for bookmarked / starred questions.
 */

const memory = new Map()

async function readAll() {
  if (!idbSupported) return [...memory.values()]
  try {
    return await idbBookmarks.getAll()
  } catch {
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
    memory.clear()
    if (idbSupported) {
      try {
        await idbBookmarks.clear()
      } catch {}
    }
  },
}
