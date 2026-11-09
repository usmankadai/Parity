import { http } from 'msw';
import { describe, expect, it } from 'vitest';
import type { AskStreamEvent } from '../../api/types';
import { server } from '../node';
import { sseResponse, toSseFrame } from '../sse';

// These tests prove the test environment can do what the Ask feature needs:
// MSW serves a streamed body, the client reads it chunk by chunk (not buffered
// into one piece), and aborting or a dropped stream surfaces as an error.

const url = new URL('/api/test-stream', window.location.origin).toString();

const events: AskStreamEvent[] = [
  { type: 'chunk', text: 'Germany ' },
  { type: 'chunk', text: 'offers more.' },
  { type: 'sources', rowIds: ['de-annual-leave'] },
  { type: 'done' },
];

async function readAll(response: Response) {
  if (!response.body) throw new Error('Response has no body');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const reads: string[] = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) return reads;
    reads.push(decoder.decode(value, { stream: true }));
  }
}

describe('streamed MSW responses', () => {
  it('arrive in separate chunks, in order', async () => {
    server.use(http.post(url, () => sseResponse(events, { delayMs: 5 })));

    const response = await fetch(url, { method: 'POST' });
    const reads = await readAll(response);

    expect(response.headers.get('Content-Type')).toBe('text/event-stream');
    expect(reads.length).toBeGreaterThan(1);
    expect(reads.join('')).toBe(events.map(toSseFrame).join(''));
  });

  // Known MSW behaviours, recorded in ADR 0002. If either test starts failing
  // after an MSW upgrade, the behaviour has changed: update the ADR.
  //
  // 1. Under MSW, reader.cancel() never settles, but the reader does stop:
  //    the next read reports done. So cleanup must cancel without awaiting.
  it('stop when the reader is cancelled (without awaiting the cancel)', async () => {
    server.use(http.post(url, () => sseResponse(events, { delayMs: 20 })));

    const response = await fetch(url, { method: 'POST' });
    if (!response.body) throw new Error('Response has no body');
    const reader = response.body.getReader();

    const first = await reader.read();
    expect(first.done).toBe(false);

    void reader.cancel();
    const afterCancel = await reader.read();
    expect(afterCancel.done).toBe(true);
  });

  // 2. In a real browser, aborting the request also errors the body. Under MSW
  //    the body is not tied to the signal, so it keeps streaming. So cleanup
  //    must cancel the reader as well as abort the request.
  it('keep streaming after an abort, so cleanup must also cancel the reader', async () => {
    server.use(http.post(url, () => sseResponse(events, { delayMs: 5 })));
    const controller = new AbortController();

    const response = await fetch(url, { method: 'POST', signal: controller.signal });
    controller.abort();

    expect((await readAll(response)).join('')).toBe(events.map(toSseFrame).join(''));
  });

  it('fail the read when the stream drops part way through', async () => {
    server.use(http.post(url, () => sseResponse(events, { failAfter: 2 })));

    const response = await fetch(url, { method: 'POST' });

    await expect(readAll(response)).rejects.toThrow();
  });
});
