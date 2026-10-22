import { Box, Button, Card, Chip, IconButton, Menu, MenuItem, TextField, Typography } from '@mui/material';
import { Download, EllipsisVertical, Gift, Pencil, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { selectActivePeople, selectAvailableYears, selectCashbacks, selectDataset, selectPeopleMap, selectRecordsMap } from '../../app/selectors';
import ChartCard from '../../components/common/ChartCard';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import CurrencyDisplay from '../../components/common/CurrencyDisplay';
import PageHeader from '../../components/common/PageHeader';
import ResponsiveTable, { type Column } from '../../components/common/ResponsiveTable';
import StatCard from '../../components/common/StatCard';
import type { Cashback } from '../../types/models';
import { computeMonthlyBuckets } from '../../utils/calculations';
import { formatINR } from '../../utils/currency';
import { formatDate, yearOf } from '../../utils/dates';
import { sumMoney } from '../../utils/money';
import { CashbackChart } from '../dashboard/charts';
import { deleteCashback } from '../data/dataSlice';
import { useExcelActions } from '../excel/useExcelActions';
import { openCashbackDialog, showSnackbar } from '../ui/uiSlice';

export default function CashbackPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const data = useAppSelector(selectDataset);
  const cashbacks = useAppSelector(selectCashbacks);
  const people = useAppSelector(selectPeopleMap);
  const activePeople = useAppSelector(selectActivePeople);
  const records = useAppSelector(selectRecordsMap);
  const years = useAppSelector(selectAvailableYears);
  const periodYear = useAppSelector((s) => s.ui.period.year);
  const { exportCSV } = useExcelActions();
  const [person, setPerson] = useState('all');
  const [year, setYear] = useState<'all' | number>(periodYear);
  const [menu, setMenu] = useState<{ anchor: HTMLElement; row: Cashback } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Cashback | null>(null);

  const rows = useMemo(
    () => cashbacks.filter((c) => (person === 'all' || c.personId === person) && (year === 'all' || yearOf(c.date) === year)),
    [cashbacks, person, year],
  );
  const total = useMemo(() => sumMoney(rows.map((r) => r.amount)), [rows]);
  const applied = useMemo(() => sumMoney(rows.filter((r) => r.appliedToDebt).map((r) => r.amount)), [rows]);

  const byPerson = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of rows) map.set(c.personId, (map.get(c.personId) ?? 0) + c.amount);
    return [...map.entries()]
      .map(([id, amount]) => ({ id, name: people.get(id)?.name ?? 'Unknown', amount: sumMoney([amount]) }))
      .sort((a, b) => b.amount - a.amount);
  }, [rows, people]);

  const buckets = useMemo(() => {
    const filtered = { ...data, cashbacks: person === 'all' ? data.cashbacks : data.cashbacks.filter((c) => c.personId === person) };
    return computeMonthlyBuckets(filtered, year === 'all' ? undefined : year);
  }, [data, person, year]);

  const columns: Column<Cashback>[] = [
    { key: 'date', header: 'Date', sortValue: (r) => r.date, render: (r) => formatDate(r.date) },
    {
      key: 'person',
      header: 'Person',
      primary: true,
      sortValue: (r) => people.get(r.personId)?.name ?? '',
      render: (r) => (
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" sx={{ fontWeight: 700, overflowWrap: 'anywhere' }}>
            {people.get(r.personId)?.name ?? 'Unknown'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {r.id}
          </Typography>
        </Box>
      ),
    },
    { key: 'amount', header: 'Amount', align: 'right', secondary: true, sortValue: (r) => r.amount, render: (r) => <CurrencyDisplay value={r.amount} tone="cashback" variant="body2" /> },
    { key: 'source', header: 'Source', sortValue: (r) => r.source, render: (r) => r.source },
    {
      key: 'record',
      header: 'Related record',
      render: (r) => (
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" sx={{ overflowWrap: 'anywhere' }}>
            {records.get(r.recordId)?.description ?? '—'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {r.recordId}
          </Typography>
        </Box>
      ),
    },
    { key: 'applied', header: 'Applied to debt', sortValue: (r) => (r.appliedToDebt ? 1 : 0), render: (r) => <Chip size="small" label={r.appliedToDebt ? 'Applied' : 'Separate'} color={r.appliedToDebt ? 'secondary' : 'default'} variant={r.appliedToDebt ? 'filled' : 'outlined'} /> },
    { key: 'notes', header: 'Notes', hideOnMobile: true, render: (r) => r.notes || '—' },
  ];

  return (
    <Box>
      <PageHeader
        title="Cashback"
        subtitle="A separate metric. Cashback never counts as money received unless you explicitly apply it to a debt."
        crumbs={[{ label: 'Dashboard', to: '/' }, { label: 'Cashback' }]}
        actions={
          <>
            <Button variant="outlined" startIcon={<Download size={16} />} onClick={() => exportCSV('cashback')} disabled={cashbacks.length === 0}>
              CSV
            </Button>
            <Button variant="contained" startIcon={<Plus size={16} />} onClick={() => dispatch(openCashbackDialog())}>
              Add cashback
            </Button>
          </>
        }
      />

      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mb: 2 }}>
        <TextField select value={person} onChange={(e) => setPerson(e.target.value)} label="Person" sx={{ minWidth: 180, flex: '1 1 180px', maxWidth: 280 }}>
          <MenuItem value="all">All people</MenuItem>
          {activePeople.map((p) => (
            <MenuItem key={p.id} value={p.id}>
              {p.name}
            </MenuItem>
          ))}
        </TextField>
        <TextField select value={year} onChange={(e) => setYear(e.target.value === 'all' ? 'all' : Number(e.target.value))} label="Year" sx={{ minWidth: 130 }}>
          <MenuItem value="all">All years</MenuItem>
          {years.map((y) => (
            <MenuItem key={y} value={y}>
              {y}
            </MenuItem>
          ))}
        </TextField>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 1.5, mb: 2 }}>
        <StatCard label="Total cashback" value={formatINR(total)} caption={`${rows.length} entries in this view`} icon={Gift} accent="cashback" />
        <StatCard label="Applied to debt" value={formatINR(applied)} caption="Recorded as separate adjustments" icon={Gift} accent="received" />
        <StatCard label="Tracked separately" value={formatINR(sumMoney([total - applied]))} caption="Not deducted from what is owed" icon={Gift} accent="neutral" />
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '3fr 2fr' }, gap: 2, mb: 2 }}>
        <ChartCard title="Cashback by month" subtitle={year === 'all' ? 'All months with cashback' : String(year)} height={240} empty={!buckets.some((b) => b.cashback > 0)} emptyMessage="No cashback recorded in this period.">
          <CashbackChart data={buckets} />
        </ChartCard>
        <Card sx={{ p: { xs: 2, md: 2.5 } }}>
          <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 700 }}>
            Cashback by person
          </Typography>
          {byPerson.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              Nothing in this view yet.
            </Typography>
          ) : (
            byPerson.map((p) => (
              <Box key={p.id} onClick={() => navigate(`/people/${p.id}`)} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.75, cursor: 'pointer', borderBottom: (t) => `1px solid ${t.app.border}`, '&:last-child': { borderBottom: 'none' } }}>
                <Typography variant="body2" noWrap sx={{ minWidth: 0 }}>
                  {p.name}
                </Typography>
                <CurrencyDisplay value={p.amount} tone="cashback" variant="body2" />
              </Box>
            ))
          )}
        </Card>
      </Box>

      <ResponsiveTable
        rows={rows}
        columns={columns}
        rowKey={(r) => r.id}
        onRowClick={(r) => navigate(`/records/${r.recordId}`)}
        initialSort={{ key: 'date', direction: 'desc' }}
        emptyTitle={cashbacks.length === 0 ? 'No cashback recorded' : 'No cashback in this view'}
        emptyDescription={cashbacks.length === 0 ? 'Track card rewards and offers earned on amounts you paid for others.' : undefined}
        emptyAction={cashbacks.length === 0 ? { label: 'Add cashback', onClick: () => dispatch(openCashbackDialog()) } : undefined}
        actions={(r) => (
          <IconButton size="small" onClick={(e) => setMenu({ anchor: e.currentTarget, row: r })} aria-label="more actions">
            <EllipsisVertical size={16} />
          </IconButton>
        )}
      />

      <Menu open={!!menu} anchorEl={menu?.anchor} onClose={() => setMenu(null)}>
        <MenuItem
          onClick={() => {
            if (menu) dispatch(openCashbackDialog({ editId: menu.row.id }));
            setMenu(null);
          }}
        >
          <Pencil size={16} style={{ marginRight: 8 }} /> Edit
        </MenuItem>
        <MenuItem
          sx={{ color: 'error.main' }}
          onClick={() => {
            if (menu) setConfirmDelete(menu.row);
            setMenu(null);
          }}
        >
          <Trash2 size={16} style={{ marginRight: 8 }} /> Delete
        </MenuItem>
      </Menu>

      <ConfirmDialog
        open={!!confirmDelete}
        danger
        title="Delete this cashback entry?"
        message={`Cashback ${confirmDelete?.id} (${confirmDelete ? formatINR(confirmDelete.amount) : ''}) will be removed.`}
        confirmLabel="Delete"
        onConfirm={() => {
          if (confirmDelete) {
            dispatch(deleteCashback(confirmDelete.id));
            dispatch(showSnackbar({ message: `Deleted cashback ${confirmDelete.id}`, severity: 'info' }));
          }
          setConfirmDelete(null);
        }}
        onCancel={() => setConfirmDelete(null)}
      />
    </Box>
  );
}
