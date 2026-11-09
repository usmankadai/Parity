export type ApiMode = 'mock' | 'real';

/** Mock mode is the default, so the public demo never needs an API key. */
export function readApiMode(value: string | undefined): ApiMode {
  return value === 'real' ? 'real' : 'mock';
}
