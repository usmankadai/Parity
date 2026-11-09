import type { AskStreamEvent } from './types';

/** Thrown when a frame is not a valid ask event. */
export class SseParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SseParseError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isAskStreamEvent(value: unknown): value is AskStreamEvent {
  if (!isRecord(value)) return false;
  switch (value.type) {
    case 'chunk':
      return typeof value.text === 'string';
    case 'sources':
      return Array.isArray(value.rowIds) && value.rowIds.every((id) => typeof id === 'string');
    case 'done':
      return true;
    case 'error':
      return typeof value.message === 'string';
    default:
      return false;
  }
}

function parseFrame(frame: string): AskStreamEvent | null {
  // A frame can have several "data:" lines; other fields and comments are ignored.
  const data = frame
    .split('\n')
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).replace(/^ /, ''))
    .join('\n');
  if (data === '') return null;

  let value: unknown;
  try {
    value = JSON.parse(data);
  } catch {
    throw new SseParseError('An answer event was not valid JSON.');
  }
  if (!isAskStreamEvent(value)) {
    throw new SseParseError('An answer event had an unexpected shape.');
  }
  return value;
}

/**
 * Turns server-sent event text into ask events. Text arrives in arbitrary
 * pieces, so a frame can be split across two pieces: the parser keeps the
 * unfinished part until the rest arrives.
 */
export function createSseParser() {
  let buffer = '';

  return {
    push(text: string): AskStreamEvent[] {
      buffer += text.replace(/\r\n?/g, '\n');
      const frames = buffer.split('\n\n');
      buffer = frames.pop() ?? '';
      return frames.flatMap((frame) => {
        const event = parseFrame(frame);
        return event ? [event] : [];
      });
    },
  };
}
