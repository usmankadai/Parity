import { describe, expect, it } from 'vitest';
import type { BenefitRow, SourceUnit } from '../../../api/types';
import { normalise } from '../normalise';

function row(amount: number | null, unit: SourceUnit | null, overrides: Partial<BenefitRow> = {}) {
  const base: BenefitRow = {
    id: 'XX-test',
    countryCode: 'GB',
    category: 'annual-leave',
    status: 'verified',
    amount,
    unit,
    sourceValue: '',
    sourceUrl: '',
    sourceTitle: '',
    sourceQuote: '',
    asOf: '2026-11-09',
  };
  return { ...base, ...overrides };
}

describe('normalise', () => {
  it('keeps working days on a 5-day week as they are', () => {
    expect(normalise(row(28, 'working-days-5'), 'working-days')).toBe(28);
  });

  it('converts days on a 6-day week to a 5-day week (German Werktage)', () => {
    expect(normalise(row(24, 'working-days-6'), 'working-days')).toBe(20);
  });

  it('converts working weeks to working days', () => {
    expect(normalise(row(4, 'working-weeks'), 'working-days')).toBe(20);
  });

  it('converts months to weeks as 52 / 12, rounded to one decimal place', () => {
    expect(normalise(row(1, 'months'), 'weeks')).toBe(4.3);
  });

  it('converts 5-day-week days to weeks', () => {
    expect(normalise(row(5, 'working-days-5'), 'weeks')).toBe(1);
  });

  it('passes counts and percentages through unchanged', () => {
    expect(normalise(row(10, 'days'), 'days')).toBe(10);
    expect(normalise(row(1.5, 'percent'), 'percent')).toBe(1.5);
  });

  it('returns null when there is no figure', () => {
    expect(normalise(row(null, null, { status: 'todo_verify' }), 'weeks')).toBeNull();
    expect(normalise(row(null, null, { status: 'no_statutory_minimum' }), 'weeks')).toBeNull();
  });

  it('throws on a unit that cannot be shown in the display unit', () => {
    expect(() => normalise(row(3, 'percent'), 'weeks')).toThrow(/cannot convert/);
    expect(() => normalise(row(3, 'weeks'), 'percent')).toThrow(/cannot show/);
    expect(() => normalise(row(3, 'weeks'), 'days')).toThrow(/cannot show/);
  });
});
