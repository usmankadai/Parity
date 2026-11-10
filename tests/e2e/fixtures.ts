import AxeBuilder from '@axe-core/playwright';
import { expect, test as base, type Page } from '@playwright/test';
import type { ScenarioId } from '../../src/mocks/scenarios';

interface Fixtures {
  /** The mock API scenario to start in. Set with test.use({ scenario: 'flaky' }). */
  scenario: ScenarioId;
}

declare global {
  interface Window {
    __cspViolations?: string[];
  }
}

export const test = base.extend<Fixtures>({
  scenario: ['normal', { option: true }],

  page: async ({ page, scenario }, use) => {
    await page.addInitScript((id) => {
      // The scenario switcher remembers its choice in localStorage, so setting
      // it before the app loads starts the page in that scenario.
      window.localStorage.setItem('parity:scenario', id);

      // Record any Content Security Policy violation the page reports.
      window.__cspViolations = [];
      document.addEventListener('securitypolicyviolation', (event) => {
        window.__cspViolations?.push(`${event.violatedDirective}: ${event.blockedURI}`);
      });
    }, scenario);

    await use(page);

    // Every test fails if the page broke its own Content Security Policy.
    const violations = await page
      .evaluate(() => window.__cspViolations ?? [])
      .catch(() => [] as string[]);
    expect(violations, 'Content Security Policy violations').toEqual([]);
  },
});

export { expect };

/** Fails with a readable list if axe finds WCAG 2.2 AA problems on the page. */
export async function expectNoAxeViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  const summary = results.violations.map(
    (violation) => `${violation.id}: ${violation.help} (${violation.nodes.length})`,
  );
  expect(summary).toEqual([]);
}

/** Loads the app and waits for the country list. */
export async function openApp(page: Page) {
  await page.goto('/');
  await expect(
    page.getByRole('group', { name: 'Which countries do you want to compare?' }),
  ).toBeVisible();
}

/** Ticks the given countries and presses Compare. */
export async function compare(page: Page, names: string[]) {
  for (const name of names) {
    await page.getByRole('checkbox', { name }).check();
  }
  await page.getByRole('button', { name: 'Compare', exact: true }).click();
  await expect(page.getByRole('table')).toBeVisible();
}
