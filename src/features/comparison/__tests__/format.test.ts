import { describe, expect, it } from 'vitest';
import { formatAsOf, formatMeasure } from '../format';

describe('formatMeasure', () => {
  it('formats each unit, with singular forms', () => {
    expect(formatMeasure(20, 'working-days')).toBe('20 working days');
    expect(formatMeasure(1, 'working-days')).toBe('1 working day');
    expect(formatMeasure(9, 'days')).toBe('9 days');
    expect(formatMeasure(1, 'weeks')).toBe('1 week');
    expect(formatMeasure(4.3, 'weeks')).toBe('4.3 weeks');
    expect(formatMeasure(1.5, 'percent')).toBe('1.5%');
  });
});

describe('formatAsOf', () => {
  it('formats an ISO date in British style', () => {
    expect(formatAsOf('2026-11-09')).toBe('9 November 2026');
  });

  it('returns the input when it is not a date', () => {
    expect(formatAsOf('soon')).toBe('soon');
  });
});
