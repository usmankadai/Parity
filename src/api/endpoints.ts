import { getJson, postForStream } from './client';
import type { AskRequest, BenefitRow, Country, CountryCode } from './types';
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

/** Starts a streamed answer. The caller reads the stream (see features/ask/sseChannel.ts). */
export function openAskStream(
  request: AskRequest,
  signal?: AbortSignal,
): Promise<ReadableStreamDefaultReader<Uint8Array>> {
  return postForStream('/api/ask', request, signal);
}
