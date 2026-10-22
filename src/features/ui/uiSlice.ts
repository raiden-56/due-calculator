import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { currentMonth, currentYear } from '../../utils/dates';

export type ThemeMode = 'light' | 'dark';

export interface SnackbarState {
  open: boolean;
  message: string;
  severity: 'success' | 'info' | 'warning' | 'error';
}

export interface Period {
  year: number;
  /** null means the whole year */
  month: number | null;
}

export interface DialogPrefill {
  personId?: string;
  recordId?: string;
}

export interface UiState {
  themeMode: ThemeMode;
  sidebarCollapsed: boolean;
  mobileNavOpen: boolean;
  period: Period;
  snackbar: SnackbarState;
  recordDialog: { open: boolean; editId?: string; prefill?: DialogPrefill };
  paymentDialog: { open: boolean; editId?: string; prefill?: DialogPrefill };
  cashbackDialog: { open: boolean; editId?: string; prefill?: DialogPrefill };
  personDialog: { open: boolean; editId?: string };
  importDialogOpen: boolean;
  globalSearch: string;
  /** Status of the workbook linked via src/config/excelSource.ts */
  linkedSheet: {
    status: 'idle' | 'loading' | 'loaded' | 'error' | 'conflict';
    message?: string;
    loadedAt?: string;
  };
  /** The user's own .xlsx file connected through the File System Access API. */
  connectedFile: {
    status: 'none' | 'loading' | 'connected' | 'needs-permission' | 'conflict' | 'saving' | 'error';
    name?: string;
    message?: string;
    lastSavedAt?: string;
    lastLoadedAt?: string;
    autoSave: boolean;
  };
}

const readStoredTheme = (): ThemeMode => {
  try {
    const stored = localStorage.getItem('mymoney.theme');
    if (stored === 'dark' || stored === 'light') return stored;
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches) return 'dark';
  } catch {
    /* ignore */
  }
  return 'light';
};

const readStoredAutoSave = (): boolean => {
  try {
    return localStorage.getItem('mymoney.autosave') !== 'off';
  } catch {
    return true;
  }
};

const initialState: UiState = {
  themeMode: readStoredTheme(),
  sidebarCollapsed: false,
  mobileNavOpen: false,
  period: { year: currentYear(), month: currentMonth() },
  snackbar: { open: false, message: '', severity: 'info' },
  recordDialog: { open: false },
  paymentDialog: { open: false },
  cashbackDialog: { open: false },
  personDialog: { open: false },
  importDialogOpen: false,
  globalSearch: '',
  linkedSheet: { status: 'idle' },
  connectedFile: { status: 'none', autoSave: readStoredAutoSave() },
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleTheme(state) {
      state.themeMode = state.themeMode === 'light' ? 'dark' : 'light';
      try {
        localStorage.setItem('mymoney.theme', state.themeMode);
      } catch {
        /* ignore */
      }
    },
    toggleSidebar(state) {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
    setMobileNav(state, action: PayloadAction<boolean>) {
      state.mobileNavOpen = action.payload;
    },
    setPeriod(state, action: PayloadAction<Partial<Period>>) {
      state.period = { ...state.period, ...action.payload };
    },
    showSnackbar(state, action: PayloadAction<{ message: string; severity?: SnackbarState['severity'] }>) {
      state.snackbar = { open: true, message: action.payload.message, severity: action.payload.severity ?? 'success' };
    },
    hideSnackbar(state) {
      state.snackbar.open = false;
    },
    openRecordDialog(state, action: PayloadAction<{ editId?: string; prefill?: DialogPrefill } | undefined>) {
      state.recordDialog = { open: true, editId: action.payload?.editId, prefill: action.payload?.prefill };
    },
    closeRecordDialog(state) {
      state.recordDialog = { open: false };
    },
    openPaymentDialog(state, action: PayloadAction<{ editId?: string; prefill?: DialogPrefill } | undefined>) {
      state.paymentDialog = { open: true, editId: action.payload?.editId, prefill: action.payload?.prefill };
    },
    closePaymentDialog(state) {
      state.paymentDialog = { open: false };
    },
    openCashbackDialog(state, action: PayloadAction<{ editId?: string; prefill?: DialogPrefill } | undefined>) {
      state.cashbackDialog = { open: true, editId: action.payload?.editId, prefill: action.payload?.prefill };
    },
    closeCashbackDialog(state) {
      state.cashbackDialog = { open: false };
    },
    openPersonDialog(state, action: PayloadAction<{ editId?: string } | undefined>) {
      state.personDialog = { open: true, editId: action.payload?.editId };
    },
    closePersonDialog(state) {
      state.personDialog = { open: false };
    },
    setImportDialogOpen(state, action: PayloadAction<boolean>) {
      state.importDialogOpen = action.payload;
    },
    setGlobalSearch(state, action: PayloadAction<string>) {
      state.globalSearch = action.payload;
    },
    setLinkedSheet(state, action: PayloadAction<UiState['linkedSheet']>) {
      state.linkedSheet = action.payload;
    },
    setConnectedFile(state, action: PayloadAction<Partial<UiState['connectedFile']>>) {
      state.connectedFile = { ...state.connectedFile, ...action.payload };
    },
    setAutoSave(state, action: PayloadAction<boolean>) {
      state.connectedFile.autoSave = action.payload;
      try {
        localStorage.setItem('mymoney.autosave', action.payload ? 'on' : 'off');
      } catch {
        /* ignore */
      }
    },
  },
});

export const {
  toggleTheme,
  toggleSidebar,
  setMobileNav,
  setPeriod,
  showSnackbar,
  hideSnackbar,
  openRecordDialog,
  closeRecordDialog,
  openPaymentDialog,
  closePaymentDialog,
  openCashbackDialog,
  closeCashbackDialog,
  openPersonDialog,
  closePersonDialog,
  setImportDialogOpen,
  setGlobalSearch,
  setLinkedSheet,
  setConnectedFile,
  setAutoSave,
} = uiSlice.actions;

export default uiSlice.reducer;
