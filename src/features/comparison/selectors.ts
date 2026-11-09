import { createSelector } from '@reduxjs/toolkit';
import type { BenefitRow, Country, CountryCode } from '../../api/types';
import type { RootState } from '../../app/store';
import { selectCountries } from '../countries/selectors';
import { CATEGORIES, type Category } from './categories';
import { normalise } from './normalise';
import { rankRow, type Rank } from './ranking';

export const selectSelectedCountryCodes = (state: RootState) => state.comparison.selected;
export const selectComparisonStatus = (state: RootState) => state.comparison.status;
export const selectComparisonError = (state: RootState) => state.comparison.error;
export const selectComparisonRetry = (state: RootState) => state.comparison.retry;
const selectRowsByCountry = (state: RootState) => state.comparison.rowsByCountry;

export const selectLoadedCountryCodes = createSelector([selectRowsByCountry], (rowsByCountry) =>
  (Object.keys(rowsByCountry) as CountryCode[]).filter((code) => rowsByCountry[code]),
);

export interface ComparisonCell {
  country: Country;
  row: BenefitRow | undefined;
  value: number | null;
  rank: Rank | undefined;
}

export interface ComparisonTableRow {
  category: Category;
  cells: ComparisonCell[];
}

export interface ComparisonTable {
  countries: Country[];
  rows: ComparisonTableRow[];
}

/** The table, ready to render: countries in a stable order, values normalised and ranked. */
export const selectComparisonTable = createSelector(
  [selectCountries, selectSelectedCountryCodes, selectRowsByCountry],
  (allCountries, selected, rowsByCountry): ComparisonTable => {
    const countries = allCountries.filter((country) => selected.includes(country.code));

    const rows = CATEGORIES.map((category) => {
      const cells = countries.map((country): Omit<ComparisonCell, 'rank'> => {
        const row = rowsByCountry[country.code]?.find((r) => r.category === category.id);
        return { country, row, value: row ? normalise(row, category.displayUnit) : null };
      });

      const ranks = rankRow(
        cells.flatMap((cell) =>
          cell.row ? [{ key: cell.country.code, status: cell.row.status, value: cell.value }] : [],
        ),
        category.rankable,
      );

      return {
        category,
        cells: cells.map((cell) => ({ ...cell, rank: ranks.get(cell.country.code) })),
      };
    });

    return { countries, rows };
  },
);

/** True when at least one selected country has rows, so there is something to show. */
export const selectComparisonHasData = createSelector(
  [selectSelectedCountryCodes, selectRowsByCountry],
  (selected, rowsByCountry) => selected.some((code) => (rowsByCountry[code]?.length ?? 0) > 0),
);
