/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './templates/**/*.html',
    './apps/**/*.py',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
        success: {
          50:  '#f0fdf4',
          100: '#dcfce7',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
        },
        warning: {
          50:  '#fffbeb',
          100: '#fef3c7',
          500: '#f59e0b',
          600: '#d97706',
        },
        danger: {
          50:  '#fef2f2',
          100: '#fee2e2',
          500: '#ef4444',
          600: '#dc2626',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      animation: {
        'fade-in':      'fadeIn 0.6s ease-out forwards',
        'fade-in-up':   'fadeInUp 0.6s ease-out forwards',
        'fade-in-down': 'fadeInDown 0.5s ease-out forwards',
        'scale-in':     'scaleIn 0.4s ease-out forwards',
        'float':        'float 6s ease-in-out infinite',
      },
      keyframes: {
        fadeIn:     { '0%': { opacity: '0' },                                         '100%': { opacity: '1' } },
        fadeInUp:   { '0%': { opacity: '0', transform: 'translateY(20px)' },          '100%': { opacity: '1', transform: 'translateY(0)' } },
        fadeInDown: { '0%': { opacity: '0', transform: 'translateY(-10px)' },         '100%': { opacity: '1', transform: 'translateY(0)' } },
        scaleIn:    { '0%': { opacity: '0', transform: 'scale(0.95)' },               '100%': { opacity: '1', transform: 'scale(1)' } },
        float:      { '0%, 100%': { transform: 'translateY(0)' },                     '50%':  { transform: 'translateY(-10px)' } },
      },
    },
  },
  plugins: [],
}
