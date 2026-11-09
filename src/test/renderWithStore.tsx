import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { Provider } from 'react-redux';
import { makeStore } from '../app/store';

type StoreOptions = Parameters<typeof makeStore>[0];

/** Renders UI with a fresh store, and returns the store so tests can inspect state. */
export function renderWithStore(ui: ReactElement, options?: StoreOptions) {
  const { store } = makeStore(options);
  return { store, ...render(<Provider store={store}>{ui}</Provider>) };
}
