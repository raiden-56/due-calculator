import { useCallback, useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { selectDataset, selectMeta } from '../../app/selectors';
import { nowISO } from '../../utils/dates';
import { markExported, replaceDataset } from '../data/dataSlice';
import { setConnectedFile, showSnackbar } from '../ui/uiSlice';
import { buildWorkbook, workbookToBlob } from './excelExport';
import {
  clearHandle,
  createExcelFile,
  ensureWritePermission,
  type ExcelFileHandle,
  getCurrentHandle,
  isFileAccessSupported,
  loadHandle,
  pickExcelFile,
  readExcelFile,
  saveHandle,
  setCurrentHandle,
  writeExcelFile,
} from './excelFile';
import { parseWorkbook } from './excelImport';

const errMsg = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong.');

/**
 * Keeps the app in sync with the user's own .xlsx file.
 *  - connect(): pick the workbook, load it, remember it.
 *  - createNew(): create an empty workbook on disk and connect to it.
 *  - save(): write the current data into the connected file.
 *  - With autoSave on, every change is written ~1s after it happens.
 * Pass { autoload, autosave } only from the app shell so the effects run once.
 */
export const useConnectedExcel = (opts?: { autoload?: boolean; autosave?: boolean }) => {
  const dispatch = useAppDispatch();
  const meta = useAppSelector(selectMeta);
  const dataset = useAppSelector(selectDataset);
  const year = useAppSelector((s) => s.ui.period.year);
  const file = useAppSelector((s) => s.ui.connectedFile);
  const ran = useRef(false);
  const saving = useRef(false);

  const loadFromHandle = useCallback(
    async (handle: ExcelFileHandle, force: boolean) => {
      if (!force && meta.dirty) {
        setCurrentHandle(handle);
        dispatch(
          setConnectedFile({
            status: 'conflict',
            name: handle.name,
            message: 'You have changes that were not saved to the file. Load the file (discarding them) or save your changes into it?',
          }),
        );
        return;
      }
      dispatch(setConnectedFile({ status: 'loading', name: handle.name, message: undefined }));
      const { buffer } = await readExcelFile(handle);
      const result = parseWorkbook(buffer);
      const total = result.counts.people + result.counts.records + result.counts.payments + result.counts.cashbacks;
      if (result.errors.length > 0 && total === 0 && result.sheetsFound.length > 0 && !result.sheetsFound.some((s) => /people|money records|payments/i.test(s))) {
        throw new Error(`${handle.name} does not look like a MyMoney workbook. Start from the template.`);
      }
      setCurrentHandle(handle);
      await saveHandle(handle);
      dispatch(replaceDataset({ dataset: result.dataset, source: 'imported', fileName: handle.name }));
      dispatch(
        setConnectedFile({
          status: 'connected',
          name: handle.name,
          lastLoadedAt: nowISO(),
          message: result.errors.length ? `${result.errors.length} invalid row(s) in the file were skipped.` : undefined,
        }),
      );
      dispatch(
        showSnackbar({
          message: `Connected to ${handle.name} — ${result.counts.records} records, ${result.counts.payments} payments`,
          severity: result.errors.length ? 'warning' : 'success',
        }),
      );
    },
    [dispatch, meta.dirty],
  );

  const connect = useCallback(async () => {
    try {
      const handle = await pickExcelFile();
      if (!handle) return;
      if (!(await ensureWritePermission(handle, true))) {
        dispatch(setConnectedFile({ status: 'error', name: handle.name, message: 'Write permission was not granted.' }));
        return;
      }
      await loadFromHandle(handle, false);
    } catch (e) {
      dispatch(setConnectedFile({ status: 'error', message: errMsg(e) }));
    }
  }, [dispatch, loadFromHandle]);

  const save = useCallback(
    async (silent = false) => {
      const handle = getCurrentHandle();
      if (!handle || saving.current) return false;
      saving.current = true;
      dispatch(setConnectedFile({ status: 'saving', message: undefined }));
      try {
        if (!(await ensureWritePermission(handle, !silent))) {
          dispatch(setConnectedFile({ status: 'needs-permission', message: 'Click Reconnect to allow saving to the file.' }));
          return false;
        }
        await writeExcelFile(handle, workbookToBlob(buildWorkbook(dataset, { year })));
        dispatch(markExported({ fileName: handle.name }));
        dispatch(setConnectedFile({ status: 'connected', name: handle.name, lastSavedAt: nowISO() }));
        if (!silent) dispatch(showSnackbar({ message: `Saved to ${handle.name}` }));
        return true;
      } catch (e) {
        dispatch(setConnectedFile({ status: 'error', name: handle.name, message: errMsg(e) }));
        dispatch(showSnackbar({ message: errMsg(e), severity: 'error' }));
        return false;
      } finally {
        saving.current = false;
      }
    },
    [dataset, dispatch, year],
  );

  const createNew = useCallback(async () => {
    try {
      const handle = await createExcelFile();
      if (!handle) return;
      setCurrentHandle(handle);
      await saveHandle(handle);
      await writeExcelFile(handle, workbookToBlob(buildWorkbook(dataset, { year })));
      dispatch(markExported({ fileName: handle.name }));
      dispatch(setConnectedFile({ status: 'connected', name: handle.name, lastSavedAt: nowISO(), message: undefined }));
      dispatch(showSnackbar({ message: `Created ${handle.name} and connected to it` }));
    } catch (e) {
      dispatch(setConnectedFile({ status: 'error', message: errMsg(e) }));
    }
  }, [dataset, dispatch, year]);

  /** Re-grant permission after a browser restart (needs a click). */
  const reconnect = useCallback(async () => {
    const handle = getCurrentHandle() ?? (await loadHandle());
    if (!handle) return;
    try {
      if (!(await ensureWritePermission(handle, true))) {
        dispatch(setConnectedFile({ status: 'needs-permission', name: handle.name, message: 'Permission was not granted.' }));
        return;
      }
      if (meta.dirty) {
        // The draft holds unsaved edits: keep them and push them into the file.
        setCurrentHandle(handle);
        dispatch(setConnectedFile({ status: 'connected', name: handle.name, message: undefined }));
        await save(false);
      } else {
        await loadFromHandle(handle, true);
      }
    } catch (e) {
      dispatch(setConnectedFile({ status: 'error', name: handle.name, message: errMsg(e) }));
    }
  }, [dispatch, loadFromHandle, meta.dirty, save]);

  const resolveConflict = useCallback(
    async (choice: 'load-file' | 'save-mine') => {
      const handle = getCurrentHandle();
      if (!handle) return;
      try {
        if (choice === 'load-file') await loadFromHandle(handle, true);
        else {
          dispatch(setConnectedFile({ status: 'connected', name: handle.name, message: undefined }));
          await save(false);
        }
      } catch (e) {
        dispatch(setConnectedFile({ status: 'error', name: handle.name, message: errMsg(e) }));
      }
    },
    [dispatch, loadFromHandle, save],
  );

  const disconnect = useCallback(async () => {
    setCurrentHandle(null);
    await clearHandle();
    dispatch(setConnectedFile({ status: 'none', name: undefined, message: undefined, lastSavedAt: undefined, lastLoadedAt: undefined }));
    dispatch(showSnackbar({ message: 'Disconnected from the Excel file. Your data stays in the app.', severity: 'info' }));
  }, [dispatch]);

  /* Startup: restore the remembered file. */
  useEffect(() => {
    if (!opts?.autoload || ran.current || !isFileAccessSupported()) return;
    ran.current = true;
    (async () => {
      const handle = await loadHandle();
      if (!handle) return;
      setCurrentHandle(handle);
      try {
        if (await ensureWritePermission(handle, false)) await loadFromHandle(handle, false);
        else dispatch(setConnectedFile({ status: 'needs-permission', name: handle.name, message: 'Click Reconnect to continue saving to this file.' }));
      } catch (e) {
        dispatch(setConnectedFile({ status: 'error', name: handle.name, message: errMsg(e) }));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts?.autoload]);

  /* Auto-save: write ~1s after the last change. */
  useEffect(() => {
    if (!opts?.autosave || !file.autoSave || file.status !== 'connected' || !meta.dirty) return;
    const t = setTimeout(() => void save(true), 1000);
    return () => clearTimeout(t);
  }, [opts?.autosave, file.autoSave, file.status, meta.dirty, dataset, save]);

  return { file, supported: isFileAccessSupported(), connect, createNew, save, reconnect, resolveConflict, disconnect };
};
