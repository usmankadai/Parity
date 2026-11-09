import {
  all,
  call,
  select,
  type AllEffect,
  type CallEffect,
  type SelectEffect,
} from 'redux-saga/effects';
import type { RootState } from './store';

// redux-saga types every `yield` result as `any`. These small wrappers, used
// with `yield*`, give each result its real type without casts in the sagas.
// They yield the ordinary effects, so redux-saga-test-plan still sees `call`
// and `select` and its providers work as usual.

export function* typedCall<Args extends unknown[], Result>(
  fn: (...args: Args) => Promise<Result> | Result,
  ...args: Args
): Generator<CallEffect<unknown>, Result, unknown> {
  return (yield call(fn, ...args)) as Result;
}

export function* typedSelect<Result>(
  selector: (state: RootState) => Result,
): Generator<SelectEffect, Result, unknown> {
  return (yield select(selector)) as Result;
}

/**
 * Runs calls in parallel with `all`, and types the results as a list.
 * The caller names the result type, because a call to a generic generator
 * (such as withRetry) loses it.
 */
export function* typedAllCalls<Result>(
  effects: CallEffect<unknown>[],
): Generator<AllEffect<CallEffect<unknown>>, Result[], unknown> {
  return (yield all(effects)) as Result[];
}
