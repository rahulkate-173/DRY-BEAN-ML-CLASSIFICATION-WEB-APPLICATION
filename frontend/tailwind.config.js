/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        forest: {
          50:  '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          950: '#052e16',
        },
        sage: {
          50:  '#f8faf8',
          100: '#e8f0e9',
          200: '#d0e2d2',
          300: '#a8c9ac',
          400: '#78aa7e',
          500: '#518a58',
          600: '#3d6e44',
          700: '#325838',
          800: '#2a472f',
          900: '#243b27',
        },
        neutral: {
          warm: '#faf9f7',
          card: '#ffffff',
          border: '#e8e5e0',
          muted: '#9e9890',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
