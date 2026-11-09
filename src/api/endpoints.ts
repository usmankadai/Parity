import { getJson } from './client';
import type { BenefitRow, Country, CountryCode } from './types';
import { parseBenefitRows, parseCountries } from './validate';

export function fetchCountries(signal?: AbortSignal): Promise<Country[]> {
  return getJson('/api/countries', parseCountries, signal);
}

export function fetchBenefits(
  countries: CountryCode[],
  signal?: AbortSignal,
): Promise<BenefitRow[]> {
  const query = new URLSearchParams({ countries: countries.join(',') });
  return getJson(`/api/benefits?${query.toString()}`, parseBenefitRows, signal);
}
