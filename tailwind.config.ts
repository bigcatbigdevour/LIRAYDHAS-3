import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0a0a0a',
        ink: '#f4f1ea',
        'ink-dim': '#888888',
        'ink-faint': '#555555',
        hairline: '#222222',
        accent: '#8b3a3a',
        // desaturated traditional HD center colors against black
        hd: {
          yellow: '#9c8a3a',
          brown: '#6e553a',
          red: '#8b3a3a',
          green: '#3a7a52',
        },
      },
      fontFamily: {
        serif: ['var(--font-serif)', 'PT Serif', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'Inter', 'system-ui', 'sans-serif'],
      },
      letterSpacing: {
        'caps': '0.1em',
        'caps-wide': '0.16em',
      },
      borderRadius: {
        none: '0',
      },
    },
  },
  plugins: [],
};

export default config;
