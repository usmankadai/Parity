import { createSelector } from '@reduxjs/toolkit';
import { companyBenefitId, companyFigureId } from '../../api/companyIds';
import type { AskRequest, BenefitRow } from '../../api/types';
import type { RootState } from '../../app/store';
import { COMPANY_BENEFITS } from '../company/benefits';
import { selectCompanyView, selectSelectedCompany } from '../company/selectors';
import { CATEGORIES } from '../comparison/categories';
import { selectSelectedCountryCodes } from '../comparison/selectors';
import { selectCountries } from '../countries/selectors';

export const selectAskState = (state: RootState) => state.ask;
const selectRowsByCountry = (state: RootState) => state.comparison.rowsByCountry;

/**
 * The data the answer may use: the selected countries and their rows and, in
 * the company view, the company's figures and benefits for those countries.
 */
export const selectAskContext = createSelector(
  [selectSelectedCountryCodes, selectRowsByCountry, selectSelectedCompany, selectCompanyView],
  (countries, rowsByCountry, company, view): Omit<AskRequest, 'question'> => {
    const context: Omit<AskRequest, 'question'> = {
      countries,
      rows: countries.flatMap((code): BenefitRow[] => rowsByCountry[code] ?? []),
    };
    if (!company || view !== 'company') return context;

    const inScope = new Set(countries);
    return {
      ...context,
      company: {
        id: company.id,
        name: company.name,
        figures: company.figures.filter((figure) => inScope.has(figure.countryCode)),
        benefits: company.benefits.filter((benefit) => inScope.has(benefit.countryCode)),
      },
    };
  },
);

export { citableIds } from '../../api/citations';

export interface SourceChip {
  id: string;
  label: string;
}

/**
 * Cited rows as readable labels: "United Kingdom maternity leave" for a legal
 * minimum, "Northwind Logistics: Ireland employer notice after 2 years" for a
 * company figure.
 */
export const selectSourceChips = createSelector(
  [(state: RootState) => state.ask.sourceRowIds, selectAskContext, selectCountries],
  (ids, context, countries): SourceChip[] => {
    const countryName = (code: string) => countries.find((c) => c.code === code)?.name ?? code;
    const labels = new Map<string, string>();

    for (const row of context.rows) {
      const category = CATEGORIES.find((c) => c.id === row.category)?.label ?? row.category;
      labels.set(row.id, `${countryName(row.countryCode)} ${category.toLowerCase()}`);
    }
    const { company } = context;
    if (company) {
      for (const f of company.figures) {
        const category = CATEGORIES.find((c) => c.id === f.category)?.label ?? f.category;
        labels.set(
          companyFigureId(company.id, f.countryCode, f.category),
          `${company.name}: ${countryName(f.countryCode)} ${category.toLowerCase()}`,
        );
      }
      for (const b of company.benefits) {
        const benefit = COMPANY_BENEFITS.find((c) => c.id === b.benefit)?.label ?? b.benefit;
        labels.set(
          companyBenefitId(company.id, b.countryCode, b.benefit),
          `${company.name}: ${countryName(b.countryCode)} ${benefit.toLowerCase()}`,
        );
      }
    }

    return ids.flatMap((id) => {
      const label = labels.get(id);
      return label ? [{ id, label }] : [];
    });
  },
);
