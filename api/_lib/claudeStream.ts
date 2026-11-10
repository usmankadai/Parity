import Anthropic from '@anthropic-ai/sdk';
import type { ModelEvent, ModelRequest } from './handleAsk';

/** Models that accept server-side refusal fallbacks in the "default" form. */
const FALLBACK_MODELS = new Set([
  'claude-opus-5-5',
  'claude-opus-5',
  'claude-fable-5-1',
  'claude-sonnet-5-5',
]);

/**
 * Streams one answer from Claude and yields its text, then how it ended.
 *
 * - The system prompt is identical on every request, so it is cached.
 * - Effort is low: these are short answers from data in the prompt.
 * - max_tokens is a deliberate cap on cost and length for a public demo; the
 *   prompt asks for answers under about 150 words.
 * - On supported models, a server-side fallback re-runs a refused request on
 *   another model inside the same call.
 */
export async function* streamFromClaude(
  { model, system, user }: ModelRequest,
  apiKey: string,
  signal: AbortSignal,
): AsyncIterable<ModelEvent> {
  const client = new Anthropic({ apiKey, maxRetries: 1, timeout: 60_000 });
  const fallback = FALLBACK_MODELS.has(model)
    ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const }
    : {};

  const stream = client.beta.messages.stream(
    {
      model,
      max_tokens: 2048,
      output_config: { effort: 'low' },
      system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: user }],
      ...fallback,
    },
    { signal },
  );

  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      yield { type: 'text', text: event.delta.text };
    }
  }

  const message = await stream.finalMessage();
  yield { type: 'end', stopReason: message.stop_reason };
}
