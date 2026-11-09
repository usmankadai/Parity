import { createSlice } from '@reduxjs/toolkit';
import type { ApiMode } from './apiMode';

export interface AppState {
  apiMode: ApiMode;
}

const initialState: AppState = { apiMode: 'mock' };

export const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {},
});
