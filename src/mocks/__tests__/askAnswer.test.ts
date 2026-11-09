import { describe, expect, it } from 'vitest';
import type { CountryCode } from '../../api/types';
import { parseBenefitRows } from '../../api/validate';
import { composeAnswer, toStreamEvents } from '../askAnswer';
import benefits from '../fixtures/benefits.json';

const rowsFor = (...codes: CountryCode[]) =>
  parseBenefitRows(benefits).filter((row) => codes.includes(row.countryCode));

describe('composeAnswer', () => {
  it('answers only from the rows it was given, and cites them', () => {
    const answer = composeAnswer({
      question: 'Where is parental leave most generous?',
      countries: ['GB', 'DE'],
      rows: rowsFor('GB', 'DE'),
    });

    expect(answer.rowIds).toEqual([
      'GB-maternity-leave',
      'DE-maternity-leave',
      'GB-paternity-leave',
      'DE-paternity-leave',
    ]);
    expect(answer.text).toContain('United Kingdom, maternity leave: 52 weeks.');
    expect(answer.text).toContain('Germany, paternity or partner leave: no legal minimum');
    expect(answer.text).not.toContain('Ireland');
  });

  it('says so when the data does not cover the question', () => {
    const answer = composeAnswer({
      question: 'What about company cars?',
      countries: ['GB', 'IE'],
      rows: rowsFor('GB', 'IE'),
    });

    expect(answer.rowIds).toEqual([]);
    expect(answer.text).toMatch(/does not cover that question/);
  });
});

describe('toStreamEvents', () => {
  it('streams the text in chunks that join back exactly, then sources, then done', () => {
    const answer = { text: 'One two three four.\n\nFive six seven.', rowIds: ['GB-pension'] };
    const events = toStreamEvents(answer);

    const text = events.flatMap((event) => (event.type === 'chunk' ? [event.text] : [])).join('');
    expect(text).toBe(answer.text);
    expect(events.slice(-2)).toEqual([
      { type: 'sources', rowIds: ['GB-pension'] },
      { type: 'done' },
    ]);
  });
});
