import {
  Box,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { IndianRupee, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { setMobileNav, toggleSidebar } from '../../features/ui/uiSlice';
import { SIDEBAR_COLLAPSED_WIDTH, SIDEBAR_WIDTH } from '../../theme/tokens';
import { NAV_ITEMS } from './navItems';
import { isLinkedSheetConfigured } from '../../features/excel/linkedWorkbook';

function NavContent({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const theme = useTheme();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const meta = useAppSelector((s) => s.data.meta);
  const file = useAppSelector((s) => s.ui.connectedFile);
  const connected = file.status === 'connected' || file.status === 'saving';

  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: theme.app.sidebar,
        color: theme.app.sidebarText,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.25,
          px: collapsed ? 1.5 : 2.5,
          height: 64,
          flexShrink: 0,
          justifyContent: collapsed ? 'center' : 'flex-start',
        }}
      >
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: 2,
            display: 'grid',
            placeItems: 'center',
            background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
            color: '#fff',
            flexShrink: 0,
          }}
        >
          <IndianRupee size={18} strokeWidth={2.5} />
        </Box>
        {!collapsed && (
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontWeight: 800, color: '#fff', lineHeight: 1.1, letterSpacing: '-0.01em' }} noWrap>
              MyMoney
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(203,213,225,0.7)' }} noWrap>
              Personal Money Tracker
            </Typography>
          </Box>
        )}
      </Box>

      <List sx={{ px: 1.25, py: 1, flex: 1, overflowY: 'auto' }}>
        {NAV_ITEMS.map((item) => {
          const active = item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to);
          const button = (
            <ListItemButton
              key={item.to}
              component={NavLink}
              to={item.to}
              onClick={onNavigate}
              sx={{
                borderRadius: 2,
                mb: 0.5,
                minHeight: 44,
                px: collapsed ? 1.5 : 1.75,
                justifyContent: collapsed ? 'center' : 'flex-start',
                color: active ? '#fff' : theme.app.sidebarText,
                bgcolor: active ? theme.app.sidebarActive : 'transparent',
                '&:hover': { bgcolor: active ? theme.app.sidebarActive : 'rgba(255,255,255,0.06)' },
              }}
            >
              <ListItemIcon sx={{ minWidth: collapsed ? 0 : 36, color: 'inherit', justifyContent: 'center' }}>
                <item.icon size={19} strokeWidth={active ? 2.4 : 2} />
              </ListItemIcon>
              {!collapsed && (
                <ListItemText
                  primary={item.label}
                  slotProps={{ primary: { noWrap: true, sx: { fontSize: 14, fontWeight: active ? 700 : 500 } } }}
                />
              )}
            </ListItemButton>
          );
          return collapsed ? (
            <Tooltip key={item.to} title={item.label} placement="right">
              {button}
            </Tooltip>
          ) : (
            button
          );
        })}
      </List>

      <Box sx={{ px: collapsed ? 1 : 2, py: 1.5, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        {!collapsed && (
          <Box sx={{ mb: 1 }}>
            <Typography variant="caption" sx={{ color: 'rgba(203,213,225,0.6)', display: 'block' }}>
              {connected ? 'Connected Excel file' : isLinkedSheetConfigured() ? 'Linked Excel sheet' : 'Data source'}
            </Typography>
            <Typography variant="caption" sx={{ color: '#fff', fontWeight: 600, display: 'block' }} noWrap>
              {connected
                ? file.name
                : meta.source === 'imported'
                  ? meta.sourceFileName ?? 'Imported Excel'
                  : meta.source === 'manual'
                    ? 'Local draft (not in Excel yet)'
                    : 'No data'}
            </Typography>
            {meta.dirty ? (
              <Typography variant="caption" sx={{ color: '#FBBF24', display: 'block' }}>
                ● Unsaved changes{connected ? (file.autoSave ? ' — saving…' : ' — click Save to Excel') : ' — connect or download Excel'}
              </Typography>
            ) : connected ? (
              <Typography variant="caption" sx={{ color: '#34D399', display: 'block' }}>
                ● All changes saved
              </Typography>
            ) : null}
          </Box>
        )}
        <Tooltip title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} placement="right">
          <IconButton
            onClick={() => dispatch(toggleSidebar())}
            size="small"
            sx={{ color: theme.app.sidebarText, width: '100%', borderRadius: 2 }}
            aria-label="toggle sidebar"
          >
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
}

export default function Sidebar() {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const collapsed = useAppSelector((s) => s.ui.sidebarCollapsed);
  const mobileOpen = useAppSelector((s) => s.ui.mobileNavOpen);
  const dispatch = useAppDispatch();
  const width = collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH;

  if (isDesktop) {
    return (
      <Drawer
        variant="permanent"
        sx={{
          width,
          flexShrink: 0,
          transition: 'width 160ms ease',
          '& .MuiDrawer-paper': {
            width,
            border: 'none',
            borderRadius: 0,
            transition: 'width 160ms ease',
            overflowX: 'hidden',
          },
        }}
      >
        <NavContent collapsed={collapsed} />
      </Drawer>
    );
  }

  return (
    <Drawer
      variant="temporary"
      open={mobileOpen}
      onClose={() => dispatch(setMobileNav(false))}
      ModalProps={{ keepMounted: true }}
      sx={{ '& .MuiDrawer-paper': { width: Math.min(SIDEBAR_WIDTH, 300), border: 'none', borderRadius: 0 } }}
    >
      <NavContent collapsed={false} onNavigate={() => dispatch(setMobileNav(false))} />
    </Drawer>
  );
}
