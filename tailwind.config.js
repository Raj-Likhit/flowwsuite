/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        base: '#0A0A0A',
        surface: '#111111',
        'surface-light': '#1A1A1A',
        primary: {
          DEFAULT: 'var(--primary)',
          400: 'var(--primary-400)',
          500: 'var(--primary-500)',
          600: 'var(--primary-600)',
        },
        secondary: {
          DEFAULT: 'var(--secondary)',
          400: 'var(--secondary-400)',
          500: 'var(--secondary-500)',
        },
        accent: {
          start: 'var(--accent-start)',
          end: 'var(--accent-end)',
        },
        slate: {
          950: '#020617',
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'hero-glow': 'conic-gradient(from 180deg at 50% 50%, var(--accent-start-trans) 0deg, var(--accent-end-trans) 180deg, var(--accent-start-trans) 360deg)',
        'accent-gradient': 'linear-gradient(to right, var(--accent-start), var(--accent-end))',
      },
      animation: {
        'blob': 'blob 7s infinite',
        'fade-in': 'fadeIn 0.5s ease-out forwards',
        'ring-pulse': 'ringPulse 2s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        blob: {
          '0%': { transform: 'translate(0px, 0px) scale(1)' },
          '33%': { transform: 'translate(30px, -50px) scale(1.1)' },
          '66%': { transform: 'translate(-20px, 20px) scale(0.9)' },
          '100%': { transform: 'translate(0px, 0px) scale(1)' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        ringPulse: {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
      },
    },
  },
  plugins: [],
}
