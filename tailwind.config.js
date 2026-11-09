/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: '#0f172a', soft: '#334155' },
        brand: { DEFAULT: '#2563eb', dark: '#1e3a8a', light: '#eff6ff' },
        // Màu quan hệ trích dẫn: giữ đúng bảng màu của graph.html trong Citenet
        rel: { seed: '#3b82f6', backward: '#10b981', forward: '#f59e0b', related: '#ec4899' },
      },
      fontFamily: { sans: ['"Be Vietnam Pro"', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
};
