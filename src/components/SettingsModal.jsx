import { useState } from 'react'
import { CloseIcon, SettingsIcon } from './icons.jsx'
import { FONT_SCALES, THEMES, settingsStore } from '../storage/settingsStore.js'
import './SettingsModal.css'

export default function SettingsModal({ isOpen, onClose }) {
  const [settings, setSettings] = useState(() => settingsStore.load())

  if (!isOpen) return null

  const update = (partial) => {
    const next = { ...settings, ...partial }
    setSettings(next)
    settingsStore.save(next)
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        <header className="settings-modal__header">
          <div className="settings-modal__title">
            <SettingsIcon width="20" height="20" />
            <h2>App Settings</h2>
          </div>
          <button
            type="button"
            className="icon-btn"
            aria-label="Close settings"
            onClick={onClose}
          >
            <CloseIcon width="18" height="18" />
          </button>
        </header>

        <main className="settings-modal__body">
          {/* Theme Selector */}
          <section className="settings-section">
            <label className="settings-label">Color Theme</label>
            <div className="theme-grid">
              {[
                { id: THEMES.SYSTEM, label: 'System' },
                { id: THEMES.LIGHT, label: 'Light' },
                { id: THEMES.DARK, label: 'Dark' },
                { id: THEMES.OLED, label: 'OLED Black' },
                { id: THEMES.SEPIA, label: 'Sepia' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`theme-chip ${settings.theme === t.id ? 'is-active' : ''}`}
                  onClick={() => update({ theme: t.id })}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </section>

          {/* Typography Scale */}
          <section className="settings-section">
            <label className="settings-label">
              Text Size Scaling ({Math.round((settings.fontScale ?? 1.0) * 100)}%)
            </label>
            <div className="scale-grid">
              {[
                { val: FONT_SCALES.COMPACT, label: 'A- (Compact)' },
                { val: FONT_SCALES.NORMAL, label: 'A (Default)' },
                { val: FONT_SCALES.LARGE, label: 'A+ (Large)' },
                { val: FONT_SCALES.XLARGE, label: 'A++ (Extra)' },
              ].map((s) => (
                <button
                  key={s.val}
                  type="button"
                  className={`scale-chip ${settings.fontScale === s.val ? 'is-active' : ''}`}
                  onClick={() => update({ fontScale: s.val })}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </section>

          {/* Sound & Haptics */}
          <section className="settings-section">
            <label className="settings-label">Audio & Feedback</label>
            <div className="toggle-row">
              <span>Sound Effects (Chimes & Tones)</span>
              <input
                type="checkbox"
                checked={settings.soundEnabled}
                onChange={(e) => update({ soundEnabled: e.target.checked })}
              />
            </div>
            <div className="toggle-row">
              <span>Haptic Vibrations (Mobile)</span>
              <input
                type="checkbox"
                checked={settings.hapticsEnabled}
                onChange={(e) => update({ hapticsEnabled: e.target.checked })}
              />
            </div>
          </section>

          {/* Target Exam Goal */}
          <section className="settings-section">
            <label className="settings-label">Target Exam & Date</label>
            <div className="target-exam-fields">
              <input
                type="text"
                value={settings.examTargetName}
                placeholder="e.g. CSS MPT 2026"
                onChange={(e) => update({ examTargetName: e.target.value })}
                className="target-input"
              />
              <input
                type="date"
                value={settings.examTargetDate}
                onChange={(e) => update({ examTargetDate: e.target.value })}
                className="target-input"
              />
            </div>
          </section>

          {/* Full Data Backup & Cloud-Ready Export/Import */}
          <section className="settings-section">
            <label className="settings-label">Full Data Backup & Restore</label>
            <p style={{ fontSize: '0.78rem', color: 'var(--muted)', margin: '0 0 0.75rem' }}>
              Export or restore your progress, bookmarks, SRS mistakes, study notes, streaks, and settings.
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn--small btn--ghost"
                onClick={async () => {
                  const { backupManager } = await import('../storage/backupManager.js')
                  const payload = await backupManager.exportCompleteBackup()
                  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = `mpt-ai-full-backup-${new Date().toISOString().slice(0, 10)}.json`
                  a.click()
                  URL.revokeObjectURL(url)
                }}
              >
                Export Full Backup (JSON)
              </button>
              <label className="btn btn--small btn--ghost" style={{ cursor: 'pointer', margin: 0 }}>
                Restore Backup
                <input
                  type="file"
                  accept=".json"
                  style={{ display: 'none' }}
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    try {
                      const text = await file.text()
                      const { backupManager } = await import('../storage/backupManager.js')
                      const res = await backupManager.importCompleteBackup(text)
                      alert(`Backup restored successfully!\n- Progress: ${res.progressCount}\n- Bookmarks: ${res.bookmarksCount}\n- Mistakes: ${res.mistakesCount}\n- Notes: ${res.notesCount}\n\nReloading app...`)
                      window.location.reload()
                    } catch (err) {
                      alert(`Failed to restore backup: ${err.message}`)
                    }
                  }}
                />
              </label>
            </div>
          </section>
        </main>

        <footer className="settings-modal__footer">
          <button className="btn btn--small" type="button" onClick={onClose}>
            Done
          </button>
        </footer>
      </div>
    </div>
  )
}
