import { idb, idbBookmarks, idbMistakes, idbNotes, idbSupported } from './idb.js'
import { streakStore } from './streakStore.js'
import { settingsStore } from './settingsStore.js'
import { dailyStore } from './dailyStore.js'

export const backupManager = {
  async exportCompleteBackup() {
    let progress = []
    let bookmarks = []
    let mistakes = []
    let notes = []

    if (idbSupported) {
      try {
        progress = await idb.getAll()
      } catch {}
      try {
        bookmarks = await idbBookmarks.getAll()
      } catch {}
      try {
        mistakes = await idbMistakes.getAll()
      } catch {}
      try {
        notes = await idbNotes.getAll()
      } catch {}
    }

    return {
      version: 4,
      appName: 'MPT-AI',
      exportedAt: new Date().toISOString(),
      data: {
        progress,
        bookmarks,
        mistakes,
        notes,
        streak: streakStore.load(),
        settings: settingsStore.load(),
        daily: dailyStore.getAll(),
      },
    }
  },

  async importCompleteBackup(jsonString) {
    const payload = typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString
    if (!payload || !payload.data) {
      throw new Error('Invalid backup file structure: missing data payload')
    }

    const { progress, bookmarks, mistakes, notes, streak, settings, daily } = payload.data

    if (idbSupported) {
      if (Array.isArray(progress) && progress.length > 0) {
        await idb.putMany(progress)
      }
      if (Array.isArray(bookmarks) && bookmarks.length > 0) {
        await idbBookmarks.putMany(bookmarks)
      }
      if (Array.isArray(mistakes) && mistakes.length > 0) {
        await idbMistakes.putMany(mistakes)
      }
      if (Array.isArray(notes) && notes.length > 0) {
        await idbNotes.putMany(notes)
      }
    }

    if (typeof localStorage !== 'undefined') {
      if (streak) {
        try {
          localStorage.setItem('mpt_ai_streak', JSON.stringify(streak))
        } catch {}
      }
      if (daily) {
        try {
          localStorage.setItem('mpt_ai_daily_sprints', JSON.stringify(daily))
        } catch {}
      }
    }
    if (settings) {
      settingsStore.save(settings)
    }

    return {
      progressCount: progress?.length ?? 0,
      bookmarksCount: bookmarks?.length ?? 0,
      mistakesCount: mistakes?.length ?? 0,
      notesCount: notes?.length ?? 0,
    }
  },

  async resetTrackProgress(trackId, trackUnits = []) {
    if (!idbSupported) return
    const all = await idb.getAll()
    const unitLessonIds = new Set(
      trackUnits.flatMap((u) => u.lessons.map((l) => `lesson:${l.id}`)),
    )
    const toDelete = all.filter((r) => unitLessonIds.has(r.id)).map((r) => r.id)
    if (toDelete.length > 0) {
      await idb.deleteMany(toDelete)
    }
    return toDelete.length
  },
}
