import { describe, expect, it } from 'vitest';
import { createSseParser, isAskStreamEvent, SseParseError } from '../sse';

describe('createSseParser', () => {
  it('parses several events that arrive in one piece', () => {
    const parser = createSseParser();
    const events = parser.push(
      'data: {"type":"chunk","text":"Hello"}\n\ndata: {"type":"done"}\n\n',
    );
    expect(events).toEqual([{ type: 'chunk', text: 'Hello' }, { type: 'done' }]);
  });

  it('keeps an event that is split across pieces until it is complete', () => {
    const parser = createSseParser();
    expect(parser.push('data: {"type":"chu')).toEqual([]);
    expect(parser.push('nk","text":"Hi"}\n')).toEqual([]);
    expect(parser.push('\ndata: {"type":"done"}\n\n')).toEqual([
      { type: 'chunk', text: 'Hi' },
      { type: 'done' },
    ]);
  });

  it('accepts Windows line endings and ignores comments and other fields', () => {
    const parser = createSseParser();
    const events = parser.push(
      ': keep-alive\r\n\r\nevent: message\r\ndata: {"type":"sources","rowIds":["GB-pension"]}\r\n\r\n',
    );
    expect(events).toEqual([{ type: 'sources', rowIds: ['GB-pension'] }]);
  });

  it('throws on invalid JSON or an unknown event', () => {
    expect(() => createSseParser().push('data: {oops}\n\n')).toThrow(SseParseError);
    expect(() => createSseParser().push('data: {"type":"chunk"}\n\n')).toThrow(SseParseError);
  });
});

describe('isAskStreamEvent', () => {
  it('checks each event type', () => {
    expect(isAskStreamEvent({ type: 'error', message: 'x' })).toBe(true);
    expect(isAskStreamEvent({ type: 'sources', rowIds: [1] })).toBe(false);
    expect(isAskStreamEvent({ type: 'unknown' })).toBe(false);
    expect(isAskStreamEvent(null)).toBe(false);
  });
});
