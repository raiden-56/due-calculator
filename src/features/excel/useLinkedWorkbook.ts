import { useCallback, useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { selectMeta } from '../../app/selectors';
import { LINKED_SHEET_CONFLICT } from '../../config/excelSource';
import { nowISO } from '../../utils/dates';
import { replaceDataset } from '../data/dataSlice';
import { setLinkedSheet, showSnackbar } from '../ui/uiSlice';
import { fetchLinkedWorkbook, isLinkedSheetConfigured, linkedSheetName } from './linkedWorkbook';

/**
 * Loads the workbook configured in src/config/excelSource.ts.
 * - `autoload` runs once on startup (used by AppShell).
 * - `reload` is exposed for the "Load from linked sheet" button.
 */
export const useLinkedWorkbook = (autoload = false) => {
  const dispatch = useAppDispatch();
  const meta = useAppSelector(selectMeta);
  const linked = useAppSelector((s) => s.ui.linkedSheet);
  const ran = useRef(false);

  const reload = useCallback(
    async (force = false) => {
      if (!isLinkedSheetConfigured()) return;
      // Protect unexported edits unless the user explicitly forces the reload.
      if (!force && meta.dirty && LINKED_SHEET_CONFLICT === 'ask') {
        dispatch(
          setLinkedSheet({
            status: 'conflict',
            message: 'You have changes that were never exported. Reload from the linked sheet and discard them?',
          }),
        );
        return;
      }
      dispatch(setLinkedSheet({ status: 'loading' }));
      try {
        const result = await fetchLinkedWorkbook();
        const total = result.counts.people + result.counts.records + result.counts.payments + result.counts.cashbacks;
        if (result.errors.length > 0 && total === 0) {
          dispatch(setLinkedSheet({ status: 'error', message: result.errors[0].message }));
          return;
        }
        dispatch(replaceDataset({ dataset: result.dataset, source: 'imported', fileName: linkedSheetName() }));
        const skipped = result.errors.length;
        dispatch(setLinkedSheet({ status: 'loaded', loadedAt: nowISO(), message: skipped ? `${skipped} invalid row(s) were skipped. Import the file manually to see details.` : undefined }));
        dispatch(
          showSnackbar({
            message: `Loaded ${result.counts.records} records and ${result.counts.payments} payments from the linked sheet`,
            severity: skipped ? 'warning' : 'success',
          }),
        );
      } catch (e) {
        dispatch(setLinkedSheet({ status: 'error', message: e instanceof Error ? e.message : 'Could not load the linked workbook.' }));
      }
    },
    [dispatch, meta.dirty],
  );

  useEffect(() => {
    if (!autoload || ran.current) return;
    ran.current = true;
    void reload(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoload]);

  return { linked, reload, configured: isLinkedSheetConfigured(), name: linkedSheetName() };
};
