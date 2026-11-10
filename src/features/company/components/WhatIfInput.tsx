import { useId, useState } from 'react';
import { useAppDispatch } from '../../../app/hooks';
import type { DisplayUnit } from '../../comparison/categories';
import { companyActions } from '../slice';
import { isValidOverride } from '../whatIfStorage';
import styles from './WhatIf.module.css';

const UNIT_LABELS: Record<DisplayUnit, string> = {
  'working-days': 'working days',
  days: 'days',
  weeks: 'weeks',
  percent: '%',
};

function toText(value: number | null): string {
  return value === null ? '' : String(value);
}

interface WhatIfInputProps {
  companyId: string;
  editKey: string;
  value: number | null;
  displayUnit: DisplayUnit;
  /** For example "Ireland, employer notice after 2 years", read by screen readers. */
  context: string;
}

/** A number input for one company figure in what-if mode. */
export function WhatIfInput({ companyId, editKey, value, displayUnit, context }: WhatIfInputProps) {
  const dispatch = useAppDispatch();
  const id = useId();
  const [text, setText] = useState(toText(value));
  const [lastValue, setLastValue] = useState(value);

  // When the figure changes from outside (for example "Reset"), show it,
  // unless it is what the user is already typing.
  if (value !== lastValue) {
    setLastValue(value);
    if (Number(text) !== value || text === '') setText(toText(value));
  }

  return (
    <p className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        What if<span className="visually-hidden">, {context},</span> ({UNIT_LABELS[displayUnit]})
      </label>
      <input
        id={id}
        className={styles.input}
        type="number"
        inputMode="decimal"
        min={0}
        step="any"
        value={text}
        onChange={(event) => {
          const next = event.target.value;
          setText(next);
          const number = Number(next);
          if (next.trim() === '') {
            dispatch(companyActions.figureEdited({ companyId, key: editKey, value: null }));
          } else if (isValidOverride(number)) {
            dispatch(companyActions.figureEdited({ companyId, key: editKey, value: number }));
          }
        }}
      />
    </p>
  );
}
