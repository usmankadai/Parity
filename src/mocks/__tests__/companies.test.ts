import { describe, expect, it } from 'vitest';
import { CATEGORY_IDS, COMPANY_BENEFIT_IDS } from '../../api/types';
import { parseCompanies } from '../../api/validateCompany';
import { CATEGORIES } from '../../features/comparison/categories';
import { normaliseAmount } from '../../features/comparison/normalise';
import { companies as raw } from '../fixtures/companies';

const companies = parseCompanies(raw);

describe('company fixtures', () => {
  it('are valid', () => {
    expect(companies.length).toBeGreaterThan(0);
  });

  it.each(companies.map((company) => [company.name, company] as const))(
    '%s has one figure per category and one entry per company benefit in every country',
    (_name, company) => {
      for (const { code } of company.countries) {
        const categories = company.figures
          .filter((f) => f.countryCode === code)
          .map((f) => f.category);
        expect([...categories].sort(), `${company.id} ${code}`).toEqual([...CATEGORY_IDS].sort());

        const benefits = company.benefits
          .filter((b) => b.countryCode === code)
          .map((b) => b.benefit);
        expect([...benefits].sort(), `${company.id} ${code}`).toEqual(
          [...COMPANY_BENEFIT_IDS].sort(),
        );
      }
    },
  );

  it('have figures that convert into each category unit', () => {
    for (const company of companies) {
      for (const figure of company.figures) {
        const category = CATEGORIES.find((c) => c.id === figure.category);
        const { amount, unit } = figure;
        if (!category || amount === null || unit === null) continue;
        expect(() => normaliseAmount(amount, unit, category.displayUnit, 'x')).not.toThrow();
      }
    }
  });
});

describe('parseCompanies', () => {
  const base = {
    id: 'test-co',
    name: 'Test Co',
    industry: 'Testing',
    theme: { brand: '#2340cc', brandWash: '#eef1fd' },
    countries: [{ code: 'GB', headcount: 10 }],
    figures: [],
    benefits: [],
  };

  it('accepts a minimal company', () => {
    expect(parseCompanies([base])[0]?.name).toBe('Test Co');
  });

  it('rejects bad ids, colours, countries and figures', () => {
    expect(() => parseCompanies([{ ...base, id: 'Test Co' }])).toThrow(/id/);
    expect(() =>
      parseCompanies([{ ...base, theme: { brand: 'blue', brandWash: '#fff' } }]),
    ).toThrow(/colours/);
    expect(() => parseCompanies([{ ...base, countries: [] }])).toThrow(/at least one/);
    expect(() =>
      parseCompanies([
        {
          ...base,
          figures: [
            { countryCode: 'DE', category: 'pension', amount: 3, unit: 'percent', summary: 'x' },
          ],
        },
      ]),
    ).toThrow(/country/);
    expect(() =>
      parseCompanies([
        {
          ...base,
          figures: [
            { countryCode: 'GB', category: 'pension', amount: 3, unit: null, summary: 'x' },
          ],
        },
      ]),
    ).toThrow(/amount/);
    expect(() => parseCompanies([base, base])).toThrow(/repeated/);
  });
});
