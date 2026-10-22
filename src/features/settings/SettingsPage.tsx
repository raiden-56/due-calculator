import { Box, Button, Card, Divider, FormControlLabel, Stack, Switch, Typography } from '@mui/material';
import { Database, Moon, RotateCcw, Sun, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { selectIsEmpty, selectMeta } from '../../app/selectors';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import PageHeader from '../../components/common/PageHeader';
import { clearDraft, draftSizeBytes } from '../../storage/localDraft';
import { clearAll } from '../data/dataSlice';
import { setAutoSave, showSnackbar, toggleSidebar, toggleTheme } from '../ui/uiSlice';
import { useExcelActions } from '../excel/useExcelActions';
import { useConnectedExcel } from '../excel/useConnectedExcel';

export default function SettingsPage() {
  const dispatch = useAppDispatch();
  const mode = useAppSelector((s) => s.ui.themeMode);
  const collapsed = useAppSelector((s) => s.ui.sidebarCollapsed);
  const meta = useAppSelector(selectMeta);
  const isEmpty = useAppSelector(selectIsEmpty);
  const { exportWorkbook } = useExcelActions();
  const { file, supported, save } = useConnectedExcel();
  const [confirm, setConfirm] = useState<'clear' | 'draft' | null>(null);
  const draftKb = Math.round(draftSizeBytes() / 1024);

  const run = () => {
    if (confirm === 'clear') {
      dispatch(clearAll());
      dispatch(showSnackbar({ message: 'All data cleared', severity: 'info' }));
    } else if (confirm === 'draft') {
      clearDraft();
      dispatch(showSnackbar({ message: 'Local draft removed. Current data stays until you reload.', severity: 'info' }));
    }
    setConfirm(null);
  };

  return (
    <Box>
      <PageHeader title="Settings" subtitle="Appearance, saving and data safety." crumbs={[{ label: 'Dashboard', to: '/' }, { label: 'Settings' }]} />
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
        <Card sx={{ p: { xs: 2, md: 3 } }}>
          <Typography variant="h6" gutterBottom>
            Appearance
          </Typography>
          <FormControlLabel
            control={<Switch checked={mode === 'dark'} onChange={() => dispatch(toggleTheme())} />}
            label={
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                {mode === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
                <span>Dark theme</span>
              </Stack>
            }
          />
          <Box sx={{ display: { xs: 'none', md: 'block' } }}>
            <FormControlLabel control={<Switch checked={collapsed} onChange={() => dispatch(toggleSidebar())} />} label="Collapse sidebar" />
          </Box>
          <Divider sx={{ my: 2 }} />
          <Typography variant="body2" color="text.secondary">
            Currency is shown in Indian Rupees with lakh/crore grouping (₹1,00,000). All totals are computed exactly in paise, so
            ₹0.10 + ₹0.20 is always ₹0.30.
          </Typography>
        </Card>

        <Card sx={{ p: { xs: 2, md: 3 } }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
            <Database size={20} />
            <Typography variant="h6">Saving to Excel</Typography>
          </Stack>
          {supported ? (
            <>
              <FormControlLabel
                control={<Switch checked={file.autoSave} onChange={(e) => dispatch(setAutoSave(e.target.checked))} />}
                label="Auto-save every change into the connected Excel file"
              />
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {file.status === 'connected' || file.status === 'saving'
                  ? `Connected to ${file.name}. ${file.autoSave ? 'Changes are written about a second after you make them.' : 'Use "Save to Excel" in the top bar to write changes.'}`
                  : 'No Excel file is connected. Connect one from the Excel Import / Export page.'}
              </Typography>
            </>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              This browser cannot write to files directly. Use Chrome or Edge to connect an Excel file, or use Export Updated Excel to
              download a copy.
            </Typography>
          )}
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            A recoverable draft is also kept in this browser's storage ({draftKb} KB) so a refresh never loses work.
          </Typography>
          <Stack spacing={1} direction={{ xs: 'column', sm: 'row' }} sx={{ flexWrap: 'wrap' }} useFlexGap>
            {file.status === 'connected' && (
              <Button variant="contained" onClick={() => void save(false)} disabled={isEmpty}>
                Save to Excel now
              </Button>
            )}
            <Button variant={file.status === 'connected' ? 'outlined' : 'contained'} onClick={() => exportWorkbook()} disabled={isEmpty}>
              Download a copy (.xlsx)
            </Button>
            <Button variant="outlined" color="warning" startIcon={<RotateCcw size={16} />} onClick={() => setConfirm('draft')}>
              Remove local draft
            </Button>
          </Stack>
          {meta.dirty && (
            <Typography variant="caption" color="warning.main" sx={{ display: 'block', mt: 1.5 }}>
              You have changes not yet saved to Excel.
            </Typography>
          )}
        </Card>

        <Card sx={{ p: { xs: 2, md: 3 } }}>
          <Typography variant="h6" gutterBottom>
            Danger zone
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Remove every person, record, payment and cashback from the app. The connected Excel file is not touched until the next save,
            so disconnect it first if you want to keep it.
          </Typography>
          <Button color="error" variant="contained" startIcon={<Trash2 size={16} />} onClick={() => setConfirm('clear')} disabled={isEmpty}>
            Clear all data
          </Button>
        </Card>
      </Box>

      <ConfirmDialog
        open={confirm !== null}
        danger
        title={confirm === 'clear' ? 'Clear all data?' : 'Remove local draft?'}
        message={
          confirm === 'clear'
            ? `Everything in the app will be removed${meta.dirty ? ', including changes you have not saved' : ''}.${file.status === 'connected' && file.autoSave ? ' Auto-save is on, so the connected Excel file will be emptied too.' : ''}`
            : 'The auto-saved draft in this browser will be deleted. The data on screen stays until you reload.'
        }
        confirmLabel={confirm === 'draft' ? 'Remove draft' : 'Clear'}
        onConfirm={run}
        onCancel={() => setConfirm(null)}
      />
    </Box>
  );
}
