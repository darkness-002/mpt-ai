const SETTINGS_KEY = 'mpt_ai_settings'

export const THEMES = {
  LIGHT: 'light',          // 1. Light: Pure white & slate-50
  DARK: 'dark',            // 2. Dark (Fixed): Truly dark zinc-950 & charcoal
  ZEN: 'zen',              // 3. Zen: Calming gray-blue & soft indigo
  MIDNIGHT: 'midnight',    // 4. Midnight: Deep navy blue & sky cyan
  // Backward compatibility aliases
  OLED: 'dark',
  SEPIA: 'zen',
  IVORY: 'zen',
  SYSTEM: 'system',
}

export const THEME_LIST = [
  { id: THEMES.LIGHT, label: 'Light', desc: 'Pure white & slate-50' },
  { id: THEMES.DARK, label: 'Dark', desc: 'Zinc-950 deep charcoal' },
  { id: THEMES.ZEN, label: 'Zen', desc: 'Calming gray-blue' },
  { id: THEMES.MIDNIGHT, label: 'Midnight', desc: 'Deep navy & sky blue' },
]

export const FONT_SCALES = {
  COMPACT: 0.9,
  NORMAL: 1.0,
  LARGE: 1.15,
  XLARGE: 1.3,
}

const DEFAULT_SETTINGS = {
  theme: THEMES.LIGHT,
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

    let theme = settings.theme || THEMES.LIGHT
    if (theme === 'oled') theme = THEMES.DARK
    if (theme === 'sepia' || theme === 'ivory' || theme === 'warm-ivory') theme = THEMES.ZEN

    // Theme application
    if (theme === THEMES.SYSTEM) {
      root.removeAttribute('data-theme')
    } else {
      root.setAttribute('data-theme', theme)
    }

    const isSystemDark =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-color-scheme: dark)').matches

    const isDark =
      theme === THEMES.DARK ||
      theme === THEMES.MIDNIGHT ||
      (theme === THEMES.SYSTEM && isSystemDark)

    if (isDark) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }

    // Font scaling
    root.style.setProperty('--font-scale', `${settings.fontScale ?? 1.0}`)
  },
}
