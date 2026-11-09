import { compare, expect, expectNoAxeViolations, openApp, test } from './fixtures';

test('compares countries, with a source for every cell', async ({ page }) => {
  await openApp(page);
  await compare(page, ['United Kingdom', 'Germany']);

  const table = page.getByRole('table');
  await expect(table.getByRole('columnheader')).toHaveText([
    'Benefit',
    'United Kingdom',
    'Germany',
  ]);

  const annualLeave = table.getByRole('row', { name: /^Annual leave/ });
  await expect(annualLeave.getByRole('cell').first()).toContainText('28 working days');
  await expect(annualLeave.getByRole('cell').first()).toContainText('Most generous');
  await expect(annualLeave.getByRole('cell').nth(1)).toContainText('20 working days');

  // 7 categories × 2 countries, each with its own source button.
  await expect(table.getByRole('button', { name: /^Source: / })).toHaveCount(14);

  const source = table.getByRole('button', { name: 'Source: Germany, annual leave' });
  await source.click();
  await expect(source).toHaveAttribute('aria-expanded', 'true');
  await expect(table.getByRole('link', { name: /Federal Leave Act/ })).toHaveAttribute(
    'href',
    'https://www.gesetze-im-internet.de/burlg/__3.html',
  );
  await page.keyboard.press('Escape');
  await expect(source).toHaveAttribute('aria-expanded', 'false');

  await expectNoAxeViolations(page);
});

test('shows an error summary when fewer than 2 countries are chosen', async ({ page }) => {
  await openApp(page);
  await page.getByRole('checkbox', { name: 'Ireland' }).check();
  await page.getByRole('button', { name: 'Compare' }).click();

  await expect(page.getByRole('heading', { name: 'There is a problem' })).toBeVisible();
  await expect(page).toHaveTitle(/^Error: /);
  await expectNoAxeViolations(page);
});

test('fits the screen without sideways page scrolling', async ({ page }) => {
  await openApp(page);
  await compare(page, ['United Kingdom', 'Ireland', 'Germany', 'Netherlands']);

  // A wide table scrolls inside its own labelled region, never the whole page.
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);

  // The open demo panel stays on screen.
  await page.getByRole('button', { name: /^Demo scenarios/ }).click();
  const panelHeading = page.getByRole('heading', { name: 'Demo scenarios' });
  await expect(panelHeading).toBeInViewport();
  const viewport = page.viewportSize();
  const box = await panelHeading.locator('..').boundingBox();
  expect(box && viewport && box.x >= 0 && box.x + box.width <= viewport.width).toBe(true);
  await expectNoAxeViolations(page);
});
