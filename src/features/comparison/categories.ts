import type { CategoryId } from '../../api/types.js';

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
  /** Whether a company figure can be compared with the minimum as a number. */
  comparable: boolean;
  /** Shown in the company view: what the gap is based on, or why there is none. */
  gapNote: string;
}

export const CATEGORIES: readonly Category[] = [
  {
    id: 'annual-leave',
    label: 'Annual leave',
    displayUnit: 'working-days',
    rankable: true,
    rankingNote: 'Ranked by days of leave on a 5-day week.',
    comparable: true,
    gapNote: 'Compared in working days on a 5-day week.',
  },
  {
    id: 'public-holidays',
    label: 'Paid public holidays',
    displayUnit: 'days',
    rankable: true,
    rankingNote:
      'Ranked by public holidays the law guarantees as paid. No legal minimum counts as zero.',
    comparable: true,
    gapNote: 'Compared by paid public holidays.',
  },
  {
    id: 'maternity-leave',
    label: 'Maternity leave',
    displayUnit: 'weeks',
    rankable: true,
    rankingNote: 'Ranked by length of leave only. Pay differs a lot: see each cell.',
    comparable: true,
    gapNote: 'Compared by length of leave. Pay is shown in each cell.',
  },
  {
    id: 'paternity-leave',
    label: 'Paternity or partner leave',
    displayUnit: 'weeks',
    rankable: true,
    rankingNote: 'Ranked by length of leave only. No legal minimum counts as zero.',
    comparable: true,
    gapNote: 'Compared by length of leave.',
  },
  {
    id: 'sick-pay',
    label: 'Statutory sick pay',
    displayUnit: 'weeks',
    rankable: false,
    rankingNote: 'Not ranked: pay rates and who pays are too different to compare by length.',
    comparable: false,
    gapNote: 'Not compared: pay rates and who pays differ too much to compare by length.',
  },
  {
    id: 'pension',
    label: 'Employer workplace pension contribution',
    displayUnit: 'percent',
    rankable: false,
    rankingNote: 'Not ranked: percentages apply to different earnings, and state pensions differ.',
    comparable: true,
    gapNote: 'Compared by percentage, but the earnings it applies to can differ.',
  },
  {
    id: 'notice-period',
    label: 'Employer notice after 2 years',
    displayUnit: 'weeks',
    rankable: true,
    rankingNote: 'Ranked by length of notice. A month counts as 52 ÷ 12 weeks.',
    comparable: true,
    gapNote: 'Compared by length of notice. A month counts as 52 ÷ 12 weeks.',
  },
];
