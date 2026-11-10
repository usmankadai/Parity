import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { App } from '../App';
import { expectNoAxeViolations } from '../test/axe';
import { renderWithStore } from '../test/renderWithStore';

async function openCompanyView() {
  const user = userEvent.setup();
  renderWithStore(<App />);
  await screen.findByRole('button', { name: 'Compare all Northwind Logistics countries' });
  return user;
}

function cellsFor(rowLabel: RegExp) {
  const header = within(screen.getByRole('table')).getByRole('rowheader', { name: rowLabel });
  const row = header.closest('tr');
  if (!row) throw new Error('Row not found');
  return within(row).getAllByRole('cell');
}

describe('company view', () => {
  it('introduces the fictional company before anything is compared', async () => {
    await openCompanyView();

    expect(screen.getByText('Fictional company')).toBeInTheDocument();
    expect(screen.getByText(/2,790 employees in 4 countries/)).toBeInTheDocument();
    expect(
      screen.getByRole('radio', { name: 'Northwind Logistics vs legal minimums' }),
    ).toBeChecked();
  });

  it('compares every company country with one click, and ticks them in the picker', async () => {
    const user = await openCompanyView();

    await user.click(
      screen.getByRole('button', { name: 'Compare all Northwind Logistics countries' }),
    );
    await screen.findByRole('table');

    for (const name of ['United Kingdom', 'Ireland', 'Germany', 'Netherlands']) {
      expect(screen.getByRole('checkbox', { name })).toBeChecked();
    }
  });

  it('summarises the gaps and marks each cell against the legal minimum', async () => {
    const user = await openCompanyView();
    await user.click(
      screen.getByRole('button', { name: 'Compare all Northwind Logistics countries' }),
    );
    await screen.findByRole('table');

    expect(
      screen.getByRole('heading', { name: '2 gaps below the legal minimum' }),
    ).toBeInTheDocument();
    const summary = screen.getByRole('heading', { name: '2 gaps below the legal minimum' })
      .parentElement as HTMLElement;
    expect(within(summary).getByText('Ireland').parentElement).toHaveTextContent(
      '1 below minimum: Employer notice after 2 years',
    );
    expect(within(summary).getByText('United Kingdom').parentElement).toHaveTextContent(
      'meet or beat the minimum',
    );

    // Columns: United Kingdom, Ireland, Germany, Netherlands.
    const [gbNotice, ieNotice, deNotice, nlNotice] = cellsFor(/^Employer notice after 2 years/);
    expect(gbNotice).toHaveTextContent('Above minimum');
    expect(ieNotice).toHaveTextContent('1 week');
    expect(ieNotice).toHaveTextContent('Below minimum (non-compliant)');
    expect(ieNotice).toHaveTextContent('Legal minimum: 2 weeks');
    // 4 weeks is short of "1 month, to the end of a calendar month".
    expect(deNotice).toHaveTextContent('Below minimum (non-compliant)');
    expect(nlNotice).toHaveTextContent('Meets minimum');

    // No legal minimum is never "below", and sick pay is not compared.
    const [, , dePaternity] = cellsFor(/^Paternity or partner leave/);
    expect(dePaternity).toHaveTextContent('Above minimum (no legal minimum)');
    for (const cell of cellsFor(/^Statutory sick pay/)) {
      expect(cell).toHaveTextContent('Not compared');
    }

    // Company-only benefits have their own section.
    expect(
      screen.getByRole('rowheader', { name: 'Company benefits (no legal minimum)' }),
    ).toBeInTheDocument();
    const [gbHealth, , deHealth] = cellsFor(/^Private health insurance/);
    expect(gbHealth).toHaveTextContent('Offered');
    expect(deHealth).toHaveTextContent('Not offered');

    await expectNoAxeViolations(document.body);
  });

  it('switches to the legal minimums alone, with ranking markers', async () => {
    const user = await openCompanyView();
    await user.click(
      screen.getByRole('button', { name: 'Compare all Northwind Logistics countries' }),
    );
    await screen.findByRole('table');

    await user.click(screen.getByRole('radio', { name: 'Legal minimums only' }));

    expect(screen.queryByText(/gaps? below the legal minimum/)).not.toBeInTheDocument();
    expect(screen.getAllByText('Most generous').length).toBeGreaterThan(0);
    expect(screen.queryByText('Private health insurance')).not.toBeInTheDocument();
  });
});
