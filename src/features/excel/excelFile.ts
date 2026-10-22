/**
 * Direct read/write access to the user's own .xlsx file using the File System
 * Access API (Chrome, Edge and other Chromium browsers on desktop). The user
 * picks the file once; the handle is kept in IndexedDB so the connection survives
 * a reload (the browser asks for permission again after a restart).
 */

/* ---- Minimal typings for the File System Access API ---- */
type PermissionState = 'granted' | 'denied' | 'prompt';
interface FSPermissionDescriptor {
  mode?: 'read' | 'readwrite';
}
export interface ExcelFileHandle {
  readonly kind: 'file';
  readonly name: string;
  getFile(): Promise<File>;
  createWritable(): Promise<{ write(data: Blob | ArrayBuffer): Promise<void>; close(): Promise<void> }>;
  queryPermission(desc?: FSPermissionDescriptor): Promise<PermissionState>;
  requestPermission(desc?: FSPermissionDescriptor): Promise<PermissionState>;
}
interface PickerOptions {
  multiple?: boolean;
  excludeAcceptAllOption?: boolean;
  types?: { description: string; accept: Record<string, string[]> }[];
  suggestedName?: string;
}
declare global {
  interface Window {
    showOpenFilePicker?: (options?: PickerOptions) => Promise<ExcelFileHandle[]>;
    showSaveFilePicker?: (options?: PickerOptions) => Promise<ExcelFileHandle>;
  }
}

export const isFileAccessSupported = (): boolean =>
  typeof window !== 'undefined' && typeof window.showOpenFilePicker === 'function' && window.isSecureContext;

const XLSX_TYPE = {
  description: 'Excel workbook',
  accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] },
};

export class ExcelFileError extends Error {}

/** Opens the native file picker. Returns null if the user cancelled. */
export const pickExcelFile = async (): Promise<ExcelFileHandle | null> => {
  if (!window.showOpenFilePicker) throw new ExcelFileError('This browser cannot connect to files directly. Use Chrome or Edge, or import/export manually.');
  try {
    const [handle] = await window.showOpenFilePicker({ multiple: false, excludeAcceptAllOption: true, types: [XLSX_TYPE] });
    return handle ?? null;
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') return null;
    throw e;
  }
};

/** Creates a brand-new workbook file on disk (used when starting from scratch). */
export const createExcelFile = async (suggestedName = 'MyMoney.xlsx'): Promise<ExcelFileHandle | null> => {
  if (!window.showSaveFilePicker) throw new ExcelFileError('This browser cannot create files directly. Use Chrome or Edge.');
  try {
    return await window.showSaveFilePicker({ suggestedName, excludeAcceptAllOption: true, types: [XLSX_TYPE] });
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') return null;
    throw e;
  }
};

export const ensureWritePermission = async (handle: ExcelFileHandle, request: boolean): Promise<boolean> => {
  const desc: FSPermissionDescriptor = { mode: 'readwrite' };
  if ((await handle.queryPermission(desc)) === 'granted') return true;
  if (!request) return false;
  return (await handle.requestPermission(desc)) === 'granted';
};

export const readExcelFile = async (handle: ExcelFileHandle): Promise<{ buffer: ArrayBuffer; lastModified: number }> => {
  const file = await handle.getFile();
  return { buffer: await file.arrayBuffer(), lastModified: file.lastModified };
};

export const writeExcelFile = async (handle: ExcelFileHandle, blob: Blob): Promise<void> => {
  try {
    const writable = await handle.createWritable();
    await writable.write(blob);
    await writable.close();
  } catch (e) {
    if (e instanceof DOMException && (e.name === 'NoModificationAllowedError' || e.name === 'InvalidStateError')) {
      throw new ExcelFileError(`Could not write to ${handle.name}. If it is open in Excel, close it and try again.`);
    }
    if (e instanceof DOMException && e.name === 'NotAllowedError') {
      throw new ExcelFileError('Permission to write the file was denied. Click "Reconnect" to grant it again.');
    }
    throw e;
  }
};

/* ---- Persist the handle across reloads (IndexedDB can store handles, localStorage cannot) ---- */
const DB = 'mymoney-files';
const STORE = 'handles';
const KEY = 'excel';

const openDb = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

export const saveHandle = async (handle: ExcelFileHandle): Promise<void> => {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(handle, KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    /* non-fatal: the connection just will not survive a reload */
  }
};

export const loadHandle = async (): Promise<ExcelFileHandle | null> => {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(KEY);
      req.onsuccess = () => resolve((req.result as ExcelFileHandle | undefined) ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
};

export const clearHandle = async (): Promise<void> => {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    /* ignore */
  }
};

/* ---- The live handle lives in module scope (it is not serialisable for Redux) ---- */
let current: ExcelFileHandle | null = null;
export const setCurrentHandle = (h: ExcelFileHandle | null) => {
  current = h;
};
export const getCurrentHandle = () => current;
