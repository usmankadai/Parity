import Anthropic from '@anthropic-ai/sdk';
import { describe, expect, it } from 'vitest';
import { describeModelError } from '../claudeStream';

const apiError = (status: number, type: string, message: string) =>
  Anthropic.APIError.generate(
    status,
    { type: 'error', error: { type, message } },
    message,
    new Headers({ 'request-id': 'req_123' }),
  );

describe('describeModelError', () => {
  it('does not retry a rejected request or a bad key, and logs why', () => {
    const rejected = describeModelError(
      apiError(400, 'invalid_request_error', 'Your credit balance is too low'),
    );
    expect(rejected.retryable).toBe(false);
    expect(rejected.log).toContain('400');
    expect(rejected.log).toContain('invalid_request_error');
    expect(rejected.log).toContain('credit balance is too low');
    expect(rejected.log).toContain('req_123');

    expect(describeModelError(apiError(401, 'authentication_error', 'invalid key')).retryable).toBe(
      false,
    );
  });

  it('retries rate limits, overload and connection failures', () => {
    expect(describeModelError(apiError(429, 'rate_limit_error', 'slow down')).retryable).toBe(true);
    expect(describeModelError(apiError(529, 'overloaded_error', 'busy')).retryable).toBe(true);
    expect(
      describeModelError(new Anthropic.APIConnectionError({ message: 'offline' })).retryable,
    ).toBe(true);
  });
});
