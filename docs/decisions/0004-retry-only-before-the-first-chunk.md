# ADR 0004: Retry only before the first chunk

- **Status:** Accepted
- **Date:** 2026-11-09

## Context

The Ask feature streams its answer. Requests fail in two different places:

1. **Before any text arrives:** the connection fails, or the server replies 5xx. Nothing has been shown, so trying again is invisible to the user apart from a short wait.
2. **After text has arrived:** the stream drops part way through. Half an answer is already on screen.

Data loading (milestone 3) retries network errors and 5xx up to 3 times with backoff. Applying the same rule to a stream in the second case would be wrong: a retry starts a new answer, so the text would repeat ("Germany has Germany has 20 days") or two different answers would be mixed. A model's answer is not deterministic, so the second attempt cannot simply "continue" the first.

## Options

1. **Retry at any point, clearing the partial answer.** Avoids mixed text, but the answer visibly disappears and restarts, and the user may have been reading it.
2. **Retry at any point, appending.** Produces repeated or mixed text. Rejected.
3. **Retry only before the first chunk. After that, mark the answer interrupted** and offer "Try again" as an explicit user action.

## Decision

Option 3.

- The saga (`features/ask/sagas.ts`) tracks whether the first chunk has arrived. Before it, network errors, 5xx responses, an `error` event and a stream that ends early are retried with the same backoff as data loading (3 attempts, exponential with jitter). 4xx and malformed events are never retried.
- After it, any failure puts `ask/streamInterrupted`. The partial text stays visible, labelled "Answer interrupted", with a note that it may be incomplete and a "Try again" button that asks again from scratch.
- "Stop generating" and a new question (`takeLatest`) are cancellations, not failures: they are never retried and never shown as errors.
- Cleanup on every exit closes the event channel (cancelling the stream reader without awaiting it, per ADR 0002) and aborts the request when the saga was cancelled.

## Consequences

- The answer on screen is never silently replaced or corrupted.
- A drop late in a long answer costs the user a click rather than a silent retry. That is the honest trade: they can see what they got and choose to ask again.
- The "Drops mid-stream" demo scenario shows this live, and saga and integration tests cover both sides of the line: retry-then-success before the first chunk, and interrupted-with-no-retry after it.
