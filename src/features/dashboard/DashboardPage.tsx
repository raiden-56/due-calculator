import { Box, Button, MenuItem, TextField } from '@mui/material';
import { BadgeIndianRupee, CircleCheck, Gift, HandCoins, TrendingUp, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import {
  selectAvailableYears,
  selectDataset,
  selectIsEmpty,
  selectPersonSummaries,
  selectStatusDistribution,
  selectTotals,
} from '../../app/selectors';
import ChartCard from '../../components/common/ChartCard';
import EmptyState from '../../components/common/EmptyState';
import PageHeader from '../../components/common/PageHeader';
import StatCard from '../../components/common/StatCard';
import { computeMonthlyBuckets } from '../../utils/calculations';
import { formatINR } from '../../utils/currency';
import { openRecordDialog, setImportDialogOpen } from '../ui/uiSlice';
import PeopleWhoOwe from './PeopleWhoOwe';
import RecentPayments from './RecentPayments';
import { CashbackChart, CollectionTrendChart, GivenVsReceivedChart, OutstandingByPersonChart, StatusDonut } from './charts';

export default function DashboardPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const data = useAppSelector(selectDataset);
  const totals = useAppSelector(selectTotals);
  const people = useAppSelector(selectPersonSummaries);
  const statusDist = useAppSelector(selectStatusDistribution);
  const years = useAppSelector(selectAvailableYears);
  const periodYear = useAppSelector((s) => s.ui.period.year);
  const isEmpty = useAppSelector(selectIsEmpty);
  const [year, setYear] = useState<number | 'all'>(periodYear);

  const buckets = useMemo(() => computeMonthlyBuckets(data, year === 'all' ? undefined : year), [data, year]);
  const hasMonthly = buckets.some((b) => b.given > 0 || b.received > 0);
  const hasCashback = buckets.some((b) => b.cashback > 0);
  const owing = useMemo(
    () => people.filter((p) => p.outstanding > 0).sort((a, b) => b.outstanding - a.outstanding).map((p) => ({ name: p.person.name, outstanding: p.outstanding })),
    [people],
  );

  if (isEmpty) {
    return (
      <Box>
        <PageHeader title="Dashboard" subtitle="Overview of money given, received and outstanding." />
        <EmptyState
          title="No data yet"
          description="Connect your Excel workbook (or create a new one) and every record you add is saved straight into it."
          actionLabel="Connect Excel file"
          onAction={() => navigate('/excel')}
        />
        <Box sx={{ textAlign: 'center', display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Button onClick={() => dispatch(setImportDialogOpen(true))}>Import a workbook</Button>
          <Button onClick={() => dispatch(openRecordDialog())}>Add a record first</Button>
        </Box>
      </Box>
    );
  }

  const yearFilter = (
    <TextField select size="small" value={year} onChange={(e) => setYear(e.target.value === 'all' ? 'all' : Number(e.target.value))} sx={{ minWidth: 120 }}>
      <MenuItem value="all">All time</MenuItem>
      {years.map((y) => (
        <MenuItem key={y} value={y}>
          {y}
        </MenuItem>
      ))}
    </TextField>
  );

  return (
    <Box>
      <PageHeader
        title="Dashboard"
        subtitle="Overview of money given, received and outstanding."
        actions={yearFilter}
      />

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)', xl: 'repeat(6, 1fr)' },
          gap: { xs: 1.5, md: 2 },
          mb: { xs: 2, md: 3 },
        }}
      >
        <StatCard label="Total Amount Given" value={formatINR(totals.totalGiven)} caption={`${totals.recordCount} records · original amounts`} icon={HandCoins} accent="primary" onClick={() => navigate('/records')} />
        <StatCard label="Total Received" value={formatINR(totals.totalReceived)} caption={`${totals.paymentCount} payments recorded`} icon={TrendingUp} accent="received" onClick={() => navigate('/payments')} />
        <StatCard
          label="Total Outstanding"
          value={formatINR(totals.totalOutstanding)}
          caption={totals.totalOverpaid > 0 ? `Still owed to me · ${formatINR(totals.totalOverpaid)} overpaid credit` : 'Still owed to me'}
          icon={BadgeIndianRupee}
          accent={totals.overdueRecords > 0 ? 'overdue' : 'pending'}
          onClick={() => navigate('/reports')}
        />
        <StatCard label="Total Cashback" value={formatINR(totals.totalCashback)} caption={totals.cashbackApplied > 0 ? `${formatINR(totals.cashbackApplied)} applied to debt` : 'Tracked separately from payments'} icon={Gift} accent="cashback" onClick={() => navigate('/cashback')} />
        <StatCard label="People With Pending Balances" value={String(totals.peopleWithPending)} caption={`of ${people.filter((p) => p.recordCount > 0).length} people with records`} icon={Users} accent="neutral" onClick={() => navigate('/people')} />
        <StatCard label="Fully Settled Records" value={String(totals.fullySettledRecords)} caption={`${totals.overdueRecords} overdue · ${totals.recordCount - totals.fullySettledRecords} open`} icon={CircleCheck} accent="received" onClick={() => navigate('/records')} />
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '3fr 2fr' }, gap: { xs: 1.5, md: 2 }, mb: { xs: 1.5, md: 2 } }}>
        <ChartCard title="Money given vs received" subtitle={year === 'all' ? 'All months with activity' : `Monthly, ${year}`} empty={!hasMonthly} emptyMessage="No money given or received in this period.">
          <GivenVsReceivedChart data={buckets} />
        </ChartCard>
        <ChartCard title="Payment status" subtitle="Share of records by status" empty={statusDist.length === 0}>
          <StatusDonut data={statusDist} total={totals.recordCount} />
        </ChartCard>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '2fr 3fr' }, gap: { xs: 1.5, md: 2 }, mb: { xs: 1.5, md: 2 } }}>
        <ChartCard title="Outstanding by person" subtitle="Top balances still owed" empty={owing.length === 0} emptyMessage="Everyone is settled.">
          <OutstandingByPersonChart data={owing} />
        </ChartCard>
        <ChartCard title="Monthly collection trend" subtitle="Received per month and running total" empty={!hasMonthly} emptyMessage="No payments in this period.">
          <CollectionTrendChart data={buckets} />
        </ChartCard>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: { xs: 1.5, md: 2 }, mb: { xs: 1.5, md: 2 } }}>
        <ChartCard title="Cashback summary" subtitle={`Total ${formatINR(totals.totalCashback)} · ${data.cashbacks.length} entries`} height={240} empty={!hasCashback} emptyMessage="No cashback recorded in this period.">
          <CashbackChart data={buckets} />
        </ChartCard>
        <PeopleWhoOwe />
      </Box>

      <RecentPayments limit={5} />
    </Box>
  );
}
