/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['selector', '[data-theme="dark"]'],
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Pure black (#000000) and pure white (#FFFFFF) are strictly banned.
        ground: {
          light: '#fafaf9', // Warm stone-50 porcelain
          dark: '#0c0d12',  // Carbon slate-950
        },
        surface: {
          light: '#f5f5f3',
          dark: '#13151f',
          subtleLight: '#ebebe8',
          subtleDark: '#1a1d2b',
        },
        // Bespoke High-Contrast Royal Cobalt palette (Zero Purple)
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
        teal: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          500: '#0d9488',
          600: '#0f766e',
          700: '#115e59',
        },
        // Anti-strain body and heading text scales
        ink: {
          heading: '#18181b',     // Zinc-900 (never pure black)
          body: '#3f3f46',        // Zinc-700
          muted: '#71717a',       // Zinc-500
          headingDark: '#f4f4f5', // Zinc-100 (never pure white)
          bodyDark: '#cbd5e1',    // Slate-300
          mutedDark: '#94a3b8',   // Slate-400
        },
      },
      fontFamily: {
        heading: ['"Space Grotesk"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['"Plus Jakarta Sans"', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        // Multi-layer ambient diffused shadow overriding harsh default shadows
        diffused: '0 4px 20px -2px rgba(12, 13, 17, 0.03), 0 0 3px rgba(12, 13, 17, 0.02), 0 12px 32px -4px rgba(12, 13, 17, 0.05)',
        'diffused-lg': '0 8px 30px -4px rgba(12, 13, 17, 0.04), 0 20px 48px -8px rgba(12, 13, 17, 0.07), 0 0 4px rgba(12, 13, 17, 0.02)',
        'diffused-dark': '0 4px 24px -2px rgba(0, 0, 0, 0.4), 0 0 3px rgba(255, 255, 255, 0.04)',
      },
      borderRadius: {
        '2xl': '1.25rem',
        full: '9999px',
      },
    },
  },
  plugins: [],
}
