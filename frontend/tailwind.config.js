/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Source Sans 3"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        heading: ['Fraunces', 'Georgia', 'serif'],
      },
      colors: {
        // Navy - primary brand color (Direction A: Refined Authority)
        navy: {
          DEFAULT: '#1B2A4A',
          light: '#2D4A7A',
          50: '#E8EDF4',
        },
        // Steel blue - secondary interactive color
        steel: {
          DEFAULT: '#4A7FB5',
          light: '#E8F0F8',
          dark: '#3A6A9A',
        },
        // Coral - warm accent for CTAs
        coral: {
          DEFAULT: '#E07A5F',
          light: '#FDF0EC',
        },
        // Semantic colors
        danger: {
          DEFAULT: '#C0392B',
          dark: '#922B21',
          light: '#FDECEB',
        },
        warning: {
          DEFAULT: '#E6A817',
          light: '#FFF8E1',
        },
        success: {
          DEFAULT: '#27AE60',
          light: '#EAFAF1',
        },
        info: {
          DEFAULT: '#2E86DE',
          light: '#EBF5FB',
        },
        // Surface grays
        surface: {
          DEFAULT: '#F8F9FA',
          50: '#F8F9FA',
          100: '#F1F3F5',
          200: '#E2E5E9',
          300: '#CED4DA',
          400: '#ADB5BD',
          500: '#868E96',
          600: '#5A6270',
          700: '#3D4551',
        },
        // Keep backward compatibility with existing primary/accent references
        primary: {
          50: '#E8EDF4',
          100: '#D1DBE9',
          200: '#A3B7D3',
          300: '#7593BD',
          400: '#4A7FB5',
          500: '#1B2A4A',
          600: '#162240',
          700: '#111A36',
          800: '#0C122C',
          900: '#070A22',
        },
        accent: {
          50: '#FDF0EC',
          100: '#FBE1D9',
          200: '#F7C3B3',
          300: '#F3A58D',
          400: '#E07A5F',
          500: '#D4694F',
          600: '#C45A41',
          700: '#A34835',
          800: '#873D2E',
          900: '#6F3428',
        },
      },
      borderRadius: {
        sm: '8px',
        DEFAULT: '10px',
        lg: '12px',
      },
      boxShadow: {
        'token-sm': '0 1px 2px rgba(27,42,74,0.05)',
        'token-md': '0 2px 8px rgba(27,42,74,0.08)',
        'token-lg': '0 4px 16px rgba(27,42,74,0.1)',
      },
    },
  },
  plugins: [],
}
