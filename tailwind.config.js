/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        /* Official FLOATE Brand Tokens */
        'floate-green': 'var(--floate-green, #1B5E20)',
        'floate-green-deep': 'var(--floate-green-deep, #123F16)',
        'floate-green-light': 'var(--floate-green-light, #2E7D32)',
        'floate-yellow': 'var(--floate-yellow, #FFC107)',
        'floate-yellow-tint': 'var(--floate-yellow-tint, rgba(255, 193, 7, 0.14))',
        'floate-yellow-border': 'var(--floate-yellow-border, rgba(255, 193, 7, 0.50))',

        /* Light Surfaces */
        'surface-cream': 'var(--surface-cream, #FFF8E1)',
        'surface-paper': 'var(--surface-paper, #F7F7F2)',
        'surface-white': 'var(--surface-white, #FFFFFF)',
        'mint-50': 'var(--mint-50, #E8F5E9)',
        'mint-100': 'var(--mint-100, #C8E6C9)',

        /* Typography */
        'text-on-green': 'var(--text-on-green, #FFFFFF)',
        'text-on-green-body': 'var(--text-on-green-body, #E3F0E3)',
        'text-on-green-muted': 'var(--text-on-green-muted, #CFE3CF)',
        'text-on-green-subtle': 'var(--text-on-green-subtle, #B9D6B9)',
        'nav-on-green': 'var(--nav-on-green, #D9EAD9)',
        'text-strong': 'var(--text-strong, #111111)',
        'text-body': 'var(--text-body, #555555)',
        'text-muted': 'var(--text-muted, #666666)',

        /* Borders & Lines */
        'border-light': 'var(--border-light, #E5E5E5)',
        'border-on-green': 'var(--border-on-green, rgba(255, 255, 255, 0.16))',
        'divider-on-green': 'var(--divider-on-green, rgba(255, 255, 255, 0.18))',

        /* Status & Live */
        'live-dot': 'var(--live-dot, #7CFC8A)',
        'live-dot-ring': 'var(--live-dot-ring, rgba(124, 252, 138, 0.25))',
        'whatsapp': 'var(--whatsapp, #25D366)',
      }
    },
  },
  plugins: [],
};
