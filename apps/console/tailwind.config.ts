import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#FFF7ED',
          100: '#FFEDD5',
          200: '#FED7AA',
          300: '#FDBA74',
          400: '#FB923C',
          500: '#F97316',
          600: '#EA580C',
          700: '#C2410C',
          800: '#9A3412',
          900: '#7C2D12',
          950: '#431407',
        },
        accent: {
          50: '#F5F3FF',
          100: '#EDE9FE',
          200: '#DDD6FE',
          300: '#C4B5FD',
          400: '#A78BFA',
          500: '#8B5CF6',
          600: '#7C3AED',
          700: '#6D28D9',
          800: '#5B21B6',
          900: '#4C1D95',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['var(--font-instrument)', 'ui-serif', 'Georgia', 'serif'],
        mono: ['var(--font-geist-mono)', 'ui-monospace', 'Menlo', 'monospace'],
      },
      borderRadius: {
        card: '14px',
        btn: '8px',
      },
      boxShadow: {
        'soft-sm': '0 1px 2px rgba(24,24,27,0.04), 0 1px 1px rgba(24,24,27,0.03)',
        'soft-md': '0 4px 12px rgba(24,24,27,0.06), 0 2px 4px rgba(24,24,27,0.04)',
        'soft-lg': '0 16px 40px rgba(24,24,27,0.10), 0 4px 12px rgba(24,24,27,0.05)',
        warm: '0 20px 50px rgba(249,115,22,0.18)',
      },
    },
  },
};

export default config;
