/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Brand blue lifted from the client's actual "Super Lab Service" logo ribbon.
        app: '#f5f7fa',
        surface: '#ffffff',
        border: { DEFAULT: '#e1e6ec', strong: '#c7cfd9' },
        ink: { DEFAULT: '#1a2430', 2: '#57677a', 3: '#8593a3' },
        accent: {
          DEFAULT: '#1b6fae',
          ink: '#125483',
          soft: '#e8f1f9',
          softBorder: '#bfdcf0'
        },
        success: { DEFAULT: '#1f8a54', soft: '#e7f6ee' },
        warning: { DEFAULT: '#9a6b00', soft: '#fdf3df' },
        danger: { DEFAULT: '#c23b33', soft: '#fceae8' },
        info: { DEFAULT: '#1b6fae', soft: '#e8f1f9' }
      }
    }
  },
  plugins: []
}
