import { configureStore } from '@reduxjs/toolkit';
import dataReducer, { type DataState, initialDataState } from '../features/data/dataSlice';
import uiReducer from '../features/ui/uiSlice';
import { loadDraft, saveDraft } from '../storage/localDraft';

/** Start from the recoverable local draft if there is one, otherwise empty. */
const preloadedData = (): DataState => {
  const draft = loadDraft();
  if (draft) return { ...initialDataState, ...draft.state };
  return initialDataState;
};

export const store = configureStore({
  reducer: {
    data: dataReducer,
    ui: uiReducer,
  },
  preloadedState: { data: preloadedData() },
});

/* Persist a recoverable draft (debounced). Excel remains the source of truth. */
let timer: ReturnType<typeof setTimeout> | undefined;
let last = store.getState().data;
store.subscribe(() => {
  const current = store.getState().data;
  if (current === last) return;
  last = current;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => saveDraft(current), 300);
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
