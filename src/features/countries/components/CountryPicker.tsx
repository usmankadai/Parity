import { useEffect, useId, useState, type SubmitEvent } from 'react';
import type { CountryCode } from '../../../api/types';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { Button } from '../../../components/Button';
import { ErrorSummary } from '../../../components/ErrorSummary';
import { comparisonActions } from '../../comparison/slice';
import { selectCountries, selectCountriesError, selectCountriesStatus } from '../selectors';
import { countriesActions } from '../slice';
import styles from './CountryPicker.module.css';

export const MIN_COUNTRIES = 2;
export const TOO_FEW_MESSAGE = `Select at least ${MIN_COUNTRIES} countries to compare`;
const ERROR_PREFIX = 'Error: ';

export function CountryPicker() {
  const dispatch = useAppDispatch();
  const countries = useAppSelector(selectCountries);
  const status = useAppSelector(selectCountriesStatus);
  const loadError = useAppSelector(selectCountriesError);

  const [selected, setSelected] = useState<CountryCode[]>([]);
  const [error, setError] = useState<string | null>(null);

  const legendId = useId();
  const hintId = useId();
  const errorId = useId();
  const idPrefix = useId();
  const firstCheckboxId = countries[0] ? `${idPrefix}-${countries[0].code}` : '';

  // Prefix the page title while the form shows an error (GOV.UK pattern).
  useEffect(() => {
    const base = document.title.startsWith(ERROR_PREFIX)
      ? document.title.slice(ERROR_PREFIX.length)
      : document.title;
    document.title = error ? `${ERROR_PREFIX}${base}` : base;
  }, [error]);

  if (status === 'idle' || status === 'loading') {
    return <p role="status">Loading countries…</p>;
  }

  if (status === 'error') {
    return (
      <div className={styles.loadError}>
        <p>Sorry, the list of countries could not be loaded. {loadError}</p>
        <Button variant="secondary" onClick={() => dispatch(countriesActions.loadRequested())}>
          Try again
        </Button>
      </div>
    );
  }

  function toggle(code: CountryCode, checked: boolean) {
    setSelected((current) =>
      checked ? [...current, code] : current.filter((value) => value !== code),
    );
  }

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (selected.length < MIN_COUNTRIES) {
      setError(TOO_FEW_MESSAGE);
      return;
    }
    setError(null);
    dispatch(comparisonActions.requested(selected));
  }

  return (
    <form onSubmit={handleSubmit} noValidate className={styles.form}>
      {error && <ErrorSummary errors={[{ fieldId: firstCheckboxId, message: error }]} />}

      <fieldset
        className={`${styles.fieldset} ${error ? styles.fieldsetError : ''}`}
        aria-describedby={error ? `${hintId} ${errorId}` : hintId}
      >
        <legend id={legendId} className={styles.legend}>
          Which countries do you want to compare?
        </legend>
        <p id={hintId} className={styles.hint}>
          Select {MIN_COUNTRIES} to {countries.length}.
        </p>
        {error && (
          <p id={errorId} className={styles.error}>
            <span className="visually-hidden">Error:</span> {error}
          </p>
        )}

        <div className={styles.options}>
          {countries.map((country) => {
            const id = `${idPrefix}-${country.code}`;
            return (
              <div key={country.code} className={styles.option}>
                <input
                  id={id}
                  type="checkbox"
                  name="countries"
                  value={country.code}
                  checked={selected.includes(country.code)}
                  onChange={(event) => {
                    toggle(country.code, event.target.checked);
                  }}
                  className={styles.checkbox}
                />
                <label htmlFor={id} className={styles.label}>
                  {country.name}
                </label>
              </div>
            );
          })}
        </div>
      </fieldset>

      <Button type="submit">Compare</Button>
    </form>
  );
}
