import { compare, expect, expectNoAxeViolations, openApp, test } from './fixtures';

test('asks a question and gets a streamed answer with sources', async ({ page }) => {
  await openApp(page);
  await compare(page, ['United Kingdom', 'Netherlands']);

  await page.getByRole('button', { name: 'Where is parental leave most generous?' }).click();

  const answer = page.locator('[aria-busy]');
  await expect(answer).toContainText('This is not legal advice.');
  await expect(answer).toHaveAttribute('aria-busy', 'false');
  await expect(answer.getByRole('listitem')).toHaveText([
    'United Kingdom maternity leave',
    'United Kingdom paternity or partner leave',
    'Netherlands maternity leave',
    'Netherlands paternity or partner leave',
  ]);
  await expectNoAxeViolations(page);
});

test('stops generating and keeps the partial answer', async ({ page }) => {
  await openApp(page);
  // Four countries make a longer answer, so there is time to stop it.
  await compare(page, ['United Kingdom', 'Ireland', 'Germany', 'Netherlands']);

  await page.getByRole('button', { name: 'Where is parental leave most generous?' }).click();
  await expect(page.getByText('Here is what', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Stop generating' }).click();

  await expect(page.getByText('You stopped this answer.')).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Your question' })).toBeFocused();
  await expect(page.locator('[aria-busy]')).not.toContainText('This is not legal advice.');
  await expectNoAxeViolations(page);
});
