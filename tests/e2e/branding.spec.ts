import { expect, expectNoAxeViolations, openApp, test } from './fixtures';

test('switches company, re-themes under the CSP, and stays accessible', async ({ page }) => {
  await openApp(page);

  const brand = () =>
    page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--brand').trim(),
    );
  expect(await brand()).toBe('#2340cc');

  await page
    .getByRole('combobox', { name: 'Company' })
    .selectOption({ label: 'Harbourside Retail (fictional)' });
  expect(await brand()).toBe('#9b1c46');

  await page.getByRole('button', { name: 'Compare all Harbourside Retail countries' }).click();
  await expect(page.getByRole('heading', { name: '1 gap below the legal minimum' })).toBeVisible();

  // Colour contrast is checked in a real browser, with the new theme applied.
  await expectNoAxeViolations(page);
});
