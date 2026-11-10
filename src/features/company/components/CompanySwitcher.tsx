import { useId } from 'react';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { askActions } from '../../ask/slice';
import { comparisonActions } from '../../comparison/slice';
import { selectCompanyState } from '../selectors';
import { companyActions } from '../slice';
import styles from './CompanySwitcher.module.css';

/**
 * Chooses which fictional company the workspace is for. Switching starts a
 * fresh comparison, because the new company may operate in other countries.
 */
export function CompanySwitcher() {
  const dispatch = useAppDispatch();
  const { items, selectedId } = useAppSelector(selectCompanyState);
  const id = useId();

  if (items.length < 2 || !selectedId) return null;

  return (
    <span className={styles.switcher}>
      <label htmlFor={id} className={styles.label}>
        Company
      </label>
      <select
        id={id}
        className={styles.select}
        value={selectedId}
        onChange={(event) => {
          dispatch(companyActions.selected(event.target.value));
          dispatch(comparisonActions.cleared());
          dispatch(askActions.cleared());
        }}
      >
        {items.map((company) => (
          <option key={company.id} value={company.id}>
            {company.name} (fictional)
          </option>
        ))}
      </select>
    </span>
  );
}
