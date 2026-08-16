/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#6a4dff',
        secondary: '#FF7A18',
        'accent-yellow': '#FFD644',
        'background-light': '#F5F5F7',
        'background-dark': '#120f23',
      },
      fontFamily: {
        display: ['"Plus Jakarta Sans"', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '0.25rem',
        lg: '0.5rem',
        xl: '0.75rem',
        full: '9999px',
      },
    },
  },
  plugins: [],
};
