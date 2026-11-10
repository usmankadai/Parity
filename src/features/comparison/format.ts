import type { DisplayUnit } from './categories.js';

const numberFormat = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 1 });

/** Formats a normalised value for display, for example "20 working days" or "4.3 weeks". */
export function formatMeasure(value: number, unit: DisplayUnit): string {
  const number = numberFormat.format(value);
  const one = value === 1;

  switch (unit) {
    case 'working-days':
      return `${number} working ${one ? 'day' : 'days'}`;
    case 'days':
      return `${number} ${one ? 'day' : 'days'}`;
    case 'weeks':
      return `${number} ${one ? 'week' : 'weeks'}`;
    case 'percent':
      return `${number}%`;
  }
}

const dateFormat = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

/** Formats an ISO date (YYYY-MM-DD) as "9 November 2026". */
export function formatAsOf(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? isoDate : dateFormat.format(date);
}
