import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  LinearProgress,
  Radio,
  RadioGroup,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { FileSpreadsheet, Upload, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { selectIsEmpty, selectMeta } from '../../app/selectors';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { formatINR } from '../../utils/currency';
import { formatDate } from '../../utils/dates';
import { mergeDataset, replaceDataset } from '../data/dataSlice';
import { setImportDialogOpen, showSnackbar } from '../ui/uiSlice';
import { parseWorkbook, readFileAsArrayBuffer, type ImportResult } from './excelImport';

type Mode = 'replace' | 'merge';

export default function ExcelImportDialog() {
  const dispatch = useAppDispatch();
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const open = useAppSelector((s) => s.ui.importDialogOpen);
  const meta = useAppSelector(selectMeta);
  const isDemo = false; // demo data was removed; kept so merge/replace wording stays simple
  const isEmpty = useAppSelector(selectIsEmpty);
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [readError, setReadError] = useState<string | null>(null);
  const [tab, setTab] = useState(0);
  const [mode, setMode] = useState<Mode>('replace');
  const [confirm, setConfirm] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const reset = () => {
    setFile(null);
    setResult(null);
    setReadError(null);
    setTab(0);
    setMode('replace');
    setBusy(false);
  };

  const close = () => {
    dispatch(setImportDialogOpen(false));
    reset();
  };

  const handleFile = async (f: File) => {
    if (!/\.(xlsx|xlsm|xls|csv)$/i.test(f.name)) {
      setReadError('Please choose an Excel workbook (.xlsx).');
      return;
    }
    setBusy(true);
    setReadError(null);
    setFile(f);
    try {
      const buffer = await readFileAsArrayBuffer(f);
      const parsed = parseWorkbook(buffer);
      setResult(parsed);
      setTab(parsed.errors.length > 0 ? 4 : 0);
    } catch (e) {
      setReadError(e instanceof Error ? e.message : 'Could not read the workbook.');
      setResult(null);
    } finally {
      setBusy(false);
    }
  };

  const apply = () => {
    if (!result || !file) return;
    if (mode === 'merge' && !isDemo) {
      dispatch(mergeDataset({ dataset: result.dataset, fileName: file.name }));
      dispatch(showSnackbar({ message: `Merged ${result.counts.records} records and ${result.counts.payments} payments from ${file.name}` }));
    } else {
      dispatch(replaceDataset({ dataset: result.dataset, source: 'imported', fileName: file.name }));
      dispatch(showSnackbar({ message: `Imported ${file.name} — ${result.counts.records} records, ${result.counts.payments} payments` }));
    }
    setConfirm(false);
    close();
  };

  const requestApply = () => {
    if (!result) return;
    if (isEmpty) {
      apply();
      return;
    }
    setConfirm(true);
  };

  const totalRows = result ? result.counts.people + result.counts.records + result.counts.payments + result.counts.cashbacks : 0;

  return (
    <>
      <Dialog open={open} onClose={close} maxWidth="md" fullWidth fullScreen={fullScreen}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 1.5 }}>
          <Box>
            <Typography component="div" sx={{ fontWeight: 700 }}>
              Import Excel workbook
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Preview and validate before anything replaces your current records.
            </Typography>
          </Box>
          <IconButton onClick={close} size="small" aria-label="close">
            <X size={18} />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {!result && (
            <Box
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const f = e.dataTransfer.files?.[0];
                if (f) void handleFile(f);
              }}
              onClick={() => inputRef.current?.click()}
              sx={{
                border: `2px dashed ${dragOver ? theme.palette.primary.main : theme.app.border}`,
                borderRadius: 3,
                p: { xs: 3, sm: 5 },
                textAlign: 'center',
                cursor: 'pointer',
                bgcolor: dragOver ? 'action.hover' : 'transparent',
                transition: 'all 120ms',
              }}
            >
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,.xlsm,.xls"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleFile(f);
                  e.target.value = '';
                }}
              />
              <FileSpreadsheet size={40} style={{ color: theme.palette.primary.main, marginBottom: 8 }} />
              <Typography sx={{ fontWeight: 700 }}>Drop your workbook here or click to browse</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Expects sheets named People, Money Records, Payments and Cashback. Download the template from the Excel page if
                you are starting fresh.
              </Typography>
              <Button variant="outlined" startIcon={<Upload size={16} />} sx={{ mt: 2 }}>
                Choose file
              </Button>
            </Box>
          )}
          {busy && <LinearProgress />}
          {readError && (
            <Alert severity="error" sx={{ borderRadius: 2 }}>
              {readError}
            </Alert>
          )}

          {result && file && (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Chip icon={<FileSpreadsheet size={14} />} label={file.name} sx={{ maxWidth: '100%' }} />
                <Chip size="small" label={`${result.counts.people} people`} />
                <Chip size="small" label={`${result.counts.records} records`} />
                <Chip size="small" label={`${result.counts.payments} payments`} />
                <Chip size="small" label={`${result.counts.cashbacks} cashback`} />
                <Button size="small" onClick={reset} sx={{ ml: 'auto' }}>
                  Choose another file
                </Button>
              </Box>

              {result.errors.length > 0 && (
                <Alert severity="error" sx={{ borderRadius: 2 }}>
                  {result.errors.length} row{result.errors.length === 1 ? '' : 's'} could not be imported. Review the Issues tab —
                  valid rows can still be imported, invalid rows will be skipped.
                </Alert>
              )}
              {result.errors.length === 0 && result.warnings.length > 0 && (
                <Alert severity="warning" sx={{ borderRadius: 2 }}>
                  {result.warnings.length} warning{result.warnings.length === 1 ? '' : 's'} — check the Issues tab.
                </Alert>
              )}
              {result.errors.length === 0 && result.warnings.length === 0 && totalRows > 0 && (
                <Alert severity="success" sx={{ borderRadius: 2 }}>
                  All rows validated. Totals will be recalculated by the app after import.
                </Alert>
              )}
              {totalRows === 0 && (
                <Alert severity="info" sx={{ borderRadius: 2 }}>
                  No data rows were found. Sheets detected: {result.sheetsFound.join(', ') || 'none'}.
                </Alert>
              )}

              <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto" allowScrollButtonsMobile>
                <Tab label={`People (${result.counts.people})`} />
                <Tab label={`Records (${result.counts.records})`} />
                <Tab label={`Payments (${result.counts.payments})`} />
                <Tab label={`Cashback (${result.counts.cashbacks})`} />
                <Tab label={`Issues (${result.issues.length})`} />
              </Tabs>

              <TableContainer sx={{ maxHeight: 320, border: `1px solid ${theme.app.border}`, borderRadius: 2 }}>
                {tab === 0 && (
                  <PreviewTable
                    headers={['ID', 'Name', 'Phone', 'Archived']}
                    rows={result.dataset.people.map((p) => [p.id, p.name, p.phone ?? '', p.archived ? 'Yes' : 'No'])}
                  />
                )}
                {tab === 1 && (
                  <PreviewTable
                    headers={['ID', 'Person', 'Description', 'Category', 'Date', 'Amount', 'Due']}
                    rows={result.dataset.records.map((r) => [
                      r.id,
                      result.dataset.people.find((p) => p.id === r.personId)?.name ?? r.personId,
                      r.description,
                      r.category,
                      formatDate(r.dateGiven),
                      formatINR(r.originalAmount),
                      formatDate(r.dueDate),
                    ])}
                  />
                )}
                {tab === 2 && (
                  <PreviewTable
                    headers={['ID', 'Record', 'Date', 'Amount', 'Method', 'Reference']}
                    rows={result.dataset.payments.map((p) => [p.id, p.recordId, formatDate(p.date), formatINR(p.amount), p.method, p.reference ?? ''])}
                  />
                )}
                {tab === 3 && (
                  <PreviewTable
                    headers={['ID', 'Record', 'Date', 'Amount', 'Source', 'Applied']}
                    rows={result.dataset.cashbacks.map((c) => [c.id, c.recordId, formatDate(c.date), formatINR(c.amount), c.source, c.appliedToDebt ? 'Yes' : 'No'])}
                  />
                )}
                {tab === 4 && (
                  <PreviewTable
                    headers={['Severity', 'Sheet', 'Row', 'Message']}
                    rows={result.issues.map((i) => [i.severity === 'error' ? '✖ Error' : '⚠ Warning', i.sheet, i.row || '—', i.message])}
                    emphasizeFirst
                  />
                )}
              </TableContainer>

              {!isEmpty && (
                <Box sx={{ p: 1.5, borderRadius: 2, border: `1px solid ${theme.app.border}` }}>
                  <Typography variant="subtitle2" gutterBottom>
                    How should this import be applied?
                  </Typography>
                  {isDemo ? (
                    <Typography variant="body2" color="text.secondary">
                      Demo data is currently loaded. It will be <strong>replaced</strong> so demo records never mix with your real
                      data.
                    </Typography>
                  ) : (
                    <RadioGroup value={mode} onChange={(e) => setMode(e.target.value as Mode)}>
                      <FormControlLabel
                        value="replace"
                        control={<Radio size="small" />}
                        label={
                          <Typography variant="body2">
                            <strong>Replace</strong> everything currently in the app ({meta.sourceFileName ?? 'local draft'}) with
                            this workbook.
                          </Typography>
                        }
                      />
                      <FormControlLabel
                        value="merge"
                        control={<Radio size="small" />}
                        label={
                          <Typography variant="body2">
                            <strong>Merge</strong> — rows with matching IDs are updated, new IDs are added, nothing is deleted.
                          </Typography>
                        }
                      />
                    </RadioGroup>
                  )}
                  {meta.dirty && (
                    <Typography variant="caption" color="warning.main">
                      You have unsaved changes that have not been exported to Excel. Replacing will discard them.
                    </Typography>
                  )}
                </Box>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={close} color="inherit">
            Cancel
          </Button>
          <Button variant="contained" disabled={!result || totalRows === 0 || busy} onClick={requestApply}>
            {result && result.errors.length > 0 ? `Import ${totalRows} valid rows` : 'Import workbook'}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={confirm}
        title={mode === 'merge' && !isDemo ? 'Merge imported data?' : 'Replace current records?'}
        danger={mode === 'replace' || isDemo}
        message={
          mode === 'merge' && !isDemo
            ? 'Imported rows will be merged into your current data by ID. This cannot be undone except by re-importing.'
            : `All ${isDemo ? 'demo ' : ''}records currently in the app will be replaced by the workbook${
                meta.dirty ? ', including changes you have not exported' : ''
              }. Continue?`
        }
        confirmLabel={mode === 'merge' && !isDemo ? 'Merge' : 'Replace'}
        onConfirm={apply}
        onCancel={() => setConfirm(false)}
      />
    </>
  );
}

function PreviewTable({
  headers,
  rows,
  emphasizeFirst,
}: {
  headers: string[];
  rows: (string | number)[][];
  emphasizeFirst?: boolean;
}) {
  if (rows.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
        <Typography variant="body2">Nothing to show.</Typography>
      </Box>
    );
  }
  return (
    <Table size="small" stickyHeader sx={{ minWidth: 560 }}>
      <TableHead>
        <TableRow>
          {headers.map((h) => (
            <TableCell key={h}>{h}</TableCell>
          ))}
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((r, i) => (
          <TableRow key={i}>
            {r.map((c, j) => (
              <TableCell
                key={j}
                sx={{
                  whiteSpace: j === r.length - 1 ? 'normal' : 'nowrap',
                  color: emphasizeFirst && j === 0 ? (String(c).startsWith('✖') ? 'error.main' : 'warning.main') : undefined,
                  fontWeight: emphasizeFirst && j === 0 ? 700 : undefined,
                }}
              >
                {c}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
