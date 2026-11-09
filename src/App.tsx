import { useAppSelector } from './app/hooks';
import { selectApiMode } from './app/selectors';
import styles from './App.module.css';

export const DISCLAIMER =
  'Independent portfolio project, inspired by reward comparison tools. Not affiliated with or endorsed by Benifex. Illustrative data, not legal or HR advice.';

export function App() {
  const apiMode = useAppSelector(selectApiMode);

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
            Ireland, Germany and the Netherlands, then check your own package against them.
          </p>
          <p className={styles.notice}>{DISCLAIMER}</p>
        </div>
      </main>

      <footer className={styles.footer}>
        <div className={styles.inner}>
          <p>{DISCLAIMER}</p>
        </div>
      </footer>
    </>
  );
}
