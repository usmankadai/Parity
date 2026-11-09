import { describe, expect, it } from 'vitest';
import { rankRow, type RankInput } from '../ranking';

const verified = (key: string, value: number): RankInput => ({ key, status: 'verified', value });
const noMinimum = (key: string): RankInput => ({
  key,
  status: 'no_statutory_minimum',
  value: null,
});
const unverified = (key: string): RankInput => ({ key, status: 'todo_verify', value: null });

describe('rankRow', () => {
  it('marks the highest as most generous and the lowest as least generous', () => {
    const ranks = rankRow([verified('GB', 28), verified('DE', 20), verified('IE', 24)], true);

    expect(ranks.get('GB')).toBe('most-generous');
    expect(ranks.get('DE')).toBe('least-generous');
    expect(ranks.has('IE')).toBe(false);
  });

  it('marks every tied cell', () => {
    const ranks = rankRow(
      [verified('IE', 20), verified('DE', 20), verified('NL', 20), verified('GB', 28)],
      true,
    );

    expect(ranks.get('GB')).toBe('most-generous');
    expect(ranks.get('IE')).toBe('least-generous');
    expect(ranks.get('DE')).toBe('least-generous');
    expect(ranks.get('NL')).toBe('least-generous');
  });

  it('marks nothing when all values are equal', () => {
    expect(rankRow([verified('GB', 2), verified('IE', 2)], true).size).toBe(0);
  });

  it('ranks "no legal minimum" as zero', () => {
    const ranks = rankRow([verified('NL', 6), noMinimum('DE'), verified('GB', 2)], true);

    expect(ranks.get('NL')).toBe('most-generous');
    expect(ranks.get('DE')).toBe('least-generous');
  });

  it('never ranks a cell that is not yet verified', () => {
    const ranks = rankRow([verified('GB', 2), unverified('IE'), verified('NL', 6)], true);

    expect(ranks.has('IE')).toBe(false);
    expect(ranks.get('GB')).toBe('least-generous');
  });

  it('needs at least 2 rankable values', () => {
    expect(rankRow([verified('GB', 2), unverified('IE')], true).size).toBe(0);
  });

  it('marks nothing in a category that is not rankable', () => {
    expect(rankRow([verified('GB', 28), verified('NL', 104)], false).size).toBe(0);
  });

  it('handles a "no legal minimum" cell that ties with a verified zero', () => {
    const ranks = rankRow([verified('GB', 0), noMinimum('NL'), verified('IE', 10)], true);

    expect(ranks.get('GB')).toBe('least-generous');
    expect(ranks.get('NL')).toBe('least-generous');
    expect(ranks.get('IE')).toBe('most-generous');
  });
});
