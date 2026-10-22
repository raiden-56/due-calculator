import { Box, Button, Card, Chip, MenuItem, Tab, Tabs, TextField, Typography } from '@mui/material';
import { Download, FileSpreadsheet } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { selectActivePeople, selectAvailableYears, selectDataset, selectPeopleMap, selectPersonSummaries, selectRecordSummaries } from '../../app/selectors';
import CurrencyDisplay from '../../components/common/CurrencyDisplay';
import PageHeader from '../../components/common/PageHeader';
import ResponsiveTable, { type Column } from '../../components/common/ResponsiveTable';
import StatusChip from '../../components/common/StatusChip';
import { CATEGORIES, RECORD_STATUSES, type PersonSummary, type RecordSummary } from '../../types/models';
import { computeMonthlyBuckets } from '../../utils/calculations';
import { formatINR, formatPercent } from '../../utils/currency';
import { MONTH_NAMES, formatDate, monthOf, yearOf } from '../../utils/dates';
import { downloadText, timestampForFile } from '../../utils/download';
import { percentOf, sumMoney } from '../../utils/money';
import { toCSV } from '../excel/csvExport';
import { useExcelActions } from '../excel/useExcelActions';
import { showSnackbar } from '../ui/uiSlice';

const REPORTS = [
  { key: 'person', label: 'Person-wise outstanding' },
  { key: 'payments', label: 'Payment history' },
  { key: 'given', label: 'Monthly money given' },
  { key: 'received', label: 'Monthly money received' },
  { key: 'cashback', label: 'Cashback' },
  { key: 'settled', label: 'Fully settled' },
  { key: 'pending', label: 'Pending records' },
  { key: 'overdue', label: 'Overdue records' },
] as const;
type ReportKey = (typeof REPORTS)[number]['key'];

interface PaymentRow {
  id: string;
  date: string;
  person: string;
  personId: string;
  recordId: string;
  description: string;
  amount: number;
  method: string;
  reference: string;
}
interface CashbackRow {
  id: string;
  date: string;
  person: string;
  recordId: string;
  amount: number;
  source: string;
  applied: boolean;
}
interface MonthRow {
  key: string;
  label: string;
  amount: number;
  count: number;
}

export default function ReportsPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const data = useAppSelector(selectDataset);
  const recordSummaries = useAppSelector(selectRecordSummaries);
  const personSummaries = useAppSelector(selectPersonSummaries);
  const people = useAppSelector(selectPeopleMap);
  const activePeople = useAppSelector(selectActivePeople);
  const years = useAppSelector(selectAvailableYears);
  const { exportWorkbook } = useExcelActions();
  const [report, setReport] = useState<ReportKey>('person');
  const [year, setYear] = useState<'all' | number>('all');
  const [month, setMonth] = useState<'all' | number>('all');
  const [person, setPerson] = useState('all');
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState('all');

  const inPeriod = (iso: string) => (year === 'all' || yearOf(iso) === year) && (month === 'all' || monthOf(iso) === month);

  const filteredRecords = useMemo(
    () =>
      recordSummaries.filter(
        (s) =>
          inPeriod(s.record.dateGiven) &&
          (person === 'all' || s.record.personId === person) &&
          (category === 'all' || s.record.category === category) &&
          (status === 'all' || s.status === status),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [recordSummaries, year, month, person, category, status],
  );

  const personRows = useMemo<PersonSummary[]>(() => {
    const ids = new Set(filteredRecords.map((r) => r.record.personId));
    return personSummaries.filter((p) => ids.has(p.person.id) && (person === 'all' || p.person.id === person)).sort((a, b) => b.outstanding - a.outstanding);
  }, [personSummaries, filteredRecords, person]);

  const paymentRows = useMemo<PaymentRow[]>(() => {
    const recordIds = new Set(recordSummaries.filter((s) => (category === 'all' || s.record.category === category) && (status === 'all' || s.status === status)).map((s) => s.record.id));
    return data.payments
      .filter((p) => inPeriod(p.date) && (person === 'all' || p.personId === person) && recordIds.has(p.recordId))
      .map((p) => ({
        id: p.id,
        date: p.date,
        person: people.get(p.personId)?.name ?? 'Unknown',
        personId: p.personId,
        recordId: p.recordId,
        description: data.records.find((r) => r.id === p.recordId)?.description ?? '',
        amount: p.amount,
        method: p.method,
        reference: p.reference ?? '',
      }))
      .sort((a, b) => b.date.localeCompare(a.date));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, recordSummaries, year, month, person, category, status, people]);

  const cashbackRows = useMemo<CashbackRow[]>(
    () =>
      data.cashbacks
        .filter((c) => inPeriod(c.date) && (person === 'all' || c.personId === person))
        .map((c) => ({ id: c.id, date: c.date, person: people.get(c.personId)?.name ?? 'Unknown', recordId: c.recordId, amount: c.amount, source: c.source, applied: c.appliedToDebt }))
        .sort((a, b) => b.date.localeCompare(a.date)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, year, month, person, people],
  );

  const monthRows = useMemo<MonthRow[]>(() => {
    const subset = {
      ...data,
      records: data.records.filter((r) => (person === 'all' || r.personId === person) && (category === 'all' || r.category === category)),
      payments: data.payments.filter((p) => person === 'all' || p.personId === person),
    };
    return computeMonthlyBuckets(subset, year === 'all' ? undefined : year)
      .filter((b) => month === 'all' || b.month === month)
      .map((b) => ({
        key: b.key,
        label: b.label,
        amount: report === 'given' ? b.given : b.received,
        count: report === 'given' ? b.recordCount : b.paymentCount,
      }));
  }, [data, year, month, person, category, report]);

  const recordColumns: Column<RecordSummary>[] = [
    {
      key: 'description',
      header: 'Record',
      primary: true,
      sortValue: (r) => r.record.description,
      render: (r) => (
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" sx={{ fontWeight: 700, overflowWrap: 'anywhere' }}>
            {r.record.description}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {r.record.id} · {r.record.category}
          </Typography>
        </Box>
      ),
    },
    { key: 'person', header: 'Person', sortValue: (r) => r.personName, render: (r) => r.personName },
    { key: 'date', header: 'Date given', sortValue: (r) => r.record.dateGiven, render: (r) => formatDate(r.record.dateGiven) },
    { key: 'due', header: 'Due', sortValue: (r) => r.record.dueDate ?? '', render: (r) => (r.isOverdue ? <Typography variant="body2" color="error.main" sx={{ fontWeight: 700 }}>{formatDate(r.record.dueDate)} · {r.daysOverdue}d</Typography> : formatDate(r.record.dueDate)) },
    { key: 'original', header: 'Original', align: 'right', sortValue: (r) => r.record.originalAmount, render: (r) => <CurrencyDisplay value={r.record.originalAmount} variant="body2" /> },
    { key: 'received', header: 'Received', align: 'right', sortValue: (r) => r.totalPaid, render: (r) => <CurrencyDisplay value={r.totalPaid} tone="received" variant="body2" dimZero /> },
    { key: 'outstanding', header: 'Outstanding', align: 'right', sortValue: (r) => r.outstanding, render: (r) => <CurrencyDisplay value={r.outstanding} tone={r.isOverdue ? 'overdue' : 'pending'} variant="body2" dimZero /> },
    { key: 'status', header: 'Status', secondary: true, render: (r) => <StatusChip status={r.status} /> },
  ];

  const personColumns: Column<PersonSummary>[] = [
    { key: 'name', header: 'Person', primary: true, sortValue: (r) => r.person.name, render: (r) => <Typography variant="body2" sx={{ fontWeight: 700 }}>{r.person.name}</Typography> },
    { key: 'records', header: 'Records', align: 'right', sortValue: (r) => r.recordCount, render: (r) => `${r.recordCount} (${r.pendingRecords} open)` },
    { key: 'given', header: 'Total given', align: 'right', sortValue: (r) => r.totalGiven, render: (r) => <CurrencyDisplay value={r.totalGiven} variant="body2" /> },
    { key: 'paid', header: 'Total paid', align: 'right', sortValue: (r) => r.totalPaid, render: (r) => <CurrencyDisplay value={r.totalPaid} tone="received" variant="body2" dimZero /> },
    { key: 'cashback', header: 'Cashback', align: 'right', hideOnMobile: true, sortValue: (r) => r.totalCashback, render: (r) => <CurrencyDisplay value={r.totalCashback} tone="cashback" variant="body2" dimZero /> },
    { key: 'outstanding', header: 'Outstanding', align: 'right', sortValue: (r) => r.outstanding, render: (r) => <CurrencyDisplay value={r.outstanding} tone={r.status === 'Overdue' ? 'overdue' : 'pending'} variant="body2" dimZero /> },
    { key: 'pct', header: 'Collected', align: 'right', sortValue: (r) => percentOf(r.totalPaid + r.cashbackApplied, r.totalGiven), render: (r) => formatPercent(percentOf(r.totalPaid + r.cashbackApplied, r.totalGiven)) },
    { key: 'status', header: 'Status', secondary: true, render: (r) => <StatusChip status={r.status} /> },
  ];

  const paymentColumns: Column<PaymentRow>[] = [
    { key: 'date', header: 'Date', sortValue: (r) => r.date, render: (r) => formatDate(r.date) },
    { key: 'person', header: 'Person', primary: true, sortValue: (r) => r.person, render: (r) => <Typography variant="body2" sx={{ fontWeight: 700 }}>{r.person}</Typography> },
    { key: 'record', header: 'Record', render: (r) => <Box sx={{ minWidth: 0 }}><Typography variant="body2" sx={{ overflowWrap: 'anywhere' }}>{r.description}</Typography><Typography variant="caption" color="text.secondary">{r.recordId}</Typography></Box> },
    { key: 'amount', header: 'Amount', align: 'right', secondary: true, sortValue: (r) => r.amount, render: (r) => <CurrencyDisplay value={r.amount} tone="received" variant="body2" /> },
    { key: 'method', header: 'Method', render: (r) => <Chip size="small" variant="outlined" label={r.method} /> },
    { key: 'reference', header: 'Reference', hideOnMobile: true, render: (r) => r.reference || '—' },
  ];

  const cashbackColumns: Column<CashbackRow>[] = [
    { key: 'date', header: 'Date', sortValue: (r) => r.date, render: (r) => formatDate(r.date) },
    { key: 'person', header: 'Person', primary: true, sortValue: (r) => r.person, render: (r) => <Typography variant="body2" sx={{ fontWeight: 700 }}>{r.person}</Typography> },
    { key: 'source', header: 'Source', render: (r) => r.source },
    { key: 'record', header: 'Record', hideOnMobile: true, render: (r) => r.recordId },
    { key: 'amount', header: 'Amount', align: 'right', secondary: true, sortValue: (r) => r.amount, render: (r) => <CurrencyDisplay value={r.amount} tone="cashback" variant="body2" /> },
    { key: 'applied', header: 'Applied to debt', render: (r) => (r.applied ? 'Yes' : 'No') },
  ];

  const monthColumns: Column<MonthRow>[] = [
    { key: 'label', header: 'Month', primary: true, sortValue: (r) => r.key, render: (r) => <Typography variant="body2" sx={{ fontWeight: 700 }}>{r.label}</Typography> },
    { key: 'count', header: report === 'given' ? 'Records' : 'Payments', align: 'right', sortValue: (r) => r.count, render: (r) => r.count },
    { key: 'amount', header: report === 'given' ? 'Money given' : 'Money received', align: 'right', secondary: true, sortValue: (r) => r.amount, render: (r) => <CurrencyDisplay value={r.amount} tone={report === 'given' ? 'default' : 'received'} variant="body2" dimZero /> },
  ];

  const settledRows = filteredRecords.filter((r) => r.status === 'Settled');
  const pendingRows = filteredRecords.filter((r) => r.outstanding > 0 && !r.isOverdue);
  const overdueRows = filteredRecords.filter((r) => r.isOverdue);

  const summary = (() => {
    switch (report) {
      case 'person':
        return { count: personRows.length, label: 'Total outstanding', amount: sumMoney(personRows.map((p) => p.outstanding)) };
      case 'payments':
        return { count: paymentRows.length, label: 'Total received', amount: sumMoney(paymentRows.map((p) => p.amount)) };
      case 'cashback':
        return { count: cashbackRows.length, label: 'Total cashback', amount: sumMoney(cashbackRows.map((c) => c.amount)) };
      case 'given':
      case 'received':
        return { count: monthRows.reduce((a, b) => a + b.count, 0), label: report === 'given' ? 'Total given' : 'Total received', amount: sumMoney(monthRows.map((m) => m.amount)) };
      case 'settled':
        return { count: settledRows.length, label: 'Original amount settled', amount: sumMoney(settledRows.map((r) => r.record.originalAmount)) };
      case 'pending':
        return { count: pendingRows.length, label: 'Outstanding', amount: sumMoney(pendingRows.map((r) => r.outstanding)) };
      case 'overdue':
        return { count: overdueRows.length, label: 'Overdue amount', amount: sumMoney(overdueRows.map((r) => r.outstanding)) };
    }
  })();

  const exportCurrentCSV = () => {
    const name = REPORTS.find((r) => r.key === report)!.label.replace(/\s+/g, '_');
    let csv = '';
    if (report === 'person') {
      csv = toCSV(['Person', 'Records', 'Total Given', 'Total Paid', 'Cashback', 'Outstanding', 'Overpaid', 'Status'], personRows.map((p) => [p.person.name, p.recordCount, p.totalGiven, p.totalPaid, p.totalCashback, p.outstanding, p.overpaid, p.status]));
    } else if (report === 'payments') {
      csv = toCSV(['Date', 'Person', 'Record ID', 'Description', 'Amount', 'Method', 'Reference', 'Payment ID'], paymentRows.map((p) => [p.date, p.person, p.recordId, p.description, p.amount, p.method, p.reference, p.id]));
    } else if (report === 'cashback') {
      csv = toCSV(['Date', 'Person', 'Record ID', 'Source', 'Amount', 'Applied To Debt', 'Cashback ID'], cashbackRows.map((c) => [c.date, c.person, c.recordId, c.source, c.amount, c.applied ? 'Yes' : 'No', c.id]));
    } else if (report === 'given' || report === 'received') {
      csv = toCSV(['Month', report === 'given' ? 'Records' : 'Payments', 'Amount'], monthRows.map((m) => [m.label, m.count, m.amount]));
    } else {
      const rows = report === 'settled' ? settledRows : report === 'pending' ? pendingRows : overdueRows;
      csv = toCSV(['Record ID', 'Person', 'Description', 'Category', 'Date Given', 'Due Date', 'Original', 'Received', 'Outstanding', 'Status', 'Days Overdue'], rows.map((r) => [r.record.id, r.personName, r.record.description, r.record.category, r.record.dateGiven, r.record.dueDate ?? '', r.record.originalAmount, r.totalPaid, r.outstanding, r.status, r.daysOverdue]));
    }
    downloadText(csv, `MyMoney_Report_${name}_${timestampForFile()}.csv`, 'text/csv;charset=utf-8');
    dispatch(showSnackbar({ message: 'Report CSV downloaded', severity: 'info' }));
  };

  const showsRecordFilters = report !== 'cashback';

  return (
    <Box>
      <PageHeader
        title="Reports"
        subtitle="Filter by period, person, category and status. Totals update instantly."
        crumbs={[{ label: 'Dashboard', to: '/' }, { label: 'Reports' }]}
        actions={
          <>
            <Button variant="outlined" startIcon={<Download size={16} />} onClick={exportCurrentCSV} disabled={summary.count === 0}>
              Report CSV
            </Button>
            <Button variant="contained" startIcon={<FileSpreadsheet size={16} />} onClick={() => exportWorkbook({ year: year === 'all' ? undefined : year })}>
              Export Excel
            </Button>
          </>
        }
      />

      <Card sx={{ mb: 2 }}>
        <Tabs value={report} onChange={(_, v) => setReport(v)} variant="scrollable" scrollButtons="auto" allowScrollButtonsMobile sx={{ px: 1 }}>
          {REPORTS.map((r) => (
            <Tab key={r.key} value={r.key} label={r.label} />
          ))}
        </Tabs>
      </Card>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(5, 1fr)' }, gap: 1.5, mb: 2 }}>
        <TextField select value={year} onChange={(e) => setYear(e.target.value === 'all' ? 'all' : Number(e.target.value))} label="Year">
          <MenuItem value="all">All years</MenuItem>
          {years.map((y) => (
            <MenuItem key={y} value={y}>
              {y}
            </MenuItem>
          ))}
        </TextField>
        <TextField select value={month} onChange={(e) => setMonth(e.target.value === 'all' ? 'all' : Number(e.target.value))} label="Month">
          <MenuItem value="all">All months</MenuItem>
          {MONTH_NAMES.map((m, i) => (
            <MenuItem key={m} value={i + 1}>
              {m}
            </MenuItem>
          ))}
        </TextField>
        <TextField select value={person} onChange={(e) => setPerson(e.target.value)} label="Person">
          <MenuItem value="all">All people</MenuItem>
          {activePeople.map((p) => (
            <MenuItem key={p.id} value={p.id}>
              {p.name}
            </MenuItem>
          ))}
        </TextField>
        {showsRecordFilters && (
          <TextField select value={category} onChange={(e) => setCategory(e.target.value)} label="Category">
            <MenuItem value="all">All categories</MenuItem>
            {CATEGORIES.map((c) => (
              <MenuItem key={c} value={c}>
                {c}
              </MenuItem>
            ))}
          </TextField>
        )}
        {showsRecordFilters && !['settled', 'pending', 'overdue', 'given', 'received'].includes(report) && (
          <TextField select value={status} onChange={(e) => setStatus(e.target.value)} label="Status">
            <MenuItem value="all">All statuses</MenuItem>
            {RECORD_STATUSES.map((s) => (
              <MenuItem key={s} value={s}>
                {s}
              </MenuItem>
            ))}
          </TextField>
        )}
      </Box>

      <Card sx={{ p: 1.5, mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="body2" color="text.secondary">
          {summary.count} row{summary.count === 1 ? '' : 's'}
        </Typography>
        <Typography variant="body2">
          {summary.label}: <Typography component="span" sx={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{formatINR(summary.amount)}</Typography>
        </Typography>
      </Card>

      {report === 'person' && <ResponsiveTable rows={personRows} columns={personColumns} rowKey={(r) => r.person.id} onRowClick={(r) => navigate(`/people/${r.person.id}`)} initialSort={{ key: 'outstanding', direction: 'desc' }} emptyTitle="No people match these filters" />}
      {report === 'payments' && <ResponsiveTable rows={paymentRows} columns={paymentColumns} rowKey={(r) => r.id} onRowClick={(r) => navigate(`/records/${r.recordId}`)} initialSort={{ key: 'date', direction: 'desc' }} emptyTitle="No payments in this period" />}
      {report === 'cashback' && <ResponsiveTable rows={cashbackRows} columns={cashbackColumns} rowKey={(r) => r.id} onRowClick={(r) => navigate(`/records/${r.recordId}`)} initialSort={{ key: 'date', direction: 'desc' }} emptyTitle="No cashback in this period" />}
      {(report === 'given' || report === 'received') && <ResponsiveTable rows={monthRows} columns={monthColumns} rowKey={(r) => r.key} onRowClick={(r) => navigate(`/monthly/${r.key.slice(0, 4)}/${Number(r.key.slice(5, 7))}`)} initialSort={{ key: 'label', direction: 'asc' }} disablePagination emptyTitle="No months to show" />}
      {report === 'settled' && <ResponsiveTable rows={settledRows} columns={recordColumns} rowKey={(r) => r.record.id} onRowClick={(r) => navigate(`/records/${r.record.id}`)} initialSort={{ key: 'date', direction: 'desc' }} emptyTitle="No fully settled records" emptyDescription="Records whose outstanding balance is exactly zero appear here." />}
      {report === 'pending' && <ResponsiveTable rows={pendingRows} columns={recordColumns} rowKey={(r) => r.record.id} onRowClick={(r) => navigate(`/records/${r.record.id}`)} initialSort={{ key: 'outstanding', direction: 'desc' }} emptyTitle="No pending records" emptyDescription="Records with a balance that is not yet overdue." />}
      {report === 'overdue' && <ResponsiveTable rows={overdueRows} columns={recordColumns} rowKey={(r) => r.record.id} onRowClick={(r) => navigate(`/records/${r.record.id}`)} initialSort={{ key: 'due', direction: 'asc' }} emptyTitle="Nothing overdue" emptyDescription="Records with a due date in the past and a remaining balance appear here." />}
    </Box>
  );
}
