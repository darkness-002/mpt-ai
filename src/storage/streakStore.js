/**
 * Manages daily practice goals and streaks.
 * Persisted in localStorage for instant access across tabs.
 */

const STORAGE_KEY = 'mpt_ai_streak'
const DEFAULT_GOAL = 20

function getTodayString() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getYesterdayString() {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const streakStore = {
  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      const data = raw ? JSON.parse(raw) : null
      const today = getTodayString()

      if (!data) {
        return {
          goal: DEFAULT_GOAL,
          todayCount: 0,
          currentStreak: 0,
          lastActiveDate: null,
          goalMetToday: false,
        }
      }

      // If last active was before yesterday, streak resets
      const yesterday = getYesterdayString()
      let streak = data.currentStreak ?? 0
      if (data.lastActiveDate && data.lastActiveDate !== today && data.lastActiveDate !== yesterday) {
        streak = 0
      }

      const todayCount = data.lastActiveDate === today ? data.todayCount ?? 0 : 0
      const goal = data.goal ?? DEFAULT_GOAL
      const goalMetToday = todayCount >= goal

      return {
        goal,
        todayCount,
        currentStreak: streak,
        lastActiveDate: data.lastActiveDate,
        goalMetToday,
      }
    } catch {
      return {
        goal: DEFAULT_GOAL,
        todayCount: 0,
        currentStreak: 0,
        lastActiveDate: null,
        goalMetToday: false,
      }
    }
  },

  recordAnswers(count = 1) {
    const current = this.load()
    const today = getTodayString()
    const newTodayCount = current.todayCount + count
    const goalMetBefore = current.todayCount >= current.goal
    const goalMetNow = newTodayCount >= current.goal

    let newStreak = current.currentStreak
    if (!goalMetBefore && goalMetNow) {
      newStreak = current.currentStreak + 1
    }

    const payload = {
      goal: current.goal,
      todayCount: newTodayCount,
      currentStreak: newStreak,
      lastActiveDate: today,
    }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
    } catch {}

    return {
      ...payload,
      goalMetToday: goalMetNow,
    }
  },

  setGoal(goal) {
    const current = this.load()
    const updated = { ...current, goal: Number(goal) || DEFAULT_GOAL }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    } catch {}
    return updated
  },

  clear() {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {}
  },
}
