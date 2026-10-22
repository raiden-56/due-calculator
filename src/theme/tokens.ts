/**
 * Design tokens shared by MUI theme and charts. Chart colors were validated with the
 * dataviz palette validator in both light and dark modes (adjacent-pair CVD + normal
 * vision floors, contrast >= 3:1 on each surface).
 */
export const tokens = {
  light: {
    sidebar: '#0F172A',
    sidebarText: '#CBD5E1',
    sidebarActive: 'rgba(99, 102, 241, 0.18)',
    background: '#F5F7FB',
    surface: '#FFFFFF',
    border: '#E6E9F0',
    textPrimary: '#0F172A',
    textSecondary: '#64748B',
    primary: '#4F46E5',
    primaryDark: '#4338CA',
    received: '#059669',
    pending: '#D97706',
    overdue: '#DC2626',
    cashback: '#7C3AED',
    given: '#4F46E5',
    neutral: '#94A3B8',
    grid: '#EEF0F5',
  },
  dark: {
    sidebar: '#0B1220',
    sidebarText: '#CBD5E1',
    sidebarActive: 'rgba(129, 140, 248, 0.22)',
    background: '#0F172A',
    surface: '#1A2234',
    border: '#2A3447',
    textPrimary: '#F1F5F9',
    textSecondary: '#94A3B8',
    primary: '#818CF8',
    primaryDark: '#6366F1',
    received: '#059669',
    pending: '#D97706',
    overdue: '#EF4444',
    cashback: '#8B5CF6',
    given: '#6366F1',
    neutral: '#64748B',
    grid: '#263044',
  },
} as const;

export type ThemeTokens = Record<keyof (typeof tokens)['light'], string>;

export const radius = { sm: 8, md: 12, lg: 16 } as const;
export const SIDEBAR_WIDTH = 256;
export const SIDEBAR_COLLAPSED_WIDTH = 76;
export const TOPBAR_HEIGHT = 64;
