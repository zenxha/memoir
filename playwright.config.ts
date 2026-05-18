import { defineConfig } from '@playwright/test';
import * as path from 'path';

/**
 * Playwright config for the verify loop.
 *
 * Boots:
 *   - NestJS server on :3000 (against a temp test DB)
 *   - Desktop Vite dev server on :5173
 *
 * Each test owns its own DB state via the /api/dev/* endpoints (added separately).
 * Screenshots land in tests/screenshots/ for Claude self-inspection.
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    actionTimeout: 10_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium', viewport: { width: 1440, height: 900 } },
    },
  ],
  webServer: [
    {
      command: 'pnpm --filter @memoir/server dev',
      port: 3000,
      reuseExistingServer: false,
      timeout: 30_000,
      env: {
        NODE_ENV: 'test',
        // Ephemeral DB + media directory under tests/.tmp — wiped between runs.
        // Absolute path so it lands at repo-root/tests/.tmp regardless of server cwd.
        MEMOIR_DATA_DIR: path.join(__dirname, 'tests', '.tmp', 'data'),
      },
    },
    {
      command: 'pnpm --filter @memoir/desktop dev',
      port: 5173,
      reuseExistingServer: false,
      timeout: 30_000,
    },
  ],
});
