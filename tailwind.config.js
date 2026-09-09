/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        dark: {
          bg: '#0A0A0A',
          card: '#171717',
          tertiary: '#262626',
          border: '#262626',
        },
        light: {
          bg: '#FAFAFA',
          card: '#FFFFFF',
          tertiary: '#F4F4F5',
          border: '#E5E5E5',
        },
        present: {
          bg: 'var(--color-present-bg)',
          text: 'var(--color-present-text)',
          border: 'var(--color-present-border)'
        },
        absent: {
          bg: 'var(--color-absent-bg)',
          text: 'var(--color-absent-text)',
          border: 'var(--color-absent-border)'
        },
        od: {
          bg: 'var(--color-od-bg)',
          text: 'var(--color-od-text)',
          border: 'var(--color-od-border)'
        },
        medical: {
          bg: 'var(--color-medical-bg)',
          text: 'var(--color-medical-text)',
          border: 'var(--color-medical-border)'
        },
        permission: {
          bg: 'var(--color-permission-bg)',
          text: 'var(--color-permission-text)',
          border: 'var(--color-permission-border)'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace']
      }
    },
  },
  plugins: [],
}
