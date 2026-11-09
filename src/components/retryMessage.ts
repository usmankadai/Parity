import type { RetryProgress } from '../features/countries/slice';

/** What to show while a request is being retried. */
export function retryMessage(retry: RetryProgress): string {
  return `The server did not respond. Trying again (attempt ${retry.attempt} of ${retry.maxAttempts})…`;
}
