import { describe, expect, it } from 'vitest';
import { ApiError } from '../client';
import { backoffDelayMs, isRetryable } from '../retry';

describe('isRetryable', () => {
  it('retries network errors and 5xx responses', () => {
    expect(isRetryable(new ApiError('network', 'down'))).toBe(true);
    expect(isRetryable(new ApiError('http', 'error', 500))).toBe(true);
    expect(isRetryable(new ApiError('http', 'unavailable', 503))).toBe(true);
  });

  it('does not retry 4xx, bad data, aborts or unknown errors', () => {
    expect(isRetryable(new ApiError('http', 'bad request', 400))).toBe(false);
    expect(isRetryable(new ApiError('http', 'not found', 404))).toBe(false);
    expect(isRetryable(new ApiError('http', 'too many', 429))).toBe(false);
    expect(isRetryable(new ApiError('invalid-response', 'wrong shape'))).toBe(false);
    expect(isRetryable(new DOMException('aborted', 'AbortError'))).toBe(false);
    expect(isRetryable(new Error('boom'))).toBe(false);
  });
});

describe('backoffDelayMs', () => {
  const options = { baseDelayMs: 400, maxDelayMs: 4000 };

  it('doubles each retry, with half the delay randomised', () => {
    expect(backoffDelayMs(1, options, () => 0)).toBe(200);
    expect(backoffDelayMs(1, options, () => 1)).toBe(400);
    expect(backoffDelayMs(2, options, () => 0)).toBe(400);
    expect(backoffDelayMs(2, options, () => 1)).toBe(800);
    expect(backoffDelayMs(3, options, () => 0.5)).toBe(1200);
  });

  it('never goes above the maximum', () => {
    expect(backoffDelayMs(10, options, () => 1)).toBe(4000);
  });
});
