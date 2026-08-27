import type { Config } from 'tailwindcss';

/** Palette shared with the client portal design. */
const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0F3D2E',   // deep green — sidebar, headings, primary buttons
          dark:    '#0A2A20',
          light:   '#8BC53F',   // lime accent
          50:      '#F1F6EC',
          100:     '#DCE9CE',
        },
        lime: {
          DEFAULT: '#8BC53F',
          soft:    '#F1F6EC',
          border:  '#DCE9CE',
          text:    '#3f6b2b',
        },
        ink: {
          DEFAULT: '#16241d',
          strong:  '#123528',
          body:    '#3c463f',
          mid:     '#5b6660',
          muted:   '#8b968f',
        },
        line: {
          DEFAULT: '#E7EAE5',
          soft:    '#EDEFEC',
          btn:     '#D8E0DC',
        },
        canvas: '#F6F8F5',
        panel:  '#FAFBF9',
        due:    '#c2703c',
      },
      fontFamily: {
        sans: ['Helvetica Neue', 'Helvetica', 'Arial', 'sans-serif'],
      },
      borderRadius: {
        lg: '9px',
        xl: '12px',
        '2xl': '16px',
        '3xl': '20px',
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(15,61,46,0.05), 0 1px 2px -1px rgba(15,61,46,0.04)',
        'card-md': '0 8px 24px 0 rgba(15,61,46,0.08)',
      },
      keyframes: {
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        navbar: {
          '0%':   { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(400%)' },
        },
        pulseDot: {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.35' },
        },
      },
      animation: {
        fadeUp: 'fadeUp 0.4s ease both',
        pulseDot: 'pulseDot 2s ease-in-out infinite',
        navbar: 'navbar 1.1s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
