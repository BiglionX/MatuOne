/** Tailwind 只引用 CSS 变量，色值单点定义在 src/styles/tokens.css */
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: 'rgb(var(--brand-rgb) / <alpha-value>)',
          strong: 'rgb(var(--brand-strong-rgb) / <alpha-value>)',
          soft: 'rgb(var(--brand-soft-rgb) / <alpha-value>)',
          action: 'rgb(var(--brand-action-rgb) / <alpha-value>)',
          'action-strong': 'rgb(var(--brand-action-strong-rgb) / <alpha-value>)',
        },
        success: {
          DEFAULT: 'rgb(var(--success-rgb) / <alpha-value>)',
          soft: 'rgb(var(--success-soft-rgb) / <alpha-value>)',
        },
        danger: {
          DEFAULT: 'rgb(var(--danger-rgb) / <alpha-value>)',
          soft: 'rgb(var(--danger-soft-rgb) / <alpha-value>)',
        },
        warning: {
          DEFAULT: 'rgb(var(--warning-rgb) / <alpha-value>)',
          soft: 'rgb(var(--warning-soft-rgb) / <alpha-value>)',
        },
        ink: {
          DEFAULT: 'rgb(var(--ink-rgb) / <alpha-value>)',
          soft: 'rgb(var(--ink-soft-rgb) / <alpha-value>)',
        },
        line: 'rgb(var(--line-rgb) / <alpha-value>)',
        canvas: 'rgb(var(--bg-rgb) / <alpha-value>)',
        'code-bg': 'rgb(var(--code-bg-rgb) / <alpha-value>)',
      },
      borderRadius: {
        card: 'var(--radius-card)',
        field: 'var(--radius-field)',
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        pop: 'var(--shadow-pop)',
      },
      fontFamily: {
        sans: ['var(--font-sans)'],
        mono: ['var(--font-mono)'],
      },
    },
  },
  plugins: [],
}
