import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Country } from '../../api/types';

export type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';

/** Set while a failed request waits to be retried, so the UI can say so. */
export interface RetryProgress {
  attempt: number;
  maxAttempts: number;
}

export interface CountriesState {
  items: Country[];
  status: LoadStatus;
  error: string | null;
  retry: RetryProgress | null;
}

const initialState: CountriesState = { items: [], status: 'idle', error: null, retry: null };

export const countriesSlice = createSlice({
  name: 'countries',
  initialState,
  reducers: {
    loadRequested(state) {
      state.status = 'loading';
      state.error = null;
      state.retry = null;
    },
    retrying(state, action: PayloadAction<RetryProgress>) {
      state.retry = action.payload;
    },
    loaded(state, action: PayloadAction<Country[]>) {
      state.items = action.payload;
      state.status = 'ready';
      state.retry = null;
    },
    loadFailed(state, action: PayloadAction<string>) {
      state.status = 'error';
      state.error = action.payload;
      state.retry = null;
    },
  },
});

export const countriesActions = countriesSlice.actions;
