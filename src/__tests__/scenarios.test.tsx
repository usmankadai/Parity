import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { App } from '../App';
import { server } from '../mocks/node';
import { setScenario } from '../mocks/scenarios';
import { renderWithStore } from '../test/renderWithStore';

// One integration test (or more) per mock API scenario, through the real UI,
// sagas, retries and MSW handlers. Retries use the real backoff delays, so
// some waits allow a few seconds.

const RETRY_WAIT = { timeout: 4000 };
const GROUP_NAME = 'Which countries do you want to compare?';

let requests: string[] = [];

beforeEach(() => {
  requests = [];
  server.events.on('request:start', ({ request }) => {
    const url = new URL(request.url);
    requests.push(`${url.pathname}${url.search}`);
  });
});

afterEach(() => {
  server.events.removeAllListeners();
});

const countRequests = (path: string) => requests.filter((r) => r.startsWith(path)).length;

async function compareTwoCountries(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('checkbox', { name: 'United Kingdom' }));
  await user.click(screen.getByRole('checkbox', { name: 'Ireland' }));
  await user.click(screen.getByRole('button', { name: 'Compare' }));
}

describe('normal scenario', () => {
  it('loads the countries and the comparison first time', async () => {
    const user = userEvent.setup();
    renderWithStore(<App />);

    await screen.findByRole('group', { name: GROUP_NAME });
    await compareTwoCountries(user);

    expect(await screen.findByRole('table')).toBeInTheDocument();
    expect(countRequests('/api/countries')).toBe(1);
    expect(countRequests('/api/benefits')).toBe(2);
  });
});

describe('slow scenario', () => {
  it('shows a loading message until the slow response arrives', async () => {
    setScenario('slow', { slowDelayMs: 300 });
    renderWithStore(<App />);

    expect(screen.getByRole('status')).toHaveTextContent('Loading countries…');
    expect(await screen.findByRole('group', { name: GROUP_NAME })).toBeInTheDocument();
  });
});

describe('server error scenario', () => {
  it('retries the countries 3 times, says so, then offers to try again', async () => {
    setScenario('server-error');
    const user = userEvent.setup();
    renderWithStore(<App />);

    expect(await screen.findByText(/Trying again \(attempt 2 of 3\)/)).toBeInTheDocument();
    expect(
      await screen.findByText(/could not be loaded.*We tried 3 times\./, undefined, RETRY_WAIT),
    ).toBeInTheDocument();
    expect(countRequests('/api/countries')).toBe(3);

    setScenario('normal');
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('group', { name: GROUP_NAME })).toBeInTheDocument();
  });

  it('shows the comparison error after retries run out, and recovers', async () => {
    const user = userEvent.setup();
    renderWithStore(<App />);
    await screen.findByRole('group', { name: GROUP_NAME });

    setScenario('server-error');
    await compareTwoCountries(user);

    expect(
      await screen.findByText(/Sorry, the comparison could not be loaded/, undefined, RETRY_WAIT),
    ).toHaveTextContent('We tried 3 times.');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();

    setScenario('normal');
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('table')).toBeInTheDocument();
  });
});

describe('empty data scenario', () => {
  it('says when there are no countries', async () => {
    setScenario('empty');
    renderWithStore(<App />);

    expect(
      await screen.findByText('No countries are available to compare right now.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('says when there is no data for the chosen countries, and recovers', async () => {
    const user = userEvent.setup();
    renderWithStore(<App />);
    await screen.findByRole('group', { name: GROUP_NAME });

    setScenario('empty');
    await compareTwoCountries(user);

    expect(
      await screen.findByText('No benefit data is available for these countries yet.', {
        ignore: '[aria-live]',
      }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();

    setScenario('normal');
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('table')).toBeInTheDocument();
  });
});

describe('flaky scenario', () => {
  it('recovers the countries after two failures', async () => {
    setScenario('flaky');
    renderWithStore(<App />);

    expect(await screen.findByText(/Trying again \(attempt 2 of 3\)/)).toBeInTheDocument();
    expect(await screen.findByRole('group', { name: GROUP_NAME }, RETRY_WAIT)).toBeInTheDocument();
    expect(countRequests('/api/countries')).toBe(3);
  });

  it('recovers each country in the comparison after two failures', async () => {
    setScenario('flaky');
    const user = userEvent.setup();
    renderWithStore(<App />);
    await screen.findByRole('group', { name: GROUP_NAME }, RETRY_WAIT);

    await compareTwoCountries(user);

    expect(await screen.findByRole('table', undefined, RETRY_WAIT)).toBeInTheDocument();
    expect(countRequests('/api/benefits?countries=GB')).toBe(3);
    expect(countRequests('/api/benefits?countries=IE')).toBe(3);
  });
});

describe('drops mid-stream scenario', () => {
  it('leaves country and benefit data loading normally', async () => {
    setScenario('drops-mid-stream');
    const user = userEvent.setup();
    renderWithStore(<App />);

    await screen.findByRole('group', { name: GROUP_NAME });
    await compareTwoCountries(user);

    expect(await screen.findByRole('table')).toBeInTheDocument();
    expect(countRequests('/api/benefits')).toBe(2);
  });
});
