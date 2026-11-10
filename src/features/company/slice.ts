import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Company } from '../../api/types';
import type { LoadStatus, RetryProgress } from '../countries/slice';

/** "company": the company's package over the minimums. "statutory": the minimums alone. */
export type ComparisonView = 'company' | 'statutory';

export interface CompanyState {
  items: Company[];
  status: LoadStatus;
  error: string | null;
  retry: RetryProgress | null;
  selectedId: string | null;
  view: ComparisonView;
}

const initialState: CompanyState = {
  items: [],
  status: 'idle',
  error: null,
  retry: null,
  selectedId: null,
  view: 'company',
};

export const companySlice = createSlice({
  name: 'company',
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
    loaded(state, action: PayloadAction<Company[]>) {
      state.items = action.payload;
      state.status = 'ready';
      state.retry = null;
      // Keep the chosen company if it still exists, otherwise use the first.
      if (!action.payload.some((company) => company.id === state.selectedId)) {
        state.selectedId = action.payload[0]?.id ?? null;
      }
    },
    loadFailed(state, action: PayloadAction<string>) {
      state.status = 'error';
      state.error = action.payload;
      state.retry = null;
    },
    selected(state, action: PayloadAction<string>) {
      if (state.items.some((company) => company.id === action.payload)) {
        state.selectedId = action.payload;
      }
    },
    viewChanged(state, action: PayloadAction<ComparisonView>) {
      state.view = action.payload;
    },
  },
});

export const companyActions = companySlice.actions;
