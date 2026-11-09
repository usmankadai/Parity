import { useId } from 'react';
import type { ComparisonTable as Table } from '../selectors';
import { ComparisonCell } from './ComparisonCell';
import styles from './ComparisonTable.module.css';

function listNames(names: string[]): string {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} and ${names.at(-1) ?? ''}`;
}

export function ComparisonTable({ table }: { table: Table }) {
  const titleId = useId();
  const title = `Statutory minimums: ${listNames(table.countries.map((country) => country.name))}`;
  const note =
    'Leave is shown in working days on a 5-day week. "Most generous" means most generous to the employee.';

  return (
    <div className={styles.card}>
      {/* The visible title sits outside the scroll area, so it is never cut off on a phone. */}
      <div className={styles.header}>
        <h2 id={titleId} className={styles.title}>
          {title}
        </h2>
        <p className={styles.note}>{note}</p>
      </div>

      {/* Scrolls sideways on small screens. Focusable and labelled, so keyboard
          users can scroll it too (axe: scrollable-region-focusable). */}
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- a scrollable region must be focusable */}
      <div className={styles.scroller} role="region" aria-labelledby={titleId} tabIndex={0}>
        <table className={styles.table}>
          {/* The caption still names the table for screen readers. */}
          <caption className="visually-hidden">
            {title}. {note}
          </caption>
          <thead>
            <tr>
              <th scope="col" className={styles.corner}>
                Benefit
              </th>
              {table.countries.map((country) => (
                <th key={country.code} scope="col" className={styles.columnHeader}>
                  {country.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map(({ category, cells }) => (
              <tr key={category.id}>
                <th scope="row" className={styles.rowHeader}>
                  <span className={styles.categoryLabel}>{category.label}</span>
                  <span className={styles.rankingNote}>{category.rankingNote}</span>
                </th>
                {cells.map((cell) => (
                  <ComparisonCell
                    key={cell.country.code}
                    cell={cell}
                    categoryLabel={category.label}
                    displayUnit={category.displayUnit}
                  />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
