import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// MEMOIR_SERVER_URL overrides the proxy target — set to https://localhost:3000
// when running with Tailscale certs. Defaults to http for the test runner.
const serverOrigin = process.env.MEMOIR_SERVER_URL ?? 'http://localhost:3000';
const wsOrigin = serverOrigin.replace(/^http/, 'ws');

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api':       { target: serverOrigin, secure: false },
      '/config.js': { target: serverOrigin, secure: false },
      '/ws':        { target: wsOrigin, ws: true, secure: false },
    },
  },
});
