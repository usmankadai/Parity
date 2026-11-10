import { expect, expectNoAxeViolations, openApp, test } from './fixtures';

test('shows the company against the legal minimums, and answers about its gaps', async ({
  page,
}) => {
  await openApp(page);
  await page.getByRole('button', { name: 'Compare all Northwind Logistics countries' }).click();

  await expect(page.getByRole('heading', { name: '2 gaps below the legal minimum' })).toBeVisible();
  const notice = page.getByRole('row', { name: /^Employer notice after 2 years/ });
  await expect(notice.getByRole('cell').nth(1)).toContainText('Below minimum (non-compliant)');
  await expect(
    page.getByRole('rowheader', { name: 'Company benefits (no legal minimum)' }),
  ).toBeVisible();
  await expectNoAxeViolations(page);

  await page.getByRole('button', { name: 'Where is our package below the legal minimum?' }).click();
  const answer = page.locator('[aria-busy]');
  await expect(answer).toContainText('This is not legal advice.');
  await expect(answer.getByRole('listitem')).toHaveText([
    'Northwind Logistics: Ireland employer notice after 2 years',
    'Ireland employer notice after 2 years',
    'Northwind Logistics: Germany employer notice after 2 years',
    'Germany employer notice after 2 years',
  ]);

  // The wide company table scrolls inside its region, never the page.
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
  await expectNoAxeViolations(page);
});
