import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from './app/hooks';
import { ScenarioSwitcher } from './devtools/ScenarioSwitcher';
import { selectApiMode } from './app/selectors';
import { AskPanel } from './features/ask/components/AskPanel';
import { ComparisonSection } from './features/comparison/components/ComparisonSection';
import { CountryPicker } from './features/countries/components/CountryPicker';
import { countriesActions } from './features/countries/slice';
import styles from './App.module.css';

export const DISCLAIMER =
  'Independent portfolio project, inspired by reward comparison tools. Not affiliated with or endorsed by Benifex. Illustrative data, not legal or HR advice.';

export function App() {
  const dispatch = useAppDispatch();
  const apiMode = useAppSelector(selectApiMode);

  useEffect(() => {
    dispatch(countriesActions.loadRequested());
  }, [dispatch]);

  return (
    <>
      <header className={styles.header}>
        <div className={styles.inner}>
          <span className={styles.logo}>Parity</span>
          {apiMode === 'mock' && <span className={styles.badge}>Demo data</span>}
        </div>
      </header>

      <main className={styles.main} id="main">
        <div className={styles.inner}>
          <h1 className={styles.title}>Compare statutory benefits across countries</h1>
          <p className={styles.lead}>
            See the legal minimums for leave, pay and pensions side by side in the United Kingdom,
            Ireland, Germany and the Netherlands. Every figure links to its official source.
          </p>
          <p className={styles.notice}>{DISCLAIMER}</p>

          <CountryPicker />
          <ComparisonSection />
          <AskPanel />
        </div>
      </main>

      <footer className={styles.footer}>
        <div className={styles.inner}>
          <p>{DISCLAIMER}</p>
        </div>
      </footer>

      {apiMode === 'mock' && <ScenarioSwitcher />}
    </>
  );
}
