import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { server } from '../mocks/node';
import { setScenario } from '../mocks/scenarios';

// Any request without a handler fails the test, so tests never reach a real API.
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

afterEach(() => {
  server.resetHandlers();
  setScenario('normal');
  window.localStorage.clear();
  cleanup();
});

afterAll(() => {
  server.close();
});
