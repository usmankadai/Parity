import {
  BENEFIT_STATUSES,
  CATEGORY_IDS,
  COUNTRY_CODES,
  SOURCE_UNITS,
  type BenefitRow,
  type CountryCode,
  type Country,
} from './types.js';

/** Thrown when a response does not have the shape the app expects. */
export class InvalidResponseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidResponseError';
  }
}

type UnknownRecord = Record<string, unknown>;

export function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isOneOf<T extends string>(options: readonly T[], value: unknown): value is T {
  return typeof value === 'string' && (options as readonly string[]).includes(value);
}

export function isCountryCode(value: unknown): value is CountryCode {
  return isOneOf(COUNTRY_CODES, value);
}

export function requireString(record: UnknownRecord, key: string, where: string): string {
  const value = record[key];
  if (typeof value !== 'string') {
    throw new InvalidResponseError(`${where}: "${key}" should be a string`);
  }
  return value;
}

function optionalString(record: UnknownRecord, key: string, where: string): string | undefined {
  const value = record[key];
  if (value === undefined) return undefined;
  if (typeof value !== 'string') {
    throw new InvalidResponseError(`${where}: "${key}" should be a string if present`);
  }
  return value;
}

export function requireArray(value: unknown, where: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new InvalidResponseError(`${where}: expected a list`);
  }
  return value;
}

export function parseCountries(value: unknown): Country[] {
  return requireArray(value, 'countries').map((item, index) => {
    const where = `countries[${index}]`;
    if (!isRecord(item)) throw new InvalidResponseError(`${where}: expected an object`);
    const code = item.code;
    if (!isCountryCode(code)) throw new InvalidResponseError(`${where}: unknown country code`);
    return { code, name: requireString(item, 'name', where) };
  });
}

function parseBenefitRow(item: unknown, index: number): BenefitRow {
  const where = `benefits[${index}]`;
  if (!isRecord(item)) throw new InvalidResponseError(`${where}: expected an object`);

  const { countryCode, category, status, amount, unit } = item;
  if (!isCountryCode(countryCode)) throw new InvalidResponseError(`${where}: unknown country code`);
  if (!isOneOf(CATEGORY_IDS, category))
    throw new InvalidResponseError(`${where}: unknown category`);
  if (!isOneOf(BENEFIT_STATUSES, status))
    throw new InvalidResponseError(`${where}: unknown status`);

  // A verified row must have a figure and a unit. The other statuses must not.
  if (status === 'verified') {
    if (typeof amount !== 'number' || !Number.isFinite(amount)) {
      throw new InvalidResponseError(`${where}: a verified row needs a numeric "amount"`);
    }
    if (!isOneOf(SOURCE_UNITS, unit)) {
      throw new InvalidResponseError(`${where}: a verified row needs a known "unit"`);
    }
  } else if (amount !== null || unit !== null) {
    throw new InvalidResponseError(`${where}: only verified rows may have an amount or unit`);
  }

  const row: BenefitRow = {
    id: requireString(item, 'id', where),
    countryCode,
    category,
    status,
    amount: status === 'verified' ? amount : null,
    unit: status === 'verified' && isOneOf(SOURCE_UNITS, unit) ? unit : null,
    sourceValue: requireString(item, 'sourceValue', where),
    sourceUrl: requireString(item, 'sourceUrl', where),
    sourceTitle: requireString(item, 'sourceTitle', where),
    sourceQuote: requireString(item, 'sourceQuote', where),
    asOf: requireString(item, 'asOf', where),
  };

  const detail = optionalString(item, 'detail', where);
  if (detail !== undefined) row.detail = detail;
  const comparisonNote = optionalString(item, 'comparisonNote', where);
  if (comparisonNote !== undefined) row.comparisonNote = comparisonNote;
  const sourceLang = optionalString(item, 'sourceLang', where);
  if (sourceLang !== undefined) row.sourceLang = sourceLang;

  return row;
}

export function parseBenefitRows(value: unknown): BenefitRow[] {
  return requireArray(value, 'benefits').map(parseBenefitRow);
}
