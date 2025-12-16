import defaultTheme from 'tailwindcss/defaultTheme';
import plugin from 'tailwindcss/plugin';

const rgbVar = (variable) => `rgb(var(${variable}) / <alpha-value>)`;
const solidVar = (variable) => `var(${variable})`;

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['index.html', 'src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: '1.5rem',
        lg: '2rem',
      },
      screens: {
        '2xl': '1440px',
      },
    },
    extend: {
      colors: {
        brand: {
          emerald: '#10b981',
          teal: '#14b8a6',
          hover: '#0eb07a',
          focus: '#10b981',
        },
        skin: {
          bg: solidVar('--bg'),
          surface: solidVar('--surface'),
          border: solidVar('--border'),
          text: solidVar('--text'),
          muted: solidVar('--muted'),
          primary: solidVar('--primary'),
        },
        background: {
          DEFAULT: rgbVar('--ui-bg'),
          surface: rgbVar('--ui-surface'),
          muted: rgbVar('--ui-muted-surface'),
          card: rgbVar('--ui-card'),
        },
        foreground: {
          DEFAULT: rgbVar('--ui-foreground'),
          muted: rgbVar('--ui-foreground-muted'),
          soft: rgbVar('--ui-foreground-soft'),
        },
        border: rgbVar('--ui-border'),
        input: rgbVar('--ui-input'),
        ring: rgbVar('--ui-ring'),
        success: solidVar('--success'),
        danger: solidVar('--danger'),
        warning: solidVar('--warning'),
        info: '#0ea5e9',
        semantic: {
          success: solidVar('--success'),
          'success-light': solidVar('--success-light'),
          'success-dark': solidVar('--success-dark'),
          warning: solidVar('--warning'),
          'warning-light': solidVar('--warning-light'),
          'warning-yellow': solidVar('--warning-yellow'),
          danger: solidVar('--danger'),
          'border-success': solidVar('--border-success'),
        },
        bank: {
          DEFAULT: '#2563eb',
          dark: '#1d4ed8',
          light: 'rgba(37, 99, 235, 0.12)',
          accent: 'rgba(37, 99, 235, 0.3)',
        },
        chart: {
          bg: solidVar('--bg-hover'),
          success: solidVar('--success'),
          warning: solidVar('--warning'),
          danger: solidVar('--danger'),
        },
      },
      backgroundColor: {
        'ui-bg': rgbVar('--ui-bg'),
        'ui-surface': rgbVar('--ui-surface'),
        'ui-muted': rgbVar('--ui-muted-surface'),
        'ui-card': rgbVar('--ui-card'),
      },
      borderColor: {
        DEFAULT: rgbVar('--ui-border'),
        ui: rgbVar('--ui-border'),
        subtle: 'rgb(var(--ui-border) / 0.6)',
        success: solidVar('--border-success'),
      },
      fontFamily: {
        sans: ['Inter', 'Space Grotesk', ...defaultTheme.fontFamily.sans],
      },
      fontSize: {
        '2xs': ['0.65rem', { lineHeight: '0.9rem' }],
        xs: ['0.75rem', { lineHeight: '1rem' }],
        sm: ['0.875rem', { lineHeight: '1.25rem' }],
        base: ['1rem', { lineHeight: '1.5rem' }],
        lg: ['1.125rem', { lineHeight: '1.75rem' }],
      },
      borderRadius: {
        xl: '1.25rem',
        '2xl': '1.75rem',
        '3xl': '2.5rem',
        pill: '999px',
      },
      boxShadow: {
        card: '0 30px 60px rgba(2, 6, 23, 0.35)',
        glow: '0 0 30px rgba(16, 185, 129, 0.35)',
        glass: '0 20px 45px rgba(2, 6, 23, 0.5)',
        header: '0 12px 35px rgba(2, 6, 23, 0.45)',
        bank: '0 2px 8px rgba(37, 99, 235, 0.25)',
        'bank-strong': '0 4px 12px rgba(37, 99, 235, 0.35)',
      },
      spacing: {
        13: '3.25rem',
        15: '3.75rem',
        18: '4.5rem',
        22: '5.5rem',
        26: '6.5rem',
      },
      opacity: {
        15: '0.15',
      },
      keyframes: {
        fade: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        glow: {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        },
        'spin-slow': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        fade: 'fade 200ms ease-in-out',
        'slide-up': 'slide-up 240ms cubic-bezier(0.16, 1, 0.3, 1)',
        glow: 'glow 2.4s ease-in-out infinite',
        'spin-slow': 'spin-slow 3s linear infinite',
      },
      backgroundImage: {
        'brand-radial': 'radial-gradient(circle at 20% 20%, rgba(16, 185, 129, 0.3), transparent 55%)',
        'brand-linear': 'linear-gradient(130deg, #10b981, #14b8a6)',
        'bank-hero': 'linear-gradient(135deg, rgb(var(--ui-bg) / 0.95) 0%, rgb(var(--success-rgb) / 0.45) 55%, rgb(var(--ui-card) / 0.9) 100%)',
      },
    },
  },
  plugins: [
    plugin(({ addVariant }) => {
      addVariant('hocus', ['&:hover', '&:focus-visible']);
    }),
  ],
};
