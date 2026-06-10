/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'terrain-dark': '#0F172A',
        'terrain-card': '#1E293B',
        'terrain-accent': '#F59E0B',
        'terrain-text': '#E2E8F0',
        'terrain-muted': '#94A3B8',
      },
      fontFamily: {
        'display': ['Space Grotesk', 'sans-serif'],
        'body': ['Inter', 'sans-serif'],
      },
      backdropBlur: {
        'terrain': '12px',
      }
    },
  },
  plugins: [],
}
