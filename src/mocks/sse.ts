import { delay, HttpResponse } from 'msw';
import type { AskStreamEvent } from '../api/types';

interface SseOptions {
  /** Pause before the first event (the "slow" scenario). */
  initialDelayMs?: number;
  /** Pause before each event, so the UI can be seen streaming. */
  delayMs?: number;
  /** Stop after this many events and fail the stream (the "drops mid-stream" case). */
  failAfter?: number;
}

/** Formats one event as a server-sent events frame. */
export function toSseFrame(event: AskStreamEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

/**
 * Builds a streamed text/event-stream response from a list of events.
 *
 * Events are produced on demand (pull), one per read. That way a failure
 * after N events really reaches the client after them: erroring a stream
 * discards any chunks still queued, so pushing everything up front would
 * lose them.
 */
export function sseResponse(
  events: AskStreamEvent[],
  { initialDelayMs = 0, delayMs = 0, failAfter }: SseOptions = {},
) {
  const encoder = new TextEncoder();
  let index = 0;

  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      const wait = index === 0 ? initialDelayMs + delayMs : delayMs;
      if (wait > 0) await delay(wait);

      if (failAfter !== undefined && index >= failAfter) {
        controller.error(new Error('Mock stream dropped'));
        return;
      }
      const event = events[index];
      if (!event) {
        controller.close();
        return;
      }
      index += 1;
      controller.enqueue(encoder.encode(toSseFrame(event)));
    },
  });

  return new HttpResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
    },
  });
}
