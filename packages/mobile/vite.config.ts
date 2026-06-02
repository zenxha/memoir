import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command }) => {
  const serverOrigin = process.env.MEMOIR_SERVER_URL ?? 'http://localhost:3000';
  return {
    base: command === 'build' ? '/mobile/' : '/',
    plugins: [react()],
    server: {
      port: 5174,
      proxy: {
        // `/config.js` is a server-side route (packages/server/src/main.ts) that
        // injects window.__CONFIG__.mapboxToken. Without this proxy entry, the
        // <script src="/config.js"> tag in index.html 404s under `vite dev` and
        // Mapbox silently fails to render (CR-03). Mirrors desktop/vite.config.ts.
        '/api':       { target: serverOrigin, secure: false },
        '/config.js': { target: serverOrigin, secure: false },
      },
    },
  };
});
