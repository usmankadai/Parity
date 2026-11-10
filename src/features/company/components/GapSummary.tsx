import { useId } from 'react';
import type { CountryGapSummary } from '../selectors';
import styles from './GapSummary.module.css';

/** Per country: how many categories are below the legal minimum, and which. */
export function GapSummary({
  companyName,
  summary,
}: {
  companyName: string;
  summary: CountryGapSummary[];
}) {
  const headingId = useId();
  const totalBelow = summary.reduce((total, country) => total + country.below.length, 0);

  return (
    <section className={styles.summary} aria-labelledby={headingId}>
      <h2 id={headingId} className={styles.heading}>
        {totalBelow === 0
          ? `${companyName} meets or beats every legal minimum compared`
          : `${totalBelow} ${totalBelow === 1 ? 'gap' : 'gaps'} below the legal minimum`}
      </h2>
      <ul className={styles.list}>
        {summary.map(({ country, below, compared }) => (
          <li
            key={country.code}
            className={`${styles.country} ${below.length > 0 ? styles.hasGaps : ''}`}
          >
            <span className={styles.name}>{country.name}</span>
            {below.length > 0 ? (
              <span className={styles.detail}>
                <strong>{below.length} below minimum:</strong>{' '}
                {below.map((category) => category.label).join(', ')}
              </span>
            ) : (
              <span className={styles.detail}>
                All {compared} compared categories meet or beat the minimum
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
