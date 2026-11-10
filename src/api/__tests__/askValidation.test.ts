import { describe, expect, it } from 'vitest';
import benefits from '../../mocks/fixtures/benefits.json';
import { validateAskRequest } from '../askValidation';

const gbRows = benefits.filter((row) => row.countryCode === 'GB');
const valid = { question: '  Where is leave most generous?  ', countries: ['GB'], rows: gbRows };

describe('validateAskRequest', () => {
  it('accepts a valid request and trims the question', () => {
    const result = validateAskRequest(valid);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.request.question).toBe('Where is leave most generous?');
      expect(result.request.rows).toHaveLength(7);
    }
  });

  it('rejects an empty or overlong question', () => {
    expect(validateAskRequest({ ...valid, question: '   ' })).toEqual({
      ok: false,
      message: 'Enter a question.',
    });
    expect(validateAskRequest({ ...valid, question: 'a'.repeat(501) }).ok).toBe(false);
    expect(validateAskRequest({ ...valid, question: 'a'.repeat(500) }).ok).toBe(true);
  });

  it('rejects unknown, missing or repeated countries', () => {
    expect(validateAskRequest({ ...valid, countries: ['FR'] }).ok).toBe(false);
    expect(validateAskRequest({ ...valid, countries: [] }).ok).toBe(false);
    expect(validateAskRequest({ ...valid, countries: ['GB', 'GB'] }).ok).toBe(false);
  });

  it('rejects too many rows, badly shaped rows, and rows for other countries', () => {
    expect(validateAskRequest({ ...valid, rows: Array(29).fill(gbRows[0]) }).ok).toBe(false);
    expect(validateAskRequest({ ...valid, rows: [{ id: 'x' }] }).ok).toBe(false);
    const deRow = benefits.find((row) => row.countryCode === 'DE');
    expect(validateAskRequest({ ...valid, rows: [deRow] }).ok).toBe(false);
  });

  it('rejects a body that is not an object', () => {
    expect(validateAskRequest('question').ok).toBe(false);
    expect(validateAskRequest(null).ok).toBe(false);
  });

  it('accepts company data for the request countries, and rejects anything else', () => {
    const figure = {
      countryCode: 'GB',
      category: 'pension',
      amount: 5,
      unit: 'percent',
      summary: '5% of basic salary',
    };
    const company = {
      id: 'northwind',
      name: 'Northwind Logistics',
      figures: [figure],
      benefits: [],
    };

    const ok = validateAskRequest({ ...valid, company });
    expect(ok.ok && ok.request.company?.figures).toHaveLength(1);

    expect(validateAskRequest({ ...valid, company: { ...company, id: 'Not A Slug' } }).ok).toBe(
      false,
    );
    expect(
      validateAskRequest({
        ...valid,
        company: { ...company, figures: [{ ...figure, countryCode: 'DE' }] },
      }).ok,
    ).toBe(false);
    expect(
      validateAskRequest({ ...valid, company: { ...company, figures: Array(29).fill(figure) } }).ok,
    ).toBe(false);
  });
});
