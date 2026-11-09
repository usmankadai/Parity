import type { BenefitRow, SourceUnit } from '../../api/types';
import type { DisplayUnit } from './categories';

/**
 * How many weeks one unit of each duration is worth.
 * - A working day on a 5-day week is 1/5 of a week, and on a 6-day week 1/6.
 *   This is how German "Werktage" (Monday to Saturday) become 5-day-week days.
 * - A month is 52 / 12 weeks (about 4.33).
 */
const WEEKS_PER_UNIT: Partial<Record<SourceUnit, number>> = {
  'working-days-5': 1 / 5,
  'working-days-6': 1 / 6,
  'working-weeks': 1,
  weeks: 1,
  months: 52 / 12,
};

const WORKING_DAYS_PER_WEEK = 5;

function roundTo1(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * Converts a row's figure into the category's display unit. Returns null when
 * there is no figure (not verified, or no legal minimum).
 *
 * Throws if the row's unit cannot be converted, because that is a data error
 * that should fail tests rather than show a wrong number.
 */
export function normalise(row: BenefitRow, displayUnit: DisplayUnit): number | null {
  if (row.status !== 'verified' || row.amount === null || row.unit === null) {
    return null;
  }

  const { amount, unit } = row;

  if (displayUnit === 'percent' || displayUnit === 'days') {
    const expected = displayUnit === 'percent' ? 'percent' : 'days';
    if (unit !== expected) {
      throw new Error(`${row.id}: cannot show "${unit}" as ${displayUnit}`);
    }
    return amount;
  }

  const weeksPerUnit = WEEKS_PER_UNIT[unit];
  if (weeksPerUnit === undefined) {
    throw new Error(`${row.id}: cannot convert "${unit}" to a duration`);
  }

  const weeks = amount * weeksPerUnit;
  return roundTo1(displayUnit === 'working-days' ? weeks * WORKING_DAYS_PER_WEEK : weeks);
}
