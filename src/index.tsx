import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { readApiMode, type ApiMode } from './app/apiMode';
import { makeStore } from './app/store';
import { App } from './App';
// Self-hosted, so the Content Security Policy can stay at font-src 'self'.
import '@fontsource-variable/ibm-plex-sans';
import './styles/tokens.css';
import './styles/global.css';

/**
 * Starts MSW. In mock mode it serves every /api call. In real mode it still
 * serves the static data (countries, benefits, companies), but lets
 * /api/ask through to the serverless proxy, which calls the real model.
 */
async function startMockApi(apiMode: ApiMode) {
  // Dynamic imports keep MSW out of the main bundle.
  const [{ worker }, { http, passthrough }] = await Promise.all([
    import('./mocks/browser'),
    import('msw'),
  ]);
  if (apiMode === 'real') {
    worker.use(http.post('*/api/ask', () => passthrough()));
  }
  await worker.start({ onUnhandledRequest: 'bypass', quiet: true });
}

async function main() {
  const apiMode = readApiMode(import.meta.env.PUBLIC_API_MODE);

  // If the mock fails to start (for example, a browser that blocks service
  // workers), still render: data requests will then fail and show their error states.
  try {
    await startMockApi(apiMode);
  } catch (error) {
    console.error('Parity: the demo data service could not start.', error);
  }

  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error('Root element #root is missing from index.html');
  }

  const { store } = makeStore({ apiMode });

  createRoot(rootElement).render(
    <StrictMode>
      <Provider store={store}>
        <App />
      </Provider>
    </StrictMode>,
  );
}

void main();
