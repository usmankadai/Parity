import type { PayloadAction } from '@reduxjs/toolkit';
import { call, cancelled, put, takeLatest } from 'redux-saga/effects';
import { fetchBenefits } from '../../api/endpoints';
import type { BenefitRow, CountryCode } from '../../api/types';
import { errorMessage } from '../../app/errorMessage';
import { typedAllCalls, typedSelect } from '../../app/typedEffects';
import { withRetry } from '../../app/withRetry';
import { selectLoadedCountryCodes } from './selectors';
import { comparisonActions } from './slice';

const onRetry = (attempt: number, maxAttempts: number) =>
  comparisonActions.retrying({ attempt, maxAttempts });

/** Loads one country's rows, retrying temporary failures. */
export function* loadCountryRows(code: CountryCode, signal: AbortSignal) {
  return yield* withRetry(fetchBenefits, [[code], signal], { onRetry });
}

export function* loadComparison(action: PayloadAction<CountryCode[]>) {
  const controller = new AbortController();
  try {
    // select: only fetch countries we have not loaded before.
    const loaded = yield* typedSelect(selectLoadedCountryCodes);
    const missing = action.payload.filter((code) => !loaded.includes(code));

    // all: one request per country, in parallel, each with its own retries,
    // so one slow or flaky country does not hold up requesting the others.
    const results = yield* typedAllCalls<BenefitRow[]>(
      missing.map((code) => call(loadCountryRows, code, controller.signal)),
    );

    yield put(comparisonActions.rowsLoaded(results.flat()));
  } catch (error) {
    // If one country failed for good, all() has cancelled the others:
    // abort their requests too.
    controller.abort();
    yield put(comparisonActions.loadFailed(errorMessage(error)));
  } finally {
    // A newer comparison cancelled this one: stop its requests.
    if ((yield cancelled()) as boolean) controller.abort();
  }
}

export function* comparisonSaga() {
  // takeLatest: if the user changes their selection mid-load, only the newest counts.
  yield takeLatest(comparisonActions.requested.type, loadComparison);
}
