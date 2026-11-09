import { expectSaga } from 'redux-saga-test-plan';
import { describe, expect, it } from 'vitest';
import { ApiError } from '../../api/client';
import { withRetry } from '../withRetry';

const retrying = (attempt: number, maxAttempts: number) => ({
  type: 'test/retrying',
  payload: { attempt, maxAttempts },
});

/** A fake request that fails with each error in turn, then succeeds. */
function failingThen(errors: Error[]) {
  let calls = 0;
  const fn = (): Promise<string> => {
    const error = errors[calls];
    calls += 1;
    return error ? Promise.reject(error) : Promise.resolve('ok');
  };
  return { fn, calls: () => calls };
}

const fast = { baseDelayMs: 1, maxDelayMs: 2 };
const serverError = () => new ApiError('http', 'The server replied with status 500.', 500);

describe('withRetry', () => {
  it('returns straight away when the first attempt succeeds', async () => {
    const request = failingThen([]);
    const result: { returnValue: unknown } = await expectSaga(
      withRetry,
      request.fn,
      [],
      fast,
    ).run();

    expect(result.returnValue).toBe('ok');
    expect(request.calls()).toBe(1);
  });

  it('retries 5xx and network errors, then succeeds, announcing each retry', async () => {
    const request = failingThen([serverError(), new ApiError('network', 'down')]);

    const result: { returnValue: unknown } = await expectSaga(withRetry, request.fn, [], {
      ...fast,
      onRetry: retrying,
    })
      .put(retrying(2, 3))
      .put(retrying(3, 3))
      .run();

    expect(result.returnValue).toBe('ok');
    expect(request.calls()).toBe(3);
  });

  it('gives up after 3 attempts and says so', async () => {
    const request = failingThen([serverError(), serverError(), serverError()]);

    const result = await expectSaga(withRetry, request.fn, [], fast)
      .run()
      .catch((error: unknown) => error);

    expect(result).toBeInstanceOf(ApiError);
    expect((result as ApiError).message).toBe(
      'The server replied with status 500. We tried 3 times.',
    );
    expect((result as ApiError).status).toBe(500);
    expect(request.calls()).toBe(3);
  });

  it('does not retry a 4xx error', async () => {
    const request = failingThen([new ApiError('http', 'Bad request', 400)]);

    const result = await expectSaga(withRetry, request.fn, [], { ...fast, onRetry: retrying })
      .not.put.like({ action: { type: 'test/retrying' } })
      .run()
      .catch((error: unknown) => error);

    expect((result as ApiError).status).toBe(400);
    expect(request.calls()).toBe(1);
  });
});
