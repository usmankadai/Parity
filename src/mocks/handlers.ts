import { http, HttpResponse, type HttpHandler } from 'msw';
import type { CountryCode } from '../api/types';
import { isCountryCode } from '../api/validate';
import benefits from './fixtures/benefits.json';
import countries from './fixtures/countries.json';

/**
 * The default MSW handlers, shared by the browser worker and the Node server.
 * Paths are matched on any origin, so they work in the browser and in tests.
 */
export const handlers: HttpHandler[] = [
  http.get('*/api/countries', () => HttpResponse.json(countries)),

  http.get('*/api/benefits', ({ request }) => {
    const param = new URL(request.url).searchParams.get('countries') ?? '';
    const codes = param.split(',').filter(Boolean);

    if (codes.length === 0 || !codes.every(isCountryCode)) {
      return HttpResponse.json(
        { message: 'countries must be a comma-separated list of supported country codes' },
        { status: 400 },
      );
    }

    const wanted = new Set<CountryCode>(codes);
    return HttpResponse.json(benefits.filter((row) => wanted.has(row.countryCode as CountryCode)));
  }),
];
