import type { DataState } from '../features/data/dataSlice';

const KEY = 'mymoney.draft.v1';

export interface DraftEnvelope {
  version: 1;
  savedAt: string;
  state: DataState;
}

export const loadDraft = (): DraftEnvelope | null => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DraftEnvelope;
    if (parsed?.version !== 1 || !parsed.state) return null;
    return parsed;
  } catch {
    return null;
  }
};

export const saveDraft = (state: DataState): string | null => {
  try {
    const env: DraftEnvelope = { version: 1, savedAt: new Date().toISOString(), state };
    localStorage.setItem(KEY, JSON.stringify(env));
    return env.savedAt;
  } catch {
    return null;
  }
};

export const clearDraft = (): void => {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
};

export const draftSizeBytes = (): number => {
  try {
    return new Blob([localStorage.getItem(KEY) ?? '']).size;
  } catch {
    return 0;
  }
};
