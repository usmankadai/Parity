import type { RootState } from './store';

export const selectApiMode = (state: RootState) => state.app.apiMode;
