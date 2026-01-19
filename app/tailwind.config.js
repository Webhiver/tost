/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Theme colors using CSS variables
        void: 'var(--color-void)',
        primary: 'var(--color-primary)',
        secondary: 'var(--color-secondary)',
        tertiary: 'var(--color-tertiary)',
        elevated: 'var(--color-elevated)',
        'text-primary': 'var(--color-text-primary)',
        'text-secondary': 'var(--color-text-secondary)',
        'text-muted': 'var(--color-text-muted)',
        flame: '#ff6b35',
        'flame-glow': 'rgba(255, 107, 53, 0.25)',
        cool: '#00d4aa',
        'cool-glow': 'rgba(0, 212, 170, 0.25)',
        idle: '#3a86ff',
        warning: '#ffd60a',
        'border-subtle': 'var(--color-border-subtle)',
        'border-visible': 'var(--color-border-visible)',
        error: 'var(--color-error)',
        'error-bg': 'var(--color-error-bg)',
      },
      fontFamily: {
        sans: ['DM Sans', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['JetBrains Mono', 'SF Mono', 'monospace'],
      },
      borderRadius: {
        'sm': '8px',
        'md': '16px',
        'lg': '24px',
        'xl': '32px',
      },
      boxShadow: {
        'lg': '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        'glow-flame': '0 0 60px rgba(255, 107, 53, 0.25)',
        'glow-cool': '0 0 60px rgba(0, 212, 170, 0.25)',
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'flame-pulse': 'flame-pulse 1.5s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
        'spin': 'spin 1s linear infinite',
        'fade-in': 'fadeIn 0.3s ease forwards',
        'slide-up': 'slideUp 0.4s ease forwards',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(255, 214, 10, 0.3)' },
          '50%': { boxShadow: '0 0 20px 2px rgba(255, 214, 10, 0.15)' },
        },
        'flame-pulse': {
          '0%, 100%': { opacity: 1, transform: 'scale(1)' },
          '50%': { opacity: 0.6, transform: 'scale(0.85)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        'fadeIn': {
          'from': { opacity: 0, transform: 'translateY(10px)' },
          'to': { opacity: 1, transform: 'translateY(0)' },
        },
        'slideUp': {
          'from': { opacity: 0, transform: 'translateY(30px)' },
          'to': { opacity: 1, transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
