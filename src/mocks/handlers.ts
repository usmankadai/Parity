import { delay, http, HttpResponse, type HttpHandler } from 'msw';
import type { CountryCode } from '../api/types';
import { isCountryCode } from '../api/validate';
import benefits from './fixtures/benefits.json';
import countries from './fixtures/countries.json';
import { getScenario, getSlowDelayMs, shouldFlakyFail } from './scenarios';

/**
 * Applies the active scenario to a data endpoint. Returns a response to send
 * instead of the normal one, or undefined to carry on normally.
 */
async function applyScenario(endpoint: string): Promise<Response | undefined> {
  switch (getScenario()) {
    case 'slow':
      await delay(getSlowDelayMs());
      return undefined;
    case 'server-error':
      return HttpResponse.json({ message: 'Mock server error' }, { status: 500 });
    case 'empty':
      return HttpResponse.json([]);
    case 'flaky':
      return shouldFlakyFail(endpoint)
        ? HttpResponse.json({ message: 'Mock flaky failure' }, { status: 503 })
        : undefined;
    case 'normal':
    case 'drops-mid-stream':
      // Mid-stream drops only affect the streamed /api/ask answer (milestone 4).
      return undefined;
  }
}

/**
 * The default MSW handlers, shared by the browser worker and the Node server.
 * Paths are matched on any origin, so they work in the browser and in tests.
 */
export const handlers: HttpHandler[] = [
  http.get('*/api/countries', async () => {
    const override = await applyScenario('countries');
    return override ?? HttpResponse.json(countries);
  }),

  http.get('*/api/benefits', async ({ request }) => {
    const param = new URL(request.url).searchParams.get('countries') ?? '';
    const codes = param.split(',').filter(Boolean);

    // A bad request is always a 400, whatever the scenario: it is the client's fault.
    if (codes.length === 0 || !codes.every(isCountryCode)) {
      return HttpResponse.json(
        { message: 'countries must be a comma-separated list of supported country codes' },
        { status: 400 },
      );
    }

    const override = await applyScenario(`benefits:${codes.join(',')}`);
    if (override) return override;

    const wanted = new Set<CountryCode>(codes);
    return HttpResponse.json(benefits.filter((row) => wanted.has(row.countryCode as CountryCode)));
  }),
];
