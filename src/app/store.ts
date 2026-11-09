import { combineReducers, configureStore } from '@reduxjs/toolkit';
import createSagaMiddleware from 'redux-saga';
import type { ApiMode } from './apiMode';
import { comparisonSlice } from '../features/comparison/slice';
import { countriesSlice } from '../features/countries/slice';
import { appSlice } from './appSlice';
import { rootSaga } from './rootSaga';

export const rootReducer = combineReducers({
  [appSlice.name]: appSlice.reducer,
  [countriesSlice.name]: countriesSlice.reducer,
  [comparisonSlice.name]: comparisonSlice.reducer,
});

export type RootState = ReturnType<typeof rootReducer>;

interface MakeStoreOptions {
  apiMode?: ApiMode;
  preloadedState?: Partial<RootState>;
}

/**
 * Builds a fresh store. Tests call this to get an isolated store per test.
 *
 * Thunks are turned off on purpose: every side effect goes through a saga,
 * so there is one place to look for async behaviour, cancellation and retries.
 */
export function makeStore({ apiMode = 'mock', preloadedState }: MakeStoreOptions = {}) {
  const sagaMiddleware = createSagaMiddleware();

  const store = configureStore({
    reducer: rootReducer,
    preloadedState: { app: { apiMode }, ...preloadedState },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({ thunk: false }).concat(sagaMiddleware),
  });

  const rootTask = sagaMiddleware.run(rootSaga);

  return { store, rootTask };
}

export type AppStore = ReturnType<typeof makeStore>['store'];
export type AppDispatch = AppStore['dispatch'];
