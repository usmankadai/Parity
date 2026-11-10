import { useId, useState, type SubmitEvent } from 'react';
import type { CountryCode } from '../../../api/types';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { Button } from '../../../components/Button';
import { ErrorSummary } from '../../../components/ErrorSummary';
import { selectDraftCountryCodes } from '../../comparison/selectors';
import { comparisonActions } from '../../comparison/slice';
import { retryMessage } from '../../../components/retryMessage';
import { useErrorTitle } from '../../../components/useErrorTitle';
import {
  selectCountries,
  selectCountriesError,
  selectCountriesRetry,
  selectCountriesStatus,
} from '../selectors';
import { countriesActions } from '../slice';
import styles from './CountryPicker.module.css';

export const MIN_COUNTRIES = 2;
export const TOO_FEW_MESSAGE = `Select at least ${MIN_COUNTRIES} countries to compare`;

export function CountryPicker() {
  const dispatch = useAppDispatch();
  const countries = useAppSelector(selectCountries);
  const status = useAppSelector(selectCountriesStatus);
  const loadError = useAppSelector(selectCountriesError);
  const retry = useAppSelector(selectCountriesRetry);

  const selected = useAppSelector(selectDraftCountryCodes);
  const [error, setError] = useState<string | null>(null);

  const legendId = useId();
  const hintId = useId();
  const errorId = useId();
  const idPrefix = useId();
  const firstCheckboxId = countries[0] ? `${idPrefix}-${countries[0].code}` : '';

  useErrorTitle(error !== null);

  const tryAgain = (
    <Button variant="secondary" onClick={() => dispatch(countriesActions.loadRequested())}>
      Try again
    </Button>
  );

  if (status === 'idle' || status === 'loading') {
    return (
      <div className={styles.toolbar}>
        <p role="status" className={styles.message}>
          {retry ? retryMessage(retry) : 'Loading countries…'}
        </p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className={`${styles.toolbar} ${styles.problem}`}>
        <p className={styles.message}>
          Sorry, the list of countries could not be loaded. {loadError}
        </p>
        {tryAgain}
      </div>
    );
  }

  if (countries.length === 0) {
    return (
      <div className={`${styles.toolbar} ${styles.problem}`}>
        <p className={styles.message}>No countries are available to compare right now.</p>
        {tryAgain}
      </div>
    );
  }

  function toggle(code: CountryCode, checked: boolean) {
    dispatch(
      comparisonActions.draftChanged(
        checked ? [...selected, code] : selected.filter((value) => value !== code),
      ),
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

      <div className={`${styles.toolbar} ${error ? styles.toolbarError : ''}`}>
        <fieldset
          className={styles.fieldset}
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
                    <span aria-hidden="true" className={styles.code}>
                      {country.code}
                    </span>
                    {country.name}
                  </label>
                </div>
              );
            })}
          </div>
        </fieldset>

        <Button type="submit" className={styles.submit}>
          Compare
        </Button>
      </div>
    </form>
  );
}
