import type { DisplayUnit } from '../../comparison/categories';
import { minimumText } from '../../comparison/components/ComparisonCell';
import { SourceDisclosure } from '../../comparison/components/SourceDisclosure';
import cellStyles from '../../comparison/components/ComparisonCell.module.css';
import { formatMeasure } from '../../comparison/format';
import type { CompanyCell as Cell } from '../selectors';
import { GapMarker } from './GapMarker';
import styles from './CompanyCell.module.css';

interface CompanyCellProps {
  cell: Cell;
  categoryLabel: string;
  displayUnit: DisplayUnit;
}

/** The company's figure in words, or its policy when it has no single number. */
function companyText(cell: Cell, displayUnit: DisplayUnit): string {
  if (!cell.figure) return 'No company figure';
  if (cell.companyValue !== null) return formatMeasure(cell.companyValue, displayUnit);
  return cell.figure.summary;
}

export function CompanyCell({ cell, categoryLabel, displayUnit }: CompanyCellProps) {
  const headline = companyText(cell, displayUnit);

  return (
    <td className={cellStyles.cell}>
      <p
        className={`${cellStyles.headline} ${cell.companyValue === null ? cellStyles.headlineMuted : ''}`}
      >
        {headline}
      </p>
      {cell.gap && (
        <p className={cellStyles.rank}>
          <GapMarker gap={cell.gap} />
        </p>
      )}
      {cell.figure && cell.figure.summary !== headline && (
        <p className={cellStyles.detail}>{cell.figure.summary}</p>
      )}
      <p className={styles.minimum}>
        Legal minimum: <strong>{minimumText(cell, displayUnit)}</strong>
      </p>
      {cell.row && (
        <SourceDisclosure
          row={cell.row}
          context={`${cell.country.name}, ${categoryLabel.toLowerCase()}`}
        />
      )}
    </td>
  );
}
