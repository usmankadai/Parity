import { useEffect, useId, useRef, useState } from 'react';
import { useAppDispatch } from '../app/hooks';
import { Button } from '../components/Button';
import { LiveRegion } from '../components/LiveRegion';
import { comparisonActions } from '../features/comparison/slice';
import { countriesActions } from '../features/countries/slice';
import { getScenario, SCENARIOS, setScenario, type ScenarioId } from '../mocks/scenarios';
import styles from './ScenarioSwitcher.module.css';

/**
 * A floating demo panel (mock mode only) that changes how the mock API
 * behaves, so retries, errors and empty states can be seen live.
 */
export function ScenarioSwitcher() {
  const dispatch = useAppDispatch();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<ScenarioId>(getScenario);
  const [announcement, setAnnouncement] = useState('');
  const panelId = useId();
  const headingId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      const focusInside = containerRef.current?.contains(document.activeElement) ?? false;
      if (event.key === 'Escape' && focusInside) {
        setOpen(false);
        toggleRef.current?.focus();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  function choose(id: ScenarioId) {
    setScenario(id);
    setActive(id);
    // Forget loaded rows, so the next comparison goes through the new scenario.
    dispatch(comparisonActions.cacheCleared());
    const label = SCENARIOS.find((scenario) => scenario.id === id)?.label ?? id;
    setAnnouncement(`Scenario changed to ${label}. Compare again to see it.`);
  }

  const activeLabel = SCENARIOS.find((scenario) => scenario.id === active)?.label ?? active;

  return (
    // A labelled landmark, so the panel is easy to find and not stray content.
    <aside ref={containerRef} className={styles.switcher} aria-label="Demo scenarios">
      <LiveRegion message={announcement} />

      <div id={panelId} className={styles.panel} hidden={!open}>
        <h2 id={headingId} className={styles.heading}>
          Demo scenarios
        </h2>
        <p className={styles.hint}>
          Changes how the mock API responds. Compare again, or reload the countries, to see it.
        </p>

        <fieldset className={styles.fieldset}>
          <legend className="visually-hidden">Mock API scenario</legend>
          {SCENARIOS.map((scenario) => {
            const inputId = `${panelId}-${scenario.id}`;
            const descriptionId = `${inputId}-description`;
            return (
              <div key={scenario.id} className={styles.option}>
                <input
                  id={inputId}
                  type="radio"
                  name={`${panelId}-scenario`}
                  value={scenario.id}
                  checked={active === scenario.id}
                  aria-describedby={descriptionId}
                  onChange={() => {
                    choose(scenario.id);
                  }}
                  className={styles.radio}
                />
                <label htmlFor={inputId} className={styles.label}>
                  {scenario.label}
                </label>
                <span id={descriptionId} className={styles.description}>
                  {scenario.description}
                </span>
              </div>
            );
          })}
        </fieldset>

        <Button variant="secondary" onClick={() => dispatch(countriesActions.loadRequested())}>
          Reload countries
        </Button>
      </div>

      <button
        ref={toggleRef}
        type="button"
        className={styles.toggle}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => {
          setOpen((value) => !value);
        }}
      >
        Demo scenarios: {activeLabel}
      </button>
    </aside>
  );
}
