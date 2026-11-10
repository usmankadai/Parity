import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Company } from '../../api/types';
import type { LoadStatus, RetryProgress } from '../countries/slice';
import type { WhatIfOverrides } from './whatIfStorage';

/** "company": the company's package over the minimums. "statutory": the minimums alone. */
export type ComparisonView = 'company' | 'statutory';

export interface CompanyState {
  items: Company[];
  status: LoadStatus;
  error: string | null;
  retry: RetryProgress | null;
  selectedId: string | null;
  view: ComparisonView;
  /** Whether figures can be edited ("what if"). */
  whatIf: boolean;
  /** Figures typed in by the user, per company. Saved locally by a debounced saga. */
  overrides: WhatIfOverrides;
}

const initialState: CompanyState = {
  items: [],
  status: 'idle',
  error: null,
  retry: null,
  selectedId: null,
  view: 'company',
  whatIf: false,
  overrides: {},
};

/** The overrides with one company's edits replaced; a company with no edits is left out. */
function withCompany(
  overrides: WhatIfOverrides,
  companyId: string,
  figures: Record<string, number>,
): WhatIfOverrides {
  const others = Object.entries(overrides).filter(([id]) => id !== companyId);
  return Object.fromEntries(
    Object.keys(figures).length > 0 ? [...others, [companyId, figures]] : others,
  );
}

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
    whatIfToggled(state, action: PayloadAction<boolean>) {
      state.whatIf = action.payload;
    },
    /** A figure typed in what-if mode. Null removes the edit. */
    figureEdited(
      state,
      action: PayloadAction<{ companyId: string; key: string; value: number | null }>,
    ) {
      const { companyId, key, value } = action.payload;
      const others = Object.entries(state.overrides[companyId] ?? {}).filter(([k]) => k !== key);
      const figures = Object.fromEntries(value === null ? others : [...others, [key, value]]);
      state.overrides = withCompany(state.overrides, companyId, figures);
    },
    overridesReset(state, action: PayloadAction<string>) {
      state.overrides = withCompany(state.overrides, action.payload, {});
    },
    /** Edits read back from storage when the app starts. */
    overridesRestored(state, action: PayloadAction<WhatIfOverrides>) {
      state.overrides = action.payload;
    },
  },
});

export const companyActions = companySlice.actions;
