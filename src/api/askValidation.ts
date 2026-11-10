import { ASK_LIMITS, type AskCompanyContext, type AskRequest, type CountryCode } from './types.js';
import { isCountryCode, isRecord, parseBenefitRows } from './validate.js';
import { parseCompanyBenefit, parseCompanyFigure, SLUG } from './validateCompany.js';

export type AskValidation = { ok: true; request: AskRequest } | { ok: false; message: string };

/**
 * Checks an /api/ask body. Used by the mock API now, and by the serverless
 * proxy in real mode, so both reject the same requests.
 */
export function validateAskRequest(body: unknown): AskValidation {
  if (typeof body !== 'object' || body === null) {
    return { ok: false, message: 'The request body must be an object.' };
  }
  const { question, countries, rows } = body as Record<string, unknown>;

  if (typeof question !== 'string' || question.trim() === '') {
    return { ok: false, message: 'Enter a question.' };
  }
  if (question.length > ASK_LIMITS.maxQuestionLength) {
    return {
      ok: false,
      message: `Questions must be ${ASK_LIMITS.maxQuestionLength} characters or fewer.`,
    };
  }

  if (
    !Array.isArray(countries) ||
    countries.length === 0 ||
    !countries.every(isCountryCode) ||
    new Set(countries).size !== countries.length
  ) {
    return { ok: false, message: 'countries must be a list of different supported country codes.' };
  }

  if (!Array.isArray(rows) || rows.length > ASK_LIMITS.maxRows) {
    return { ok: false, message: `rows must be a list of at most ${ASK_LIMITS.maxRows} rows.` };
  }

  let parsedRows;
  try {
    parsedRows = parseBenefitRows(rows);
  } catch {
    return { ok: false, message: 'rows contains a row in an unexpected shape.' };
  }

  const allowed = new Set<CountryCode>(countries);
  if (!parsedRows.every((row) => allowed.has(row.countryCode))) {
    return { ok: false, message: 'Every row must belong to one of the countries.' };
  }

  const request: AskRequest = { question: question.trim(), countries, rows: parsedRows };

  const { company } = body as Record<string, unknown>;
  if (company !== undefined) {
    const parsed = parseCompanyContext(company, allowed);
    if (typeof parsed === 'string') return { ok: false, message: parsed };
    request.company = parsed;
  }

  return { ok: true, request };
}

/** Checks the optional company data. Returns an error message, or the parsed context. */
function parseCompanyContext(
  value: unknown,
  countries: Set<CountryCode>,
): AskCompanyContext | string {
  if (!isRecord(value)) return 'company must be an object.';
  const { id, name, figures, benefits } = value;
  if (typeof id !== 'string' || !SLUG.test(id)) return 'company.id is not valid.';
  if (typeof name !== 'string' || name.trim() === '' || name.length > 100) {
    return 'company.name is not valid.';
  }
  if (!Array.isArray(figures) || figures.length > ASK_LIMITS.maxCompanyFigures) {
    return `company.figures must be a list of at most ${ASK_LIMITS.maxCompanyFigures}.`;
  }
  if (!Array.isArray(benefits) || benefits.length > ASK_LIMITS.maxCompanyBenefits) {
    return `company.benefits must be a list of at most ${ASK_LIMITS.maxCompanyBenefits}.`;
  }
  try {
    return {
      id,
      name,
      figures: figures.map((f, i) => parseCompanyFigure(f, `company.figures[${i}]`, countries)),
      benefits: benefits.map((b, i) => parseCompanyBenefit(b, `company.benefits[${i}]`, countries)),
    };
  } catch {
    return 'company contains a figure or benefit in an unexpected shape, or for another country.';
  }
}
