import { cancelled, put, takeLatest } from 'redux-saga/effects';
import { fetchCountries } from '../../api/endpoints';
import { typedCall } from '../../app/typedEffects';
import { errorMessage } from '../../app/errorMessage';
import { countriesActions } from './slice';

export function* loadCountries() {
  const controller = new AbortController();
  try {
    const countries = yield* typedCall(fetchCountries, controller.signal);
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
