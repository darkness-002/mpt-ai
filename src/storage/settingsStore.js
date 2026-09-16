const SETTINGS_KEY = 'mpt_ai_settings'

export const THEMES = {
  SYSTEM: 'system',
  LIGHT: 'light',
  DARK: 'dark',
  OLED: 'oled',
  SEPIA: 'sepia',
}

export const FONT_SCALES = {
  COMPACT: 0.9,
  NORMAL: 1.0,
  LARGE: 1.15,
  XLARGE: 1.3,
}

const DEFAULT_SETTINGS = {
  theme: THEMES.SYSTEM,
  fontScale: FONT_SCALES.NORMAL,
  soundEnabled: true,
  hapticsEnabled: true,
  examTargetDate: '', // e.g. "2026-11-15"
  examTargetName: 'CSS MPT 2026',
}

export const settingsStore = {
  load() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY)
      if (!raw) return { ...DEFAULT_SETTINGS }
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
    } catch {
      return { ...DEFAULT_SETTINGS }
    }
  },

  save(settings) {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
      this.apply(settings)
    } catch {
      // Storage unavailable
    }
  },

  apply(settings) {
    if (typeof document === 'undefined') return
    const root = document.documentElement

    // Theme application
    if (settings.theme === THEMES.SYSTEM) {
      root.removeAttribute('data-theme')
    } else {
      root.setAttribute('data-theme', settings.theme)
    }

    // Font scaling
    root.style.setProperty('--font-scale', `${settings.fontScale ?? 1.0}`)
  },
}
