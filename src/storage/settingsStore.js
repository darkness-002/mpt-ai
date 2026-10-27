const SETTINGS_KEY = 'mpt_ai_settings'

export const THEMES = {
  LIGHT: 'light',          // 1. Minimal Light (Default)
  MIDNIGHT: 'midnight',    // 2. Midnight Slate
  IVORY: 'ivory',          // 3. Warm Ivory
  OLED: 'oled',            // 4. OLED Console
  // Backward compatibility aliases
  DARK: 'midnight',
  SEPIA: 'ivory',
  SYSTEM: 'system',
}

export const THEME_LIST = [
  { id: THEMES.LIGHT, label: 'Minimal Light', desc: 'Pure white & slate-50 (Default)' },
  { id: THEMES.MIDNIGHT, label: 'Midnight Slate', desc: 'Modern slate dark mode' },
  { id: THEMES.IVORY, label: 'Warm Ivory', desc: 'Reading cream & warm sepia' },
  { id: THEMES.OLED, label: 'OLED Console', desc: 'True black & neon accents' },
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

    const theme = settings.theme || THEMES.LIGHT

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
      theme === THEMES.MIDNIGHT ||
      theme === THEMES.OLED ||
      theme === 'dark' ||
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
