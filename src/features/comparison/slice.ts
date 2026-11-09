import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { BenefitRow, CountryCode } from '../../api/types';
import type { LoadStatus } from '../countries/slice';

export interface ComparisonState {
  /** The countries the user last asked to compare. */
  selected: CountryCode[];
  /** Rows already loaded, kept per country so re-comparing does not refetch. */
  rowsByCountry: Partial<Record<CountryCode, BenefitRow[]>>;
  status: LoadStatus;
  error: string | null;
}

const initialState: ComparisonState = {
  selected: [],
  rowsByCountry: {},
  status: 'idle',
  error: null,
};

export const comparisonSlice = createSlice({
  name: 'comparison',
  initialState,
  reducers: {
    requested(state, action: PayloadAction<CountryCode[]>) {
      state.selected = action.payload;
      state.status = 'loading';
      state.error = null;
    },
    rowsLoaded(state, action: PayloadAction<BenefitRow[]>) {
      for (const row of action.payload) {
        const existing = state.rowsByCountry[row.countryCode] ?? [];
        state.rowsByCountry[row.countryCode] = [...existing.filter((r) => r.id !== row.id), row];
      }
      state.status = 'ready';
    },
    loadFailed(state, action: PayloadAction<string>) {
      state.status = 'error';
      state.error = action.payload;
    },
  },
});

export const comparisonActions = comparisonSlice.actions;
