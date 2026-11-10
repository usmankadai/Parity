# Parity

[![CI](https://github.com/usmankadai/Parity/actions/workflows/ci.yml/badge.svg)](https://github.com/usmankadai/Parity/actions/workflows/ci.yml)

Compare statutory employee benefits across the United Kingdom, Ireland, Germany and the Netherlands, and ask questions that are answered only from the data on screen.

> Independent portfolio project, inspired by reward comparison tools. Not affiliated with or endorsed by Benifex. Illustrative data, not legal or HR advice.

**Live demo: [parity.usmankadai.dev](https://parity.usmankadai.dev/)** (runs entirely on mock data, no sign-in or API key needed)

## Why I built it

A Reward Director comparing packages across countries has to line up rules that are written in different units, with different exceptions, and sometimes with no legal minimum at all. Parity is a small, deliberately scoped take on that problem, built in the stack of the team I was applying to: **React, TypeScript, Redux, Redux-Saga, RsBuild and MSW**.

It is meant to show three things:

1. Fluency in that stack, with Redux-Saga used where it earns its place: streaming, cancellation and retries.
2. Careful handling of async AI flows: a streamed answer you can stop, replace, retry (at the right moment) and trust.
3. Shift-left quality: accessibility, tests, security and written decisions from the first commit.

## What it does

### A company's package against the law

Parity opens on **Northwind Logistics**, a fictional freight company with 2,790 employees in the United Kingdom, Ireland, Germany and the Netherlands. One click compares its package in every country with the legal minimums:

- A **summary** says where it falls short: Ireland's notice period (a contract template still gives 1 week, where the law requires 2) and Germany's (the company gives "4 weeks", the law "1 month, to the end of a calendar month").
- Each cell shows the company's figure, a marker (**Above minimum**, **Meets minimum**, **Below minimum (non-compliant)**, with an icon and text), the policy in words, and the legal minimum with its source.
- **Company benefits** with no legal minimum (private health insurance, a gym and wellbeing allowance, an employee assistance programme) have their own section.
- **Ask** knows the company's figures too: "Where is our package below the legal minimum?" cites both the company's figure and the law it falls short of.
- "Legal minimums only" switches back to the plain comparison between countries.

The company and its figures are fictional and labelled that way. The rules for comparing them are in [ADR 0006](docs/decisions/0006-company-view-and-gap-rules.md).

### Compare legal minimums between countries

Pick 2 to 4 countries and get a table of 7 statutory minimums: annual leave, paid public holidays, maternity leave, paternity or partner leave, sick pay, employer pension contributions and employer notice.

- **Every figure is from an official source** (GOV.UK, Citizens Information, gesetze-im-internet.de, the German Federal Ministry of the Interior, Business.gov.nl), with the source's own wording and the date it was checked: **9 November 2026**.
- **Figures are made comparable without hiding the original.** Leave is shown in working days on a 5-day week, so Germany's 24 "Werktage" (counted Monday to Saturday) become 20. The source's wording is always shown underneath.
- **"No legal minimum" is a fact, not a gap.** The UK has no right to paid bank holidays, Germany has no separate paternity leave, and the Netherlands has no general duty to offer a pension. Each says so, with a note on what applies instead.
- **Most and least generous** are marked with an icon and text. Categories that cannot be ranked fairly (sick pay, pensions) are not ranked, and say why. See [ADR 0003](docs/decisions/0003-normalising-statutory-data.md).

### Ask about the comparison

Below the table, ask a question. It is sent with the rows on screen, the answer streams in, and chips list the rows it was based on.

- **Stop generating** stops the answer and keeps what has arrived.
- **A new question** cancels the one still streaming.
- **Retries happen only before the first words arrive.** After that, a failure marks the answer as interrupted and offers Try again, so text is never repeated or mixed ([ADR 0004](docs/decisions/0004-retry-only-before-the-first-chunk.md)).
- **Citations are checked:** a chip only appears for a row that was actually sent.

In the public demo, answers are scripted from the rows sent, so they can never invent a figure. **Real mode** sends the question to an AI model through a small server-side proxy that keeps the API key secret, checks every request, rate limits each visitor, and drops any citation that was not in the data sent ([ADR 0007](docs/decisions/0007-real-ai-mode.md)).

### Try the failure handling

The **Demo scenarios** button in the top bar changes how the mock API responds, so you can watch the error handling work:

| Scenario         | What you should see                                                                                     |
| ---------------- | ------------------------------------------------------------------------------------------------------- |
| Normal           | Data loads straight away.                                                                               |
| Slow             | A loading message for 3 seconds.                                                                        |
| Server error     | "Trying again (attempt 2 of 3)", then an error with a Try again button.                                 |
| Empty data       | A clear "no data" message instead of an empty table.                                                    |
| Flaky            | Two failures, then the retries recover on their own.                                                    |
| Drops mid-stream | An answer stops part way, is marked "Answer interrupted" and is not retried. Other data loads normally. |

Open it from the top bar, pick a scenario, then press Compare, ask a question, or "Reload countries". The choice is remembered, so reloading the page shows how the country list behaves too.

## Redux-Saga patterns, and why

Components never call `fetch`. They dispatch actions, and sagas do the I/O.

| Pattern                         | Where                                        | Why                                                                                    |
| ------------------------------- | -------------------------------------------- | -------------------------------------------------------------------------------------- |
| `takeLatest`                    | Ask, comparison and country loading          | Only the newest request matters; an older one is cancelled.                            |
| `race` with `ask/stopRequested` | Stop generating                              | Whichever happens first wins, and the stream is cancelled.                             |
| `cancelled()` in `finally`      | Every saga that makes a request              | Cleanup runs on every way out: abort the request, close the stream.                    |
| `eventChannel` (buffered)       | The streamed answer                          | Turns the stream into actions; the buffer keeps events that arrive together.           |
| Backoff loop with `delay`       | Data loading, and Ask before its first chunk | Exponential backoff with jitter; stops early on errors that will not get better (4xx). |
| `all`                           | Loading each country's rows                  | Countries load in parallel, each with its own retries.                                 |
| `select`                        | Ask, and skipping already-loaded countries   | The answer can only use the data on screen.                                            |

Thunks are turned off (`getDefaultMiddleware({ thunk: false })`), and a test proves it. [ADR 0001](docs/decisions/0001-redux-saga-for-async-flows.md) explains the choice over thunks and RTK Query. Small typed helpers (`src/app/typedEffects.ts`) give each `yield` a real type, so there is no `any`.

## Accessibility

Target: WCAG 2.2 AA.

- A real `<table>` with a caption and scoped headers, in a labelled scroll region on small screens.
- GOV.UK-style error summaries, inline errors and an "Error:" page title prefix.
- Sources open in a disclosure (not a tooltip, so the link is reachable); Escape closes it and returns focus.
- Most and least generous are marked with icon and text, never colour alone.
- The streamed answer is not announced word by word: a live region says "Answer started", "Answer complete", "Generation stopped" or "Answer interrupted".
- German source quotes are marked `lang="de"`, so screen readers pronounce them correctly.
- `prefers-reduced-motion` is respected.
- axe runs in component tests and in every Playwright flow, at desktop and phone sizes.

## Security

- **Content Security Policy** with no inline scripts and `connect-src 'self'`, plus `worker-src 'self'` so the demo's service worker is allowed. Without that line the demo works locally and breaks only in production, so Playwright runs against the production build under the same headers, and every test fails if the page reports a CSP violation. A unit test keeps `vercel.json` in step with the headers in `config/securityHeaders.ts`.
- Answers are rendered as plain text. `dangerouslySetInnerHTML` is banned by a lint rule.
- Every API response is validated before use, and `/api/ask` requests are validated with rules the phase 2 proxy will share.
- `npm audit` runs in CI.

## Testing

| Layer       | Tools                                | What it covers                                                                                              |
| ----------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| Unit        | Vitest                               | Normalisation, ranking, retry rules, the SSE parser, request validation, and the data fixture itself.       |
| Saga        | redux-saga-test-plan                 | Every Ask path: answer, stop, replace, retry then success, retries exhausted, no retry on 4xx, interrupted. |
| Integration | React Testing Library, MSW, axe-core | The whole app with mocked APIs, including every demo scenario.                                              |
| End-to-end  | Playwright, @axe-core/playwright     | The production build under its real security headers, at desktop and phone sizes.                           |

[ADR 0002](docs/decisions/0002-test-environment-for-msw-streaming.md) records two MSW quirks found while testing streams, and how the code handles them.

## Running it

Requires Node 22.12 or later (see `.nvmrc`).

```bash
npm install
npm run dev          # mock mode: every /api call is served by MSW
npm run test         # unit, saga and integration tests
npm run test:e2e     # Playwright (first time: npx playwright install chromium)
npm run typecheck
npm run lint
npm run build
npm run brand:images # regenerate the favicon and link-preview image
```

### Real mode (AI answers)

1. In Vercel, set `PUBLIC_API_MODE=real`, `ANTHROPIC_API_KEY` (server-only, never `PUBLIC_`) and `ANTHROPIC_MODEL` (for example `claude-opus-5-5`), then redeploy.
2. Set a monthly spending limit on the API key. The proxy caps each answer and rate limits each visitor (10 questions per 10 minutes), but the limit lives in memory per server instance, so it is a demo guard, not real protection.
3. Locally, run `vercel dev` with the same variables in `.env.local`.

`npm run check:secrets` (also in CI) fails if the key could ever reach the browser bundle.

## Decisions

- [ADR 0001: Redux-Saga for async flows](docs/decisions/0001-redux-saga-for-async-flows.md)
- [ADR 0002: Test environment for MSW streaming](docs/decisions/0002-test-environment-for-msw-streaming.md)
- [ADR 0003: Normalising statutory data](docs/decisions/0003-normalising-statutory-data.md)
- [ADR 0004: Retry only before the first chunk](docs/decisions/0004-retry-only-before-the-first-chunk.md)
- [ADR 0005: Workspace layout and visual identity](docs/decisions/0005-workspace-layout-and-visual-identity.md)
- [ADR 0006: Company view and gap rules](docs/decisions/0006-company-view-and-gap-rules.md)
- [ADR 0007: Real AI mode and checking citations in the proxy](docs/decisions/0007-real-ai-mode.md)

## Known limitations

- Statutory minimums only. Collective agreements, sector rules and company policies are mentioned in notes, not modelled.
- The 5-day week and "a month is 52 ÷ 12 weeks" are simplifications. They are stated where the numbers appear, and the original wording is always shown.
- Ranking maternity leave by length can mislead (much of the UK's 52 weeks is low pay or unpaid). The ranking note and cell details say so.
- Demo answers are scripted, not written by an AI, unless real mode is switched on.
- Laws change. The data was checked on 9 November 2026, and each cell shows its date.

## How AI tools were used

I built Parity with Claude Code as a pair programmer, working from a `CLAUDE.md` that sets the stack, conventions, accessibility rules and milestones. I reviewed every change, and some suggestions were changed or rejected along the way, for example:

- Dropped `typed-redux-saga` (unmaintained since 2022) and `vitest-axe` (no stable 1.0) for small local helpers.
- Stayed on MSW 2, TypeScript 6 and ESLint 9 rather than the newest majors, because the lint plugins did not support them yet.
- Removed a claim from the data ("in practice they often are") that the official source did not support.
- Caught, through Playwright on a phone screen, that hidden screen reader text was widening the page, and fixed the cause rather than the symptom.

## What's next

- **What-if editing:** change a company figure and see the gaps update, saved locally by a debounced saga.
- **A second company with its own branding,** switching the whole workspace's theme from config.
- Lighthouse budgets in CI, and a short demo video.
