import { describe, expect, it } from 'vitest';
import { compareToMinimum, type GapInput } from '../gap';

const verified = (minimum: number, companyValue: number | null): GapInput => ({
  status: 'verified',
  minimum,
  companyValue,
  comparable: true,
});

describe('compareToMinimum', () => {
  it('compares a company figure with a verified minimum', () => {
    expect(compareToMinimum(verified(20, 25))).toBe('above');
    expect(compareToMinimum(verified(20, 20))).toBe('meets');
    expect(compareToMinimum(verified(2, 1))).toBe('below');
  });

  it('treats a month of notice as more than 4 weeks (52 / 12 = 4.3)', () => {
    expect(compareToMinimum(verified(4.3, 4))).toBe('below');
    expect(compareToMinimum(verified(4.3, 4.3))).toBe('meets');
  });

  it('allows for rounding to one decimal place', () => {
    expect(compareToMinimum(verified(4.3, 4.33))).toBe('meets');
    expect(compareToMinimum(verified(4.3, 4.26))).toBe('meets');
  });

  it('says when the company has no single figure for a verified minimum', () => {
    expect(compareToMinimum(verified(3, null))).toBe('no-company-figure');
  });

  it('is never "below" when the law sets no minimum', () => {
    const noMinimum = (companyValue: number | null): GapInput => ({
      status: 'no_statutory_minimum',
      minimum: null,
      companyValue,
      comparable: true,
    });
    expect(compareToMinimum(noMinimum(2))).toBe('above-no-minimum');
    expect(compareToMinimum(noMinimum(0))).toBe('no-minimum');
    expect(compareToMinimum(noMinimum(null))).toBe('no-minimum');
  });

  it('cannot compare with a minimum that is not verified', () => {
    expect(
      compareToMinimum({ status: 'todo_verify', minimum: null, companyValue: 5, comparable: true }),
    ).toBe('not-verified');
  });

  it('does not compare categories marked as not comparable', () => {
    expect(compareToMinimum({ ...verified(28, 12), comparable: false })).toBe('not-compared');
  });
});
