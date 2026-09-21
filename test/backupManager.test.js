import { describe, expect, it } from 'vitest'
import { backupManager } from '../src/storage/backupManager.js'

describe('backupManager', () => {
  it('exports a valid multi-store backup JSON payload', async () => {
    const backup = await backupManager.exportCompleteBackup()
    expect(backup).toHaveProperty('version', 4)
    expect(backup).toHaveProperty('appName', 'MPT-AI')
    expect(backup).toHaveProperty('data')
    expect(backup.data).toHaveProperty('progress')
    expect(backup.data).toHaveProperty('bookmarks')
    expect(backup.data).toHaveProperty('mistakes')
    expect(backup.data).toHaveProperty('notes')
    expect(backup.data).toHaveProperty('streak')
    expect(backup.data).toHaveProperty('settings')
  })

  it('validates and imports backup payload safely', async () => {
    const payload = {
      version: 4,
      appName: 'MPT-AI',
      exportedAt: new Date().toISOString(),
      data: {
        progress: [{ id: 'lesson:test-1', bestScore: 10, total: 10 }],
        bookmarks: [],
        mistakes: [],
        notes: [{ id: 'q-test-1', text: 'Important note' }],
        streak: { currentStreak: 5, goal: 20 },
      },
    }

    const counts = await backupManager.importCompleteBackup(payload)
    expect(counts.progressCount).toBe(1)
    expect(counts.notesCount).toBe(1)
  })
})
