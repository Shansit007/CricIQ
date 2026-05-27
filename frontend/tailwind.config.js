/** @type {import('tailwindcss').Config} */
export default {
  // Tell Tailwind where our React files are
  // So it only includes CSS classes we actually use
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Custom CricIQ colors
      colors: {
        cricket: {
          green: "#1a7a4a",   // cricket field green
          dark: "#0a0a0a",    // dark background
          card: "#1a1a2e",    // card background
          accent: "#e63946",  // red accent
          gold: "#ffd60a",    // gold for highlights
        }
      }
    },
  },
  plugins: [],
}