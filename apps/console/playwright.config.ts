import { defineConfig, devices } from '@playwright/test';

// Slot-aware: /b-start may run multiple workers on adjacent ports.
const PORT = Number(process.env.LOCAL_PORT ?? 3000);
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: 'line',
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // When PLAYWRIGHT_BASE_URL is set externally (eg. vercel-preview), skip the
  // local webServer entirely — tests run against that URL as-is.
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: `pnpm dev --port ${PORT}`,
        url: BASE_URL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        // next dev prints to stderr by default; surface logs only on failure.
        stdout: 'ignore',
        stderr: 'pipe',
      },
});
