/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        app: '#f6f7f7',
        surface: '#ffffff',
        border: { DEFAULT: '#e2e5e6', strong: '#cbd1d3' },
        ink: { DEFAULT: '#1a2023', 2: '#5c6569', 3: '#8a9094' },
        accent: {
          DEFAULT: '#2c7a73',
          ink: '#1f5a55',
          soft: '#e6f2f0',
          softBorder: '#bfe0db'
        },
        success: { DEFAULT: '#2f7d4f', soft: '#eaf5ee' },
        warning: { DEFAULT: '#8a5a00', soft: '#fcf3df' },
        danger: { DEFAULT: '#b3261e', soft: '#fbeae8' },
        info: { DEFAULT: '#1f5fa8', soft: '#e9f1fa' }
      }
    }
  },
  plugins: []
}
