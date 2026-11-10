import type { CountryCode } from './types.js';

/**
 * Country names as a constant, for code that runs on the server (the AI
 * proxy), where importing JSON would need import attributes. A test checks
 * it matches the countries fixture.
 */
export const COUNTRY_NAMES: Record<CountryCode, string> = {
  GB: 'United Kingdom',
  IE: 'Ireland',
  DE: 'Germany',
  NL: 'Netherlands',
};
