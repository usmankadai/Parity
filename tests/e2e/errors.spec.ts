import { compare, expect, expectNoAxeViolations, openApp, test } from './fixtures';

test.describe('server error scenario', () => {
  test.use({ scenario: 'server-error' });

  test('retries, shows the error, then recovers with Try again', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByText(/Trying again \(attempt 2 of 3\)/)).toBeVisible();
    await expect(page.getByText(/We tried 3 times\./)).toBeVisible({ timeout: 10_000 });
    await expectNoAxeViolations(page);

    // Switch back to normal in the demo panel, then try again.
    await page.getByRole('button', { name: 'Demo scenarios: Server error' }).click();
    await page.getByRole('radio', { name: 'Normal' }).check();
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Try again' }).click();

    await expect(
      page.getByRole('group', { name: 'Which countries do you want to compare?' }),
    ).toBeVisible();
  });
});

test.describe('drops mid-stream scenario', () => {
  test.use({ scenario: 'drops-mid-stream' });

  test('marks an answer interrupted without retrying it', async ({ page }) => {
    let askRequests = 0;
    page.on('request', (request) => {
      if (request.url().endsWith('/api/ask')) askRequests += 1;
    });

    await openApp(page);
    await compare(page, ['Ireland', 'Germany']);
    await page.getByRole('button', { name: 'How does sick pay compare?' }).click();

    await expect(page.getByText('Answer interrupted.')).toBeVisible();
    await expect(page.getByText('Here is what', { exact: false })).toBeVisible();
    expect(askRequests).toBe(1);
    await expectNoAxeViolations(page);
  });
});
