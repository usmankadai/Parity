import { defineConfig } from 'vitest/config';

// Vitest needs a default export from its config file.
// eslint-disable-next-line no-restricted-syntax
export default defineConfig({
  test: {
    // jsdom, chosen in docs/decisions/0002-test-environment-for-msw-streaming.md
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'api/**/*.test.ts'],
    restoreMocks: true,
  },
});
