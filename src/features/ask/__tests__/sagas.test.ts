import { expectSaga } from 'redux-saga-test-plan';
import * as matchers from 'redux-saga-test-plan/matchers';
import { dynamic, type StaticProvider } from 'redux-saga-test-plan/providers';
import { describe, expect, it } from 'vitest';
import { ApiError } from '../../../api/client';
import { openAskStream } from '../../../api/endpoints';
import type { AskStreamEvent } from '../../../api/types';
import { parseBenefitRows } from '../../../api/validate';
import { rootReducer, type RootState } from '../../../app/store';
import benefits from '../../../mocks/fixtures/benefits.json';
import { toSseFrame } from '../../../mocks/sse';
import { comparisonActions } from '../../comparison/slice';
import { askQuestion, askSaga } from '../sagas';
import { askActions } from '../slice';

const fastRetry = { maxAttempts: 3, baseDelayMs: 1, maxDelayMs: 2 };

/** State with United Kingdom and Germany compared, so there are rows to send. */
function stateWithComparison(): RootState {
  const rows = parseBenefitRows(benefits).filter((r) => ['GB', 'DE'].includes(r.countryCode));
  let state = rootReducer(undefined, comparisonActions.requested(['GB', 'DE']));
  state = rootReducer(state, comparisonActions.rowsLoaded(rows));
  return state;
}

interface FakeStreamOptions {
  /** Error the stream after this many events. */
  failAfter?: number;
  /** Never close the stream after the events, like a slow model. */
  hang?: boolean;
}

/**
 * A reader over real SSE frames, like the one fetch gives the saga. It hands
 * out one event per read, so an error after some events really arrives after
 * them (calling error() up front would discard queued chunks).
 */
function fakeReader(events: AskStreamEvent[], { failAfter, hang }: FakeStreamOptions = {}) {
  const encoder = new TextEncoder();
  const limit = failAfter ?? events.length;
  let index = 0;
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      const event = events[index];
      if (index < limit && event) {
        index += 1;
        controller.enqueue(encoder.encode(toSseFrame(event)));
      } else if (failAfter !== undefined) {
        controller.error(new Error('dropped'));
      } else if (!hang) {
        controller.close();
      }
      // When hanging, pull simply returns without enqueuing: no more data ever comes.
    },
  }).getReader();
}

const answer: AskStreamEvent[] = [
  { type: 'chunk', text: 'Germany ' },
  { type: 'chunk', text: 'has 20 days.' },
  { type: 'sources', rowIds: ['DE-annual-leave', 'FR-made-up-row'] },
  { type: 'done' },
];

/** Records each request's signal and serves responses in turn. */
function provider(responses: (() => ReadableStreamDefaultReader<Uint8Array> | Error)[]) {
  const signals: AbortSignal[] = [];
  const scriptedFlags: boolean[] = [];
  const handler: unknown = dynamic(({ args }: { args: unknown[] }) => {
    signals.push(args[1] as AbortSignal);
    scriptedFlags.push(args[2] === true);
    const next = responses[Math.min(signals.length - 1, responses.length - 1)];
    if (!next) throw new Error('No response configured');
    const response = next();
    return response instanceof Error ? Promise.reject(response) : Promise.resolve(response);
  });
  const provide: StaticProvider = [matchers.call.fn(openAskStream), handler];
  return { provide, signals, scriptedFlags };
}

const serverError = () => new ApiError('http', 'The server replied with status 503.', 503);

describe('askQuestion', () => {
  it('streams the answer, and only cites rows that were sent', async () => {
    const { provide } = provider([() => fakeReader(answer)]);

    const result: { storeState: unknown } = await expectSaga(
      askQuestion,
      askActions.questionSubmitted('How much leave?'),
      fastRetry,
    )
      .withReducer(
        rootReducer,
        rootReducer(stateWithComparison(), askActions.questionSubmitted('How much leave?')),
      )
      .provide([provide])
      .put(askActions.firstChunkReceived())
      .put(askActions.chunkReceived('Germany '))
      .put(askActions.chunkReceived('has 20 days.'))
      .put(askActions.sourcesReceived(['DE-annual-leave']))
      .put(askActions.streamCompleted())
      .run();

    const { ask } = result.storeState as RootState;
    expect(ask.status).toBe('done');
    expect(ask.answer).toBe('Germany has 20 days.');
    expect(ask.sourceRowIds).toEqual(['DE-annual-leave']);
  });

  it('sends the selected countries and their rows with the question', async () => {
    const { provide } = provider([() => fakeReader(answer)]);

    await expectSaga(askQuestion, askActions.questionSubmitted('Leave?'), fastRetry)
      .withState(stateWithComparison())
      .provide([provide])
      .call.like({
        fn: openAskStream,
        args: [{ question: 'Leave?', countries: ['GB', 'DE'] }],
      })
      .run();
  });

  it('stops when the user presses stop, keeping the partial answer and aborting the request', async () => {
    const { provide, signals } = provider([() => fakeReader(answer.slice(0, 1), { hang: true })]);

    const result: { storeState: unknown } = await expectSaga(
      askQuestion,
      askActions.questionSubmitted('Leave?'),
      fastRetry,
    )
      .withReducer(rootReducer, stateWithComparison())
      .provide([provide])
      .put(askActions.chunkReceived('Germany '))
      .delay(20)
      .dispatch(askActions.stopRequested())
      .put(askActions.generationStopped())
      .not.put(askActions.streamCompleted())
      .silentRun(50);

    expect((result.storeState as RootState).ask.answer).toBe('Germany ');
    expect(signals[0]?.aborted).toBe(true);
  });

  it('retries before the first chunk, then succeeds', async () => {
    const { provide, signals } = provider([
      () => serverError(),
      () => serverError(),
      () => fakeReader(answer),
    ]);

    await expectSaga(askQuestion, askActions.questionSubmitted('Leave?'), fastRetry)
      .withState(stateWithComparison())
      .provide([provide])
      .put(askActions.retrying({ attempt: 2, maxAttempts: 3 }))
      .put(askActions.retrying({ attempt: 3, maxAttempts: 3 }))
      .put(askActions.streamCompleted())
      .run();

    expect(signals).toHaveLength(3);
  });

  it('gives up after 3 attempts and says so', async () => {
    const { provide, signals } = provider([() => serverError()]);

    await expectSaga(askQuestion, askActions.questionSubmitted('Leave?'), fastRetry)
      .withState(stateWithComparison())
      .provide([provide])
      .put(askActions.streamFailed('The server replied with status 503. We tried 3 times.'))
      .run();

    expect(signals).toHaveLength(3);
  });

  it('does not retry a 4xx error', async () => {
    const { provide, signals } = provider([
      () => new ApiError('http', 'The server replied with status 400.', 400),
    ]);

    await expectSaga(askQuestion, askActions.questionSubmitted('Leave?'), fastRetry)
      .withState(stateWithComparison())
      .provide([provide])
      .not.put.like({ action: { type: askActions.retrying.type } })
      .put(askActions.streamFailed('The server replied with status 400.'))
      .run();

    expect(signals).toHaveLength(1);
  });

  it('does not retry when the server says the request was rejected', async () => {
    const { provide, signals } = provider([
      () => fakeReader([{ type: 'error', message: 'Rejected.', retryable: false }]),
    ]);

    await expectSaga(askQuestion, askActions.questionSubmitted('Leave?'), fastRetry)
      .withState(stateWithComparison())
      .provide([provide])
      .not.put.like({ action: { type: askActions.retrying.type } })
      .put(askActions.streamFailed('Rejected.'))
      .run();

    expect(signals).toHaveLength(1);
  });

  it('marks the answer interrupted, and does not retry, when the stream fails after text', async () => {
    const { provide, signals } = provider([() => fakeReader(answer, { failAfter: 2 })]);

    const result: { storeState: unknown } = await expectSaga(
      askQuestion,
      askActions.questionSubmitted('Leave?'),
      fastRetry,
    )
      .withReducer(rootReducer, stateWithComparison())
      .provide([provide])
      .put(askActions.chunkReceived('has 20 days.'))
      .put(askActions.streamInterrupted('The connection dropped before the answer finished.'))
      .not.put.like({ action: { type: askActions.retrying.type } })
      .run();

    expect((result.storeState as RootState).ask.answer).toBe('Germany has 20 days.');
    expect(signals).toHaveLength(1);
  });

  it('refuses to ask when there is no data on screen', async () => {
    await expectSaga(askQuestion, askActions.questionSubmitted('Leave?'), fastRetry)
      .withState(rootReducer(undefined, { type: 'init' }))
      .not.call.fn(openAskStream)
      .put(
        askActions.streamFailed(
          'Compare at least 2 countries first, so there is data to ask about.',
        ),
      )
      .run();
  });
});

describe('scripted fallback', () => {
  it('asks the last question again through the scripted endpoint', async () => {
    const { provide, scriptedFlags } = provider([() => fakeReader(answer)]);
    const state = rootReducer(stateWithComparison(), askActions.questionSubmitted('Leave?'));

    await expectSaga(askQuestion, askActions.scriptedFallbackRequested(), fastRetry)
      .withState(state)
      .provide([provide])
      .call.like({ fn: openAskStream, args: [{ question: 'Leave?' }] })
      .put(askActions.streamCompleted())
      .run();

    expect(scriptedFlags).toEqual([true]);
  });

  it('labels the state as scripted, and a new question clears that', () => {
    let state = rootReducer(undefined, askActions.questionSubmitted('Leave?'));
    state = rootReducer(state, askActions.scriptedFallbackRequested());
    expect(state.ask).toMatchObject({ question: 'Leave?', scripted: true, status: 'waiting' });

    state = rootReducer(state, askActions.questionSubmitted('Pensions?'));
    expect(state.ask.scripted).toBe(false);
  });
});

describe('askSaga', () => {
  it('cancels the answer still streaming when a new question is asked', async () => {
    const { provide, signals } = provider([
      () => fakeReader(answer.slice(0, 1), { hang: true }),
      () => fakeReader(answer),
    ]);

    await expectSaga(askSaga)
      .withReducer(rootReducer, stateWithComparison())
      .provide([provide])
      .dispatch(askActions.questionSubmitted('First question'))
      .dispatch(askActions.questionSubmitted('Second question'))
      .put(askActions.streamCompleted())
      .silentRun(100);

    expect(signals).toHaveLength(2);
    expect(signals[0]?.aborted).toBe(true);
    expect(signals[1]?.aborted).toBe(false);
  });
});
