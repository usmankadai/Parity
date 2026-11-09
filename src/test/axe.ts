import axe from 'axe-core';
import { expect } from 'vitest';

/**
 * Runs axe on a rendered container and fails with a readable list of violations.
 *
 * Colour contrast is turned off here because jsdom does not lay out or paint,
 * so axe cannot measure it. Playwright's axe scans check contrast in a real browser.
 */
export async function expectNoAxeViolations(container: Element) {
  const results = await axe.run(container, {
    rules: { 'color-contrast': { enabled: false } },
  });

  const summary = results.violations.map(
    (violation) => `${violation.id}: ${violation.help} (${violation.nodes.length} element(s))`,
  );

  expect(summary).toEqual([]);
}
