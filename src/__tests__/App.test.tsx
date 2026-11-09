import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App, DISCLAIMER } from '../App';
import { expectNoAxeViolations } from '../test/axe';
import { renderWithStore } from '../test/renderWithStore';

describe('App', () => {
  it('shows the page heading', () => {
    renderWithStore(<App />);

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Compare statutory benefits across countries',
      }),
    ).toBeInTheDocument();
  });

  it('shows the disclaimer in the footer', () => {
    renderWithStore(<App />);

    expect(within(screen.getByRole('contentinfo')).getByText(DISCLAIMER)).toBeInTheDocument();
  });

  it('labels mock mode as demo data, and real mode without the label', () => {
    const { unmount } = renderWithStore(<App />, { apiMode: 'mock' });
    expect(screen.getByText('Demo data')).toBeInTheDocument();
    unmount();

    renderWithStore(<App />, { apiMode: 'real' });
    expect(screen.queryByText('Demo data')).not.toBeInTheDocument();
  });

  it('has no axe violations', async () => {
    const { container } = renderWithStore(<App />);

    await expectNoAxeViolations(container);
  });
});
