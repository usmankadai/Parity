/**
 * Types shared by the client, the MSW handlers and (later) the serverless proxy.
 * Request and row types are added with the features that use them.
 */

/** One event in the `/api/ask` text/event-stream response. */
export type AskStreamEvent =
  | { type: 'chunk'; text: string }
  | { type: 'sources'; rowIds: string[] }
  | { type: 'done' }
  | { type: 'error'; message: string };
