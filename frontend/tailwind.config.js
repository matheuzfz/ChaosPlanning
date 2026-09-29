/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        poker: {
          felt: '#1b6e41',
          feltDark: '#162238',
          tableBorder: '#3b2219',
          card: '#ffffff',
          gold: '#f59e0b',
        }
      },
      boxShadow: {
        'felt-inner': 'inset 0 0 50px rgba(0, 0, 0, 0.45)',
        'table-border': '0 0 0 12px #2d1810, 0 20px 40px -15px rgba(0,0,0,0.6)',
        'table-border-dark': '0 0 0 12px #0f172a, 0 20px 40px -15px rgba(0,0,0,0.8)',
      }
    },
  },
  plugins: [],
}
