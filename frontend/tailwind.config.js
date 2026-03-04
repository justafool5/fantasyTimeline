/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        'fantasy-heading': ['"Cormorant Garamond"', 'serif'],
        'fantasy-body': ['Lato', 'sans-serif'],
        'scifi-heading': ['Orbitron', 'sans-serif'],
        'scifi-body': ['Rajdhani', 'sans-serif'],
      },
      colors: {
        fantasy: {
          bg: '#f4e4bc',
          'bg-secondary': '#e6d2a0',
          text: '#2c1810',
          accent: '#8a0303',
          border: '#d4af37',
          muted: '#8b7355',
          card: '#f9f1d8',
        },
        scifi: {
          bg: '#050510',
          'bg-secondary': '#0a0a20',
          text: '#e0e0ff',
          accent: '#00f3ff',
          'accent-secondary': '#ff00ff',
          border: '#0066cc',
          muted: '#4a5568',
          card: '#0a1428',
        },
      },
    },
  },
  plugins: [],
};
