import { CATEGORY_IDS, COUNTRY_CODES } from '../../api/types';

/**
 * What-if edits: for each company, figures typed in by the user, keyed
 * `${countryCode}-${category}`, in the category's display unit.
 */
export type WhatIfOverrides = Record<string, Record<string, number>>;

export const WHAT_IF_STORAGE_KEY = 'parity:what-if';
const VERSION = 1;
/** No statutory figure in any unit we show comes close to this. */
const MAX_VALUE = 1000;

const KEY = new RegExp(`^(${COUNTRY_CODES.join('|')})-(${CATEGORY_IDS.join('|')})$`);
const COMPANY_ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function overrideKey(countryCode: string, category: string): string {
  return `${countryCode}-${category}`;
}

/** A figure a user may type: a finite, non-negative number within range. */
export function isValidOverride(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= MAX_VALUE;
}

export function serialiseOverrides(overrides: WhatIfOverrides): string {
  return JSON.stringify({ version: VERSION, overrides });
}

/**
 * Reads stored edits back. Anything unexpected (another version, a bad key,
 * a value out of range) is dropped, never trusted: storage can be edited by
 * hand, or left over from an older version of the app.
 */
export function parseStoredOverrides(raw: string | null): WhatIfOverrides {
  if (raw === null) return {};
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return {};
  }
  if (typeof value !== 'object' || value === null) return {};
  const { version, overrides } = value as Record<string, unknown>;
  if (version !== VERSION || typeof overrides !== 'object' || overrides === null) return {};

  const result: WhatIfOverrides = {};
  for (const [companyId, figures] of Object.entries(overrides as Record<string, unknown>)) {
    if (!COMPANY_ID.test(companyId) || typeof figures !== 'object' || figures === null) continue;
    const kept: Record<string, number> = {};
    for (const [key, figure] of Object.entries(figures as Record<string, unknown>)) {
      if (KEY.test(key) && typeof figure === 'number' && isValidOverride(figure)) {
        kept[key] = figure;
      }
    }
    if (Object.keys(kept).length > 0) result[companyId] = kept;
  }
  return result;
}

/** localStorage can be blocked (private mode, strict settings), so every access is guarded. */
export function readStoredOverrides(): WhatIfOverrides {
  try {
    return parseStoredOverrides(window.localStorage.getItem(WHAT_IF_STORAGE_KEY));
  } catch {
    return {};
  }
}

export function writeStoredOverrides(overrides: WhatIfOverrides): void {
  try {
    if (Object.keys(overrides).length === 0) {
      window.localStorage.removeItem(WHAT_IF_STORAGE_KEY);
    } else {
      window.localStorage.setItem(WHAT_IF_STORAGE_KEY, serialiseOverrides(overrides));
    }
  } catch {
    // Not saved, but the edits still apply for this visit.
  }
}
