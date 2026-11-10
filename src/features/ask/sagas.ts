import type { PayloadAction } from '@reduxjs/toolkit';
import type { EventChannel } from 'redux-saga';
import { call, cancelled, delay, put, take, takeLatest } from 'redux-saga/effects';
import { ApiError } from '../../api/client';
import { openAskStream } from '../../api/endpoints';
import { backoffDelayMs, DEFAULT_RETRY, isRetryable, type RetryOptions } from '../../api/retry';
import type { AskRequest } from '../../api/types';
import { errorMessage } from '../../app/errorMessage';
import { isEnd, typedCall, typedRace, typedSelect, typedTakeMaybe } from '../../app/typedEffects';
import { citableIds, selectAskContext } from './selectors';
import { askActions } from './slice';
import { sseChannel, type StreamMessage } from './sseChannel';

const NO_DATA_MESSAGE = 'Compare at least 2 countries first, so there is data to ask about.';

/**
 * Streams one answer. Retries only until the first chunk arrives: after that,
 * a retry would repeat or mix text, so a failure marks the answer as
 * interrupted instead (ADR 0004).
 */
export function* streamAnswer(
  request: AskRequest,
  retry: RetryOptions = DEFAULT_RETRY,
  scripted = false,
) {
  // Statutory and company rows: the only IDs an answer may cite.
  const sentRowIds = citableIds(request);
  const controller = new AbortController();
  let channel: EventChannel<StreamMessage> | undefined;
  let gotFirstChunk = false;

  try {
    for (let attempt = 1; ; attempt++) {
      try {
        const reader = yield* typedCall(openAskStream, request, controller.signal, scripted);
        channel = sseChannel(reader);

        // eventChannel: take the stream one message at a time.
        for (;;) {
          const message = yield* typedTakeMaybe(channel);
          if (isEnd(message)) {
            throw new ApiError('network', 'The answer stopped before it finished.');
          }
          if (message.kind === 'failure') throw message.error;

          const { event } = message;
          if (event.type === 'chunk') {
            if (!gotFirstChunk) {
              gotFirstChunk = true;
              yield put(askActions.firstChunkReceived());
            }
            yield put(askActions.chunkReceived(event.text));
          } else if (event.type === 'sources') {
            // Only cite rows we actually sent: never trust the model's IDs.
            yield put(askActions.sourcesReceived(event.rowIds.filter((id) => sentRowIds.has(id))));
          } else if (event.type === 'error') {
            // A rejected request will fail again, so it is not retried (ApiError 4xx).
            throw new ApiError('http', event.message, event.retryable === false ? 400 : 500);
          } else {
            yield put(askActions.streamCompleted());
            return;
          }
        }
      } catch (error) {
        channel?.close();
        channel = undefined;

        if (gotFirstChunk) {
          yield put(askActions.streamInterrupted(errorMessage(error)));
          return;
        }
        if (!isRetryable(error)) throw error;
        if (attempt >= retry.maxAttempts) {
          const { kind, status, message } = error as ApiError;
          throw new ApiError(kind, `${message} We tried ${retry.maxAttempts} times.`, status);
        }

        yield put(askActions.retrying({ attempt: attempt + 1, maxAttempts: retry.maxAttempts }));
        yield delay(backoffDelayMs(attempt, retry));
      }
    }
  } catch (error) {
    yield put(askActions.streamFailed(errorMessage(error)));
  } finally {
    // cancelled(): a new question (takeLatest) or "Stop generating" (race)
    // ended this saga. Abort the request and stop reading the stream.
    if ((yield cancelled()) as boolean) controller.abort();
    channel?.close();
  }
}

export function* askQuestion(
  action: PayloadAction<string> | PayloadAction<undefined>,
  retry: RetryOptions = DEFAULT_RETRY,
) {
  // A scripted fallback asks the last question again, answered by the script.
  const scripted = action.type === askActions.scriptedFallbackRequested.type;
  const question = scripted
    ? yield* typedSelect((state) => state.ask.question)
    : (action.payload ?? '');

  // select: send the rows on screen, so the answer can only use that data.
  const context = yield* typedSelect(selectAskContext);
  if (context.rows.length === 0) {
    yield put(askActions.streamFailed(NO_DATA_MESSAGE));
    return;
  }

  // race: whichever happens first wins, and the other is cancelled.
  const result = yield* typedRace<{ finished: unknown; stopped: unknown }>({
    finished: call(streamAnswer, { question, ...context }, retry, scripted),
    stopped: take(askActions.stopRequested.type),
  });

  if (result.stopped) {
    yield put(askActions.generationStopped());
  }
}

export function* askSaga() {
  // takeLatest: a new question cancels the one still streaming.
  // A scripted fallback is a new request too, so it also cancels anything streaming.
  yield takeLatest(
    [askActions.questionSubmitted.type, askActions.scriptedFallbackRequested.type],
    askQuestion,
  );
}
