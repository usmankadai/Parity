import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from './app/hooks';
import { selectApiMode } from './app/selectors';
import { Logo } from './components/Logo';
import { ScenarioSwitcher } from './devtools/ScenarioSwitcher';
import { AskPanel, ASK_SECTION_ID } from './features/ask/components/AskPanel';
import { ComparisonSection } from './features/comparison/components/ComparisonSection';
import { CountryPicker } from './features/countries/components/CountryPicker';
import { selectSelectedCompany } from './features/company/selectors';
import { companyActions } from './features/company/slice';
import { countriesActions } from './features/countries/slice';
import styles from './App.module.css';

export const DISCLAIMER =
  'Independent portfolio project, inspired by reward comparison tools. Not affiliated with or endorsed by Benifex. Illustrative data, not legal or HR advice.';

/** When the statutory data was last checked against its sources. */
export const DATA_CHECKED = '9 November 2026';

export function App() {
  const dispatch = useAppDispatch();
  const apiMode = useAppSelector(selectApiMode);
  const company = useAppSelector(selectSelectedCompany);

  useEffect(() => {
    dispatch(countriesActions.loadRequested());
    dispatch(companyActions.loadRequested());
  }, [dispatch]);

  return (
    <>
      <header className={styles.topbar}>
        <div className={styles.topbarInner}>
          <span className={styles.brand}>
            <Logo />
            <span className={styles.wordmark}>Parity</span>
          </span>
          <span className={styles.tagline}>
            {company ? (
              <>
                {company.name} <span className={styles.fictional}>(fictional)</span>
              </>
            ) : (
              'Statutory benefits workspace'
            )}
          </span>
          <span className={styles.meta}>
            <span className={styles.checked}>Sources checked {DATA_CHECKED}</span>
            {apiMode === 'mock' && (
              <>
                <span className={styles.badge}>Demo data</span>
                <ScenarioSwitcher />
              </>
            )}
          </span>
        </div>
      </header>

      <main className={styles.main} id="main">
        <div className={styles.intro}>
          <h1 className={styles.title}>Compare statutory benefits across countries</h1>
          <p className={styles.lead}>
            The legal minimums for leave, pay and pensions in the United Kingdom, Ireland, Germany
            and the Netherlands, side by side. Every figure links to its official source.
          </p>
          <p className={styles.notice}>{DISCLAIMER}</p>
          <a className={styles.jump} href={`#${ASK_SECTION_ID}`}>
            Jump to Ask about this comparison
          </a>
        </div>

        <CountryPicker />

        <div className={styles.workspace}>
          <div className={styles.primary}>
            <ComparisonSection />
          </div>
          <div className={styles.secondary}>
            <AskPanel />
          </div>
        </div>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <p>{DISCLAIMER}</p>
          <p>
            <a href="https://github.com/usmankadai/Parity">Source code on GitHub</a>
          </p>
        </div>
      </footer>
    </>
  );
}
