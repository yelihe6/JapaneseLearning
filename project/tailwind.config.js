/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'fade-in-scale': {
          '0%': { opacity: '0', transform: 'scale(0.92)' },
          '70%': { opacity: '1', transform: 'scale(1.02)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'backdrop-fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'fade-out-scale': {
          '0%': { opacity: '1', transform: 'scale(1)' },
          '100%': { opacity: '0', transform: 'scale(0.95)' },
        },
        'backdrop-fade-out': {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease-out forwards',
        'fade-in-scale': 'fade-in-scale 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        'backdrop-fade-in': 'backdrop-fade-in 0.2s ease-out forwards',
        'fade-out-scale': 'fade-out-scale 0.2s ease-in forwards',
        'backdrop-fade-out': 'backdrop-fade-out 0.2s ease-in forwards',
      },
    },
  },
  plugins: [],
};
