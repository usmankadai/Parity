import { ApiError } from './client';

export interface RetryOptions {
  /** Total attempts, including the first. */
  maxAttempts: number;
  /** Delay before the first retry, before jitter. Doubles each time. */
  baseDelayMs: number;
  /** Upper limit for any single delay. */
  maxDelayMs: number;
}

export const DEFAULT_RETRY: RetryOptions = {
  maxAttempts: 3,
  baseDelayMs: 400,
  maxDelayMs: 4000,
};

/**
 * Retry network failures and 5xx responses: they are often temporary.
 * Never retry 4xx (the request itself is wrong, so it would fail again),
 * a response in the wrong shape, or anything that is not an ApiError
 * (including aborts, which mean we no longer want the answer).
 */
export function isRetryable(error: unknown): boolean {
  if (!(error instanceof ApiError)) return false;
  if (error.kind === 'network') return true;
  return error.kind === 'http' && error.status !== undefined && error.status >= 500;
}

/**
 * The wait before retry number `retry` (1 for the first retry): exponential
 * backoff with jitter. The jitter keeps half the delay fixed and randomises
 * the other half, so many clients failing together do not retry in lockstep.
 */
export function backoffDelayMs(
  retry: number,
  { baseDelayMs, maxDelayMs }: Pick<RetryOptions, 'baseDelayMs' | 'maxDelayMs'>,
  random: () => number = Math.random,
): number {
  const exponential = Math.min(maxDelayMs, baseDelayMs * 2 ** (retry - 1));
  return Math.round(exponential / 2 + random() * (exponential / 2));
}
