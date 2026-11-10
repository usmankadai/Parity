import type { DisplayUnit } from '../categories';
import { formatMeasure } from '../format';
import type { ComparisonCell as Cell } from '../selectors';
import { RankMarker } from './RankMarker';
import { SourceDisclosure } from './SourceDisclosure';
import styles from './ComparisonCell.module.css';

interface ComparisonCellProps {
  cell: Cell;
  categoryLabel: string;
  displayUnit: DisplayUnit;
}

/** The legal minimum in words: a figure, "No legal minimum" or "Not yet verified". */
export function minimumText(cell: Cell, displayUnit: DisplayUnit): string {
  if (!cell.row) return 'No data';
  switch (cell.row.status) {
    case 'todo_verify':
      return 'Not yet verified';
    case 'no_statutory_minimum':
      return 'No legal minimum';
    case 'verified':
      return cell.value === null ? 'No data' : formatMeasure(cell.value, displayUnit);
  }
}

export function ComparisonCell({ cell, categoryLabel, displayUnit }: ComparisonCellProps) {
  const { row, rank } = cell;

  return (
    <td className={styles.cell}>
      <p className={`${styles.headline} ${row?.status === 'verified' ? '' : styles.headlineMuted}`}>
        {minimumText(cell, displayUnit)}
      </p>
      {rank && (
        <p className={styles.rank}>
          <RankMarker rank={rank} />
        </p>
      )}

      {/* The source's own wording, unless it says exactly what the figure says. */}
      {row &&
        row.status !== 'todo_verify' &&
        row.sourceValue !== minimumText(cell, displayUnit) && (
          <p className={styles.stated}>{row.sourceValue}</p>
        )}
      {row?.detail && <p className={styles.detail}>{row.detail}</p>}
      {row?.comparisonNote && (
        <p className={styles.note}>
          <span className={styles.noteLabel}>Note</span> {row.comparisonNote}
        </p>
      )}

      {row && (
        <SourceDisclosure
          row={row}
          context={`${cell.country.name}, ${categoryLabel.toLowerCase()}`}
        />
      )}
    </td>
  );
}
