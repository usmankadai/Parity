import { useAppDispatch } from '../../../app/hooks';
import type { Company } from '../../../api/types';
import { Button } from '../../../components/Button';
import { comparisonActions } from '../../comparison/slice';
import styles from './CompanyOverview.module.css';

const numberFormat = new Intl.NumberFormat('en-GB');

/** Shown before anything is compared: who the company is, and a quick way in. */
export function CompanyOverview({
  company,
  countryNames,
}: {
  company: Company;
  countryNames: Record<string, string>;
}) {
  const dispatch = useAppDispatch();
  const headcount = company.countries.reduce((total, country) => total + country.headcount, 0);
  const codes = company.countries.map((country) => country.code);

  return (
    <div className={styles.overview}>
      <p className={styles.eyebrow}>Fictional company</p>
      <p className={styles.name}>{company.name}</p>
      <p className={styles.meta}>
        {company.industry} · {numberFormat.format(headcount)} employees in {codes.length}{' '}
        {codes.length === 1 ? 'country' : 'countries'}
      </p>
      <ul className={styles.countries}>
        {company.countries.map((country) => (
          <li key={country.code}>
            <span className={styles.countryName}>{countryNames[country.code] ?? country.code}</span>
            <span className={styles.headcount}>
              {numberFormat.format(country.headcount)} employees
            </span>
          </li>
        ))}
      </ul>
      <p className={styles.text}>
        See where {company.name}&apos;s package sits against the legal minimum in each country, and
        what it offers on top.
      </p>
      <Button onClick={() => dispatch(comparisonActions.requested(codes))}>
        Compare all {company.name} countries
      </Button>
    </div>
  );
}
