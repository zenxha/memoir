import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/mobile/' : '/',
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      '/api': { target: process.env.MEMOIR_SERVER_URL ?? 'http://localhost:3000', secure: false },
    },
  },
}));
