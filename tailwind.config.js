/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#ecfdf5',
          100: '#d1fae5',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
        },
      },
      borderRadius: {
        app: '0.75rem',
      },
      boxShadow: {
        card: '0 10px 30px -10px rgb(15 23 42 / 0.22)',
        modal: '0 24px 64px -16px rgb(15 23 42 / 0.35)',
      },
      spacing: {
        section: '1.5rem',
      },
    },
  },
  plugins: [],
};
