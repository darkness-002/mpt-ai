/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['selector', '[data-theme="dark"], [data-theme="midnight"]'],
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        ground: {
          light: '#ffffff',    // 1. Pure white (Light theme)
          dark: '#09090b',     // 2. Truly dark zinc-950 (Dark theme)
          zen: '#f6f8fa',      // 3. Calming cool gray-blue (Zen theme)
          midnight: '#020617', // 4. Deep navy blue slate-950 (Midnight theme)
        },
        surface: {
          light: '#f8fafc',    // Slate-50 surface
          dark: '#18181b',     // Zinc-900 surface
          zen: '#ffffff',      // Pure white surface
          midnight: '#0f172a', // Slate-900 navy surface
          subtleLight: '#f1f5f9',
          subtleDark: '#27272a',
          subtleZen: '#eef2f6',
          subtleMidnight: '#1e293b',
        },
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#2563eb',
          600: '#1d4ed8',
          700: '#1e40af',
          800: '#1e3a8a',
          900: '#172554',
          950: '#0a1128',
        },
        indigo: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
        },
        cyan: {
          50: '#ecfeff',
          100: '#cffafe',
          200: '#a5f3fc',
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',
          700: '#0e7490',
        },
        teal: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          500: '#0d9488',
          600: '#0f766e',
          700: '#115e59',
        },
        ink: {
          heading: '#0f172a',     // Dark slate-900
          body: '#334155',        // Slate-700
          muted: '#64748b',       // Slate-500
          headingDark: '#f4f4f5', // Zinc-100
          bodyDark: '#e4e4e7',    // Zinc-200
          mutedDark: '#a1a1aa',   // Zinc-400
        },
      },
      fontFamily: {
        heading: ['Inter', '"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['Inter', '"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03)',
        diffused: '0 4px 16px -2px rgba(15, 23, 42, 0.04), 0 0 2px rgba(15, 23, 42, 0.02)',
        'diffused-lg': '0 10px 25px -4px rgba(15, 23, 42, 0.06), 0 4px 10px -2px rgba(15, 23, 42, 0.03)',
        'diffused-dark': '0 4px 20px -2px rgba(0, 0, 0, 0.45), 0 0 2px rgba(255, 255, 255, 0.04)',
      },
      borderRadius: {
        '2xl': '1.25rem',
        full: '9999px',
      },
    },
  },
  plugins: [],
}
