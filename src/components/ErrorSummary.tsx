import { useEffect, useId, useRef } from 'react';
import styles from './ErrorSummary.module.css';

export interface FieldError {
  /** The id of the field to move focus to. */
  fieldId: string;
  message: string;
}

/**
 * The GOV.UK error summary pattern: shown at the top of a form on submit,
 * focused so screen reader users hear it, with a link to each invalid field.
 */
export function ErrorSummary({ errors }: { errors: FieldError[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const headingId = useId();

  useEffect(() => {
    ref.current?.focus();
  }, [errors]);

  if (errors.length === 0) return null;

  return (
    <div ref={ref} className={styles.summary} tabIndex={-1} aria-labelledby={headingId}>
      <h2 id={headingId} className={styles.heading}>
        There is a problem
      </h2>
      <ul className={styles.list}>
        {errors.map((error) => (
          <li key={error.fieldId}>
            <a
              href={`#${error.fieldId}`}
              onClick={(event) => {
                // Focus the field itself, not just scroll to it.
                event.preventDefault();
                document.getElementById(error.fieldId)?.focus();
              }}
            >
              {error.message}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
