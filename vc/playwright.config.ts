import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  retries: 0,
  use: {
    // Use isolated browser context — never use default user profile
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
    browserName: 'chromium',
    headless: true,
    // Disable geolocation, camera, notifications etc.
    permissions: [],
    // Don't save storage state to disk
    storageState: undefined,
    trace: 'on-first-retry',
  },
  // Only launch browser through Playwright — never attach to user's existing session
  webServer: process.env.E2E_NO_DEV_SERVER ? undefined : {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
