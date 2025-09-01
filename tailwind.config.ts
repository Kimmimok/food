import type { Config } from 'tailwindcss'

export default {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'white',
        foreground: '#0a0a0a',
        muted: '#f5f5f5'
      }
    },
  },
  plugins: [],
} satisfies Config
