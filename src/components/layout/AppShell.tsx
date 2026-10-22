import { Alert, Box, Button, Snackbar } from '@mui/material';
import { useLinkedWorkbook } from '../../features/excel/useLinkedWorkbook';
import { useConnectedExcel } from '../../features/excel/useConnectedExcel';
import { setConnectedFile, setLinkedSheet } from '../../features/ui/uiSlice';
import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { hideSnackbar } from '../../features/ui/uiSlice';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import RecordFormDialog from '../../features/records/RecordFormDialog';
import PaymentFormDialog from '../../features/payments/PaymentFormDialog';
import CashbackFormDialog from '../../features/cashback/CashbackFormDialog';
import PersonFormDialog from '../../features/people/PersonFormDialog';
import ExcelImportDialog from '../../features/excel/ExcelImportDialog';

export default function AppShell() {
  const dispatch = useAppDispatch();
  const snackbar = useAppSelector((s) => s.ui.snackbar);
  const dirty = useAppSelector((s) => s.data.meta.dirty);
  const location = useLocation();
  const { linked, reload } = useLinkedWorkbook(true);
  const { file, reconnect, resolveConflict } = useConnectedExcel({ autoload: true, autosave: true });

  // Warn before leaving the tab with changes not yet exported to Excel.
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [location.pathname]);

  return (
    <Box sx={{ display: 'flex', minHeight: '100dvh', width: '100%', overflowX: 'hidden' }}>
      <Sidebar />
      <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <TopBar />
        {file.status === 'needs-permission' && (
          <Alert
            severity="info"
            sx={{ borderRadius: 0 }}
            action={
              <Button color="inherit" size="small" variant="outlined" onClick={() => void reconnect()}>
                Reconnect
              </Button>
            }
          >
            Your Excel file <strong>{file.name}</strong> is remembered. Reconnect to keep saving changes into it.
          </Alert>
        )}
        {file.status === 'conflict' && (
          <Alert
            severity="warning"
            sx={{ borderRadius: 0 }}
            action={
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button color="inherit" size="small" onClick={() => void resolveConflict('load-file')}>
                  Load file
                </Button>
                <Button color="inherit" size="small" variant="outlined" onClick={() => void resolveConflict('save-mine')}>
                  Save my changes to file
                </Button>
              </Box>
            }
          >
            <strong>{file.name}</strong>: {file.message}
          </Alert>
        )}
        {file.status === 'error' && (
          <Alert severity="error" sx={{ borderRadius: 0 }} onClose={() => dispatch(setConnectedFile({ status: file.name ? 'needs-permission' : 'none', message: undefined }))}>
            Excel file: {file.message}
          </Alert>
        )}
        {linked.status === 'conflict' && (
          <Alert
            severity="warning"
            sx={{ borderRadius: 0 }}
            action={
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button color="inherit" size="small" onClick={() => dispatch(setLinkedSheet({ status: 'idle' }))}>
                  Keep my changes
                </Button>
                <Button color="inherit" size="small" variant="outlined" onClick={() => void reload(true)}>
                  Reload from sheet
                </Button>
              </Box>
            }
          >
            Linked Excel sheet available. {linked.message}
          </Alert>
        )}
        {linked.status === 'error' && (
          <Alert severity="error" sx={{ borderRadius: 0 }} onClose={() => dispatch(setLinkedSheet({ status: 'idle' }))}>
            Linked Excel sheet could not be loaded: {linked.message}
          </Alert>
        )}
        <Box
          component="main"
          sx={{
            flex: 1,
            px: { xs: 2, sm: 3, lg: 4 },
            py: { xs: 2, md: 3 },
            maxWidth: 1600,
            width: '100%',
            mx: 'auto',
            minWidth: 0,
          }}
        >
          <Outlet />
        </Box>
      </Box>

      <RecordFormDialog />
      <PaymentFormDialog />
      <CashbackFormDialog />
      <PersonFormDialog />
      <ExcelImportDialog />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => dispatch(hideSnackbar())}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => dispatch(hideSnackbar())}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%', borderRadius: 2 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
