# Parity

[![CI](https://github.com/usmankadai/Parity/actions/workflows/ci.yml/badge.svg)](https://github.com/usmankadai/Parity/actions/workflows/ci.yml)

Compare statutory employee benefits across the United Kingdom, Ireland, Germany and the Netherlands, check your own package against them, and ask questions answered only from the data on screen.

> Independent portfolio project, inspired by reward comparison tools. Not affiliated with or endorsed by Benifex. Illustrative data, not legal or HR advice.

**Status:** milestone 2 of phase 1 (comparison table). The full README arrives at the end of phase 1.

## The data

Every figure comes from an official source (GOV.UK, Citizens Information, gesetze-im-internet.de, the German Federal Ministry of the Interior, Business.gov.nl) and links to it in the table. The data was last checked on **9 November 2026**.

Each figure is stored as the source states it and converted in code (see [ADR 0003](docs/decisions/0003-normalising-statutory-data.md)). Where the law sets no minimum, the table says "No legal minimum" and explains what applies instead, rather than showing a gap.

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
