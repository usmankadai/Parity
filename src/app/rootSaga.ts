import { all, fork } from 'redux-saga/effects';
import { askSaga } from '../features/ask/sagas';
import { comparisonSaga } from '../features/comparison/sagas';
import { countriesSaga } from '../features/countries/sagas';

/**
 * Starts every feature saga. Each watcher runs in its own fork, so they all
 * start together and one feature's watcher does not wait on another's.
 */
export function* rootSaga() {
  yield all([fork(countriesSaga), fork(comparisonSaga), fork(askSaga)]);
}
