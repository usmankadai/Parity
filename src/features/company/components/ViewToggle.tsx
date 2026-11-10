import { useId } from 'react';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { selectCompanyView, selectSelectedCompany } from '../selectors';
import { companyActions, type ComparisonView } from '../slice';
import styles from './ViewToggle.module.css';

/** Two radio buttons styled as a segmented control: company view or legal minimums only. */
export function ViewToggle() {
  const dispatch = useAppDispatch();
  const view = useAppSelector(selectCompanyView);
  const company = useAppSelector(selectSelectedCompany);
  const name = useId();

  if (!company) return null;

  const options: { value: ComparisonView; label: string }[] = [
    { value: 'company', label: `${company.name} vs legal minimums` },
    { value: 'statutory', label: 'Legal minimums only' },
  ];

  return (
    <fieldset className={styles.toggle}>
      <legend className="visually-hidden">Show</legend>
      {options.map((option) => {
        const id = `${name}-${option.value}`;
        return (
          <div key={option.value} className={styles.option}>
            <input
              id={id}
              type="radio"
              name={name}
              value={option.value}
              checked={view === option.value}
              onChange={() => dispatch(companyActions.viewChanged(option.value))}
              className={styles.radio}
            />
            <label htmlFor={id} className={styles.label}>
              {option.label}
            </label>
          </div>
        );
      })}
    </fieldset>
  );
}
