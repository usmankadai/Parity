import { describe, expect, it } from 'vitest';
import { CATEGORY_IDS, COUNTRY_CODES } from '../../api/types';
import { parseBenefitRows, parseCountries } from '../../api/validate';
import { CATEGORIES } from '../../features/comparison/categories';
import { normalise } from '../../features/comparison/normalise';
import benefitsJson from '../fixtures/benefits.json';
import countriesJson from '../fixtures/countries.json';

// The fixture is the app's data, so it gets the same checks as code.

const OFFICIAL_HOSTS = [
  'www.gov.uk',
  'www.citizensinformation.ie',
  'www.gesetze-im-internet.de',
  'www.bmi.bund.de',
  'business.gov.nl',
  'www.government.nl',
];

const rows = parseBenefitRows(benefitsJson);

describe('countries fixture', () => {
  it('lists every supported country once', () => {
    const codes = parseCountries(countriesJson).map((country) => country.code);
    expect([...codes].sort()).toEqual([...COUNTRY_CODES].sort());
  });
});

describe('benefits fixture', () => {
  it('has exactly one row per country and category', () => {
    const keys = rows.map((row) => `${row.countryCode}-${row.category}`);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys.length).toBe(COUNTRY_CODES.length * CATEGORY_IDS.length);
  });

  it('uses the id format `${countryCode}-${category}`', () => {
    for (const row of rows) {
      expect(row.id).toBe(`${row.countryCode}-${row.category}`);
    }
  });

  it('links every row to an official source over https', () => {
    for (const row of rows) {
      const url = new URL(row.sourceUrl);
      expect(url.protocol, row.id).toBe('https:');
      expect(OFFICIAL_HOSTS, row.id).toContain(url.hostname);
    }
  });

  it('dates every row', () => {
    for (const row of rows) {
      expect(row.asOf, row.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('explains every "no legal minimum" cell with a note', () => {
    for (const row of rows.filter((r) => r.status === 'no_statutory_minimum')) {
      expect(row.comparisonNote, row.id).toBeTruthy();
    }
  });

  it('converts every verified figure into its category unit', () => {
    for (const row of rows) {
      const category = CATEGORIES.find((c) => c.id === row.category);
      if (!category) throw new Error(`No category for ${row.id}`);
      const value = normalise(row, category.displayUnit);
      expect(value === null, row.id).toBe(row.status !== 'verified');
    }
  });
});
