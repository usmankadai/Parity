import type { UnknownAction } from '@reduxjs/toolkit';
import { describe, expect, it } from 'vitest';
import { readApiMode } from '../apiMode';
import { selectApiMode } from '../selectors';
import { makeStore } from '../store';

describe('makeStore', () => {
  it('starts the root saga', () => {
    const { rootTask } = makeStore();

    expect(rootTask.error()).toBeUndefined();
  });

  it('has thunks turned off, so a function cannot be dispatched', () => {
    const { store } = makeStore();
    const thunk = (() => undefined) as unknown as UnknownAction;

    expect(() => store.dispatch(thunk)).toThrow();
  });

  it('keeps the API mode it was created with', () => {
    expect(selectApiMode(makeStore().store.getState())).toBe('mock');
    expect(selectApiMode(makeStore({ apiMode: 'real' }).store.getState())).toBe('real');
  });
});

describe('readApiMode', () => {
  it('is real only when asked for exactly', () => {
    expect(readApiMode('real')).toBe('real');
    expect(readApiMode(undefined)).toBe('mock');
    expect(readApiMode('')).toBe('mock');
    expect(readApiMode('REAL')).toBe('mock');
  });
});
