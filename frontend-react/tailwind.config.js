/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        primary: '#DC2626',
        accent: '#1A1D2E',
        navy: '#1A1D2E',
        success: '#059669',
        danger: '#DC2626',
        warning: '#F59E0B',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0,0,0,0.1)',
        'card-hover': '0 10px 40px rgba(220,38,38,0.15)',
        'glow': '0 0 32px rgba(220,38,38,0.4)',
        'glow-accent': '0 0 32px rgba(26,29,46,0.4)',
        'glow-success': '0 0 32px rgba(16,185,129,0.4)',
        'inner-sm': 'inset 0 1px 2px rgba(0,0,0,0.06)',
        'xl': '0 20px 60px rgba(0,0,0,0.15)',
      },
      backgroundImage: {
        'hero-gradient': 'radial-gradient(ellipse 90% 70% at 60% 0%, rgba(220,38,38,0.3), transparent), linear-gradient(160deg, #1A1D2E 0%, #2D1A1A 55%, #991B1B 100%)',
        'primary-gradient': 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
        'accent-gradient': 'linear-gradient(135deg, #1A1D2E 0%, #0F1117 100%)',
        'success-gradient': 'linear-gradient(135deg, #059669 0%, #047857 100%)',
        'danger-gradient': 'linear-gradient(135deg, #DC2626 0%, #991B1B 100%)',
        'card-shimmer': 'linear-gradient(105deg, rgba(255,255,255,0) 40%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0) 60%)',
        'gradient-blue': 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
        'gradient-accent': 'linear-gradient(135deg, #1A1D2E 0%, #0F1117 100%)',
      },
      animation: {
        'fade-up': 'fadeUp 0.6s ease-out both',
        'fade-in': 'fadeIn 0.5s ease-out both',
        'slide-in': 'slideIn 0.5s ease-out both',
        'blob': 'blob 10s infinite ease-in-out',
        'spin-slow': 'spin 8s linear infinite',
        'ping-slow': 'ping 2.5s cubic-bezier(0,0,0.2,1) infinite',
        'pulse-soft': 'pulse-soft 3s ease-in-out infinite',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { opacity: '0', transform: 'translateX(-20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        blob: {
          '0%, 100%': { transform: 'translate(0,0) scale(1)' },
          '33%': { transform: 'translate(30px,-20px) scale(1.1)' },
          '66%': { transform: 'translate(-15px,15px) scale(0.95)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
      },
    },
  },
  plugins: [],
}
