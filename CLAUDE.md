# CLAUDE.md: Parity

## What this project is

Parity is a portfolio project. It helps a Reward Director **compare employee reward and benefits packages across countries**: statutory minimums side by side, their own company package laid over the top, and an AI assistant that answers questions using only the data on screen.

It is inspired by reward comparison tools such as Benifex Brain, and built to show a hiring team three things:

1. Fluency in their frontend stack: **React, TypeScript, Redux, Redux-Saga, RsBuild, MSW**.
2. Careful handling of async AI flows: streaming, cancellation, retries, error states, and citations that are checked rather than trusted.
3. Shift-left quality: tests, accessibility and security built in from the first commit, and decisions written down as ADRs.

Code quality and clarity matter more than feature count. If a choice is between "more features" and "cleaner, better-tested code", choose the second.

### Branding rule (important)

- Parity is an independent project. It must never look like a Benifex product.
- Use Parity's own name, logo, colours and copy. Never use Benifex or Brain logos, wordmarks, colours, fonts or product copy.
- Show this notice in the footer and on the landing view: "Independent portfolio project, inspired by reward comparison tools. Not affiliated with or endorsed by Benifex. Illustrative data, not legal or HR advice."

## Tech stack (do not substitute)

- **Build:** RsBuild (`@rsbuild/core`, `@rsbuild/plugin-react`)
- **UI:** React 19 with TypeScript in `strict` mode
- **State:** Redux Toolkit 2 (`configureStore`, `createSlice`, `createSelector`) with **Redux-Saga** for all side effects. Do not use thunks, `createAsyncThunk`, RTK Query or React Query. Turn thunk middleware off explicitly: `getDefaultMiddleware({ thunk: false })`.
- **API mocking:** MSW v2 (`http`, `HttpResponse`, `delay`), in the browser for dev and the public demo, and in Node for tests. Streamed responses use a `ReadableStream` body.
- **Styling:** CSS Modules with CSS custom properties for design tokens. No UI component library: the point is to show hand-built accessible components.
- **Testing:** Vitest (jsdom, see ADR 0002), React Testing Library, `@testing-library/user-event`, `redux-saga-test-plan` (`expectSaga` with static providers), `axe-core` through the `expectNoAxeViolations` helper in `src/test/axe.ts` (vitest-axe's stable release is old and its 1.0 has only ever been a pre-release), and Playwright with `@axe-core/playwright` for a few end-to-end flows.
- **Lint/format:** ESLint 9 (typescript-eslint strict type-checked, react-hooks, jsx-a11y) and Prettier.
- **Version pins:** TypeScript stays on 6.0 and ESLint on 9 until typescript-eslint supports TypeScript 7 and jsx-a11y supports ESLint 10. MSW stays on v2 (v3 is out, but too new to rely on for this project).
- **CI:** GitHub Actions.
- **AI (real mode only):** a small serverless proxy (`api/ask.ts`, a Vercel function) that calls the Anthropic Messages API with streaming. The model comes from the `ANTHROPIC_MODEL` env var.

## Commands

```bash
npm run dev          # RsBuild dev server, MSW on by default
npm run build        # production build
npm run preview      # serve the build
npm run test         # Vitest (unit + integration)
npm run test:e2e     # Playwright (includes axe checks)
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit
npm run lhci         # Lighthouse CI budgets (after npm run build)
```

Before you call any task done, run `npm run typecheck && npm run lint && npm run test`, and they must all pass.

**Lockfile:** change dependencies with npm 11.21 or later (for example `npx npm@11.21.2 install -D some-package`). Older npm versions (such as 11.6) leave out Rspack's optional WebAssembly dependencies (`@emnapi/core`, `@emnapi/runtime`) on macOS, and `npm ci` on the Linux CI runner then fails. Updating Node to 24.15 or later brings a new enough npm. For changes to a user flow, also run `npm run test:e2e`.

## Two run modes

- **Mock mode (default, and how the public demo is deployed):** MSW handles every `/api/*` call, including `/api/ask`, which streams a scripted answer built only from the rows sent. No API key is needed.
- **Real mode:** set `PUBLIC_API_MODE=real` at build time (RsBuild exposes `PUBLIC_`-prefixed variables through `import.meta.env`). MSW still serves the static data (countries, benefits, companies) but passes `/api/ask` through to the serverless proxy (`api/ask.ts`), which calls the model with `ANTHROPIC_API_KEY` and `ANTHROPIC_MODEL` from the server environment. Run it locally with `vercel dev`. See ADR 0007.
- **The API key must never reach the browser bundle.** It is never `PUBLIC_`-prefixed, and `npm run check:secrets` (in CI) fails if the build output contains `ANTHROPIC_API_KEY` or a string starting `sk-ant-`.
- The public deployment stays in mock mode until real mode is switched on deliberately.

## Data scope

### Countries

Four countries, matching where the Benifex Brain team hires: **United Kingdom (GB), Ireland (IE), Germany (DE), Netherlands (NL)**. Use ISO 3166-1 alpha-2 codes in data and APIs (`GB`, not `UK`), and full names in the UI. The user compares 2 to 4 of them.

### Benefit categories

One row per category:

- Annual leave (statutory minimum)
- Public holidays
- Maternity leave (length and pay)
- Paternity or partner leave (length and pay)
- Statutory sick pay
- Employer pension contribution (statutory minimum, if any)
- Employer notice period (statutory minimum after 2 years' service)

### Data rules (important)

- **Do not invent statutory figures.** Data lives in `src/mocks/fixtures/benefits.json`. Every row has a `sourceUrl` on an official government site (for example gov.uk, citizensinformation.ie, bmas.de, government.nl or business.gov.nl) and an `asOf` date.
- Every row has a `status` with three values, because "we have not checked" and "the law sets no minimum" are different facts:
  - `verified`: a figure confirmed from an official source. `value` is set.
  - `todo_verify`: not yet confirmed. `value: null`. The UI shows "Not yet verified", never a guess.
  - `no_statutory_minimum`: an official source confirms the law sets no minimum for this category in this country. `value: null`, and `sourceUrl` still points at the source that says so. The UI shows "No legal minimum", plus a `comparisonNote` for any related scheme that a reader might confuse with it (for example general parental leave that either parent can take).
- Keep the raw source value (`sourceValue`, as the source states it) alongside the normalised value used for comparison.

### Data that changes

Statutory figures change, and some changed recently (for example UK statutory sick pay rules changed in 2026, and Ireland's pension auto-enrolment started in 2026). So:

- **Take every figure from the official source at the time you write the fixture.** Never use figures from this file, from earlier chats or from a code review, including the examples in the normalisation section below. They show the kind of trap, not the data.
- Set `asOf` to the date you checked the source, not the date the law started.
- If a source mentions a change that is announced but not yet in force, use the figure in force on the `asOf` date and mention the change in `comparisonNote`.
- The README says when the data was last checked.

### Normalisation (this is where the domain knowledge shows)

Statutory figures are not directly comparable, and the app must not pretend they are. Examples of the traps:

- UK statutory leave is 28 days for a 5-day week, and employers may count bank holidays towards it. German statutory leave is 20 days on a 5-day week (24 "Werktage" on a 6-day week), on top of public holidays.
- UK statutory maternity pay is 90% of average weekly earnings for 6 weeks, then a flat weekly rate (or 90% if lower) for the rest of the paid period. One number cannot describe it.

Rules:

- Leave is normalised to **working days, assuming a 5-day week**. State this assumption in the table caption.
- Each row has a `primary` measure used for ranking (for example "weeks of leave") plus a short `detail` string for pay structure, and an optional `comparisonNote` for anything that changes how the number should be read (such as "can include bank holidays"). Notes are shown in the cell, not hidden.
- A `no_statutory_minimum` cell that ranks as zero must have a `comparisonNote` whenever practice differs from the law. For example, the Netherlands has no general statutory employer pension contribution, but many Dutch employees are in compulsory sector pension schemes. That cell's note must say so (checked against an official source), or a Reward Director will read "Least generous" as a mistake.
- Each category declares `rankable: boolean`. Categories whose structures are too different to rank fairly (for example sick pay) are shown without best or worst markers, with a note saying why.

### Best and worst markers

- "Best" means **most generous to the employee**. For the employer notice period, longer is more generous.
- Mark best and worst with an icon **and** visible text ("Most generous", "Least generous"), never colour alone.
- Only mark a row when it is `rankable`, has at least 2 rankable values, and the values are not all equal. Ties are all marked.
- `todo_verify` cells are never ranked. `no_statutory_minimum` cells rank as zero (the law guarantees nothing), but the cell always shows the "No legal minimum" text and its note, so a "Least generous" marker is never the only thing a reader sees.

## Features (MVP)

### 1. Country comparison

- Choose 2 to 4 countries with a fieldset of checkboxes, with validation and an error message if fewer than 2 are chosen.
- A real `<table>`: `<caption>` (including the 5-day week assumption), `<th scope="col">` per country, `<th scope="row">` per category.
- Every cell has a "Source" disclosure button that opens a popover (native `popover` attribute, or a disclosure with `aria-expanded`) containing the source link, the source's own wording and the `asOf` date. **Not a tooltip**: tooltips cannot hold links that keyboard and screen reader users can reach.
- Loading, empty and error states, with a retry button on error.

### 2. Company view (phase 2)

Parity is used by one company's Reward Director, so the main view shows **that company's package in each country, laid over the legal minimums**.

- **Companies are fictional and config-driven.** Each lives in one file in `src/mocks/fixtures/companies/` (name, industry, brand colours, countries with headcount, the package per country, and company-only benefits), validated like the benefits data and served by `GET /api/companies`. The UI always labels a company "fictional". Never use a real company's name or data.
- **Statutory categories:** the company figure is stored as `amount` + `unit` (the same source units as statutory rows) plus a plain-English `summary`, and normalised with the same code.
- **Company-only benefits** (private health insurance, wellbeing allowance, employee assistance programme): `provided` plus a `summary`. There is no legal minimum, so they are marked "Company benefit". Their figures are invented for the fictional company and labelled as such; statutory figures keep their official sources.
- **Gap calculation** is a pure function in `src/features/company/gap.ts` with unit tests. Rules by statutory `status`:
  - `verified`: compare the normalised company value with the minimum: "Above minimum", "Meets minimum" or "Below minimum (non-compliant)". No company figure is "No company figure".
  - `no_statutory_minimum`: any company value above zero is "Above minimum (no legal minimum)". Zero or none is "No legal minimum". It is never "Below minimum".
  - `todo_verify`: "Cannot compare: minimum not verified".
  - Categories with `comparable: false` (sick pay: pay structures differ) are "Not compared", with the reason shown.
- Gap markers use an icon **and** text, never colour alone. Ranking markers (most and least generous) are only shown in the "Legal minimums only" view.
- A **summary** above the table lists, per selected country, how many categories are below the minimum.
- A toggle switches between "Company view" (default) and "Legal minimums only" (the phase 1 table).
- Ask sends the company's figures for the selected countries with the statutory rows, and can cite either. Company row IDs are `${companyId}-${countryCode}-${category}`.

### 2b. What-if editing (phase 2)

- "What if" mode turns company figures into structured number inputs, one per comparable category per country, in the display unit. No free-text parsing.
- Gaps and the summary update as you type. "Reset to company package" restores the config.
- Edits are stored in Redux and saved to `localStorage` by a **debounced saga**. Storage access is wrapped in try/catch. The stored value has a version number and the company id, and is validated as `unknown` on load; anything invalid is discarded.

### 2c. Per-company branding (phase 2)

- A second fictional company with a different shape (for example 2 countries, a different package, its own colours).
- A company switcher in the top bar. Switching re-themes the workspace from the company config by setting the brand tokens.
- A unit test checks every company's colours against the contrast rules, so a config cannot make the page inaccessible.

### 3. Ask (AI assistant)

- A side panel with a labelled question box, suggested starter questions, and a streamed answer.
- The request carries the question plus the **currently selected countries and their data rows**. The assistant answers only from those rows and cites the row IDs it used. Cited rows show as chips under the answer: "Based on: United Kingdom maternity leave, Germany maternity leave".
- **Stop generating** button.
- Asking a new question while one is streaming cancels the old one (`takeLatest` + `AbortController`).
- **Cancel cleanup does two things:** abort the request, and call `reader.cancel()` on the stream reader **without awaiting it**. Under MSW, aborting does not stop a body that has already arrived, and `reader.cancel()` never settles. See ADR 0002.
- **Retry rule:** retry with exponential backoff (max 3 attempts, with jitter) on 5xx or network errors **only before the first chunk arrives**. After the first chunk, a failure is never retried automatically, because that would repeat or mix text. The partial answer stays visible, labelled "Answer interrupted", with a "Try again" button that re-asks from scratch. No retry on 4xx.
- The answer is rendered as plain text (or a tiny safe formatter for paragraphs and lists). Never `dangerouslySetInnerHTML`.
- UI states: idle, waiting (before the first chunk), streaming, done, stopped, interrupted, error (with retry), and no data (no countries selected).
- Starter questions, for example "Where is parental leave most generous?" and "Where would a 25-day annual leave policy fall below the minimum?"

### 4. Scenario switcher (dev and demo)

- A small floating panel, in dev and the mock-mode demo only, to switch MSW scenarios: **normal, slow (3s), server error (500), empty data, flaky (fails twice, then succeeds), and drops mid-stream** (sends some chunks, then errors).
- This is a deliberate showcase: an interviewer can watch the retry, interrupt and error handling happen live.
- The panel is keyboard accessible, labelled, and announces the active scenario.

## Citations are checked, not trusted

The model is asked to cite row IDs, but the proxy never passes its claims straight through.

- The system prompt asks the model to finish with a single block: `<sources>id-one,id-two</sources>`.
- The proxy streams text through a pure, unit-tested splitter (`api/lib/sourcesSplitter.ts`) that forwards text as `chunk` events and holds back any text from `<sources>` onwards. It keeps a small tail buffer so a tag split across two chunks is still caught.
- When the stream ends, the proxy parses the block and **keeps only row IDs that were in the request**. Unknown IDs are dropped (and counted in a server log line, without any request content). The kept IDs go out as one `sources` event.
- If the model gives no valid sources, the UI says "No sources cited" rather than showing nothing.
- The MSW mock streams the same event shapes. A **test-only** handler (`src/mocks/testHandlers.ts`, used with `server.use()` in tests, never in the switcher) cites an unknown row ID, so the client's rule of only showing chips for row IDs it sent is tested. It is not in the scenario switcher because the result (a chip that does not appear) is not visible in a demo.

## Architecture

```
src/
  app/
    store.ts            # configureStore, saga middleware, thunk: false
    rootSaga.ts         # all() of feature sagas
    hooks.ts            # typed useAppDispatch / useAppSelector
  features/
    countries/          # slice, sagas, selectors, components
    comparison/         # table, normalisation, ranking, selectors
    company/            # company view, gap calc, what-if and persistence saga
    ask/                # Ask slice, streaming saga, panel UI
  api/
    types.ts            # shared request/response and event types
    client.ts           # typed fetch wrapper, AbortSignal support, ApiError type
    sse.ts              # parse an SSE ReadableStream into an eventChannel
    retry.ts            # backoff helper used by sagas
  mocks/
    handlers.ts         # MSW handlers
    scenarios.ts        # scenario state + switcher
    browser.ts / node.ts
    fixtures/           # benefits.json, countries.json
  components/           # shared accessible primitives (Button, Popover, Checkbox, NumberInput, LiveRegion, ErrorSummary)
  styles/               # tokens.css, global.css
api/
  ask.ts                # serverless proxy to Anthropic (real mode only)
  _lib/                 # proxy helpers; the underscore stops Vercel treating them as functions
  lib/                  # validation, sourcesSplitter, rate limit
docs/
  decisions/            # ADRs
```

### Feature folder convention

Each feature has `slice.ts`, `sagas.ts`, `selectors.ts`, `types.ts`, `components/`, and `__tests__/`. Components never call `fetch`. They dispatch actions, and sagas do the I/O.

## Redux-Saga patterns to use

Use each pattern where it fits, with a short comment explaining _why_:

| Pattern                                                | Where                                                   |
| ------------------------------------------------------ | ------------------------------------------------------- |
| `takeLatest`                                           | Ask questions (a new question cancels the old one)      |
| `race` with a cancel action                            | "Stop generating" button                                |
| `cancelled()` in `finally` + `AbortController.abort()` | Close the fetch when a saga is cancelled                |
| `eventChannel`                                         | Turn the SSE stream into actions (`ask/chunkReceived`)  |
| Backoff loop with `delay`                              | 5xx and network failures, before the first chunk only   |
| `debounce`                                             | Saving the company package to `localStorage`            |
| `all` / `fork`                                         | Root saga composition and parallel data loading         |
| `select`                                               | Pull the selected countries' rows to send as AI context |

Action names follow `feature/eventName`, past tense for events: `ask/questionSubmitted`, `ask/firstChunkReceived`, `ask/streamCompleted`, `ask/streamInterrupted`, `ask/streamFailed`, `ask/stopRequested`.

## API contract (mocked by MSW, matched by the proxy)

```
GET  /api/countries                 -> Country[]
GET  /api/benefits?countries=GB,DE  -> BenefitRow[]
GET  /api/companies                 -> Company[]   (fictional companies, phase 2)
POST /api/ask                       -> text/event-stream
     body: { question: string, countries: CountryCode[], rows: BenefitRow[], company?: AskCompanyContext }
     events: { type: "chunk", text }
           | { type: "sources", rowIds: string[] }
           | { type: "done" }
           | { type: "error", message }
```

Define these types once in `src/api/types.ts` and share them between the client, the MSW handlers and the proxy.

## AI proxy rules (`api/ask.ts`, helpers in `api/_lib/`)

- Read `ANTHROPIC_API_KEY` and `ANTHROPIC_MODEL` from env. Fail with a clear 500 (without naming the variable's value) if either is missing.
- System prompt: answer only from the supplied rows, say plainly when the data does not cover the question, keep answers short, and end with the `<sources>` block.
- Validate the request body: country codes in the allow-list, question at most 500 characters, row count capped, and every row's shape checked. Reject anything else with a 400.
- Treat the question as untrusted. The model only ever sees rows the server validated, and its output is rendered as plain text, so a prompt injection can at worst produce a wrong answer, not run code or leak a key. Note this in the README.
- Stream back using the event shapes above. Never forward raw Anthropic errors to the client.
- A per-IP rate limit is in place, but it is in memory, so on serverless each instance counts separately. Say so in the README; it is a demo guard, not real protection.

## Accessibility (WCAG 2.2 AA, non-negotiable)

- Semantic HTML first: native `<button>`, `<input>`, `<fieldset>`, `<legend>`, `<table>`.
- Every input has a visible `<label>`. Placeholders are never the only label.
- Forms use an error summary at the top (GOV.UK pattern) linked to each invalid field, plus inline errors.
- Streaming answers go into an `aria-live="polite"` region that announces "Answer started", then "Answer complete", "Generation stopped" or "Answer interrupted", rather than every token. The full answer is readable in the panel.
- Best, worst and gap markers always use icon plus text, never colour alone. Text contrast at least 4.5:1.
- Full keyboard support, visible focus styles, no keyboard traps. The popover closes on Escape and returns focus to its button.
- Respect `prefers-reduced-motion`.
- Every component test that renders UI also runs an axe check, and every Playwright flow runs an axe scan.

## Security (shift-left)

- A Content Security Policy in `vercel.json`: no inline scripts, `connect-src 'self'`, and **`worker-src 'self'`**, because the public demo runs on MSW's service worker (`public/mockServiceWorker.js`). Without it the demo works locally and breaks only in production, so a Playwright test against the production build checks that the worker registers and a mocked request succeeds.
- No `dangerouslySetInnerHTML` anywhere (enforced by an ESLint rule).
- `npm audit --audit-level=high` runs in CI.
- CI fails if the production build contains `ANTHROPIC_API_KEY` or `sk-ant-`.
- `localStorage` data is validated on load and holds only the company package figures, nothing personal.

## Testing expectations

- **Saga tests** (`expectSaga` with static providers): happy path, cancel via a new question, cancel via stop, retry then success, retries exhausted, 4xx with no retry, and a failure after the first chunk (interrupted, no retry).
- **Proxy unit tests (phase 2):** request validation, the sources splitter (tag split across chunks, no tag, unknown IDs dropped), and error mapping.
- **Integration tests** (RTL + MSW in Node): render the app, select countries, ask a question, and assert the streamed text plus the source chips. Repeat for each scenario.
- **Unit tests:** normalisation, ranking (ties, `todo_verify` cells, `no_statutory_minimum` cells ranking as zero, non-rankable categories), gap calculation for all three statuses, and storage validation.
- **E2E (Playwright):** compare countries; ask then stop; error then retry (phase 1); the company package overlay (phase 2).
- Streaming in the test environment was checked in milestone 1 (jsdom, ADR 0002). Fetch test URLs as absolute URLs built from `window.location.origin`, because Node's `fetch` does not resolve relative URLs.
- Aim for meaningful coverage of sagas and utils. Don't chase a coverage number with trivial tests.

## CI (GitHub Actions)

- **Phase 1:** on every push and pull request: typecheck, lint, unit and integration tests, build, `npm audit`, and Playwright with axe (including the production-build service worker check). Show the status badge in the README.
- **Phase 2 adds:** the bundle secret check (once real mode exists) and Lighthouse CI budgets (LCP under 2.5s, CLS under 0.1, TBT under 200ms, accessibility score 100).

## Architecture decision records

Write short ADRs in `docs/decisions/` as decisions are made. Each is one page at most: context, options, decision, consequences.

- **Phase 1** (write each one in the milestone where the decision is made):
  1. Redux-Saga for async flows (why not thunks or RTK Query for a streaming, cancellable workflow). Milestone 1.
  2. Test environment for MSW streaming. Milestone 1 (done: jsdom).
  3. Normalising statutory data (the 5-day week assumption, rankable categories, the three statuses). Milestone 2 (done).
  4. Retry only before the first chunk. Milestone 4 (done).
- **Phase 2:**
  - ADR 0005: Workspace layout and visual identity (done).
  - ADR 0006: Company view and gap rules. Milestone 6 (done).
  - ADR 0007: Real AI mode and checking citations in the proxy. Milestone 7 (done).
  - ADR 0008: Per-company branding from config. Milestone 9 (done).

## Milestones

The work is split in two phases. **Phase 1 is enough to apply with and talk through in an interview.** Do not start phase 2 until phase 1 is deployed and its README is written.

### Phase 1: interview-ready

1. **Scaffold:** RsBuild, React, TS strict, ESLint/Prettier, Vitest, MSW for browser and Node (including a streamed response test), the store with saga middleware and thunk off, and phase 1 CI. _Done when:_ the app renders, one sample test passes, CI is green.
2. **Data and comparison table:** fixtures with sources and the three statuses, the countries and benefits slices and sagas, the accessible table with source popovers, normalisation and ranking. _Done when:_ you can compare 2 to 4 countries, every cell shows its source or status, and tests plus axe pass.
3. **Scenarios and resilience:** the scenario switcher, the backoff helper, and error and empty states for data loading. _Done when:_ every scenario behaves correctly and is covered by integration tests.
4. **Ask (mock streaming):** the SSE parser, `eventChannel`, `takeLatest`, stop, the retry rule, source chips (the client only shows chips for row IDs it sent) and the live region. _Done when:_ all the saga tests listed above pass.
5. **Ship phase 1:** check ADRs 1 to 4 are written, the CSP, deploy the mock-mode demo, Playwright flows for compare countries, ask then stop, and error then retry, and a README covering what is built and what is planned.

### Phase 2: a company's Reward Director

Inspired by feedback that the tool should be about one company's package, not abstract minimums. Built in this order:

Milestones 6 to 9 are done; 10 remains.

6. **Company view:** the company data model and API, gap logic, the company table with summary and view toggle, company-only benefits, and Ask over company data. ADR on the company data model and gap rules.
7. **Real mode:** the serverless proxy with validation, the sources splitter and citation check (statutory and company row IDs), rate limiting, the env-based switch, and the bundle secret check in CI.
8. **What-if editing:** structured inputs, live gaps, and debounced, validated persistence.
9. **Per-company branding:** a second fictional company, the switcher, theming from config, and the contrast test. ADR on config-driven branding.
10. **Polish:** Lighthouse budgets in CI, Playwright flows for the company view and what-if, and a 60 to 90 second demo video.

Work one milestone at a time. At the end of each, summarise what changed and anything left as TODO.

## Conventions

- TypeScript `strict`, no `any`. Use `unknown` and narrow it.
- Named exports only, except where a tool needs a default export.
- Selectors that derive data are memoised with `createSelector`.
- Keep components small and presentational. Logic lives in sagas, selectors and pure utils.
- Commit messages: imperative mood, scoped (`feat(ask): cancel stream on new question`). No AI attribution: no `Co-Authored-By` trailer for Claude and no "Generated with" footer.
- Don't add a dependency without saying why in the commit message.

## Writing style for README, comments, UI copy and commits

- Plain British English.
- **Never use em dashes.** Use commas, colons, full stops or brackets.
- The README covers: what it is and why it was built, the stack, how to run both modes, the saga patterns and why, how to try the scenario switcher, how citations are checked, the testing approach, accessibility and security notes, the ADRs, known limitations, and a short section on **how AI tools were used to build it** (this file, review loops, and places where AI suggestions were rejected and why).
