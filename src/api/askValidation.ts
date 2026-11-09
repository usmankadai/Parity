import { ASK_LIMITS, type AskRequest, type CountryCode } from './types';
import { isCountryCode, parseBenefitRows } from './validate';

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

  return { ok: true, request: { question: question.trim(), countries, rows: parsedRows } };
}
