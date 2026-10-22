import { CssBaseline, ThemeProvider } from '@mui/material';
import { useMemo } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useAppSelector } from './app/hooks';
import AppShell from './components/layout/AppShell';
import { buildTheme } from './theme/theme';
import DashboardPage from './features/dashboard/DashboardPage';
import PeoplePage from './features/people/PeoplePage';
import MoneyRecordsPage from './features/records/MoneyRecordsPage';
import PaymentsPage from './features/payments/PaymentsPage';
import CashbackPage from './features/cashback/CashbackPage';
import MonthlyPage from './features/monthly/MonthlyPage';
import ReportsPage from './features/reports/ReportsPage';
import ExcelPage from './features/excel/ExcelPage';
import SettingsPage from './features/settings/SettingsPage';

export default function App() {
  const mode = useAppSelector((s) => s.ui.themeMode);
  const theme = useMemo(() => buildTheme(mode), [mode]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <HashRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<DashboardPage />} />
            <Route path="people" element={<PeoplePage />} />
            <Route path="people/:personId" element={<PeoplePage />} />
            <Route path="records" element={<MoneyRecordsPage />} />
            <Route path="records/:recordId" element={<MoneyRecordsPage />} />
            <Route path="payments" element={<PaymentsPage />} />
            <Route path="cashback" element={<CashbackPage />} />
            <Route path="monthly" element={<MonthlyPage />} />
            <Route path="monthly/:year/:month" element={<MonthlyPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="excel" element={<ExcelPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </HashRouter>
    </ThemeProvider>
  );
}
