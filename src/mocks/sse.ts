import { delay, HttpResponse } from 'msw';
import type { AskStreamEvent } from '../api/types';

interface SseOptions {
  /** Pause before each event, so the UI can be seen streaming. */
  delayMs?: number;
  /** Stop after this many events and fail the stream (the "drops mid-stream" case). */
  failAfter?: number;
}

/** Formats one event as a server-sent events frame. */
export function toSseFrame(event: AskStreamEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

/** Builds a streamed text/event-stream response from a list of events. */
export function sseResponse(events: AskStreamEvent[], { delayMs = 0, failAfter }: SseOptions = {}) {
  const encoder = new TextEncoder();
  let cancelled = false;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      for (const [index, event] of events.entries()) {
        if (failAfter !== undefined && index >= failAfter) {
          controller.error(new Error('Mock stream dropped'));
          return;
        }
        if (delayMs > 0) {
          await delay(delayMs);
        }
        // The reader may have cancelled while we were waiting.
        if (cancelled) return;
        controller.enqueue(encoder.encode(toSseFrame(event)));
      }
      controller.close();
    },
    cancel() {
      cancelled = true;
    },
  });

  return new HttpResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
    },
  });
}
