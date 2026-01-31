/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        heading: ['Nunito', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      colors: {
        // Sage green - main brand color
        primary: {
          50: '#f6f7f6',
          100: '#e3e7e3',
          200: '#c7d0c7',
          300: '#a3b2a3',
          400: '#7d917d',
          500: '#6B9080',  // Main sage (from mockup)
          600: '#5a7a6d',
          700: '#4A7766',
          800: '#3d5f52',
          900: '#334d43',
        },
        // Coral - accent color for CTAs
        accent: {
          50: '#fef4f2',
          100: '#fde7e3',
          200: '#fcd3cb',
          300: '#f9b4a6',
          400: '#E07A5F',  // Main coral (from mockup)
          500: '#d4694f',
          600: '#c45a41',
          700: '#a34835',
          800: '#873d2e',
          900: '#6f3428',
        },
      },
    },
  },
  plugins: [],
}
