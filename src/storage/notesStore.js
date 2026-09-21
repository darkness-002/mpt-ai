import { idbNotes, idbSupported } from './idb.js'

/**
 * Storage for candidate personal notes and mnemonics on specific questions.
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
    const records = await idbNotes.getAll()
    cache = new Map()
    records.forEach((r) => cache.set(r.id, r))
    return records
  } catch {
    cache = memory
    return [...memory.values()]
  }
}

export const notesStore = {
  async getAll() {
    return await readAll()
  },

  async getNote(questionId) {
    if (!questionId) return ''
    const all = await readAll()
    const found = all.find((n) => n.id === questionId)
    return found ? found.text : ''
  },

  async saveNote(questionId, text, question = null) {
    if (!questionId) return
    const trimmed = (text ?? '').trim()
    const all = await readAll()

    if (!trimmed) {
      // If note is cleared, delete record
      if (cache) cache.delete(questionId)
      memory.delete(questionId)
      if (idbSupported) {
        try {
          await idbNotes.delete(questionId)
        } catch {}
      }
      return
    }

    const existing = all.find((n) => n.id === questionId)
    const record = {
      id: questionId,
      text: trimmed,
      question: question || existing?.question || null,
      updatedAt: Date.now(),
    }

    if (cache) cache.set(questionId, record)
    memory.set(questionId, record)

    if (idbSupported) {
      try {
        await idbNotes.put(record)
      } catch {}
    }
    return record
  },

  async deleteNote(questionId) {
    if (cache) cache.delete(questionId)
    memory.delete(questionId)
    if (idbSupported) {
      try {
        await idbNotes.delete(questionId)
      } catch {}
    }
  },

  async clear() {
    if (cache) cache.clear()
    memory.clear()
    if (idbSupported) {
      try {
        await idbNotes.clear()
      } catch {}
    }
  },
}
