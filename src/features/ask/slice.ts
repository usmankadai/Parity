import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { RetryProgress } from '../countries/slice';

/**
 * - idle: nothing asked yet
 * - waiting: asked, no text yet (retries can happen here)
 * - streaming: text is arriving
 * - done: the answer finished
 * - stopped: the user pressed "Stop generating"
 * - interrupted: the stream failed after text had arrived (never retried)
 * - error: the request failed before any text arrived
 */
export type AskStatus =
  'idle' | 'waiting' | 'streaming' | 'done' | 'stopped' | 'interrupted' | 'error';

export interface AskState {
  question: string;
  answer: string;
  status: AskStatus;
  /** Cited row IDs, already checked against the rows that were sent. */
  sourceRowIds: string[];
  /** True once a sources event arrives, so "no sources" can be told apart from "not yet". */
  sourcesReceived: boolean;
  error: string | null;
  retry: RetryProgress | null;
}

const initialState: AskState = {
  question: '',
  answer: '',
  status: 'idle',
  sourceRowIds: [],
  sourcesReceived: false,
  error: null,
  retry: null,
};

export const askSlice = createSlice({
  name: 'ask',
  initialState,
  reducers: {
    questionSubmitted(state, action: PayloadAction<string>) {
      return { ...initialState, question: action.payload, status: 'waiting' };
    },
    retrying(state, action: PayloadAction<RetryProgress>) {
      state.retry = action.payload;
    },
    firstChunkReceived(state) {
      state.status = 'streaming';
      state.retry = null;
    },
    chunkReceived(state, action: PayloadAction<string>) {
      state.answer += action.payload;
    },
    sourcesReceived(state, action: PayloadAction<string[]>) {
      state.sourceRowIds = action.payload;
      state.sourcesReceived = true;
    },
    streamCompleted(state) {
      state.status = 'done';
    },
    /** The user asked to stop. The saga reacts; generationStopped records the result. */
    stopRequested() {},
    generationStopped(state) {
      state.status = 'stopped';
      state.retry = null;
    },
    streamInterrupted(state, action: PayloadAction<string>) {
      state.status = 'interrupted';
      state.error = action.payload;
    },
    streamFailed(state, action: PayloadAction<string>) {
      state.status = 'error';
      state.error = action.payload;
      state.retry = null;
    },
  },
});

export const askActions = askSlice.actions;
