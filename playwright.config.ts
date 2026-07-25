import { defineConfig, devices } from '@playwright/test';

const PORT = 4300;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env['CI'],
  // One retry absorbs the occasional dev-server navigation stall; failures still surface.
  retries: process.env['CI'] ? 2 : 1,
  workers: 1,
  reporter: process.env['CI'] ? [['github'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    navigationTimeout: 60_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // Run against the production build served statically (not `ng serve`) so the
  // lazy exceljs export chunk is a real static file — deterministic downloads,
  // no dev-server dependency-optimization reloads.
  webServer: {
    command: `npm run build && PORT=${PORT} node e2e/static-server.mjs`,
    url: BASE_URL,
    reuseExistingServer: !process.env['CI'],
    timeout: 240_000,
  },
});
