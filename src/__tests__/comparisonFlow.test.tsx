import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { App } from '../App';
import { TOO_FEW_MESSAGE } from '../features/countries/components/CountryPicker';
import { server } from '../mocks/node';
import { expectNoAxeViolations } from '../test/axe';
import { renderWithStore } from '../test/renderWithStore';

async function renderApp() {
  const user = userEvent.setup();
  const view = renderWithStore(<App />);
  await screen.findByRole('group', { name: 'Which countries do you want to compare?' });
  return { user, ...view };
}

async function compare(user: ReturnType<typeof userEvent.setup>, names: string[]) {
  for (const name of names) {
    await user.click(screen.getByRole('checkbox', { name }));
  }
  await user.click(screen.getByRole('button', { name: 'Compare' }));
  return screen.findByRole('table');
}

function cellsFor(table: HTMLElement, rowLabel: RegExp) {
  const header = within(table).getByRole('rowheader', { name: rowLabel });
  const row = header.closest('tr');
  if (!row) throw new Error('Row not found');
  return within(row).getAllByRole('cell');
}

describe('choosing countries', () => {
  it('lists the countries as labelled checkboxes', async () => {
    await renderApp();

    for (const name of ['United Kingdom', 'Ireland', 'Germany', 'Netherlands']) {
      expect(screen.getByRole('checkbox', { name })).not.toBeChecked();
    }
  });

  it('shows an error summary, an inline error and an "Error:" title with fewer than 2 countries', async () => {
    document.title = 'Parity';
    const { user } = await renderApp();

    await user.click(screen.getByRole('checkbox', { name: 'Germany' }));
    await user.click(screen.getByRole('button', { name: 'Compare' }));

    const summary = screen.getByRole('heading', { name: 'There is a problem' }).parentElement;
    expect(summary).toHaveFocus();
    expect(screen.getByRole('group')).toHaveAccessibleDescription(
      `Select 2 to 4. Error: ${TOO_FEW_MESSAGE}`,
    );
    expect(document.title).toBe('Error: Parity');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();

    // The summary links to the first checkbox.
    await user.click(screen.getByRole('link', { name: TOO_FEW_MESSAGE }));
    expect(screen.getByRole('checkbox', { name: 'United Kingdom' })).toHaveFocus();

    // Fixing the error removes the summary and the title prefix.
    await user.click(screen.getByRole('checkbox', { name: 'United Kingdom' }));
    await user.click(screen.getByRole('button', { name: 'Compare' }));
    expect(screen.queryByRole('heading', { name: 'There is a problem' })).not.toBeInTheDocument();
    expect(document.title).toBe('Parity');
  });
});

describe('the comparison table', () => {
  it('compares the chosen countries with normalised values and markers', async () => {
    const { user } = await renderApp();
    const table = await compare(user, ['Germany', 'United Kingdom']);

    // Columns follow the country list order, not the order clicked.
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((th) => th.textContent),
    ).toEqual(['Benefit', 'United Kingdom', 'Germany']);
    expect(
      screen.getByRole('region', { name: /Statutory minimums: United Kingdom and Germany/ }),
    ).toBeInTheDocument();

    // 24 German "Werktage" on a 6-day week become 20 working days on a 5-day week.
    const [gbLeave, deLeave] = cellsFor(table, /^Annual leave/);
    expect(gbLeave).toHaveTextContent('28 working days');
    expect(gbLeave).toHaveTextContent('Most generous');
    expect(deLeave).toHaveTextContent('20 working days');
    expect(deLeave).toHaveTextContent('Least generous');
    expect(deLeave).toHaveTextContent('24 working days, counted on a 6-day week');

    // No legal minimum is said in words, and ranks as least generous.
    const [, dePaternity] = cellsFor(table, /^Paternity or partner leave/);
    expect(dePaternity).toHaveTextContent('No legal minimum');
    expect(dePaternity).toHaveTextContent('Least generous');

    // Categories that are not rankable get no markers.
    for (const cell of cellsFor(table, /^Statutory sick pay/)) {
      expect(cell).not.toHaveTextContent(/generous/);
    }

    await expectNoAxeViolations(document.body);
  });

  it('shows each source in a disclosure that Escape closes', async () => {
    const { user } = await renderApp();
    await compare(user, ['United Kingdom', 'Germany']);

    const toggle = screen.getByRole('button', { name: 'Source: Germany, annual leave' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');

    const link = screen.getByRole('link', { name: /Federal Leave Act, section 3/ });
    expect(link).toHaveAttribute('href', 'https://www.gesetze-im-internet.de/burlg/__3.html');
    expect(screen.getByText('Der Urlaub beträgt jährlich mindestens 24 Werktage.')).toHaveAttribute(
      'lang',
      'de',
    );
    expect(screen.getAllByText('Checked 9 November 2026').length).toBeGreaterThan(0);

    link.focus();
    await user.keyboard('{Escape}');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveFocus();
  });

  it('does not fetch a country again once it is loaded', async () => {
    const requested: string[] = [];
    server.events.on('request:start', ({ request }) => {
      if (request.url.includes('/api/benefits')) requested.push(new URL(request.url).search);
    });

    const { user } = await renderApp();
    await compare(user, ['United Kingdom', 'Ireland']);

    // Add Germany: only Germany should be fetched.
    await user.click(screen.getByRole('checkbox', { name: 'Germany' }));
    await user.click(screen.getByRole('button', { name: 'Compare' }));
    await waitFor(() => {
      expect(screen.getAllByRole('columnheader')).toHaveLength(4);
    });

    server.events.removeAllListeners();
    expect(requested.sort()).toEqual(['?countries=DE', '?countries=GB', '?countries=IE']);
  });
});
