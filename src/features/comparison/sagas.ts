import type { PayloadAction } from '@reduxjs/toolkit';
import { call, cancelled, put, takeLatest } from 'redux-saga/effects';
import { fetchBenefits } from '../../api/endpoints';
import type { BenefitRow, CountryCode } from '../../api/types';
import { errorMessage } from '../../app/errorMessage';
import { typedAllCalls, typedSelect } from '../../app/typedEffects';
import { selectLoadedCountryCodes } from './selectors';
import { comparisonActions } from './slice';

export function* loadComparison(action: PayloadAction<CountryCode[]>) {
  const controller = new AbortController();
  try {
    // select: only fetch countries we have not loaded before.
    const loaded = yield* typedSelect(selectLoadedCountryCodes);
    const missing = action.payload.filter((code) => !loaded.includes(code));

    // all: one request per country, in parallel, so a slow country does not
    // hold up the others being requested.
    const results = yield* typedAllCalls<BenefitRow[]>(
      missing.map((code) => call(fetchBenefits, [code], controller.signal)),
    );

    yield put(comparisonActions.rowsLoaded(results.flat()));
  } catch (error) {
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
