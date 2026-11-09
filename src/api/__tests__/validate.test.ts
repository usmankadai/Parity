import { describe, expect, it } from 'vitest';
import { InvalidResponseError, parseBenefitRows, parseCountries } from '../validate';

const verifiedRow = {
  id: 'GB-annual-leave',
  countryCode: 'GB',
  category: 'annual-leave',
  status: 'verified',
  amount: 28,
  unit: 'working-days-5',
  sourceValue: '28 days',
  sourceUrl: 'https://www.gov.uk/holiday-entitlement-rights',
  sourceTitle: 'Holiday entitlement',
  sourceQuote: 'at least 28 days',
  asOf: '2026-11-09',
};

describe('parseCountries', () => {
  it('accepts known countries', () => {
    expect(parseCountries([{ code: 'DE', name: 'Germany' }])).toEqual([
      { code: 'DE', name: 'Germany' },
    ]);
  });

  it('rejects unknown codes and wrong shapes', () => {
    expect(() => parseCountries([{ code: 'FR', name: 'France' }])).toThrow(InvalidResponseError);
    expect(() => parseCountries({})).toThrow(InvalidResponseError);
    expect(() => parseCountries([{ code: 'DE' }])).toThrow(/name/);
  });
});

describe('parseBenefitRows', () => {
  it('accepts a verified row and keeps optional fields only when present', () => {
    const [row] = parseBenefitRows([{ ...verifiedRow, detail: 'More' }]);
    expect(row?.detail).toBe('More');
    expect(row && 'comparisonNote' in row).toBe(false);
  });

  it('requires a figure and unit on verified rows', () => {
    expect(() => parseBenefitRows([{ ...verifiedRow, amount: null }])).toThrow(/amount/);
    expect(() => parseBenefitRows([{ ...verifiedRow, unit: 'fortnights' }])).toThrow(/unit/);
  });

  it('forbids a figure on rows that are not verified', () => {
    expect(() => parseBenefitRows([{ ...verifiedRow, status: 'todo_verify' }])).toThrow(
      /only verified/,
    );
    expect(
      parseBenefitRows([
        { ...verifiedRow, status: 'no_statutory_minimum', amount: null, unit: null },
      ])[0]?.status,
    ).toBe('no_statutory_minimum');
  });

  it('rejects unknown statuses and categories', () => {
    expect(() => parseBenefitRows([{ ...verifiedRow, status: 'guess' }])).toThrow(/status/);
    expect(() => parseBenefitRows([{ ...verifiedRow, category: 'bonus' }])).toThrow(/category/);
  });
});
