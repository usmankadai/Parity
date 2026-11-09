# ADR 0001: Redux-Saga for async flows

- **Status:** Accepted
- **Date:** 2026-11-09

## Context

Parity has two kinds of async work:

1. Plain data loading (countries and benefit rows), with retries and error states.
2. The Ask assistant, which streams an answer and must handle: a new question cancelling the old one, a "Stop generating" button, retries before the first chunk only, and cleaning up the network request whenever any of those happen.

The second kind is a long-running workflow with several ways to end. Whatever handles it needs cancellation as a first-class idea, and needs to be testable without real timers or a real network.

## Options

- **Thunks (`createAsyncThunk`).** Simple for one request and one response. Cancellation is manual (pass an `AbortSignal` around, track the latest request id yourself). "A new question cancels the old one" and "stop" become hand-written bookkeeping in components or thunks.
- **RTK Query.** Excellent for caching request and response data. A streamed, cancellable answer that builds up chunk by chunk is not what it is designed for, and the retry rule (retry only before the first chunk) would fight its model.
- **Redux-Saga.** Effects describe the workflow: `takeLatest` cancels the previous question, `race` ends the stream on a stop action, `cancelled()` in `finally` runs cleanup on every way out, and `eventChannel` turns the stream into actions. Sagas yield plain effect objects, so tests can check the flow with `redux-saga-test-plan` and no real timers.

## Decision

Use Redux-Saga for every side effect, with thunk middleware turned off (`getDefaultMiddleware({ thunk: false })`). Components dispatch actions and never call `fetch`. A store test proves a thunk cannot be dispatched.

## Consequences

- One place to look for async behaviour, cancellation and retries.
- Cancellation, retry and cleanup can be tested directly, which is the riskiest part of the app.
- Generators and effects are a learning curve, and sagas add some indirection for simple loads. That cost is accepted to keep one consistent model rather than two.
- Typing saga return values (`yield call(...)`) is weaker than plain `async`/`await`. Keep the typed boundary in `src/api/client.ts` and narrow results there.
