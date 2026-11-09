import { buffers, END, eventChannel, type EventChannel } from 'redux-saga';
import { ApiError } from '../../api/client';
import { createSseParser, SseParseError } from '../../api/sse';
import type { AskStreamEvent } from '../../api/types';

export type StreamMessage =
  { kind: 'event'; event: AskStreamEvent } | { kind: 'failure'; error: ApiError };

/**
 * Turns a streamed response into a channel of messages that a saga can take
 * one at a time. The stream ending sends END.
 *
 * The buffer matters: one network read can hold several events, and the
 * channel must keep them while the saga is busy with the previous one.
 *
 * Closing the channel cancels the reader without awaiting it: under MSW
 * reader.cancel() never settles, and awaiting it would hang (see ADR 0002).
 */
export function sseChannel(
  reader: ReadableStreamDefaultReader<Uint8Array>,
): EventChannel<StreamMessage> {
  return eventChannel<StreamMessage>((emit) => {
    let closed = false;
    const parser = createSseParser();
    const decoder = new TextDecoder();

    async function pump() {
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (closed) return;
          if (done) {
            emit(END);
            return;
          }
          for (const event of parser.push(decoder.decode(value, { stream: true }))) {
            emit({ kind: 'event', event });
          }
        }
      } catch (error) {
        if (closed) return;
        emit({
          kind: 'failure',
          error:
            error instanceof SseParseError
              ? new ApiError('invalid-response', 'The answer arrived in an unexpected shape.')
              : new ApiError('network', 'The connection dropped before the answer finished.'),
        });
      }
    }

    void pump();

    return () => {
      closed = true;
      reader.cancel().catch(() => undefined);
    };
  }, buffers.expanding<StreamMessage>(32));
}
