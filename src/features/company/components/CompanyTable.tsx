import { useId } from 'react';
import cellStyles from '../../comparison/components/ComparisonCell.module.css';
import styles from '../../comparison/components/ComparisonTable.module.css';
import type { CompanyTable as Table } from '../selectors';
import { CompanyCell } from './CompanyCell';
import ownStyles from './CompanyTable.module.css';

function listNames(names: string[]): string {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} and ${names.at(-1) ?? ''}`;
}

/** The company's package in each country, laid over the legal minimums. */
export function CompanyTable({ table }: { table: Table }) {
  const titleId = useId();
  const title = `${table.companyName} against the legal minimums: ${listNames(
    table.countries.map((country) => country.name),
  )}`;
  const note =
    'Company figures are for a fictional company. Legal minimums are from official sources. Leave is in working days on a 5-day week.';
  const columns = table.countries.length + 1;

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h2 id={titleId} className={styles.title}>
          {title}
        </h2>
        <p className={styles.note}>{note}</p>
      </div>

      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- a scrollable region must be focusable */}
      <div className={styles.scroller} role="region" aria-labelledby={titleId} tabIndex={0}>
        <table className={styles.table}>
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
            <tr>
              <th scope="rowgroup" colSpan={columns} className={ownStyles.group}>
                Statutory benefits
              </th>
            </tr>
            {table.rows.map(({ category, cells }) => (
              <tr key={category.id}>
                <th scope="row" className={styles.rowHeader}>
                  <span className={styles.categoryLabel}>{category.label}</span>
                  <span className={styles.rankingNote}>{category.gapNote}</span>
                </th>
                {cells.map((cell) => (
                  <CompanyCell
                    key={cell.country.code}
                    cell={cell}
                    categoryLabel={category.label}
                    displayUnit={category.displayUnit}
                  />
                ))}
              </tr>
            ))}
          </tbody>

          <tbody>
            <tr>
              <th scope="rowgroup" colSpan={columns} className={ownStyles.group}>
                Company benefits (no legal minimum)
              </th>
            </tr>
            {table.benefitRows.map(({ benefit, cells }) => (
              <tr key={benefit.id}>
                <th scope="row" className={styles.rowHeader}>
                  <span className={styles.categoryLabel}>{benefit.label}</span>
                </th>
                {cells.map(({ country, entry }) => (
                  <td key={country.code} className={cellStyles.cell}>
                    <p
                      className={`${ownStyles.offered} ${entry?.provided ? '' : ownStyles.notOffered}`}
                    >
                      <span aria-hidden="true">{entry?.provided ? '✓' : '–'}</span>
                      {entry ? (entry.provided ? 'Offered' : 'Not offered') : 'No company figure'}
                    </p>
                    {entry && entry.summary !== (entry.provided ? 'Offered' : 'Not offered') && (
                      <p className={cellStyles.detail}>{entry.summary}</p>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
