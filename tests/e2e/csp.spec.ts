import { expect, openApp, test } from './fixtures';

// The demo runs on MSW's service worker under a strict Content Security
// Policy. If `worker-src 'self'` were missing, this would pass in dev (no CSP)
// and break only in production, so it is tested against the production build.

test('serves the production security headers', async ({ page }) => {
  const response = await page.goto('/');
  const csp = response?.headers()['content-security-policy'] ?? '';

  expect(csp).toContain("worker-src 'self'");
  expect(csp).toContain("script-src 'self'");
  expect(response?.headers()['x-content-type-options']).toBe('nosniff');
});

test('registers the mock service worker and serves mocked data under the CSP', async ({ page }) => {
  await openApp(page);

  const worker = await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    return {
      script: registration?.active?.scriptURL ?? null,
      controlled: navigator.serviceWorker.controller !== null,
    };
  });
  expect(worker.script).toMatch(/\/mockServiceWorker\.js$/);
  expect(worker.controlled).toBe(true);

  const countries = await page.evaluate(async () => {
    const response = await fetch('/api/countries');
    return { status: response.status, body: (await response.json()) as unknown };
  });
  expect(countries.status).toBe(200);
  expect(countries.body).toHaveLength(4);
  // The fixture fails the test if any CSP violation was reported.
});
