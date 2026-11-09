import { ApiError } from '../api/client';

/** A message that is safe to show in the UI. Unknown errors get a generic message. */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return 'Something went wrong.';
}
