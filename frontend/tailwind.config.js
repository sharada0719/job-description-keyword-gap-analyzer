/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        // ── CareerLens AI dark palette ───────────────────────────────────
        navy: {
          950: '#04090F',
          900: '#07111F',   // main background
          850: '#091728',
          800: '#0B1628',   // sidebar
          750: '#0D1B30',
          700: '#0F2038',
          600: '#111F33',   // card background
          500: '#14263D',   // card hover / elevated
          400: '#1A3050',
          300: '#213D63',
          200: '#2A4E7C',
          100: '#3A6496',
          50:  '#4A7AB0',
        },
        // Primary accent: vivid purple
        primary: {
          50:  '#F5F3FF',
          100: '#EDE9FE',
          200: '#DDD6FE',
          300: '#C4B5FD',
          400: '#A78BFA',
          500: '#8B5CF6',
          600: '#7C3AED',
          700: '#6D28D9',
          800: '#5B21B6',
          900: '#4C1D95',
          950: '#2E1065',
        },
        // Secondary accent: electric blue
        blue: {
          50:  '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          300: '#93C5FD',
          400: '#60A5FA',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
          800: '#1E40AF',
          900: '#1E3A8A',
        },
        // Keep success/warning/error consistent
        emerald: {
          400: '#34D399',
          500: '#22C55E',
        },
        amber: {
          400: '#FBBF24',
          500: '#F59E0B',
        },
        coral: {
          400: '#F87171',
          500: '#EF4444',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-purple': 'linear-gradient(135deg, #7C3AED 0%, #3B82F6 100%)',
        'gradient-card':   'linear-gradient(180deg, #111F33 0%, #0D1B30 100%)',
        'gradient-hero':   'linear-gradient(135deg, #0B1628 0%, #111F33 60%, #14263D 100%)',
      },
      boxShadow: {
        'card':    '0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3)',
        'card-lg': '0 4px 16px rgba(0,0,0,0.5)',
        'purple':  '0 4px 14px rgba(124,58,237,0.35)',
        'blue':    '0 4px 14px rgba(59,130,246,0.3)',
        'inset':   'inset 0 1px 0 rgba(255,255,255,0.05)',
      },
      borderColor: {
        DEFAULT: 'rgba(255,255,255,0.07)',
      },
    },
  },
  plugins: [],
}
