/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        saffron: '#FF9933',
        indiaGreen: '#138808',
        navyBlue: '#000080',
        darkBg: '#0f172a',
        cardBg: '#1e293b',
        cardBorder: '#334155',
      },
      animation: {
        'pulse-critical': 'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
}
