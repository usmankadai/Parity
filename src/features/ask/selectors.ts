import { createSelector } from '@reduxjs/toolkit';
import type { AskRequest, BenefitRow } from '../../api/types';
import type { RootState } from '../../app/store';
import { CATEGORIES } from '../comparison/categories';
import { selectSelectedCountryCodes } from '../comparison/selectors';
import { selectCountries } from '../countries/selectors';

export const selectAskState = (state: RootState) => state.ask;
const selectRowsByCountry = (state: RootState) => state.comparison.rowsByCountry;

/** The data the answer may use: the selected countries and their rows. */
export const selectAskContext = createSelector(
  [selectSelectedCountryCodes, selectRowsByCountry],
  (countries, rowsByCountry): Omit<AskRequest, 'question'> => ({
    countries,
    rows: countries.flatMap((code): BenefitRow[] => rowsByCountry[code] ?? []),
  }),
);

export interface SourceChip {
  id: string;
  label: string;
}

/** Cited rows as readable labels, for example "United Kingdom maternity leave". */
export const selectSourceChips = createSelector(
  [(state: RootState) => state.ask.sourceRowIds, selectAskContext, selectCountries],
  (ids, context, countries): SourceChip[] =>
    ids.flatMap((id) => {
      const row = context.rows.find((r) => r.id === id);
      if (!row) return [];
      const country = countries.find((c) => c.code === row.countryCode)?.name ?? row.countryCode;
      const category = CATEGORIES.find((c) => c.id === row.category)?.label ?? row.category;
      return [{ id, label: `${country} ${category.toLowerCase()}` }];
    }),
);
