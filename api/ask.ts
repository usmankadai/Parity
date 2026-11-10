import { streamFromClaude } from './_lib/claudeStream.js';
import { handleAsk } from './_lib/handleAsk.js';
import { createRateLimiter } from './_lib/rateLimit.js';

/**
 * POST /api/ask on Vercel (real mode only). Reads ANTHROPIC_API_KEY and
 * ANTHROPIC_MODEL from the server environment; neither ever reaches the
 * browser. See docs/decisions/0007-real-ai-mode.md.
 */

// 10 questions per visitor per 10 minutes, per running instance.
const limiter = createRateLimiter({ limit: 10, windowMs: 10 * 60 * 1000 });

export function POST(request: Request): Promise<Response> {
  return handleAsk(request, {
    env: { apiKey: process.env.ANTHROPIC_API_KEY, model: process.env.ANTHROPIC_MODEL },
    streamModel: streamFromClaude,
    rateLimit: (key) => limiter.check(key, Date.now()),
    logError: (message) => {
      console.error(message);
    },
  });
}
