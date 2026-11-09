import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { App } from '../../App';
import { getScenario } from '../../mocks/scenarios';
import { expectNoAxeViolations } from '../../test/axe';
import { renderWithStore } from '../../test/renderWithStore';

const GROUP_NAME = 'Which countries do you want to compare?';

describe('ScenarioSwitcher', () => {
  it('is only shown in mock mode', async () => {
    const { unmount } = renderWithStore(<App />, { apiMode: 'real' });
    await screen.findByRole('group', { name: GROUP_NAME });
    expect(screen.queryByRole('button', { name: /Demo scenarios/ })).not.toBeInTheDocument();
    unmount();

    renderWithStore(<App />, { apiMode: 'mock' });
    expect(screen.getByRole('button', { name: 'Demo scenarios: Normal' })).toBeInTheDocument();
  });

  it('opens as a labelled radio group, switches scenario and remembers it', async () => {
    const user = userEvent.setup();
    renderWithStore(<App />);
    const toggle = screen.getByRole('button', { name: 'Demo scenarios: Normal' });

    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');

    const flaky = screen.getByRole('radio', { name: 'Flaky' });
    expect(flaky).toHaveAccessibleDescription(
      'Each endpoint fails twice, then succeeds, so the retries recover.',
    );
    await user.click(flaky);

    expect(flaky).toBeChecked();
    expect(getScenario()).toBe('flaky');
    expect(window.localStorage.getItem('parity:scenario')).toBe('flaky');
    expect(screen.getByRole('button', { name: 'Demo scenarios: Flaky' })).toBeInTheDocument();
    expect(
      screen.getByText('Scenario changed to Flaky. Compare again to see it.'),
    ).toBeInTheDocument();

    await expectNoAxeViolations(document.body);
  });

  it('closes with Escape and returns focus to its button', async () => {
    const user = userEvent.setup();
    renderWithStore(<App />);
    const toggle = screen.getByRole('button', { name: /Demo scenarios/ });

    await user.click(toggle);
    screen.getByRole('radio', { name: 'Slow' }).focus();
    await user.keyboard('{Escape}');

    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveFocus();
  });

  it('clears loaded data, so the next comparison uses the new scenario', async () => {
    const user = userEvent.setup();
    renderWithStore(<App />);
    await screen.findByRole('group', { name: GROUP_NAME });

    await user.click(screen.getByRole('checkbox', { name: 'Germany' }));
    await user.click(screen.getByRole('checkbox', { name: 'Netherlands' }));
    await user.click(screen.getByRole('button', { name: 'Compare' }));
    await screen.findByRole('table');

    await user.click(screen.getByRole('button', { name: /Demo scenarios/ }));
    await user.click(screen.getByRole('radio', { name: 'Empty data' }));
    expect(screen.queryByRole('table')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Compare' }));
    expect(
      await screen.findByText('No benefit data is available for these countries yet.', {
        ignore: '[aria-live]',
      }),
    ).toBeInTheDocument();
  });
});
