import { Alert, Box, Button, Card, Chip, Divider, FormControlLabel, MenuItem, Stack, Switch, TextField, Typography } from '@mui/material';
import { Database, Download, FileDown, FilePlus2, FileSpreadsheet, FileUp, FolderOpen, Link2, RefreshCw, Save, ShieldCheck, Trash2, Unplug } from 'lucide-react';
import { useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { selectAvailableYears, selectIsEmpty, selectMeta, selectTotals } from '../../app/selectors';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import PageHeader from '../../components/common/PageHeader';
import { EXCEL_SHEET_URL } from '../../config/excelSource';
import { formatDateTime } from '../../utils/dates';
import { clearAll } from '../data/dataSlice';
import { setAutoSave, setImportDialogOpen, showSnackbar } from '../ui/uiSlice';
import { useConnectedExcel } from './useConnectedExcel';
import { useExcelActions } from './useExcelActions';
import { useLinkedWorkbook } from './useLinkedWorkbook';

export default function ExcelPage() {
  const dispatch = useAppDispatch();
  const meta = useAppSelector(selectMeta);
  const totals = useAppSelector(selectTotals);
  const isEmpty = useAppSelector(selectIsEmpty);
  const years = useAppSelector(selectAvailableYears);
  const periodYear = useAppSelector((s) => s.ui.period.year);
  const [year, setYear] = useState(periodYear);
  const [confirmClear, setConfirmClear] = useState(false);
  const { exportWorkbook, downloadTemplate, exportCSV } = useExcelActions();
  const { file, supported, connect, createNew, save, reconnect, disconnect } = useConnectedExcel();
  const { linked, reload, configured, name } = useLinkedWorkbook();
  const connected = file.status === 'connected' || file.status === 'saving';

  return (
    <Box>
      <PageHeader
        title="Excel Import / Export"
        subtitle="Your Excel workbook is the source of truth. Connect it once and every change you make in the app is written straight into it."
        crumbs={[{ label: 'Dashboard', to: '/' }, { label: 'Excel' }]}
      />

      {meta.dirty && !connected && (
        <Alert
          severity="warning"
          sx={{ mb: 2, borderRadius: 2 }}
          action={
            <Button color="inherit" size="small" onClick={() => exportWorkbook({ year })}>
              Download now
            </Button>
          }
        >
          You have changes that are not in any Excel file yet. Connect your workbook below or download a copy.
        </Alert>
      )}

      {/* ---------------- Connected file (primary) ---------------- */}
      <Card sx={{ p: { xs: 2, md: 3 }, mb: 2, borderColor: connected ? 'success.main' : 'primary.main', borderWidth: 1.5 }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 1.5, flexWrap: 'wrap', gap: 1 }} useFlexGap>
          <FolderOpen size={22} />
          <Typography variant="h6">Your Excel file</Typography>
          <Chip
            size="small"
            color={connected ? 'success' : file.status === 'error' ? 'error' : file.status === 'none' ? 'default' : 'warning'}
            label={
              connected
                ? `Connected · ${file.name}`
                : file.status === 'loading'
                  ? 'Loading…'
                  : file.status === 'needs-permission'
                    ? `Reconnect needed · ${file.name}`
                    : file.status === 'conflict'
                      ? 'Unsaved changes'
                      : file.status === 'error'
                        ? 'Error'
                        : 'Not connected'
            }
          />
        </Stack>

        {!supported && (
          <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
            Direct file saving needs Chrome or Edge on a desktop. In this browser you can still import a workbook and download the
            updated copy below.
          </Alert>
        )}
        {file.message && (
          <Alert severity={file.status === 'error' ? 'error' : 'warning'} sx={{ mb: 2, borderRadius: 2 }}>
            {file.message}
          </Alert>
        )}

        {connected ? (
          <>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(3, 1fr)' }, gap: 1.5, mb: 2 }}>
              <Info label="Loaded from file" value={formatDateTime(file.lastLoadedAt)} />
              <Info label="Last saved to file" value={formatDateTime(file.lastSavedAt)} />
              <Info label="Unsaved changes" value={meta.dirty ? 'Yes' : 'None'} />
            </Box>
            <FormControlLabel
              control={<Switch checked={file.autoSave} onChange={(e) => dispatch(setAutoSave(e.target.checked))} />}
              label="Auto-save: write every change into the file about a second after it happens"
            />
            <Divider sx={{ my: 1.5 }} />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ flexWrap: 'wrap' }} useFlexGap>
              <Button variant="contained" startIcon={<Save size={16} />} onClick={() => void save(false)} disabled={file.status === 'saving'}>
                {file.status === 'saving' ? 'Saving…' : 'Save to Excel now'}
              </Button>
              <Button variant="outlined" startIcon={<RefreshCw size={16} />} onClick={() => void reconnect()}>
                Reload from file
              </Button>
              <Button variant="text" color="inherit" startIcon={<Unplug size={16} />} onClick={() => void disconnect()}>
                Disconnect
              </Button>
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
              Keep the file closed in Excel while the app saves; Excel locks open files. Reopen it any time to see your data with live
              formulas.
            </Typography>
          </>
        ) : file.status === 'needs-permission' || file.status === 'conflict' ? (
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <Button variant="contained" startIcon={<RefreshCw size={16} />} onClick={() => void reconnect()}>
              Reconnect to {file.name}
            </Button>
            <Button variant="outlined" startIcon={<FolderOpen size={16} />} onClick={() => void connect()}>
              Choose a different file
            </Button>
          </Stack>
        ) : (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Pick the workbook you keep your records in. The app reads it, and from then on writes every record, payment and cashback you
              add straight back into the same file. Don't have one yet? Create a new workbook and the app will fill it in.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ flexWrap: 'wrap' }} useFlexGap>
              <Button variant="contained" startIcon={<FolderOpen size={16} />} onClick={() => void connect()} disabled={!supported || file.status === 'loading'}>
                Connect existing Excel file
              </Button>
              <Button variant="outlined" startIcon={<FilePlus2 size={16} />} onClick={() => void createNew()} disabled={!supported}>
                Create new Excel file
              </Button>
              <Button variant="text" startIcon={<FileSpreadsheet size={16} />} onClick={downloadTemplate}>
                Download Excel template
              </Button>
            </Stack>
          </>
        )}
      </Card>

      {/* ---------------- Optional read-only link ---------------- */}
      {configured && (
        <Card sx={{ p: { xs: 2, md: 3 }, mb: 2 }}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 1.5 }}>
            <Link2 size={22} />
            <Typography variant="h6">Linked sheet (read-only)</Typography>
            <Chip
              size="small"
              color={linked.status === 'loaded' ? 'success' : linked.status === 'error' ? 'error' : 'default'}
              label={linked.status === 'loaded' ? `Loaded ${formatDateTime(linked.loadedAt)}` : linked.status === 'loading' ? 'Loading…' : linked.status === 'error' ? 'Failed' : 'Idle'}
            />
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, overflowWrap: 'anywhere' }}>
            <strong>{name}</strong> · <code style={{ fontSize: 12 }}>{EXCEL_SHEET_URL}</code> (set in src/config/excelSource.ts). A link can only be
            read, not written to; connect a local file above to save changes.
          </Typography>
          {linked.message && (
            <Alert severity={linked.status === 'error' ? 'error' : 'warning'} sx={{ mb: 1.5, borderRadius: 2 }}>
              {linked.message}
            </Alert>
          )}
          <Button variant="outlined" startIcon={<RefreshCw size={16} />} onClick={() => void reload(true)} disabled={linked.status === 'loading'}>
            Reload from link
          </Button>
        </Card>
      )}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 2 }}>
        <Card sx={{ p: { xs: 2, md: 3 } }}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 1.5 }}>
            <FileUp size={22} />
            <Typography variant="h6">Import a workbook (one-off)</Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Load a workbook without connecting to it. You get a preview with validation errors before anything is replaced, and you can
            choose to replace or merge with the current data.
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <Button variant="outlined" startIcon={<FileUp size={16} />} onClick={() => dispatch(setImportDialogOpen(true))}>
              Import Excel
            </Button>
            <Button variant="text" startIcon={<FileSpreadsheet size={16} />} onClick={downloadTemplate}>
              Download Excel template
            </Button>
          </Stack>
        </Card>

        <Card sx={{ p: { xs: 2, md: 3 } }}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 1.5 }}>
            <FileDown size={22} />
            <Typography variant="h6">Download a copy</Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Generates Dashboard, People, Money Records, Payments, Cashback and twelve monthly sheets with formulas and ₹ formatting. Useful as
            a dated backup, or as your only save method in browsers that cannot connect to files.
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { sm: 'center' } }}>
            <TextField select label="Monthly sheets year" value={year} onChange={(e) => setYear(Number(e.target.value))} sx={{ maxWidth: { sm: 200 } }}>
              {years.map((y) => (
                <MenuItem key={y} value={y}>
                  {y}
                </MenuItem>
              ))}
            </TextField>
            <Button variant="outlined" startIcon={<Download size={16} />} onClick={() => exportWorkbook({ year })} disabled={isEmpty}>
              Export Updated Excel
            </Button>
          </Stack>
        </Card>

        <Card sx={{ p: { xs: 2, md: 3 } }}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 1.5 }}>
            <Download size={22} />
            <Typography variant="h6">CSV exports</Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Flat files with computed columns included. Handy for sharing or quick analysis.
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            <Button variant="outlined" size="small" onClick={() => exportCSV('records')} disabled={isEmpty}>
              Money records CSV
            </Button>
            <Button variant="outlined" size="small" onClick={() => exportCSV('payments')} disabled={isEmpty}>
              Payments CSV
            </Button>
            <Button variant="outlined" size="small" onClick={() => exportCSV('cashback')} disabled={isEmpty}>
              Cashback CSV
            </Button>
            <Button variant="outlined" size="small" onClick={() => exportCSV('people')} disabled={isEmpty}>
              People CSV
            </Button>
          </Box>
        </Card>

        <Card sx={{ p: { xs: 2, md: 3 } }}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 1.5 }}>
            <Database size={22} />
            <Typography variant="h6">Current data</Typography>
          </Stack>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, mb: 2 }}>
            <Info label="Source" value={connected ? file.name ?? '' : meta.source === 'imported' ? meta.sourceFileName ?? 'Imported' : meta.source === 'manual' ? 'Entered in app' : 'Empty'} />
            <Info label="Unsaved changes" value={meta.dirty ? 'Yes' : 'No'} />
            <Info label="Last loaded" value={formatDateTime(meta.lastImportedAt)} />
            <Info label="Last saved / exported" value={formatDateTime(meta.lastExportedAt)} />
            <Info label="Records / payments" value={`${totals.recordCount} / ${totals.paymentCount}`} />
            <Info label="Local draft" value="Auto-saved in this browser" />
          </Box>
          <Divider sx={{ my: 1.5 }} />
          <Button color="error" variant="outlined" startIcon={<Trash2 size={16} />} onClick={() => setConfirmClear(true)} disabled={isEmpty}>
            Clear all data
          </Button>
        </Card>
      </Box>

      <Card sx={{ p: { xs: 2, md: 3 }, mt: 2 }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 1 }}>
          <ShieldCheck size={22} />
          <Typography variant="h6">How saving works</Typography>
        </Stack>
        <Box component="ol" sx={{ pl: 2.5, m: 0, '& li': { mb: 0.75 }, color: 'text.secondary', fontSize: 14 }}>
          <li>Connect your workbook once (Chrome or Edge). The browser remembers it; after a restart it asks you to click Reconnect.</li>
          <li>Add records, payments and cashback in the app. With auto-save on, each change is written into the file within a second.</li>
          <li>Open the file in Excel whenever you like: totals are stored as formulas, so they stay live there too. Close it before the app saves again.</li>
          <li>Download a dated copy now and then as a backup.</li>
        </Box>
      </Card>

      <ConfirmDialog
        open={confirmClear}
        danger
        title="Clear all data?"
        message={`Everything currently in the app will be removed.${connected && file.autoSave ? ' Auto-save is on, so the connected Excel file will be emptied too. Disconnect first to keep it.' : ' Download a copy first if you have not already.'}`}
        confirmLabel="Clear"
        onConfirm={() => {
          dispatch(clearAll());
          setConfirmClear(false);
          dispatch(showSnackbar({ message: 'All data cleared.', severity: 'info' }));
        }}
        onCancel={() => setConfirmClear(false)}
      />
    </Box>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 600, overflowWrap: 'anywhere' }}>
        {value}
      </Typography>
    </Box>
  );
}
