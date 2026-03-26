/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        primary: '#0057FF',
        secondary: '#00C27C',
        danger: '#FF4455',
        warning: '#FF8C00',
        success: '#00C27C',
        accent: '#FFB700',
        navy: '#020C1B',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 2px 16px rgba(2,12,27,0.07)',
        'card-hover': '0 8px 40px rgba(2,12,27,0.14)',
        'glow': '0 0 32px rgba(0,87,255,0.3)',
        'glow-accent': '0 0 32px rgba(255,183,0,0.35)',
        'inner-sm': 'inset 0 1px 2px rgba(2,12,27,0.06)',
      },
      backgroundImage: {
        'hero-gradient': 'radial-gradient(ellipse 90% 70% at 60% 0%, rgba(0,87,255,0.22), transparent), linear-gradient(160deg, #020C1B 0%, #061730 55%, #071E3D 100%)',
        'primary-gradient': 'linear-gradient(135deg, #0057FF 0%, #003DC5 100%)',
        'accent-gradient': 'linear-gradient(135deg, #FFB700 0%, #FF8C00 100%)',
        'success-gradient': 'linear-gradient(135deg, #00C27C 0%, #009960 100%)',
        'danger-gradient': 'linear-gradient(135deg, #FF4455 0%, #CC1122 100%)',
        'card-shimmer': 'linear-gradient(105deg, rgba(255,255,255,0) 40%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0) 60%)',
      },
      animation: {
        'fade-up': 'fadeUp 0.5s ease-out both',
        'fade-in': 'fadeIn 0.4s ease-out both',
        'blob': 'blob 10s infinite ease-in-out',
        'spin-slow': 'spin 8s linear infinite',
        'ping-slow': 'ping 2.5s cubic-bezier(0,0,0.2,1) infinite',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(18px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        blob: {
          '0%, 100%': { transform: 'translate(0,0) scale(1)' },
          '33%': { transform: 'translate(30px,-20px) scale(1.1)' },
          '66%': { transform: 'translate(-15px,15px) scale(0.95)' },
        },
      },
    }
  },
  plugins: []
}
