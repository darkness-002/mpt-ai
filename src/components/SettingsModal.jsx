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
