import type { CategoryId } from '../../api/types';

/** What a normalised figure measures, which decides how it is converted and shown. */
export type DisplayUnit = 'working-days' | 'weeks' | 'days' | 'percent';

export interface Category {
  id: CategoryId;
  label: string;
  displayUnit: DisplayUnit;
  /** Whether best and worst markers are shown. False when structures are too different to rank fairly. */
  rankable: boolean;
  /** Shown under the row heading, so readers know what a ranking is based on (or why there is none). */
  rankingNote: string;
}

export const CATEGORIES: readonly Category[] = [
  {
    id: 'annual-leave',
    label: 'Annual leave',
    displayUnit: 'working-days',
    rankable: true,
    rankingNote: 'Ranked by days of leave on a 5-day week.',
  },
  {
    id: 'public-holidays',
    label: 'Paid public holidays',
    displayUnit: 'days',
    rankable: true,
    rankingNote:
      'Ranked by public holidays the law guarantees as paid. No legal minimum counts as zero.',
  },
  {
    id: 'maternity-leave',
    label: 'Maternity leave',
    displayUnit: 'weeks',
    rankable: true,
    rankingNote: 'Ranked by length of leave only. Pay differs a lot: see each cell.',
  },
  {
    id: 'paternity-leave',
    label: 'Paternity or partner leave',
    displayUnit: 'weeks',
    rankable: true,
    rankingNote: 'Ranked by length of leave only. No legal minimum counts as zero.',
  },
  {
    id: 'sick-pay',
    label: 'Statutory sick pay',
    displayUnit: 'weeks',
    rankable: false,
    rankingNote: 'Not ranked: pay rates and who pays are too different to compare by length.',
  },
  {
    id: 'pension',
    label: 'Employer workplace pension contribution',
    displayUnit: 'percent',
    rankable: false,
    rankingNote: 'Not ranked: percentages apply to different earnings, and state pensions differ.',
  },
  {
    id: 'notice-period',
    label: 'Employer notice after 2 years',
    displayUnit: 'weeks',
    rankable: true,
    rankingNote: 'Ranked by length of notice. A month counts as 52 ÷ 12 weeks.',
  },
];
