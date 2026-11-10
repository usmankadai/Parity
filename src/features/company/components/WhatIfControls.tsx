import { useId } from 'react';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { Button } from '../../../components/Button';
import { selectEditCount, selectSelectedCompany, selectWhatIf } from '../selectors';
import { companyActions } from '../slice';
import styles from './WhatIf.module.css';

/** Turns what-if editing on and off, and resets the edits. */
export function WhatIfControls() {
  const dispatch = useAppDispatch();
  const company = useAppSelector(selectSelectedCompany);
  const whatIf = useAppSelector(selectWhatIf);
  const edits = useAppSelector(selectEditCount);
  const id = useId();
  const hintId = useId();

  if (!company) return null;

  return (
    <div className={styles.controls}>
      <div className={styles.switch}>
        <input
          id={id}
          type="checkbox"
          checked={whatIf}
          aria-describedby={hintId}
          onChange={(event) => dispatch(companyActions.whatIfToggled(event.target.checked))}
          className={styles.checkbox}
        />
        <label htmlFor={id} className={styles.switchLabel}>
          Try changes (what if)
        </label>
      </div>
      <p id={hintId} className={styles.hint}>
        Change {company.name}&apos;s figures and see the gaps update. Edits are saved in this
        browser only.
      </p>
      {edits > 0 && (
        <p className={styles.edits}>
          <span>
            {edits} {edits === 1 ? 'figure' : 'figures'} edited
          </span>
          <Button
            variant="secondary"
            onClick={() => dispatch(companyActions.overridesReset(company.id))}
          >
            Reset to company package
          </Button>
        </p>
      )}
    </div>
  );
}
