import { InvalidResponseError } from './validate';

export type ApiErrorKind = 'http' | 'network' | 'invalid-response';

/** Every failure from the API client is an ApiError, so sagas can decide what to retry. */
export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number | undefined;

  constructor(kind: ApiErrorKind, message: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.kind = kind;
    this.status = status;
  }
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

/** Builds an absolute URL, because Node's fetch (used in tests) does not resolve relative ones. */
export function apiUrl(path: string): string {
  return new URL(path, window.location.origin).toString();
}

/**
 * GETs JSON and checks its shape with `parse`. Abort errors are re-thrown
 * unchanged, so a cancelled saga is not reported as a failure.
 */
export async function getJson<T>(
  path: string,
  parse: (value: unknown) => T,
  signal?: AbortSignal,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(apiUrl(path), {
      headers: { Accept: 'application/json' },
      ...(signal ? { signal } : {}),
    });
  } catch (error) {
    if (isAbortError(error)) throw error;
    throw new ApiError('network', 'The server could not be reached.');
  }

  if (!response.ok) {
    throw new ApiError(
      'http',
      `The server replied with status ${response.status}.`,
      response.status,
    );
  }

  try {
    return parse(await response.json());
  } catch (error) {
    if (isAbortError(error)) throw error;
    const detail = error instanceof InvalidResponseError ? ` ${error.message}` : '';
    throw new ApiError('invalid-response', `The server sent data in an unexpected shape.${detail}`);
  }
}
