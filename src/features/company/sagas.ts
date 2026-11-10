import { call, cancelled, debounce, put, takeLatest } from 'redux-saga/effects';
import { fetchCompanies } from '../../api/endpoints';
import { errorMessage } from '../../app/errorMessage';
import { typedCall, typedSelect } from '../../app/typedEffects';
import { withRetry } from '../../app/withRetry';
import { companyActions } from './slice';
import { readStoredOverrides, writeStoredOverrides } from './whatIfStorage';

export function* loadCompanies() {
  const controller = new AbortController();
  try {
    const companies = yield* withRetry(fetchCompanies, [controller.signal], {
      onRetry: (attempt, maxAttempts) => companyActions.retrying({ attempt, maxAttempts }),
    });
    yield put(companyActions.loaded(companies));
  } catch (error) {
    yield put(companyActions.loadFailed(errorMessage(error)));
  } finally {
    if ((yield cancelled()) as boolean) controller.abort();
  }
}

/** Restores what-if edits saved on an earlier visit. */
export function* restoreOverrides() {
  const overrides = yield* typedCall(readStoredOverrides);
  if (Object.keys(overrides).length > 0) {
    yield put(companyActions.overridesRestored(overrides));
  }
}

export function* saveOverrides() {
  const overrides = yield* typedSelect((state) => state.company.overrides);
  yield call(writeStoredOverrides, overrides);
}

/** How long typing must pause before edits are saved. */
export const SAVE_DEBOUNCE_MS = 400;

export function* companySaga() {
  yield call(restoreOverrides);
  // takeLatest: only the newest load matters, so an older one is cancelled.
  yield takeLatest(companyActions.loadRequested.type, loadCompanies);
  // debounce: typing "1", "12", "12.5" saves once, after the user pauses.
  yield debounce(
    SAVE_DEBOUNCE_MS,
    [companyActions.figureEdited.type, companyActions.overridesReset.type],
    saveOverrides,
  );
}
