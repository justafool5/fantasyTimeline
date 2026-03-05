/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        'fantasy-heading': ['Cinzel', 'serif'],
        'fantasy-body': ['"Crimson Text"', 'Georgia', 'serif'],
        'scifi-heading': ['Orbitron', 'sans-serif'],
        'scifi-body': ['Rajdhani', 'sans-serif'],
      },
      colors: {
        fantasy: {
          bg: '#1a1209',
          'bg-secondary': '#231a0f',
          text: '#d4c4a0',
          accent: '#c9a84c',
          'accent-red': '#8a2020',
          border: '#5c3a1e',
          muted: '#7a6a50',
          card: '#1e160d',
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
