import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { App } from '../App';
import { EMPTY_QUESTION_MESSAGE } from '../features/ask/components/AskPanel';
import { server } from '../mocks/node';
import { setScenario, setStreamDelayMs } from '../mocks/scenarios';
import { citesUnknownRow } from '../mocks/testHandlers';
import { expectNoAxeViolations } from '../test/axe';
import { renderWithStore } from '../test/renderWithStore';

const RETRY_WAIT = { timeout: 4000 };
type User = ReturnType<typeof userEvent.setup>;

let askRequests = 0;
beforeEach(() => {
  askRequests = 0;
  server.events.on('request:start', ({ request }) => {
    if (request.url.endsWith('/api/ask')) askRequests += 1;
  });
});
afterEach(() => {
  server.events.removeAllListeners();
});

async function renderAndCompare(names = ['United Kingdom', 'Germany']) {
  const user = userEvent.setup();
  renderWithStore(<App />);
  await screen.findByRole('group', { name: 'Which countries do you want to compare?' });
  for (const name of names) {
    await user.click(screen.getByRole('checkbox', { name }));
  }
  await user.click(screen.getByRole('button', { name: 'Compare' }));
  await screen.findByRole('table');
  return user;
}

async function ask(user: User, question: string) {
  const box = screen.getByRole('textbox', { name: 'Your question' });
  await user.clear(box);
  await user.type(box, question);
  await user.click(screen.getByRole('button', { name: 'Ask' }));
}

const answerComplete = () =>
  screen.findByText('Answer complete', { selector: '[aria-live] *, [aria-live]' });

function chipLabels() {
  const label = screen.queryByText('Based on:');
  if (!label?.parentElement) return [];
  return within(label.parentElement)
    .getAllByRole('listitem')
    .map((item) => item.textContent);
}

describe('asking a question', () => {
  it('asks you to compare countries first', () => {
    renderWithStore(<App />);

    expect(
      screen.getByText('Compare at least 2 countries to ask questions about them.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Your question' })).not.toBeInTheDocument();
  });

  it('streams an answer to a starter question, with source chips', async () => {
    const user = await renderAndCompare();

    await user.click(
      screen.getByRole('button', { name: 'Where is parental leave most generous?' }),
    );
    await answerComplete();

    expect(screen.getByText('United Kingdom, maternity leave: 52 weeks.')).toBeInTheDocument();
    expect(
      screen.getByText(/^Germany, paternity or partner leave: no legal minimum/),
    ).toBeInTheDocument();
    expect(chipLabels()).toEqual([
      'United Kingdom maternity leave',
      'United Kingdom paternity or partner leave',
      'Germany maternity leave',
      'Germany paternity or partner leave',
    ]);
    expect(screen.queryByRole('button', { name: 'Stop generating' })).not.toBeInTheDocument();

    await expectNoAxeViolations(document.body);
  });

  it('shows an error summary for an empty question', async () => {
    document.title = 'Parity';
    const user = await renderAndCompare();

    await user.click(screen.getByRole('button', { name: 'Ask' }));

    expect(screen.getByRole('heading', { name: 'There is a problem' }).parentElement).toHaveFocus();
    const box = screen.getByRole('textbox', { name: 'Your question' });
    expect(box).toHaveAttribute('aria-invalid', 'true');
    expect(box).toHaveAccessibleDescription(
      `Up to 500 characters. Error: ${EMPTY_QUESTION_MESSAGE}`,
    );
    expect(document.title).toBe('Error: Parity');
    expect(askRequests).toBe(0);
  });

  it('says when the data does not cover the question, with no sources', async () => {
    const user = await renderAndCompare();

    await ask(user, 'What about company cars?');
    await answerComplete();

    expect(screen.getByText(/does not cover that question/)).toBeInTheDocument();
    expect(screen.getByText('No sources cited.')).toBeInTheDocument();
  });

  it('only shows chips for rows it sent, even if the answer cites others', async () => {
    server.use(citesUnknownRow);
    const user = await renderAndCompare();

    await ask(user, 'How does sick pay compare?');
    await answerComplete();

    expect(chipLabels()).toEqual([
      'United Kingdom statutory sick pay',
      'Germany statutory sick pay',
    ]);
  });
});

describe('stopping and replacing an answer', () => {
  it('stops generating, keeps the partial answer and returns focus to the question', async () => {
    setStreamDelayMs(30);
    const user = await renderAndCompare();

    await ask(user, 'Where is parental leave most generous?');
    await screen.findByText(/^Here is what/);
    await user.click(screen.getByRole('button', { name: 'Stop generating' }));

    expect(await screen.findByText('You stopped this answer.')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Your question' })).toHaveFocus();
    expect(screen.queryByText(/This is not legal advice\./)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Stop generating' })).not.toBeInTheDocument();
  });

  it('cancels the answer in progress when a new question is asked', async () => {
    setStreamDelayMs(30);
    const user = await renderAndCompare();

    await ask(user, 'Where is parental leave most generous?');
    await screen.findByText(/^Here is what/);
    setStreamDelayMs(0);
    await ask(user, 'How does sick pay compare?');
    await answerComplete();

    expect(screen.getByText('You asked:').parentElement).toHaveTextContent(
      'You asked: How does sick pay compare?',
    );
    const answerArea = screen.getByRole('heading', { name: 'Answer' }).parentElement;
    expect(answerArea).not.toHaveTextContent(/maternity leave/);
    expect(chipLabels()).toEqual([
      'United Kingdom statutory sick pay',
      'Germany statutory sick pay',
    ]);
  });
});

describe('scenarios', () => {
  it('slow: waits for the first words, then answers', async () => {
    const user = await renderAndCompare();
    setScenario('slow', { slowDelayMs: 200 });

    await ask(user, 'How does sick pay compare?');

    expect(screen.getByText('Waiting for an answer…')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Stop generating' })).toBeInTheDocument();
    await answerComplete();
  });

  it('server error: retries 3 times before any text, then offers to try again', async () => {
    const user = await renderAndCompare();
    setScenario('server-error');

    await ask(user, 'How does sick pay compare?');

    expect(await screen.findByText(/Trying again \(attempt 2 of 3\)/)).toBeInTheDocument();
    expect(
      await screen.findByText(/Sorry, the answer could not be loaded/, undefined, RETRY_WAIT),
    ).toHaveTextContent('We tried 3 times.');
    expect(askRequests).toBe(3);

    setScenario('normal');
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    await answerComplete();
  });

  it('flaky: recovers after two failures', async () => {
    const user = await renderAndCompare();
    setScenario('flaky');

    await ask(user, 'How does sick pay compare?');

    expect(await screen.findByText('Answer complete', undefined, RETRY_WAIT)).toBeInTheDocument();
    expect(askRequests).toBe(3);
  });

  it('drops mid-stream: marks the answer interrupted and does not retry', async () => {
    const user = await renderAndCompare();
    setScenario('drops-mid-stream');

    await ask(user, 'Where is parental leave most generous?');

    expect(await screen.findByText('Answer interrupted.')).toBeInTheDocument();
    expect(screen.getByText(/^Here is what/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
    expect(askRequests).toBe(1);
  });

  it('empty: says no answer was returned', async () => {
    const user = await renderAndCompare();
    setScenario('empty');

    await ask(user, 'How does sick pay compare?');

    expect(
      await screen.findByText('No answer was returned. Try asking in a different way.'),
    ).toBeInTheDocument();
  });
});
