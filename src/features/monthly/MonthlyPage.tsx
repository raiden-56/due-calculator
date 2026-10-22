import { Box, Button, Card, Chip, Tab, Tabs, Typography, useMediaQuery, useTheme } from '@mui/material';
import { BadgeIndianRupee, Download, Gift, HandCoins, ReceiptIndianRupee, TrendingUp } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { selectAvailableYears, selectDataset, selectPeopleMap, selectRecordSummaryMap, selectTotals } from '../../app/selectors';
import ChartCard from '../../components/common/ChartCard';
import CurrencyDisplay from '../../components/common/CurrencyDisplay';
import MonthSelector from '../../components/common/MonthSelector';
import PageHeader from '../../components/common/PageHeader';
import ResponsiveTable, { type Column } from '../../components/common/ResponsiveTable';
import StatCard from '../../components/common/StatCard';
import StatusChip from '../../components/common/StatusChip';
import { computeMonthlyBuckets, filterByMonth } from '../../utils/calculations';
import { formatINR, formatINRCompact } from '../../utils/currency';
import { MONTH_NAMES, MONTH_SHORT, currentMonth, formatDate, monthLongLabel } from '../../utils/dates';
import { downloadText, timestampForFile } from '../../utils/download';
import { GivenVsReceivedChart } from '../dashboard/charts';
import { toCSV } from '../excel/csvExport';
import { useExcelActions } from '../excel/useExcelActions';
import { setPeriod, showSnackbar } from '../ui/uiSlice';

interface Txn {
  id: string;
  date: string;
  kind: 'Given' | 'Payment' | 'Cashback';
  person: string;
  detail: string;
  amount: number;
  recordId: string;
  status?: string;
}

export default function MonthlyPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const params = useParams();
  const data = useAppSelector(selectDataset);
  const totals = useAppSelector(selectTotals);
  const people = useAppSelector(selectPeopleMap);
  const recordSummaries = useAppSelector(selectRecordSummaryMap);
  const years = useAppSelector(selectAvailableYears);
  const period = useAppSelector((s) => s.ui.period);
  const { exportWorkbook } = useExcelActions();

  const year = params.year ? Number(params.year) : period.year;
  const month = params.month ? Number(params.month) : (period.month ?? currentMonth());

  useEffect(() => {
    if (params.year && params.month && (Number(params.year) !== period.year || Number(params.month) !== period.month)) {
      dispatch(setPeriod({ year: Number(params.year), month: Number(params.month) }));
    }
  }, [params.year, params.month, period.year, period.month, dispatch]);

  const go = (y: number, m: number | null) => {
    const mm = m ?? currentMonth();
    dispatch(setPeriod({ year: y, month: mm }));
    navigate(`/monthly/${y}/${mm}`);
  };

  const buckets = useMemo(() => computeMonthlyBuckets(data, year), [data, year]);
  const bucket = buckets[month - 1];

  const txns = useMemo<Txn[]>(() => {
    const given = filterByMonth(data.records, (r) => r.dateGiven, year, month).map<Txn>((r) => ({
      id: r.id,
      date: r.dateGiven,
      kind: 'Given',
      person: people.get(r.personId)?.name ?? 'Unknown',
      detail: `${r.description} · ${r.category}`,
      amount: r.originalAmount,
      recordId: r.id,
      status: recordSummaries.get(r.id)?.status,
    }));
    const paid = filterByMonth(data.payments, (p) => p.date, year, month).map<Txn>((p) => ({
      id: p.id,
      date: p.date,
      kind: 'Payment',
      person: people.get(p.personId)?.name ?? 'Unknown',
      detail: `${p.method}${p.reference ? ` · ${p.reference}` : ''} · ${p.recordId}`,
      amount: p.amount,
      recordId: p.recordId,
    }));
    const cb = filterByMonth(data.cashbacks, (c) => c.date, year, month).map<Txn>((c) => ({
      id: c.id,
      date: c.date,
      kind: 'Cashback',
      person: people.get(c.personId)?.name ?? 'Unknown',
      detail: `${c.source}${c.appliedToDebt ? ' · applied to debt' : ''} · ${c.recordId}`,
      amount: c.amount,
      recordId: c.recordId,
    }));
    return [...given, ...paid, ...cb].sort((a, b) => b.date.localeCompare(a.date));
  }, [data, year, month, people, recordSummaries]);

  const exportMonthCSV = () => {
    downloadText(
      toCSV(
        ['Date', 'Type', 'Person', 'Details', 'Amount', 'Record ID', 'ID'],
        txns.map((t) => [t.date, t.kind, t.person, t.detail, t.amount, t.recordId, t.id]),
      ),
      `MyMoney_${MONTH_SHORT[month - 1]}_${year}_${timestampForFile()}.csv`,
      'text/csv;charset=utf-8',
    );
    dispatch(showSnackbar({ message: `${monthLongLabel(year, month)} exported as CSV`, severity: 'info' }));
  };

  const columns: Column<Txn>[] = [
    { key: 'date', header: 'Date', sortValue: (r) => r.date, render: (r) => formatDate(r.date) },
    {
      key: 'kind',
      header: 'Type',
      secondary: true,
      sortValue: (r) => r.kind,
      render: (r) => (
        <Chip
          size="small"
          label={r.kind}
          sx={{
            bgcolor: r.kind === 'Given' ? theme.app.given : r.kind === 'Payment' ? theme.app.received : theme.app.cashback,
            color: '#fff',
          }}
        />
      ),
    },
    {
      key: 'person',
      header: 'Person',
      primary: true,
      sortValue: (r) => r.person,
      render: (r) => (
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" sx={{ fontWeight: 700, overflowWrap: 'anywhere' }}>
            {r.person}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>
            {r.detail}
          </Typography>
        </Box>
      ),
    },
    { key: 'amount', header: 'Amount', align: 'right', sortValue: (r) => r.amount, render: (r) => <CurrencyDisplay value={r.amount} tone={r.kind === 'Given' ? 'default' : r.kind === 'Payment' ? 'received' : 'cashback'} variant="body2" /> },
    { key: 'status', header: 'Record status', hideOnMobile: true, render: (r) => (r.status ? <StatusChip status={r.status as 'Pending'} /> : '—') },
  ];

  return (
    <Box>
      <PageHeader
        title={`${MONTH_NAMES[month - 1]} ${year}`}
        subtitle="Money given is grouped by date given, payments by payment date, cashback by cashback date. Outstanding is the current total, not a new debt each month."
        crumbs={[{ label: 'Dashboard', to: '/' }, { label: 'Monthly Overview' }]}
        actions={
          <>
            <Button variant="outlined" startIcon={<Download size={16} />} onClick={exportMonthCSV} disabled={txns.length === 0}>
              Month CSV
            </Button>
            <Button variant="contained" startIcon={<Download size={16} />} onClick={() => exportWorkbook({ year })}>
              Excel ({year})
            </Button>
          </>
        }
      />

      <Card sx={{ p: 1.5, mb: 2, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: { md: 'center' }, gap: 1.5 }}>
        <MonthSelector year={year} month={month} years={years} allowWholeYear={false} onChange={({ year: y, month: m }) => go(y, m)} />
        <Tabs
          value={month}
          onChange={(_, v) => go(year, v)}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{ flex: 1, minHeight: 36, '& .MuiTab-root': { minHeight: 36, minWidth: 48, py: 0.5 } }}
        >
          {MONTH_SHORT.map((m, i) => {
            const b = buckets[i];
            const active = b.given > 0 || b.received > 0 || b.cashback > 0;
            return <Tab key={m} value={i + 1} label={m} sx={{ fontWeight: active ? 700 : 400, opacity: active ? 1 : 0.6 }} />;
          })}
        </Tabs>
      </Card>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(5, 1fr)' }, gap: 1.5, mb: 2 }}>
        <StatCard label="Given this month" value={formatINR(bucket.given)} caption={`${bucket.recordCount} record${bucket.recordCount === 1 ? '' : 's'} created`} icon={HandCoins} accent="primary" />
        <StatCard label="Received this month" value={formatINR(bucket.received)} caption={`${bucket.paymentCount} payment transaction${bucket.paymentCount === 1 ? '' : 's'}`} icon={TrendingUp} accent="received" />
        <StatCard label="Cashback this month" value={formatINR(bucket.cashback)} caption={`${bucket.cashbackCount} entr${bucket.cashbackCount === 1 ? 'y' : 'ies'}`} icon={Gift} accent="cashback" />
        <StatCard label="Payment transactions" value={String(bucket.paymentCount)} caption="Counted by payment date" icon={ReceiptIndianRupee} accent="neutral" />
        <StatCard label="Outstanding (current)" value={formatINR(totals.totalOutstanding)} caption="Across all records, as of today" icon={BadgeIndianRupee} accent={totals.overdueRecords > 0 ? 'overdue' : 'pending'} />
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '3fr 2fr' }, gap: 2, mb: 2 }}>
        <ChartCard title={`Given vs received, ${year}`} subtitle="Click a month tab above to drill in" height={isMobile ? 220 : 260} empty={!buckets.some((b) => b.given > 0 || b.received > 0)} emptyMessage={`No activity recorded in ${year}.`}>
          <GivenVsReceivedChart data={buckets} />
        </ChartCard>
        <Card sx={{ p: { xs: 2, md: 2.5 } }}>
          <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 700 }}>
            {year} at a glance
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'auto 1fr 1fr 1fr', columnGap: 1.5, rowGap: 0.5, fontSize: 13, alignItems: 'center' }}>
            <Typography variant="caption" color="text.secondary">
              Month
            </Typography>
            <Typography variant="caption" color="text.secondary" align="right">
              Given
            </Typography>
            <Typography variant="caption" color="text.secondary" align="right">
              Received
            </Typography>
            <Typography variant="caption" color="text.secondary" align="right">
              Cashback
            </Typography>
            {buckets.map((b) => (
              <Box key={b.key} sx={{ display: 'contents' }}>
                <Button size="small" onClick={() => go(year, b.month)} sx={{ justifyContent: 'flex-start', minWidth: 0, px: 0.5, fontWeight: b.month === month ? 800 : 500 }}>
                  {MONTH_SHORT[b.month - 1]}
                </Button>
                <Typography variant="body2" align="right" sx={{ fontVariantNumeric: 'tabular-nums', color: b.given ? 'text.primary' : 'text.disabled' }}>
                  {formatINRCompact(b.given)}
                </Typography>
                <Typography variant="body2" align="right" sx={{ fontVariantNumeric: 'tabular-nums', color: b.received ? theme.app.received : 'text.disabled' }}>
                  {formatINRCompact(b.received)}
                </Typography>
                <Typography variant="body2" align="right" sx={{ fontVariantNumeric: 'tabular-nums', color: b.cashback ? theme.app.cashback : 'text.disabled' }}>
                  {formatINRCompact(b.cashback)}
                </Typography>
              </Box>
            ))}
          </Box>
        </Card>
      </Box>

      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
        Transactions in {MONTH_NAMES[month - 1]} {year} ({txns.length})
      </Typography>
      <ResponsiveTable
        rows={txns}
        columns={columns}
        rowKey={(r) => `${r.kind}-${r.id}`}
        onRowClick={(r) => navigate(`/records/${r.recordId}`)}
        initialSort={{ key: 'date', direction: 'desc' }}
        emptyTitle={`Nothing happened in ${MONTH_NAMES[month - 1]} ${year}`}
        emptyDescription="No money was given, received, or earned as cashback in this month."
      />
    </Box>
  );
}
