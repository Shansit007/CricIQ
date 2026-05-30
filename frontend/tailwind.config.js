/** @type {import('tailwindcss').Config} */
// tailwind.config.js — tells Tailwind about our custom colors and fonts
export default {
  // Tailwind scans these files to know which classes to include
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Our custom CricIQ color palette (matches CSS variables)
      colors: {
        'bg-primary':  '#0A0E1A',  // deep navy-black
        'bg-card':     '#111827',  // card background
        'card-border': '#1F2937',  // card border
        'accent-cyan': '#00D4FF',  // electric cyan
        'accent-gold': '#F4A703',  // IPL gold
        'accent-red':  '#FF4B4B',  // wicket red
        'text-primary':   '#E8EAF0',
        'text-secondary': '#9CA3AF',
      },
      // Custom fonts
      fontFamily: {
        'display': ['"Bebas Neue"', 'cursive'],  // for scores/headings
        'body':    ['Inter', 'sans-serif'],       // for body text
      },
      // Custom animations
      animation: {
        'spin-slow': 'spin 3s linear infinite',
        'pulse-fast': 'pulse 1s ease-in-out infinite',
      },
      // Background image for hero gradient
      backgroundImage: {
        'hero-gradient': 'radial-gradient(ellipse at top, #0D1B2A 0%, #0A0E1A 70%)',
        'card-gradient': 'linear-gradient(135deg, #111827, #0D1520)',
      },
    },
  },
  plugins: [],
}
