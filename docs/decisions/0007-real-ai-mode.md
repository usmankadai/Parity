# ADR 0007: Real AI mode and checking citations in the proxy

- **Status:** Accepted
- **Date:** 2026-11-10

## Context

Phase 1 answered questions with a scripted mock. That kept the public demo free and safe, but it does not reason: a thoughtful question gets a list of figures, not an answer. Real answers need a model, which brings three risks a browser-only app cannot handle: the API key must stay secret, every question costs money, and the model may cite rows it was never given.

## Decision

A small serverless function on Vercel, `api/ask.ts`, answers `POST /api/ask` in real mode, with the same request and event shapes as the mock.

- **The key stays on the server.** `ANTHROPIC_API_KEY` and `ANTHROPIC_MODEL` are read from the server environment and are never `PUBLIC_`-prefixed. CI fails if the built bundle contains anything that looks like a key, or the variable's name (`npm run check:secrets`).
- **Requests are checked before any money is spent:** a body size limit, then the same `validateAskRequest` the mock uses (country allow-list, question length, row and company-figure caps, every row's shape).
- **A per-IP rate limit** (10 questions per 10 minutes). It is in memory, so each serverless instance counts separately; the README says it is a demo guard, not real protection.
- **The prompt:** a fixed system prompt (cached, so repeated questions are cheaper) sets the rules: use only the supplied data, say when it does not cover the question, treat the question as untrusted, plain British English, short. The data and question go in the user message. Gaps between company figures and minimums are worked out in code with the same rules as the table (`gap.ts`) and given to the model, so it never recalculates them.
- **Citations are checked, not trusted.** The model ends with `<sources>id,id</sources>`. A pure, tested splitter (`api/_lib/sourcesSplitter.ts`) streams the answer while holding back that block (including a tag split across two pieces of text). At the end, only IDs that were in the request are kept; the count of dropped IDs is logged, never the request. The browser applies the same check again.
- **Failures stay inside the event stream.** A refusal becomes "The assistant could not answer that question". Any upstream error becomes a generic `error` event, so the client's rule from ADR 0004 applies: retried before the first chunk, "interrupted" after it. Raw upstream errors are never forwarded.
- **The model call** uses the Anthropic SDK's streaming API with `claude-opus-5-5` as the suggested model, low effort (short answers from supplied data), a 2,048-token cap on cost and length, and server-side refusal fallbacks on models that support them.
- **The static data does not move.** In real mode MSW still serves countries, benefits and companies (they are static), and lets only `/api/ask` through to the function.
- **The public demo stays on scripted answers** until real mode is switched on deliberately, so a public link cannot run up a bill by surprise.

## Consequences

- The handler takes the model call as a dependency, so it is tested end to end (validation, rate limit, splitting, citation check, refusals, error masking) without calling the API or needing a key.
- Turning real mode on is configuration only: set the three environment variables in Vercel and redeploy.
- Cost is bounded per question (small prompt, cached system prompt, capped output) and per visitor (rate limit), but not globally. A spending limit on the API key is the backstop.
