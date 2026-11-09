import { useEffect, useId, useRef, useState } from 'react';
import type { BenefitRow } from '../../../api/types';
import { formatAsOf } from '../format';
import styles from './SourceDisclosure.module.css';

interface SourceDisclosureProps {
  row: BenefitRow;
  /** For example "United Kingdom, annual leave", so each button has a unique name. */
  context: string;
}

/**
 * A disclosure (button + panel) rather than a tooltip, because the panel holds
 * a link that keyboard and screen reader users must be able to reach.
 * Escape closes it and returns focus to the button.
 */
export function SourceDisclosure({ row, context }: SourceDisclosureProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      const focusInside = containerRef.current?.contains(document.activeElement) ?? false;
      if (event.key === 'Escape' && focusInside) {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className={styles.disclosure}>
      <button
        ref={buttonRef}
        type="button"
        className={styles.toggle}
        // The name starts with the visible word, so voice users can say
        // "click Source" (WCAG 2.5.3). aria-expanded says whether it is open.
        aria-label={`Source: ${context}`}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => {
          setOpen((value) => !value);
        }}
      >
        <span aria-hidden="true" className={styles.chevron}>
          {open ? '▾' : '▸'}
        </span>
        Source
      </button>

      <div id={panelId} className={styles.panel} hidden={!open}>
        <p className={styles.title}>
          <a href={row.sourceUrl} target="_blank" rel="noopener noreferrer">
            {row.sourceTitle}
            <span className="visually-hidden"> (opens in a new tab)</span>
          </a>
        </p>
        <blockquote className={styles.quote} lang={row.sourceLang}>
          {row.sourceQuote}
        </blockquote>
        <p className={styles.asOf}>Checked {formatAsOf(row.asOf)}</p>
      </div>
    </div>
  );
}
