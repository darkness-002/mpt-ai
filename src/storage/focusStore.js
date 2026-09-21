const FOCUS_KEY = 'mpt_ai_focus_sessions'

let memoryStore = {}

function getStorage() {
  if (typeof localStorage !== 'undefined') return localStorage
  return {
    getItem: (k) => memoryStore[k] ?? null,
    setItem: (k, v) => {
      memoryStore[k] = String(v)
    },
    removeItem: (k) => {
      delete memoryStore[k]
    },
  }
}

export const focusStore = {
  load() {
    try {
      const storage = getStorage()
      const raw = storage.getItem(FOCUS_KEY)
      const data = raw ? JSON.parse(raw) : {}
      const today = new Date().toISOString().slice(0, 10)
      if (data.date !== today) {
        return {
          date: today,
          completedSessions: 0,
          totalMinutes: 0,
        }
      }
      return data
    } catch {
      return {
        date: new Date().toISOString().slice(0, 10),
        completedSessions: 0,
        totalMinutes: 0,
      }
    }
  },

  recordSession(minutes = 25) {
    try {
      const current = this.load()
      const updated = {
        date: new Date().toISOString().slice(0, 10),
        completedSessions: current.completedSessions + 1,
        totalMinutes: current.totalMinutes + minutes,
      }
      const storage = getStorage()
      storage.setItem(FOCUS_KEY, JSON.stringify(updated))
      return updated
    } catch {
      return null
    }
  },

  clear() {
    try {
      const storage = getStorage()
      storage.removeItem(FOCUS_KEY)
    } catch {}
  },
}
