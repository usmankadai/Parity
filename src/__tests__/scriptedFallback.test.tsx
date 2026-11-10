import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { App } from '../App';
import { server } from '../mocks/node';
import { setScenario } from '../mocks/scenarios';
import { renderWithStore } from '../test/renderWithStore';

// In real mode, questions go to the AI proxy. When that fails (no credit, the
// rate limit, an outage), the answer offers a scripted one instead: served in
// the browser, labelled as not AI, and free.

const askUrls: string[] = [];
beforeEach(() => {
  askUrls.length = 0;
  server.events.on('request:start', ({ request }) => {
    if (request.url.includes('/api/ask')) askUrls.push(new URL(request.url).search);
  });
});
afterEach(() => {
  server.events.removeAllListeners();
});

/** The real proxy, refusing with its rate-limit message. Scripted requests fall through to the mock. */
const proxyRateLimited = http.post('*/api/ask', ({ request }) =>
  new URL(request.url).searchParams.get('mode') === 'scripted'
    ? undefined
    : HttpResponse.json(
        { message: 'Too many questions. Please wait a moment and try again.' },
        { status: 429 },
      ),
);

async function askInMode(apiMode: 'real' | 'mock', question: string) {
  const user = userEvent.setup();
  renderWithStore(<App />, { apiMode });
  await screen.findByRole('group', { name: 'Which countries do you want to compare?' });
  await user.click(await screen.findByRole('radio', { name: 'Legal minimums only' }));
  await user.click(screen.getByRole('checkbox', { name: 'United Kingdom' }));
  await user.click(screen.getByRole('checkbox', { name: 'Germany' }));
  await user.click(screen.getByRole('button', { name: 'Compare' }));
  await screen.findByRole('table');
  await user.type(screen.getByRole('textbox', { name: 'Your question' }), question);
  await user.click(screen.getByRole('button', { name: 'Ask' }));
  return user;
}

describe('scripted fallback', () => {
  it('offers a labelled scripted answer when the AI cannot answer', async () => {
    server.use(proxyRateLimited);
    const user = await askInMode('real', 'How does sick pay compare?');

    // The proxy's own message is shown, and a 429 is not retried.
    expect(
      await screen.findByText(/Too many questions\. Please wait a moment and try again\./),
    ).toBeInTheDocument();
    expect(askUrls).toEqual(['']);

    await user.click(screen.getByRole('button', { name: 'Show a scripted answer instead' }));

    const answer = screen.getByRole('heading', { name: 'Answer' }).parentElement as HTMLElement;
    expect(await within(answer).findByText(/This is not legal advice\./)).toBeInTheDocument();
    expect(answer).toHaveTextContent('Scripted answer (not AI).');
    expect(answer).toHaveTextContent('You asked: How does sick pay compare?');
    expect(
      within(answer)
        .getAllByRole('listitem')
        .map((li) => li.textContent),
    ).toEqual(['United Kingdom statutory sick pay', 'Germany statutory sick pay']);
    expect(
      screen.queryByRole('button', { name: 'Show a scripted answer instead' }),
    ).not.toBeInTheDocument();
    expect(askUrls).toEqual(['', '?mode=scripted']);
  });

  it('is not offered in mock mode, where answers are already scripted', async () => {
    server.use(
      http.post('*/api/ask', () =>
        HttpResponse.json({ message: 'The question was rejected.' }, { status: 400 }),
      ),
    );
    await askInMode('mock', 'How does sick pay compare?');

    expect(await screen.findByText(/Sorry, the answer could not be loaded/)).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Show a scripted answer instead' }),
    ).not.toBeInTheDocument();
  });

  it('ignores a demo scenario left in storage', async () => {
    server.use(proxyRateLimited);
    const user = await askInMode('real', 'How does sick pay compare?');
    await screen.findByText(/Too many questions/);

    // A stored "server error" scenario must not break the fallback.
    setScenario('server-error');
    await user.click(screen.getByRole('button', { name: 'Show a scripted answer instead' }));

    expect(await screen.findByText(/This is not legal advice\./)).toBeInTheDocument();
  });
});
