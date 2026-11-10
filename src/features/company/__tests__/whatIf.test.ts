import { expectSaga } from 'redux-saga-test-plan';
import { describe, expect, it, vi } from 'vitest';
import { rootReducer } from '../../../app/store';
import { companySaga } from '../sagas';
import { companyActions, companySlice } from '../slice';
import { parseStoredOverrides, serialiseOverrides, WHAT_IF_STORAGE_KEY } from '../whatIfStorage';

describe('parseStoredOverrides', () => {
  it('reads back what was saved', () => {
    const overrides = { northwind: { 'IE-notice-period': 2, 'GB-pension': 6 } };
    expect(parseStoredOverrides(serialiseOverrides(overrides))).toEqual(overrides);
  });

  it('drops anything unexpected instead of trusting it', () => {
    expect(parseStoredOverrides(null)).toEqual({});
    expect(parseStoredOverrides('not json')).toEqual({});
    expect(parseStoredOverrides(JSON.stringify({ version: 2, overrides: {} }))).toEqual({});
    expect(
      parseStoredOverrides(
        JSON.stringify({
          version: 1,
          overrides: {
            northwind: {
              'IE-notice-period': 2,
              'FR-notice-period': 3,
              'IE-bonus': 1,
              'GB-pension': -1,
              'DE-pension': 'lots',
              'NL-pension': 5000,
            },
            'Bad Id': { 'GB-pension': 4 },
          },
        }),
      ),
    ).toEqual({ northwind: { 'IE-notice-period': 2 } });
  });
});

describe('what-if reducers', () => {
  const reduce = companySlice.reducer;
  const start = reduce(undefined, { type: 'init' });

  it('adds, replaces and removes an edit, dropping a company with none left', () => {
    let state = reduce(
      start,
      companyActions.figureEdited({ companyId: 'northwind', key: 'IE-notice-period', value: 2 }),
    );
    state = reduce(
      state,
      companyActions.figureEdited({ companyId: 'northwind', key: 'IE-notice-period', value: 3 }),
    );
    expect(state.overrides).toEqual({ northwind: { 'IE-notice-period': 3 } });

    state = reduce(
      state,
      companyActions.figureEdited({ companyId: 'northwind', key: 'IE-notice-period', value: null }),
    );
    expect(state.overrides).toEqual({});
  });

  it('resets one company without touching another', () => {
    let state = reduce(
      start,
      companyActions.overridesRestored({
        northwind: { 'GB-pension': 6 },
        other: { 'GB-pension': 4 },
      }),
    );
    state = reduce(state, companyActions.overridesReset('northwind'));
    expect(state.overrides).toEqual({ other: { 'GB-pension': 4 } });
  });
});

describe('companySaga persistence', () => {
  it('restores saved edits when it starts', async () => {
    window.localStorage.setItem(
      WHAT_IF_STORAGE_KEY,
      serialiseOverrides({ northwind: { 'DE-notice-period': 4.3 } }),
    );

    await expectSaga(companySaga)
      .withReducer(rootReducer)
      .put(companyActions.overridesRestored({ northwind: { 'DE-notice-period': 4.3 } }))
      .silentRun(10);
  });

  it('saves once after typing pauses (debounce), not on every keystroke', async () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    const edit = (value: number) =>
      companyActions.figureEdited({ companyId: 'northwind', key: 'IE-notice-period', value });

    await expectSaga(companySaga)
      .withReducer(rootReducer)
      .dispatch(edit(1))
      .dispatch(edit(1.5))
      .dispatch(edit(2))
      .silentRun(600);

    const saves = setItem.mock.calls.filter(([key]) => key === WHAT_IF_STORAGE_KEY);
    expect(saves).toHaveLength(1);
    expect(parseStoredOverrides(window.localStorage.getItem(WHAT_IF_STORAGE_KEY))).toEqual({
      northwind: { 'IE-notice-period': 2 },
    });
  });
});
