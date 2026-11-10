import { cancelled, put, takeLatest } from 'redux-saga/effects';
import { fetchCompanies } from '../../api/endpoints';
import { errorMessage } from '../../app/errorMessage';
import { withRetry } from '../../app/withRetry';
import { companyActions } from './slice';

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

export function* companySaga() {
  // takeLatest: only the newest load matters, so an older one is cancelled.
  yield takeLatest(companyActions.loadRequested.type, loadCompanies);
}
