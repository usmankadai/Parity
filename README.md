# Parity

Compare statutory employee benefits across the United Kingdom, Ireland, Germany and the Netherlands, check your own package against them, and ask questions answered only from the data on screen.

> Independent portfolio project, inspired by reward comparison tools. Not affiliated with or endorsed by Benifex. Illustrative data, not legal or HR advice.

**Status:** milestone 1 of phase 1 (scaffold). The full README arrives at the end of phase 1.

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
