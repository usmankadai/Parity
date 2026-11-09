# Parity

[![CI](https://github.com/usmankadai/Parity/actions/workflows/ci.yml/badge.svg)](https://github.com/usmankadai/Parity/actions/workflows/ci.yml)

Compare statutory employee benefits across the United Kingdom, Ireland, Germany and the Netherlands, check your own package against them, and ask questions answered only from the data on screen.

> Independent portfolio project, inspired by reward comparison tools. Not affiliated with or endorsed by Benifex. Illustrative data, not legal or HR advice.

**Status:** milestone 3 of phase 1 (scenarios and resilience). The full README arrives at the end of phase 1.

## The data

Every figure comes from an official source (GOV.UK, Citizens Information, gesetze-im-internet.de, the German Federal Ministry of the Interior, Business.gov.nl) and links to it in the table. The data was last checked on **9 November 2026**.

Each figure is stored as the source states it and converted in code (see [ADR 0003](docs/decisions/0003-normalising-statutory-data.md)). Where the law sets no minimum, the table says "No legal minimum" and explains what applies instead, rather than showing a gap.

## Try the failure handling

In the demo, the **Demo scenarios** button (bottom right) changes how the mock API responds:

| Scenario         | What you should see                                                     |
| ---------------- | ----------------------------------------------------------------------- |
| Normal           | Data loads straight away.                                               |
| Slow             | A loading message for 3 seconds.                                        |
| Server error     | "Trying again (attempt 2 of 3)", then an error with a Try again button. |
| Empty data       | A clear "no data" message instead of an empty table.                    |
| Flaky            | Two failures, then the retries recover on their own.                    |
| Drops mid-stream | For the Ask feature (milestone 4). Other data loads normally.           |

Pick a scenario, then press Compare (or "Reload countries"). The choice is remembered, so reloading the page shows how the country list behaves too.

Retries cover network errors and 5xx responses only, up to 3 attempts, with exponential backoff and jitter. A 4xx error, or a response in the wrong shape, is never retried.

## Stack

React 19, TypeScript (strict), Redux Toolkit with Redux-Saga (thunks off), RsBuild, MSW, CSS Modules, Vitest with React Testing Library and axe-core, ESLint and Prettier.

## Running it

Requires Node 22.12 or later (see `.nvmrc`).

```bash
npm install
npm run dev          # mock mode: every /api call is served by MSW
npm run test
npm run typecheck
npm run lint
npm run build
```

Real mode (`PUBLIC_API_MODE=real`) arrives in phase 2.

## Decisions

- [ADR 0001: Redux-Saga for async flows](docs/decisions/0001-redux-saga-for-async-flows.md)
- [ADR 0002: Test environment for MSW streaming](docs/decisions/0002-test-environment-for-msw-streaming.md)
- [ADR 0003: Normalising statutory data](docs/decisions/0003-normalising-statutory-data.md)
