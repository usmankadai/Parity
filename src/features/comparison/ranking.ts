import type { BenefitStatus } from '../../api/types';

export type Rank = 'most-generous' | 'least-generous';

export interface RankInput {
  key: string;
  status: BenefitStatus;
  /** The normalised value. Null when there is no figure. */
  value: number | null;
}

/**
 * Marks the most and least generous cells in a row. Higher is always more
 * generous to the employee in the categories we rank.
 *
 * Rules:
 * - Not-yet-verified cells are never ranked.
 * - "No legal minimum" ranks as zero: the law guarantees nothing.
 * - A row needs at least 2 rankable values that are not all equal.
 * - Ties are all marked.
 */
export function rankRow(cells: RankInput[], rankable: boolean): Map<string, Rank> {
  const ranks = new Map<string, Rank>();
  if (!rankable) return ranks;

  const scored: { key: string; score: number }[] = [];
  for (const cell of cells) {
    if (cell.status === 'no_statutory_minimum') {
      scored.push({ key: cell.key, score: 0 });
    } else if (cell.status === 'verified' && cell.value !== null) {
      scored.push({ key: cell.key, score: cell.value });
    }
  }

  if (scored.length < 2) return ranks;

  const scores = scored.map((cell) => cell.score);
  const best = Math.max(...scores);
  const worst = Math.min(...scores);
  if (best === worst) return ranks;

  for (const cell of scored) {
    if (cell.score === best) ranks.set(cell.key, 'most-generous');
    if (cell.score === worst) ranks.set(cell.key, 'least-generous');
  }
  return ranks;
}
