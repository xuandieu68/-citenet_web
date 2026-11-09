import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages đặt web ở https://<username>.github.io/<tên-repo>/ → base phải trùng tên repo
export default defineConfig({
  plugins: [react()],
  base: '/-citenet_web/',
});
