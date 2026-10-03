/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'maybelline-pink': '#DC143C',
        'maybelline-rose': '#E11D48',
        'maybelline-light': '#FFF1F2',
        'maybelline-magenta': '#9F1239',
        black: '#1A1A1A',
        'cool-gray': '#F5F5F5',
        'mid-gray': '#CCCCCC',
        'dark-gray': '#666666',
        'pure-white': '#FFFFFF',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        heading: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Playfair Display"', 'Georgia', 'Cambria', 'serif'],
      },
      fontSize: {
        'display-2xl': ['4.5rem', { lineHeight: '1.02', letterSpacing: '-0.035em', fontWeight: '500' }],
        'display-xl': ['3.75rem', { lineHeight: '1.1', letterSpacing: '-0.03em', fontWeight: '800' }],
        'display-lg': ['3rem', { lineHeight: '1.15', letterSpacing: '-0.02em', fontWeight: '800' }],
        'display-md': ['2.25rem', { lineHeight: '1.2', letterSpacing: '-0.02em', fontWeight: '700' }],
        'display-sm': ['1.75rem', { lineHeight: '1.25', letterSpacing: '-0.01em', fontWeight: '700' }],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'fade-up': 'fadeUp 0.5s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-soft': 'pulseSoft 3s ease-in-out infinite',
        marquee: 'marquee 38s linear infinite',
        'hero-zoom': 'heroZoom 8s ease-out forwards',
        'hero-progress': 'heroProgress 6s linear forwards',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        fadeUp: { '0%': { opacity: '0', transform: 'translateY(16px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        slideUp: { '0%': { transform: 'translateY(8px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
        pulseSoft: { '0%, 100%': { opacity: '1' }, '50%': { opacity: '0.7' } },
        marquee: { '0%': { transform: 'translateX(0)' }, '100%': { transform: 'translateX(-50%)' } },
        heroZoom: { '0%': { transform: 'scale(1.08)' }, '100%': { transform: 'scale(1)' } },
        heroProgress: { '0%': { width: '0%' }, '100%': { width: '100%' } },
      },
      spacing: {
        '18': '4.5rem',
      },
    },
  },
};
