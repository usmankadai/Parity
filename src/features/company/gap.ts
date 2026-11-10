import type { BenefitStatus } from '../../api/types';

/**
 * How a company's figure compares with the legal minimum.
 *
 * - above / meets / below: compared with a verified minimum.
 * - above-no-minimum: the law sets nothing, and the company provides something.
 * - no-minimum: the law sets nothing, and the company provides nothing (never "below").
 * - not-verified: the minimum has not been verified, so it cannot be compared.
 * - not-compared: the category cannot be compared as a number (for example sick pay).
 * - no-company-figure: there is a minimum, but the company has no single figure for it.
 */
export type Gap =
  | 'above'
  | 'meets'
  | 'below'
  | 'above-no-minimum'
  | 'no-minimum'
  | 'not-verified'
  | 'not-compared'
  | 'no-company-figure';

export const GAP_LABELS: Record<Gap, string> = {
  above: 'Above minimum',
  meets: 'Meets minimum',
  below: 'Below minimum (non-compliant)',
  'above-no-minimum': 'Above minimum (no legal minimum)',
  'no-minimum': 'No legal minimum',
  'not-verified': 'Cannot compare: minimum not verified',
  'not-compared': 'Not compared',
  'no-company-figure': 'No company figure',
};

export interface GapInput {
  status: BenefitStatus;
  /** The normalised legal minimum. Null unless the row is verified. */
  minimum: number | null;
  /** The company's figure in the same unit. Null when it has no single figure. */
  companyValue: number | null;
  comparable: boolean;
}

/** Figures are rounded to one decimal place, so allow for that when comparing. */
const TOLERANCE = 0.05;

export function compareToMinimum({ status, minimum, companyValue, comparable }: GapInput): Gap {
  if (!comparable) return 'not-compared';
  if (status === 'todo_verify') return 'not-verified';

  if (status === 'no_statutory_minimum') {
    return companyValue !== null && companyValue > 0 ? 'above-no-minimum' : 'no-minimum';
  }

  if (minimum === null) return 'not-verified';
  if (companyValue === null) return 'no-company-figure';
  if (companyValue > minimum + TOLERANCE) return 'above';
  if (companyValue >= minimum - TOLERANCE) return 'meets';
  return 'below';
}

/** True for gaps a Reward Director must act on. */
export function isBelowMinimum(gap: Gap): boolean {
  return gap === 'below';
}
