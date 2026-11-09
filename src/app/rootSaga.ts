import { all } from 'redux-saga/effects';

/**
 * Starts every feature saga. Each feature adds its watcher here with fork(),
 * so one failing watcher does not stop the others from starting.
 */
export function* rootSaga() {
  yield all([]);
}
