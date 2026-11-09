import { END, type EventChannel } from 'redux-saga';
import {
  all,
  call,
  race,
  select,
  takeMaybe,
  type AllEffect,
  type CallEffect,
  type RaceEffect,
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

/**
 * Races effects with `race`. Only the winner's key is set in the result.
 * The caller names the result shape.
 */
export function* typedRace<Result extends Record<string, unknown>>(
  effects: Record<keyof Result, unknown>,
): Generator<RaceEffect<unknown>, Partial<Result>, unknown> {
  return (yield race(effects)) as Partial<Result>;
}

/**
 * Takes the next message from a channel. Uses takeMaybe, so a closed channel
 * returns END instead of silently ending the saga.
 */
export function* typedTakeMaybe<Message extends object>(
  channel: EventChannel<Message>,
): Generator<unknown, Message | END, unknown> {
  return (yield takeMaybe(channel)) as Message | END;
}

/** True when a channel message is END (the channel closed). Narrows the type, unlike `=== END`. */
export function isEnd(value: object): value is END {
  return value === END;
}
