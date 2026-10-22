import { createTheme, type Theme } from '@mui/material/styles';
import { radius, tokens, type ThemeTokens } from './tokens';

declare module '@mui/material/styles' {
  interface Theme {
    app: ThemeTokens;
  }
  interface ThemeOptions {
    app?: ThemeTokens;
  }
}

export const buildTheme = (mode: 'light' | 'dark'): Theme => {
  const t = tokens[mode];
  return createTheme({
    app: t,
    palette: {
      mode,
      primary: { main: t.primary, dark: t.primaryDark, contrastText: '#FFFFFF' },
      secondary: { main: t.cashback },
      success: { main: t.received },
      warning: { main: t.pending },
      error: { main: t.overdue },
      background: { default: t.background, paper: t.surface },
      text: { primary: t.textPrimary, secondary: t.textSecondary },
      divider: t.border,
    },
    shape: { borderRadius: radius.md },
    typography: {
      fontFamily: '"Inter", "Segoe UI", Roboto, system-ui, -apple-system, sans-serif',
      h4: { fontWeight: 700, letterSpacing: '-0.02em' },
      h5: { fontWeight: 700, letterSpacing: '-0.01em' },
      h6: { fontWeight: 600 },
      subtitle2: { fontWeight: 600 },
      button: { textTransform: 'none', fontWeight: 600 },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: { backgroundColor: t.background, overflowX: 'hidden' },
          '*': { boxSizing: 'border-box' },
          '::-webkit-scrollbar': { width: 8, height: 8 },
          '::-webkit-scrollbar-thumb': { background: t.neutral, borderRadius: 8 },
        },
      },
      MuiPaper: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            border: `1px solid ${t.border}`,
            borderRadius: radius.lg,
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            boxShadow: mode === 'light' ? '0 1px 2px rgba(15, 23, 42, 0.04), 0 4px 16px rgba(15, 23, 42, 0.04)' : 'none',
          },
        },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: { borderRadius: radius.sm, minHeight: 40, paddingInline: 16 },
          sizeSmall: { minHeight: 34 },
        },
      },
      MuiIconButton: { styleOverrides: { root: { borderRadius: radius.sm } } },
      MuiChip: { styleOverrides: { root: { fontWeight: 600, borderRadius: 6 } } },
      MuiTextField: { defaultProps: { size: 'small', fullWidth: true } },
      MuiOutlinedInput: { styleOverrides: { root: { borderRadius: radius.sm, backgroundColor: t.surface } } },
      MuiTableCell: {
        styleOverrides: {
          root: { borderBottomColor: t.border, paddingBlock: 10 },
          head: {
            fontWeight: 600,
            color: t.textSecondary,
            fontSize: 12,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            backgroundColor: mode === 'light' ? '#F8FAFC' : '#161E2E',
            whiteSpace: 'nowrap',
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: { borderRadius: radius.lg, margin: 16, width: 'calc(100% - 32px)' },
        },
      },
      MuiTooltip: { styleOverrides: { tooltip: { fontSize: 12 } } },
      MuiTab: { styleOverrides: { root: { minHeight: 44 } } },
      MuiTabs: { styleOverrides: { root: { minHeight: 44 } } },
    },
  });
};
