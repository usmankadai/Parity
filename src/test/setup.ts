import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest';
import { server } from '../mocks/node';
import { setScenario, setStreamDelayMs } from '../mocks/scenarios';

// Any request without a handler fails the test, so tests never reach a real API.
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

// Stream mock answers without pauses. Tests that need time to press Stop slow it down.
beforeEach(() => {
  setStreamDelayMs(0);
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
