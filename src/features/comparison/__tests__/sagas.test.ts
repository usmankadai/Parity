import { expectSaga } from 'redux-saga-test-plan';
import * as matchers from 'redux-saga-test-plan/matchers';
import { dynamic, throwError } from 'redux-saga-test-plan/providers';
import { describe, expect, it } from 'vitest';
import { ApiError } from '../../../api/client';
import { fetchBenefits } from '../../../api/endpoints';
import type { BenefitRow, CountryCode } from '../../../api/types';
import { rootReducer } from '../../../app/store';
import { comparisonSaga, loadComparison } from '../sagas';
import { comparisonActions } from '../slice';

function rowFor(countryCode: CountryCode): BenefitRow {
  return {
    id: `${countryCode}-annual-leave`,
    countryCode,
    category: 'annual-leave',
    status: 'verified',
    amount: 20,
    unit: 'working-days-5',
    sourceValue: '20 days',
    sourceUrl: 'https://example.test',
    sourceTitle: 'Test',
    sourceQuote: 'Test',
    asOf: '2026-11-09',
  };
}

const fetchFor = (codes: CountryCode[]) => Promise.resolve(codes.map(rowFor));

describe('loadComparison', () => {
  it('fetches each selected country and stores the rows', async () => {
    const result: { storeState: unknown } = await expectSaga(
      loadComparison,
      comparisonActions.requested(['GB', 'DE']),
    )
      .withReducer(rootReducer)
      .provide([
        [
          matchers.call.fn(fetchBenefits),
          dynamic(({ args }: { args: unknown[] }) => fetchFor(args[0] as CountryCode[])),
        ],
      ])
      .call.like({ fn: fetchBenefits, args: [['GB']] })
      .call.like({ fn: fetchBenefits, args: [['DE']] })
      .put(comparisonActions.rowsLoaded([rowFor('GB'), rowFor('DE')]))
      .run();

    expect((result.storeState as ReturnType<typeof rootReducer>).comparison.status).toBe('ready');
  });

  it('only fetches countries that are not loaded yet', async () => {
    const state = rootReducer(undefined, comparisonActions.rowsLoaded([rowFor('GB')]));

    await expectSaga(loadComparison, comparisonActions.requested(['GB', 'NL']))
      .withState(state)
      .provide([
        [
          matchers.call.fn(fetchBenefits),
          dynamic(({ args }: { args: unknown[] }) => fetchFor(args[0] as CountryCode[])),
        ],
      ])
      .call.like({ fn: fetchBenefits, args: [['NL']] })
      .not.call.like({ fn: fetchBenefits, args: [['GB']] })
      .put(comparisonActions.rowsLoaded([rowFor('NL')]))
      .run();
  });

  it('reports a failure with a message that is safe to show', async () => {
    await expectSaga(loadComparison, comparisonActions.requested(['IE', 'DE']))
      .withReducer(rootReducer)
      .provide([
        [
          matchers.call.fn(fetchBenefits),
          throwError(new ApiError('http', 'The server replied with status 404.', 404)),
        ],
      ])
      .put(comparisonActions.loadFailed('The server replied with status 404.'))
      .run();
  });
});

describe('comparisonSaga', () => {
  it('cancels an older comparison, and aborts its request, when a newer one starts', async () => {
    const signals: AbortSignal[] = [];

    await expectSaga(comparisonSaga)
      .withReducer(rootReducer)
      .provide([
        [
          matchers.call.fn(fetchBenefits),
          dynamic(({ args }: { args: unknown[] }) => {
            const [codes, signal] = args as [CountryCode[], AbortSignal];
            signals.push(signal);
            // The first request never finishes, so only cancellation can end it.
            return codes[0] === 'GB' ? new Promise<never>(() => undefined) : fetchFor(codes);
          }),
        ],
      ])
      .dispatch(comparisonActions.requested(['GB']))
      .dispatch(comparisonActions.requested(['NL']))
      .put(comparisonActions.rowsLoaded([rowFor('NL')]))
      .not.put(comparisonActions.rowsLoaded([rowFor('GB')]))
      .silentRun(50);

    expect(signals[0]?.aborted).toBe(true);
    expect(signals[1]?.aborted).toBe(false);
  });
});
