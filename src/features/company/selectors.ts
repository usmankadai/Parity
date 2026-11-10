import { createSelector } from '@reduxjs/toolkit';
import type { CompanyBenefit, CompanyFigure, Country } from '../../api/types';
import type { RootState } from '../../app/store';
import type { Category } from '../comparison/categories';
import { normaliseAmount } from '../comparison/normalise';
import { selectComparisonTable, type ComparisonCell } from '../comparison/selectors';
import { COMPANY_BENEFITS, type CompanyBenefitCategory } from './benefits';
import { compareToMinimum, type Gap } from './gap';
import { overrideKey } from './whatIfStorage';

export const selectCompanyState = (state: RootState) => state.company;
export const selectCompanyView = (state: RootState) => state.company.view;
export const selectWhatIf = (state: RootState) => state.company.whatIf;
const selectOverrides = (state: RootState) => state.company.overrides;

export const selectSelectedCompany = createSelector(
  [(state: RootState) => state.company.items, (state: RootState) => state.company.selectedId],
  (items, selectedId) => items.find((company) => company.id === selectedId) ?? null,
);

/** True when the company view can be shown: a company is loaded and chosen. */
export const selectCompanyViewActive = (state: RootState) =>
  state.company.view === 'company' && selectSelectedCompany(state) !== null;

export interface CompanyCell extends ComparisonCell {
  figure: CompanyFigure | undefined;
  /** The company's figure in the category's display unit (a what-if edit if there is one). */
  companyValue: number | null;
  /** True when companyValue comes from a what-if edit, not the company's data. */
  edited: boolean;
  gap: Gap | null;
}

export interface CompanyTableRow {
  category: Category;
  cells: CompanyCell[];
}

export interface CompanyBenefitRow {
  benefit: CompanyBenefitCategory;
  cells: { country: Country; entry: CompanyBenefit | undefined }[];
}

export interface CompanyTable {
  companyName: string;
  countries: Country[];
  rows: CompanyTableRow[];
  benefitRows: CompanyBenefitRow[];
}

/** The comparison table with the selected company's figures and gaps added. */
export const selectCompanyTable = createSelector(
  [selectComparisonTable, selectSelectedCompany, selectOverrides],
  (table, company, overrides): CompanyTable | null => {
    if (!company) return null;
    const edits = overrides[company.id] ?? {};

    const rows = table.rows.map(({ category, cells }) => ({
      category,
      cells: cells.map((cell): CompanyCell => {
        const figure = company.figures.find(
          (f) => f.countryCode === cell.country.code && f.category === category.id,
        );
        const edit = edits[overrideKey(cell.country.code, category.id)];
        const fromData =
          figure && figure.amount !== null && figure.unit !== null
            ? normaliseAmount(figure.amount, figure.unit, category.displayUnit, category.id)
            : null;
        const edited = edit !== undefined;
        const companyValue = edited ? edit : fromData;
        const gap =
          cell.row && (figure || edited)
            ? compareToMinimum({
                status: cell.row.status,
                minimum: cell.value,
                companyValue,
                comparable: category.comparable,
              })
            : null;
        return { ...cell, figure, companyValue, edited, gap };
      }),
    }));

    const benefitRows = COMPANY_BENEFITS.map((benefit) => ({
      benefit,
      cells: table.countries.map((country) => ({
        country,
        entry: company.benefits.find(
          (b) => b.countryCode === country.code && b.benefit === benefit.id,
        ),
      })),
    }));

    return { companyName: company.name, countries: table.countries, rows, benefitRows };
  },
);

export interface CountryGapSummary {
  country: Country;
  /** Categories where the company is below the legal minimum. */
  below: Category[];
  /** How many categories were compared as a number. */
  compared: number;
}

/** Per country: what is below the legal minimum, for the summary above the table. */
export const selectGapSummary = createSelector([selectCompanyTable], (table) => {
  if (!table) return [];
  return table.countries.map((country): CountryGapSummary => {
    const below: Category[] = [];
    let compared = 0;
    for (const row of table.rows) {
      const cell = row.cells.find((c) => c.country.code === country.code);
      if (!cell?.gap) continue;
      if (['above', 'meets', 'below', 'above-no-minimum', 'no-minimum'].includes(cell.gap)) {
        compared += 1;
      }
      if (cell.gap === 'below') below.push(row.category);
    }
    return { country, below, compared };
  });
});

/** How many figures the user has edited for the selected company. */
export const selectEditCount = createSelector(
  [selectSelectedCompany, selectOverrides],
  (company, overrides) => (company ? Object.keys(overrides[company.id] ?? {}).length : 0),
);
