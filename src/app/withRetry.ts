import type { UnknownAction } from '@reduxjs/toolkit';
import { delay, put } from 'redux-saga/effects';
import { ApiError } from '../api/client';
import { backoffDelayMs, DEFAULT_RETRY, isRetryable, type RetryOptions } from '../api/retry';
import { typedCall } from './typedEffects';

interface WithRetryOptions extends Partial<RetryOptions> {
  /** An action to put before each retry, so the UI can say "trying again". */
  onRetry?: (attempt: number, maxAttempts: number) => UnknownAction;
}

/**
 * Calls `fn`, retrying temporary failures with exponential backoff.
 * A custom loop with `delay` rather than redux-saga's `retry` effect, because
 * we need jitter, a growing delay, and to stop early on errors that will not
 * get better (4xx). If the saga is cancelled during a delay, the loop simply
 * stops: nothing else is in flight.
 */
export function* withRetry<Args extends unknown[], Result>(
  fn: (...args: Args) => Promise<Result>,
  args: Args,
  options: WithRetryOptions = {},
) {
  const settings = { ...DEFAULT_RETRY, ...options };

  for (let attempt = 1; ; attempt++) {
    try {
      return yield* typedCall(fn, ...args);
    } catch (error) {
      if (!isRetryable(error)) throw error;

      if (attempt >= settings.maxAttempts) {
        // Say how hard we tried, keeping the error's kind and status.
        const { kind, status, message } = error as ApiError;
        throw new ApiError(kind, `${message} We tried ${settings.maxAttempts} times.`, status);
      }

      if (options.onRetry) {
        yield put(options.onRetry(attempt + 1, settings.maxAttempts));
      }
      yield delay(backoffDelayMs(attempt, settings));
    }
  }
}
