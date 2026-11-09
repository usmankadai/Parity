import { cancelled, put, takeLatest } from 'redux-saga/effects';
import { fetchCountries } from '../../api/endpoints';
import { errorMessage } from '../../app/errorMessage';
import { withRetry } from '../../app/withRetry';
import { countriesActions } from './slice';

export function* loadCountries() {
  const controller = new AbortController();
  try {
    // Retry temporary failures with backoff, telling the UI before each retry.
    const countries = yield* withRetry(fetchCountries, [controller.signal], {
      onRetry: (attempt, maxAttempts) => countriesActions.retrying({ attempt, maxAttempts }),
    });
    yield put(countriesActions.loaded(countries));
  } catch (error) {
    yield put(countriesActions.loadFailed(errorMessage(error)));
  } finally {
    // Runs when takeLatest cancels this load (for example, React StrictMode
    // mounting twice in development): stop the request we no longer need.
    if ((yield cancelled()) as boolean) controller.abort();
  }
}

export function* countriesSaga() {
  // takeLatest: only the newest load matters, so an older one is cancelled.
  yield takeLatest(countriesActions.loadRequested.type, loadCountries);
}
