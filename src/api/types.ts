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

/** Benefits a company may offer that have no legal minimum. */
export const COMPANY_BENEFIT_IDS = [
  'private-health',
  'wellbeing-allowance',
  'employee-assistance',
] as const;
export type CompanyBenefitId = (typeof COMPANY_BENEFIT_IDS)[number];

/** A company's own figure for a statutory category in one country. */
export interface CompanyFigure {
  countryCode: CountryCode;
  category: CategoryId;
  /** In the same source units as statutory rows. Null when there is no single figure. */
  amount: number | null;
  unit: SourceUnit | null;
  /** The policy in plain English, for example "25 days plus 8 bank holidays". */
  summary: string;
}

/** Whether a company offers a benefit with no legal minimum in one country. */
export interface CompanyBenefit {
  countryCode: CountryCode;
  benefit: CompanyBenefitId;
  provided: boolean;
  summary: string;
}

export interface CompanyTheme {
  /** Main brand colour (buttons, links, focus). White text must read on it. */
  brand: string;
  /** Pale tint of the brand colour for selected states. Brand text must read on it. */
  brandWash: string;
}

/** A fictional company, configured in one file (see CLAUDE.md, "Company view"). */
export interface Company {
  id: string;
  name: string;
  industry: string;
  theme: CompanyTheme;
  countries: { code: CountryCode; headcount: number }[];
  figures: CompanyFigure[];
  benefits: CompanyBenefit[];
}

/** The company data sent with a question, so the answer can use and cite it. */
export interface AskCompanyContext {
  id: string;
  name: string;
  figures: CompanyFigure[];
  benefits: CompanyBenefit[];
}

/** One event in the `/api/ask` text/event-stream response. */
export type AskStreamEvent =
  | { type: 'chunk'; text: string }
  | { type: 'sources'; rowIds: string[] }
  | { type: 'done' }
  /** retryable: false means trying again will not help (for example a rejected request). */
  | { type: 'error'; message: string; retryable?: boolean };

/** Limits on an /api/ask request, shared by the client, the mock and the proxy. */
export const ASK_LIMITS = {
  maxQuestionLength: 500,
  maxRows: COUNTRY_CODES.length * CATEGORY_IDS.length,
  maxCompanyFigures: COUNTRY_CODES.length * CATEGORY_IDS.length,
  maxCompanyBenefits: COUNTRY_CODES.length * COMPANY_BENEFIT_IDS.length,
} as const;

/** The body of POST /api/ask: the question plus the data the answer may use. */
export interface AskRequest {
  question: string;
  countries: CountryCode[];
  rows: BenefitRow[];
  company?: AskCompanyContext;
}
