const DAILY_KEY = 'mpt_ai_daily_sprints'

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

/**
 * Storage for Daily 10-MCQ sprint challenge results keyed by date YYYY-MM-DD.
 */
export const dailyStore = {
  getTodayKey() {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  },

  getAll() {
    try {
      const storage = getStorage()
      const raw = storage.getItem(DAILY_KEY)
      return raw ? JSON.parse(raw) : {}
    } catch {
      return {}
    }
  },

  getToday() {
    const all = this.getAll()
    return all[this.getTodayKey()] ?? null
  },

  recordToday(result) {
    try {
      const all = this.getAll()
      const todayKey = this.getTodayKey()
      all[todayKey] = {
        ...result,
        date: todayKey,
        completedAt: Date.now(),
      }
      const storage = getStorage()
      storage.setItem(DAILY_KEY, JSON.stringify(all))
      return all[todayKey]
    } catch {
      return null
    }
  },

  clear() {
    try {
      const storage = getStorage()
      storage.removeItem(DAILY_KEY)
    } catch {}
  },
}
