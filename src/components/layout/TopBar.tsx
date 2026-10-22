import {
  AppBar,
  Box,
  Button,
  Chip,
  IconButton,
  InputAdornment,
  TextField,
  Toolbar,
  Tooltip,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { CalendarDays, Menu, Moon, Plus, Save, Search, Sun, Upload } from 'lucide-react';
import { useConnectedExcel } from '../../features/excel/useConnectedExcel';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import {
  openRecordDialog,
  setGlobalSearch,
  setImportDialogOpen,
  setMobileNav,
  toggleTheme,
} from '../../features/ui/uiSlice';
import { MONTH_SHORT } from '../../utils/dates';
import { TOPBAR_HEIGHT } from '../../theme/tokens';

export default function TopBar() {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const isSmall = useMediaQuery(theme.breakpoints.down('sm'));
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const period = useAppSelector((s) => s.ui.period);
  const search = useAppSelector((s) => s.ui.globalSearch);
  const mode = useAppSelector((s) => s.ui.themeMode);
  const dirty = useAppSelector((s) => s.data.meta.dirty);
  const { file, save } = useConnectedExcel();
  const connected = file.status === 'connected' || file.status === 'saving';

  const periodLabel = period.month ? `${MONTH_SHORT[period.month - 1]} ${period.year}` : `FY ${period.year}`;

  return (
    <AppBar
      position="sticky"
      color="inherit"
      sx={{
        bgcolor: 'background.paper',
        borderBottom: `1px solid ${theme.app.border}`,
        boxShadow: 'none',
        borderRadius: 0,
      }}
    >
      <Toolbar sx={{ minHeight: TOPBAR_HEIGHT, gap: 1, px: { xs: 1.5, md: 3 } }}>
        {!isDesktop && (
          <IconButton edge="start" onClick={() => dispatch(setMobileNav(true))} aria-label="open navigation">
            <Menu size={22} />
          </IconButton>
        )}

        <Tooltip title="Current reporting period (change on Monthly Overview)">
          <Chip
            icon={<CalendarDays size={14} />}
            label={periodLabel}
            onClick={() => navigate('/monthly')}
            size="small"
            sx={{ fontWeight: 700, '& .MuiChip-icon': { ml: 1 } }}
          />
        </Tooltip>

        <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center', px: { xs: 0.5, md: 2 }, minWidth: 0 }}>
          {!isSmall && (
            <TextField
              value={search}
              onChange={(e) => dispatch(setGlobalSearch(e.target.value))}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && search.trim()) navigate('/records');
              }}
              placeholder="Search people, records, payments…"
              size="small"
              sx={{ maxWidth: 420, '& .MuiOutlinedInput-root': { bgcolor: theme.palette.mode === 'light' ? '#F8FAFC' : '#0F172A' } }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search size={16} />
                    </InputAdornment>
                  ),
                },
              }}
            />
          )}
        </Box>

        <Tooltip title={mode === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}>
          <IconButton onClick={() => dispatch(toggleTheme())} aria-label="toggle theme">
            {mode === 'light' ? <Moon size={19} /> : <Sun size={19} />}
          </IconButton>
        </Tooltip>

        {connected && (
          <Tooltip title={file.status === 'saving' ? 'Saving…' : dirty ? `Save changes to ${file.name}` : `All changes saved to ${file.name}`}>
            <span>
              <Button
                variant={dirty ? 'contained' : 'outlined'}
                color={dirty ? 'warning' : 'success'}
                startIcon={!isSmall ? <Save size={16} /> : undefined}
                onClick={() => void save(false)}
                disabled={file.status === 'saving'}
                sx={{ whiteSpace: 'nowrap', minWidth: isSmall ? 40 : undefined, px: isSmall ? 1.25 : 2 }}
                aria-label="save to excel"
              >
                {isSmall ? <Save size={18} /> : file.status === 'saving' ? 'Saving…' : dirty ? 'Save to Excel' : 'Saved'}
              </Button>
            </span>
          </Tooltip>
        )}
        {isSmall ? (
          <Tooltip title="Import Excel">
            <IconButton onClick={() => dispatch(setImportDialogOpen(true))} aria-label="import excel">
              <Upload size={19} />
            </IconButton>
          </Tooltip>
        ) : (
          <Button variant="outlined" startIcon={<Upload size={16} />} onClick={() => dispatch(setImportDialogOpen(true))}>
            Import Excel
          </Button>
        )}

        <Button
          variant="contained"
          startIcon={!isSmall ? <Plus size={16} /> : undefined}
          onClick={() => dispatch(openRecordDialog())}
          sx={{ whiteSpace: 'nowrap', minWidth: isSmall ? 40 : undefined, px: isSmall ? 1.25 : 2 }}
          aria-label="add record"
        >
          {isSmall ? <Plus size={18} /> : 'Add Record'}
        </Button>
      </Toolbar>
    </AppBar>
  );
}
