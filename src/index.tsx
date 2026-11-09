import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { readApiMode } from './app/apiMode';
import { makeStore } from './app/store';
import { App } from './App';
import './styles/tokens.css';
import './styles/global.css';

async function startMockApi() {
  // A dynamic import keeps MSW out of the main bundle.
  const { worker } = await import('./mocks/browser');
  await worker.start({ onUnhandledRequest: 'bypass', quiet: true });
}

async function main() {
  const apiMode = readApiMode(import.meta.env.PUBLIC_API_MODE);

  // In real mode MSW is never started, so every request reaches the real endpoints.
  // If the mock fails to start (for example, a browser that blocks service
  // workers), still render: data requests will then fail and show their error states.
  if (apiMode === 'mock') {
    try {
      await startMockApi();
    } catch (error) {
      console.error('Parity: the demo data service could not start.', error);
    }
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
