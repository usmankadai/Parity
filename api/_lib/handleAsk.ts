import { validateAskRequest } from '../../src/api/askValidation';
import { citableIds } from '../../src/api/citations';
import type { AskRequest, AskStreamEvent } from '../../src/api/types';
import { clientIp } from './rateLimit';
import { buildUserMessage, SYSTEM_PROMPT } from './prompt';
import { createSourcesSplitter } from './sourcesSplitter';

/** What the model call yields: pieces of answer text, then how it ended. */
export type ModelEvent =
  { type: 'text'; text: string } | { type: 'end'; stopReason: string | null };

export interface ModelRequest {
  model: string;
  system: string;
  user: string;
}

export interface AskDeps {
  env: { apiKey: string | undefined; model: string | undefined };
  /** Streams one answer from the model. Throws on failure. */
  streamModel: (
    request: ModelRequest,
    apiKey: string,
    signal: AbortSignal,
  ) => AsyncIterable<ModelEvent>;
  rateLimit: (key: string) => { allowed: true } | { allowed: false; retryAfterSeconds: number };
  /** Logs a short, safe description of a failure. Never the request or the upstream message. */
  logError: (message: string) => void;
}

const MAX_BODY_BYTES = 200_000;

function json(status: number, message: string, headers: Record<string, string> = {}) {
  return Response.json(
    { message },
    { status, headers: { 'Cache-Control': 'no-store', ...headers } },
  );
}

function frame(event: AskStreamEvent): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`);
}

/**
 * The /api/ask proxy: checks the request, asks the model, and streams the
 * answer back as server-sent events in the same shape the mock uses.
 *
 * The API key stays on the server. Raw upstream errors are never forwarded.
 */
export async function handleAsk(request: Request, deps: AskDeps): Promise<Response> {
  const { apiKey, model } = deps.env;
  if (!apiKey || !model) {
    deps.logError('ask: ANTHROPIC_API_KEY or ANTHROPIC_MODEL is not set');
    return json(500, 'The assistant is not configured.');
  }

  const limit = deps.rateLimit(clientIp(request.headers));
  if (!limit.allowed) {
    return json(429, 'Too many questions. Please wait a moment and try again.', {
      'Retry-After': String(limit.retryAfterSeconds),
    });
  }

  const raw = await request.text();
  if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) {
    return json(413, 'The request is too large.');
  }
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return json(400, 'The request body must be JSON.');
  }
  const validation = validateAskRequest(body);
  if (!validation.ok) return json(400, validation.message);

  return streamAnswer(validation.request, model, apiKey, request.signal, deps);
}

function streamAnswer(
  ask: AskRequest,
  model: string,
  apiKey: string,
  signal: AbortSignal,
  deps: AskDeps,
): Response {
  const allowed = citableIds(ask);
  const splitter = createSourcesSplitter();

  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        let stopReason: string | null = null;
        for await (const event of deps.streamModel(
          { model, system: SYSTEM_PROMPT, user: buildUserMessage(ask) },
          apiKey,
          signal,
        )) {
          if (event.type === 'end') {
            stopReason = event.stopReason;
            break;
          }
          const visible = splitter.push(event.text);
          if (visible) controller.enqueue(frame({ type: 'chunk', text: visible }));
        }

        if (stopReason === 'refusal') {
          controller.enqueue(
            frame({ type: 'error', message: 'The assistant could not answer that question.' }),
          );
          controller.close();
          return;
        }

        const { text, rowIds } = splitter.end();
        if (text) controller.enqueue(frame({ type: 'chunk', text }));
        // The citation check: drop any ID that was not in the request.
        const kept = rowIds.filter((id) => allowed.has(id));
        if (kept.length < rowIds.length) {
          deps.logError(
            `ask: dropped ${rowIds.length - kept.length} cited ID(s) that were not sent`,
          );
        }
        controller.enqueue(frame({ type: 'sources', rowIds: kept }));
        controller.enqueue(frame({ type: 'done' }));
        controller.close();
      } catch (error) {
        if (signal.aborted) {
          // The browser stopped listening (Stop, or a new question): nothing to send.
          controller.close();
          return;
        }
        deps.logError(
          `ask: model call failed (${error instanceof Error ? error.name : 'unknown'})`,
        );
        controller.enqueue(
          frame({ type: 'error', message: 'The assistant is unavailable. Please try again.' }),
        );
        controller.close();
      }
    },
  });

  return new Response(body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
