import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { BenefitRow, CountryCode } from '../../api/types';
import type { LoadStatus, RetryProgress } from '../countries/slice';

export interface ComparisonState {
  /** The countries the user last asked to compare. */
  selected: CountryCode[];
  /** The countries ticked in the picker, not yet compared. */
  draft: CountryCode[];
  /** Rows already loaded, kept per country so re-comparing does not refetch. */
  rowsByCountry: Partial<Record<CountryCode, BenefitRow[]>>;
  status: LoadStatus;
  error: string | null;
  retry: RetryProgress | null;
}

const initialState: ComparisonState = {
  selected: [],
  draft: [],
  rowsByCountry: {},
  status: 'idle',
  error: null,
  retry: null,
};

export const comparisonSlice = createSlice({
  name: 'comparison',
  initialState,
  reducers: {
    /** Back to nothing compared (for example after switching company). Loaded rows are kept. */
    cleared(state) {
      state.selected = [];
      state.draft = [];
      state.status = 'idle';
      state.error = null;
      state.retry = null;
    },
    draftChanged(state, action: PayloadAction<CountryCode[]>) {
      state.draft = action.payload;
    },
    requested(state, action: PayloadAction<CountryCode[]>) {
      state.selected = action.payload;
      state.draft = action.payload;
      state.status = 'loading';
      state.error = null;
      state.retry = null;
    },
    retrying(state, action: PayloadAction<RetryProgress>) {
      state.retry = action.payload;
    },
    rowsLoaded(state, action: PayloadAction<BenefitRow[]>) {
      for (const row of action.payload) {
        const existing = state.rowsByCountry[row.countryCode] ?? [];
        state.rowsByCountry[row.countryCode] = [...existing.filter((r) => r.id !== row.id), row];
      }
      state.status = 'ready';
      state.retry = null;
    },
    loadFailed(state, action: PayloadAction<string>) {
      state.status = 'error';
      state.error = action.payload;
      state.retry = null;
    },
    /** Forget loaded rows, so the next comparison fetches again (used by the scenario switcher). */
    cacheCleared(state) {
      state.rowsByCountry = {};
      state.status = 'idle';
      state.error = null;
      state.retry = null;
    },
  },
});

export const comparisonActions = comparisonSlice.actions;
