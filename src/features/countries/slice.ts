import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Country } from '../../api/types';

export type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface CountriesState {
  items: Country[];
  status: LoadStatus;
  error: string | null;
}

const initialState: CountriesState = { items: [], status: 'idle', error: null };

export const countriesSlice = createSlice({
  name: 'countries',
  initialState,
  reducers: {
    loadRequested(state) {
      state.status = 'loading';
      state.error = null;
    },
    loaded(state, action: PayloadAction<Country[]>) {
      state.items = action.payload;
      state.status = 'ready';
    },
    loadFailed(state, action: PayloadAction<string>) {
      state.status = 'error';
      state.error = action.payload;
    },
  },
});

export const countriesActions = countriesSlice.actions;
