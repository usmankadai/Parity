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

function headline(cell: Cell, displayUnit: DisplayUnit): string {
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
      <p className={styles.headline}>
        <strong>{headline(cell, displayUnit)}</strong>
        {rank && <RankMarker rank={rank} />}
      </p>

      {row && row.status !== 'todo_verify' && <p className={styles.stated}>{row.sourceValue}</p>}
      {row?.detail && <p className={styles.detail}>{row.detail}</p>}
      {row?.comparisonNote && (
        <p className={styles.note}>
          <strong>Note:</strong> {row.comparisonNote}
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
