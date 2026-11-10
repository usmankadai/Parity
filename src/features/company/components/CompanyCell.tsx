import type { DisplayUnit } from '../../comparison/categories';
import { minimumText } from '../../comparison/components/ComparisonCell';
import { SourceDisclosure } from '../../comparison/components/SourceDisclosure';
import cellStyles from '../../comparison/components/ComparisonCell.module.css';
import { formatMeasure } from '../../comparison/format';
import type { CompanyCell as Cell } from '../selectors';
import { overrideKey } from '../whatIfStorage';
import { GapMarker } from './GapMarker';
import { WhatIfInput } from './WhatIfInput';
import whatIfStyles from './WhatIf.module.css';
import styles from './CompanyCell.module.css';

interface CompanyCellProps {
  cell: Cell;
  categoryLabel: string;
  displayUnit: DisplayUnit;
  /** Set in what-if mode for categories that can be compared as a number. */
  whatIf?: { companyId: string } | undefined;
}

/** The company's figure in words, or its policy when it has no single number. */
function companyText(cell: Cell, displayUnit: DisplayUnit): string {
  if (!cell.figure) return 'No company figure';
  if (cell.companyValue !== null) return formatMeasure(cell.companyValue, displayUnit);
  return cell.figure.summary;
}

export function CompanyCell({ cell, categoryLabel, displayUnit, whatIf }: CompanyCellProps) {
  const headline = companyText(cell, displayUnit);

  return (
    <td className={cellStyles.cell}>
      <p
        className={`${cellStyles.headline} ${cell.companyValue === null ? cellStyles.headlineMuted : ''}`}
      >
        {headline}
        {cell.edited && <span className={whatIfStyles.edited}>Edited (what if)</span>}
      </p>
      {cell.gap && (
        <p className={cellStyles.rank}>
          <GapMarker gap={cell.gap} />
        </p>
      )}
      {cell.figure && cell.figure.summary !== headline && (
        <p className={cellStyles.detail}>{cell.figure.summary}</p>
      )}
      {whatIf && (
        <WhatIfInput
          companyId={whatIf.companyId}
          editKey={overrideKey(cell.country.code, cell.row?.category ?? '')}
          value={cell.companyValue}
          displayUnit={displayUnit}
          context={`${cell.country.name}, ${categoryLabel.toLowerCase()}`}
        />
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
