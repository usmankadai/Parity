# ADR 0002: Test environment for MSW streaming

- **Status:** Accepted
- **Date:** 2026-11-09

## Context

Integration tests render the app with React Testing Library and serve API responses with MSW in Node. The Ask feature streams its answer as `text/event-stream`, so the test environment must let MSW serve a `ReadableStream` body that the client reads chunk by chunk, and must let the client cancel it.

Vitest offers two DOM environments: jsdom and happy-dom. Streaming support in these environments has caused problems in the past, so we tested both before building anything on top of them.

## What we tested

`src/mocks/__tests__/streaming.test.ts` checks, in each environment, that:

1. A streamed MSW response arrives in more than one read, in order, with the right content type.
2. Cancelling the reader stops the stream.
3. A stream that drops part way through makes the read fail.

Both environments passed all three, with similar speed (about 1 second for the suite).

Two MSW behaviours showed up in **both** environments, and they differ from a real browser:

- **Aborting the request does not stop a mocked body.** After the response has arrived, `AbortController.abort()` leaves the body streaming to the end. In a browser, the body would error with an `AbortError`.
- **`reader.cancel()` never settles under MSW.** The returned promise stays pending, but the reader does stop: the next `read()` reports `done`.

## Decision

- Use **jsdom**. Both environments handle streaming equally well here, and jsdom has wider support from Testing Library and axe-core. happy-dom was removed to avoid an unused dependency.
- The Ask saga's cleanup (in `finally`, when `cancelled()` is true) must **abort the request and cancel the reader**, and must **not await** the cancel. This is correct in a real browser as well, so the code does not branch for tests.
- Keep the two MSW behaviours as tests. If an MSW upgrade changes them, those tests fail and this ADR is updated.

## Consequences

- Cancellation tests run against the same cleanup code the browser uses.
- A future change that only calls `abort()` would pass in the browser but leave mocked streams running in tests and the demo. The ADR and the tests make that visible.
- Colour contrast cannot be checked in jsdom (no layout or paint), so component axe checks turn that rule off and Playwright's axe scans cover it.
