import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { Button } from '../../../components/Button';
import { LiveRegion } from '../../../components/LiveRegion';
import {
  selectComparisonError,
  selectComparisonStatus,
  selectComparisonTable,
  selectSelectedCountryCodes,
} from '../selectors';
import { comparisonActions } from '../slice';
import { ComparisonTable } from './ComparisonTable';

function announcement(status: string, countryCount: number): string {
  if (status === 'loading') return 'Loading comparison';
  if (status === 'ready') return `Comparison updated for ${countryCount} countries`;
  if (status === 'error') return 'The comparison could not be loaded';
  return '';
}

export function ComparisonSection() {
  const dispatch = useAppDispatch();
  const status = useAppSelector(selectComparisonStatus);
  const error = useAppSelector(selectComparisonError);
  const selected = useAppSelector(selectSelectedCountryCodes);
  const table = useAppSelector(selectComparisonTable);

  return (
    <section aria-label="Comparison">
      <LiveRegion message={announcement(status, table.countries.length)} />

      {status === 'loading' && <p>Loading comparison…</p>}

      {status === 'error' && (
        <div>
          <p>Sorry, the comparison could not be loaded. {error}</p>
          <Button
            variant="secondary"
            onClick={() => dispatch(comparisonActions.requested(selected))}
          >
            Try again
          </Button>
        </div>
      )}

      {status === 'ready' && <ComparisonTable table={table} />}
    </section>
  );
}
