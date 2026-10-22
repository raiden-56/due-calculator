import { Box, Button, Card, Chip, IconButton, InputAdornment, Menu, MenuItem, TextField, Tooltip, Typography } from '@mui/material';
import { Download, EllipsisVertical, Eye, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { selectActivePeople, selectAvailableYears, selectPayments, selectPeopleMap, selectRecordsMap } from '../../app/selectors';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import CurrencyDisplay from '../../components/common/CurrencyDisplay';
import PageHeader from '../../components/common/PageHeader';
import ResponsiveTable, { type Column } from '../../components/common/ResponsiveTable';
import { PAYMENT_METHODS, type Payment } from '../../types/models';
import { MONTH_NAMES, formatDate, monthOf, yearOf } from '../../utils/dates';
import { sumMoney } from '../../utils/money';
import { deletePayment } from '../data/dataSlice';
import { useExcelActions } from '../excel/useExcelActions';
import { openPaymentDialog, showSnackbar } from '../ui/uiSlice';

export default function PaymentsPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const payments = useAppSelector(selectPayments);
  const people = useAppSelector(selectPeopleMap);
  const activePeople = useAppSelector(selectActivePeople);
  const records = useAppSelector(selectRecordsMap);
  const years = useAppSelector(selectAvailableYears);
  const { exportCSV } = useExcelActions();
  const [search, setSearch] = useState('');
  const [person, setPerson] = useState('all');
  const [method, setMethod] = useState('all');
  const [year, setYear] = useState<'all' | number>('all');
  const [month, setMonth] = useState<'all' | number>('all');
  const [menu, setMenu] = useState<{ anchor: HTMLElement; row: Payment } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Payment | null>(null);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return payments.filter(
      (p) =>
        (person === 'all' || p.personId === person) &&
        (method === 'all' || p.method === method) &&
        (year === 'all' || yearOf(p.date) === year) &&
        (month === 'all' || monthOf(p.date) === month) &&
        (!q ||
          (people.get(p.personId)?.name ?? '').toLowerCase().includes(q) ||
          (records.get(p.recordId)?.description ?? '').toLowerCase().includes(q) ||
          (p.reference ?? '').toLowerCase().includes(q) ||
          p.id.toLowerCase().includes(q) ||
          (p.notes ?? '').toLowerCase().includes(q)),
    );
  }, [payments, search, person, method, year, month, people, records]);

  const total = useMemo(() => sumMoney(rows.map((r) => r.amount)), [rows]);

  const columns: Column<Payment>[] = [
    { key: 'date', header: 'Payment date', sortValue: (r) => r.date, render: (r) => formatDate(r.date) },
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
    { key: 'amount', header: 'Amount', align: 'right', secondary: true, sortValue: (r) => r.amount, render: (r) => <CurrencyDisplay value={r.amount} tone="received" variant="body2" /> },
    { key: 'method', header: 'Method', sortValue: (r) => r.method, render: (r) => <Chip size="small" label={r.method} variant="outlined" /> },
    {
      key: 'record',
      header: 'Related record',
      sortValue: (r) => records.get(r.recordId)?.description ?? '',
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
    { key: 'reference', header: 'Reference', hideOnMobile: true, render: (r) => r.reference || '—' },
    { key: 'notes', header: 'Notes', hideOnMobile: true, render: (r) => <Typography variant="body2" sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.notes || '—'}</Typography> },
  ];

  return (
    <Box>
      <PageHeader
        title="Payments"
        subtitle={`${payments.length} payments · complete history, each a separate transaction`}
        crumbs={[{ label: 'Dashboard', to: '/' }, { label: 'Payments' }]}
        actions={
          <>
            <Button variant="outlined" startIcon={<Download size={16} />} onClick={() => exportCSV('payments')} disabled={payments.length === 0}>
              CSV
            </Button>
            <Button variant="contained" startIcon={<Plus size={16} />} onClick={() => dispatch(openPaymentDialog())}>
              Add payment
            </Button>
          </>
        }
      />

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: '2fr 1fr 1fr 1fr 1fr' }, gap: 1.5, mb: 2 }}>
        <TextField
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search person, record, reference"
          sx={{ gridColumn: { xs: '1 / -1', md: 'auto' } }}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search size={16} /></InputAdornment> } }}
        />
        <TextField select value={person} onChange={(e) => setPerson(e.target.value)} label="Person">
          <MenuItem value="all">All people</MenuItem>
          {activePeople.map((p) => (
            <MenuItem key={p.id} value={p.id}>
              {p.name}
            </MenuItem>
          ))}
        </TextField>
        <TextField select value={method} onChange={(e) => setMethod(e.target.value)} label="Method">
          <MenuItem value="all">All methods</MenuItem>
          {PAYMENT_METHODS.map((m) => (
            <MenuItem key={m} value={m}>
              {m}
            </MenuItem>
          ))}
        </TextField>
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
      </Box>

      {rows.length > 0 && (
        <Card sx={{ p: 1.5, mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {rows.length} payment{rows.length === 1 ? '' : 's'} shown
          </Typography>
          <Typography variant="body2">
            Total received: <CurrencyDisplay value={total} tone="received" variant="body2" />
          </Typography>
        </Card>
      )}

      <ResponsiveTable
        rows={rows}
        columns={columns}
        rowKey={(r) => r.id}
        onRowClick={(r) => navigate(`/records/${r.recordId}`)}
        initialSort={{ key: 'date', direction: 'desc' }}
        emptyTitle={payments.length === 0 ? 'No payments yet' : 'No payments match these filters'}
        emptyDescription={payments.length === 0 ? 'Record the first payment you receive against a money record.' : undefined}
        emptyAction={payments.length === 0 ? { label: 'Add payment', onClick: () => dispatch(openPaymentDialog()) } : undefined}
        actions={(r) => (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Tooltip title="View record">
              <IconButton size="small" onClick={() => navigate(`/records/${r.recordId}`)} aria-label="view record">
                <Eye size={16} />
              </IconButton>
            </Tooltip>
            <IconButton size="small" onClick={(e) => setMenu({ anchor: e.currentTarget, row: r })} aria-label="more actions">
              <EllipsisVertical size={16} />
            </IconButton>
          </Box>
        )}
      />

      <Menu open={!!menu} anchorEl={menu?.anchor} onClose={() => setMenu(null)}>
        <MenuItem
          onClick={() => {
            if (menu) dispatch(openPaymentDialog({ editId: menu.row.id }));
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
        title="Delete this payment?"
        message={`Payment ${confirmDelete?.id} will be removed and the record's outstanding balance recalculated.`}
        confirmLabel="Delete"
        onConfirm={() => {
          if (confirmDelete) {
            dispatch(deletePayment(confirmDelete.id));
            dispatch(showSnackbar({ message: `Deleted payment ${confirmDelete.id}`, severity: 'info' }));
          }
          setConfirmDelete(null);
        }}
        onCancel={() => setConfirmDelete(null)}
      />
    </Box>
  );
}
