// Mock API scenarios for the demo and tests. This module must not import MSW,
// because the scenario switcher (in the main bundle) uses it, and MSW is only
// ever loaded lazily.

export const SCENARIO_IDS = [
  'normal',
  'slow',
  'server-error',
  'empty',
  'flaky',
  'drops-mid-stream',
] as const;
export type ScenarioId = (typeof SCENARIO_IDS)[number];

export interface Scenario {
  id: ScenarioId;
  label: string;
  description: string;
}

export const SCENARIOS: readonly Scenario[] = [
  { id: 'normal', label: 'Normal', description: 'Every request succeeds straight away.' },
  { id: 'slow', label: 'Slow', description: 'Every request takes 3 seconds.' },
  {
    id: 'server-error',
    label: 'Server error',
    description: 'Every request fails with a 500 error, so retries run out.',
  },
  { id: 'empty', label: 'Empty data', description: 'Requests succeed but return no data.' },
  {
    id: 'flaky',
    label: 'Flaky',
    description: 'Each endpoint fails twice, then succeeds, so the retries recover.',
  },
  {
    id: 'drops-mid-stream',
    label: 'Drops mid-stream',
    description: 'Answers stop part way through. Other data loads normally.',
  },
];

const STORAGE_KEY = 'parity:scenario';
const DEFAULT_SLOW_DELAY_MS = 3000;

interface ScenarioState {
  id: ScenarioId;
  slowDelayMs: number;
  /** Failures served so far per endpoint, for the flaky scenario. */
  flakyFailures: Map<string, number>;
}

function isScenarioId(value: unknown): value is ScenarioId {
  return typeof value === 'string' && (SCENARIO_IDS as readonly string[]).includes(value);
}

function readStoredScenario(): ScenarioId {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return isScenarioId(stored) ? stored : 'normal';
  } catch {
    // Storage can be blocked (private mode, strict settings). Fall back quietly.
    return 'normal';
  }
}

const state: ScenarioState = {
  id: readStoredScenario(),
  slowDelayMs: DEFAULT_SLOW_DELAY_MS,
  flakyFailures: new Map(),
};

export function getScenario(): ScenarioId {
  return state.id;
}

export function getSlowDelayMs(): number {
  return state.slowDelayMs;
}

/**
 * Switches scenario, and remembers it so a page reload keeps it (useful for
 * seeing the countries list fail on load). Tests can shorten the slow delay.
 */
export function setScenario(id: ScenarioId, options: { slowDelayMs?: number } = {}): void {
  state.id = id;
  state.slowDelayMs = options.slowDelayMs ?? DEFAULT_SLOW_DELAY_MS;
  state.flakyFailures.clear();
  try {
    window.localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // Not remembered across reloads, but the switch still applies now.
  }
}

/** In the flaky scenario: true for the first 2 requests to an endpoint, then false. */
export function shouldFlakyFail(endpoint: string): boolean {
  const failures = state.flakyFailures.get(endpoint) ?? 0;
  if (failures >= 2) return false;
  state.flakyFailures.set(endpoint, failures + 1);
  return true;
}
