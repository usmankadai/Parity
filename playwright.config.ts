import { defineConfig, devices } from '@playwright/test';

const PORT = 4320;

// Playwright needs a default export from its config file.
// eslint-disable-next-line no-restricted-syntax
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'phone', use: { ...devices['Pixel 7'] } },
  ],
  // Test the production build under the production security headers
  // (rsbuild preview serves them, see rsbuild.config.ts), with MSW mocks.
  webServer: {
    command: `npm run build && npx rsbuild preview --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
