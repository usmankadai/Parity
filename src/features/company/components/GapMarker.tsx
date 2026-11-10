import { GAP_LABELS, type Gap } from '../gap';
import styles from './GapMarker.module.css';

const TONE: Record<Gap, 'good' | 'neutral' | 'bad'> = {
  above: 'good',
  'above-no-minimum': 'good',
  meets: 'neutral',
  below: 'bad',
  'no-minimum': 'neutral',
  'not-verified': 'neutral',
  'not-compared': 'neutral',
  'no-company-figure': 'neutral',
};

/** One shape per meaning, plus the text, so colour is never the only signal. */
function iconPath(gap: Gap): string {
  switch (gap) {
    case 'above':
    case 'above-no-minimum':
      return 'M2.5 6.5 L5 9 L9.5 3.5'; // tick
    case 'meets':
      return 'M2.5 4.5 H9.5 M2.5 7.5 H9.5'; // equals
    case 'below':
      return 'M3 3 L9 9 M9 3 L3 9'; // cross
    default:
      return 'M3 6 H9'; // dash
  }
}

export function GapMarker({ gap }: { gap: Gap }) {
  return (
    <span className={`${styles.marker} ${styles[TONE[gap]]}`}>
      <svg
        className={styles.icon}
        viewBox="0 0 12 12"
        width="12"
        height="12"
        aria-hidden="true"
        focusable="false"
      >
        <path
          d={iconPath(gap)}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
      </svg>
      {GAP_LABELS[gap]}
    </span>
  );
}
