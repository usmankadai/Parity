/**
 * Types shared by the client, the MSW handlers and (later) the serverless proxy.
 */

export const COUNTRY_CODES = ['GB', 'IE', 'DE', 'NL'] as const;
export type CountryCode = (typeof COUNTRY_CODES)[number];

export interface Country {
  code: CountryCode;
  name: string;
}

export const CATEGORY_IDS = [
  'annual-leave',
  'public-holidays',
  'maternity-leave',
  'paternity-leave',
  'sick-pay',
  'pension',
  'notice-period',
] as const;
export type CategoryId = (typeof CATEGORY_IDS)[number];

/**
 * - verified: a figure confirmed from an official source.
 * - todo_verify: not yet confirmed. Shown as "Not yet verified", never guessed.
 * - no_statutory_minimum: an official source confirms the law sets no minimum.
 */
export const BENEFIT_STATUSES = ['verified', 'todo_verify', 'no_statutory_minimum'] as const;
export type BenefitStatus = (typeof BENEFIT_STATUSES)[number];

/** The unit a figure is stated in at its source, before normalisation. */
export const SOURCE_UNITS = [
  'working-days-5', // working days on a 5-day week
  'working-days-6', // working days on a 6-day week (German "Werktage")
  'working-weeks',
  'weeks',
  'months',
  'days',
  'percent',
] as const;
export type SourceUnit = (typeof SOURCE_UNITS)[number];

export interface BenefitRow {
  /** Stable id, `${countryCode}-${category}`, used for citations. */
  id: string;
  countryCode: CountryCode;
  category: CategoryId;
  status: BenefitStatus;
  /** The figure as the source states it. Null unless status is "verified". */
  amount: number | null;
  unit: SourceUnit | null;
  /** The figure in plain English, as the source states it (for example "24 working days on a 6-day week"). */
  sourceValue: string;
  /** Pay or structure details that one number cannot carry. */
  detail?: string;
  /** Anything that changes how the figure should be read. Always shown in the cell. */
  comparisonNote?: string;
  sourceUrl: string;
  sourceTitle: string;
  /** The source's own wording, in its original language. */
  sourceQuote: string;
  /** BCP 47 language of `sourceQuote` when it is not English, so screen readers pronounce it correctly. */
  sourceLang?: string;
  /** The date the source was checked (YYYY-MM-DD). */
  asOf: string;
}

/** One event in the `/api/ask` text/event-stream response. */
export type AskStreamEvent =
  | { type: 'chunk'; text: string }
  | { type: 'sources'; rowIds: string[] }
  | { type: 'done' }
  | { type: 'error'; message: string };

/** Limits on an /api/ask request, shared by the client, the mock and the proxy. */
export const ASK_LIMITS = {
  maxQuestionLength: 500,
  maxRows: COUNTRY_CODES.length * CATEGORY_IDS.length,
} as const;

/** The body of POST /api/ask: the question plus the data the answer may use. */
export interface AskRequest {
  question: string;
  countries: CountryCode[];
  rows: BenefitRow[];
}
