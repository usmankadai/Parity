import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { Button } from '../../../components/Button';
import { LiveRegion } from '../../../components/LiveRegion';
import { retryMessage } from '../../../components/retryMessage';
import { CompanyOverview } from '../../company/components/CompanyOverview';
import { CompanyTable } from '../../company/components/CompanyTable';
import { GapSummary } from '../../company/components/GapSummary';
import { ViewToggle } from '../../company/components/ViewToggle';
import {
  selectCompanyTable,
  selectCompanyViewActive,
  selectGapSummary,
  selectSelectedCompany,
} from '../../company/selectors';
import { selectCountries } from '../../countries/selectors';
import type { RetryProgress } from '../../countries/slice';
import {
  selectComparisonError,
  selectComparisonHasData,
  selectComparisonRetry,
  selectComparisonStatus,
  selectComparisonTable,
  selectSelectedCountryCodes,
} from '../selectors';
import { comparisonActions } from '../slice';
import { CATEGORIES } from '../categories';
import { ComparisonTable } from './ComparisonTable';
import styles from './ComparisonSection.module.css';

const EMPTY_MESSAGE = 'No benefit data is available for these countries yet.';

function announcement(
  status: string,
  retry: RetryProgress | null,
  hasData: boolean,
  countryCount: number,
): string {
  if (status === 'loading') return retry ? retryMessage(retry) : 'Loading comparison';
  if (status === 'ready') {
    return hasData ? `Comparison updated for ${countryCount} countries` : EMPTY_MESSAGE;
  }
  if (status === 'error') return 'The comparison could not be loaded';
  return '';
}

export function ComparisonSection() {
  const dispatch = useAppDispatch();
  const status = useAppSelector(selectComparisonStatus);
  const error = useAppSelector(selectComparisonError);
  const retry = useAppSelector(selectComparisonRetry);
  const selected = useAppSelector(selectSelectedCountryCodes);
  const hasData = useAppSelector(selectComparisonHasData);
  const table = useAppSelector(selectComparisonTable);
  const company = useAppSelector(selectSelectedCompany);
  const companyActive = useAppSelector(selectCompanyViewActive);
  const companyTable = useAppSelector(selectCompanyTable);
  const gapSummary = useAppSelector(selectGapSummary);
  const countries = useAppSelector(selectCountries);
  const countryNames = Object.fromEntries(countries.map((c) => [c.code, c.name]));

  const tryAgain = (
    <Button variant="secondary" onClick={() => dispatch(comparisonActions.requested(selected))}>
      Try again
    </Button>
  );

  return (
    <section aria-label="Comparison">
      <LiveRegion message={announcement(status, retry, hasData, table.countries.length)} />

      {company && <ViewToggle />}

      {status === 'idle' && companyActive && company && (
        <CompanyOverview company={company} countryNames={countryNames} />
      )}

      {status === 'idle' && !companyActive && (
        <div className={`${styles.card} ${styles.empty}`}>
          <p className={styles.emptyTitle}>Choose at least 2 countries to compare.</p>
          <p className={styles.emptyText}>The table lines up their legal minimums for:</p>
          <ul className={styles.categories}>
            {CATEGORIES.map((category) => (
              <li key={category.id}>{category.label}</li>
            ))}
          </ul>
        </div>
      )}

      {status === 'loading' && (
        <div className={styles.card}>
          <p className={styles.text}>{retry ? retryMessage(retry) : 'Loading comparison…'}</p>
        </div>
      )}

      {status === 'error' && (
        <div className={`${styles.card} ${styles.problem}`}>
          <p className={styles.text}>Sorry, the comparison could not be loaded. {error}</p>
          {tryAgain}
        </div>
      )}

      {status === 'ready' && !hasData && (
        <div className={`${styles.card} ${styles.problem}`}>
          <p className={styles.text}>{EMPTY_MESSAGE}</p>
          {tryAgain}
        </div>
      )}

      {status === 'ready' && hasData && companyActive && companyTable && (
        <>
          <GapSummary companyName={companyTable.companyName} summary={gapSummary} />
          <CompanyTable table={companyTable} />
        </>
      )}

      {status === 'ready' && hasData && !companyActive && <ComparisonTable table={table} />}
    </section>
  );
}
