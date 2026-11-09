import type { Rank } from '../ranking';
import styles from './RankMarker.module.css';

const LABELS: Record<Rank, string> = {
  'most-generous': 'Most generous',
  'least-generous': 'Least generous',
};

/** An icon and visible text, so the meaning never relies on colour alone. */
export function RankMarker({ rank }: { rank: Rank }) {
  const best = rank === 'most-generous';
  return (
    <span className={`${styles.marker} ${best ? styles.best : styles.worst}`}>
      <svg
        className={styles.icon}
        viewBox="0 0 12 12"
        width="12"
        height="12"
        aria-hidden="true"
        focusable="false"
      >
        <path d={best ? 'M6 1 L11 10 H1 Z' : 'M6 11 L1 2 H11 Z'} fill="currentColor" />
      </svg>
      {LABELS[rank]}
    </span>
  );
}
