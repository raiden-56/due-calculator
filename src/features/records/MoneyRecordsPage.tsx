import { Box, Button, Card, InputAdornment, Menu, MenuItem, TextField, Typography } from '@mui/material';
import { Gift, Pencil, Plus, ReceiptIndianRupee, Search, Trash2 } from 'lucide-react';
import { type ReactNode, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { selectActivePeople, selectRecordSummaries } from '../../app/selectors';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import CurrencyDisplay from '../../components/common/CurrencyDisplay';
import PageHeader from '../../components/common/PageHeader';
import { CATEGORIES, RECORD_STATUSES, type RecordSummary } from '../../types/models';
import { sumMoney } from '../../utils/money';
import { deleteRecord } from '../data/dataSlice';
import { openCashbackDialog, openPaymentDialog, openRecordDialog, showSnackbar } from '../ui/uiSlice';
import MoneyRecordsTable from './MoneyRecordsTable';
import RecordDetailsDrawer from './RecordDetailsDrawer';

export default function MoneyRecordsPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { recordId } = useParams();
  const summaries = useAppSelector(selectRecordSummaries);
  const people = useAppSelector(selectActivePeople);
  const globalSearch = useAppSelector((s) => s.ui.globalSearch);
  const [search, setSearch] = useState(globalSearch);
  const [person, setPerson] = useState('all');
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState('all');
  const [menu, setMenu] = useState<{ anchor: HTMLElement; row: RecordSummary } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<RecordSummary | null>(null);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return summaries.filter(
      (s) =>
        (!q || s.record.description.toLowerCase().includes(q) || s.personName.toLowerCase().includes(q) || s.record.id.toLowerCase().includes(q) || (s.record.notes ?? '').toLowerCase().includes(q)) &&
        (person === 'all' || s.record.personId === person) &&
        (category === 'all' || s.record.category === category) &&
        (status === 'all' || s.status === status),
    );
  }, [summaries, search, person, category, status]);

  const totals = useMemo(
    () => ({
      original: sumMoney(rows.map((r) => r.record.originalAmount)),
      received: sumMoney(rows.map((r) => r.totalPaid)),
      outstanding: sumMoney(rows.map((r) => r.outstanding)),
      cashback: sumMoney(rows.map((r) => r.cashbackTotal)),
    }),
    [rows],
  );

  return (
    <Box>
      <PageHeader
        title="Money Records"
        subtitle={`${summaries.length} records · each record tracks one amount given, with its own payments and cashback`}
        crumbs={[{ label: 'Dashboard', to: '/' }, { label: 'Money Records' }]}
        actions={
          <Button variant="contained" startIcon={<Plus size={16} />} onClick={() => dispatch(openRecordDialog())}>
            Add record
          </Button>
        }
      />

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: '2fr 1fr 1fr 1fr' }, gap: 1.5, mb: 2 }}>
        <TextField
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search description, person, ID"
          sx={{ gridColumn: { xs: '1 / -1', md: 'auto' } }}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search size={16} /></InputAdornment> } }}
        />
        <TextField select value={person} onChange={(e) => setPerson(e.target.value)} label="Person">
          <MenuItem value="all">All people</MenuItem>
          {people.map((p) => (
            <MenuItem key={p.id} value={p.id}>
              {p.name}
            </MenuItem>
          ))}
        </TextField>
        <TextField select value={category} onChange={(e) => setCategory(e.target.value)} label="Category">
          <MenuItem value="all">All categories</MenuItem>
          {CATEGORIES.map((c) => (
            <MenuItem key={c} value={c}>
              {c}
            </MenuItem>
          ))}
        </TextField>
        <TextField select value={status} onChange={(e) => setStatus(e.target.value)} label="Status">
          <MenuItem value="all">All statuses</MenuItem>
          {RECORD_STATUSES.map((s) => (
            <MenuItem key={s} value={s}>
              {s}
            </MenuItem>
          ))}
        </TextField>
      </Box>

      {rows.length > 0 && (
        <Card sx={{ p: 1.5, mb: 2, display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' }, gap: 1 }}>
          <Total label="Original" value={<CurrencyDisplay value={totals.original} variant="body2" />} />
          <Total label="Received" value={<CurrencyDisplay value={totals.received} tone="received" variant="body2" />} />
          <Total label="Outstanding" value={<CurrencyDisplay value={totals.outstanding} tone="pending" variant="body2" />} />
          <Total label="Cashback" value={<CurrencyDisplay value={totals.cashback} tone="cashback" variant="body2" />} />
        </Card>
      )}

      <MoneyRecordsTable
        rows={rows}
        onView={(r) => navigate(`/records/${r.record.id}`)}
        onMenu={(anchor, row) => setMenu({ anchor, row })}
        emptyTitle={summaries.length === 0 ? 'No money records yet' : 'No records match these filters'}
        emptyDescription={summaries.length === 0 ? 'Add the first amount you gave or spent on someone’s behalf.' : undefined}
        emptyAction={summaries.length === 0 ? { label: 'Add record', onClick: () => dispatch(openRecordDialog()) } : undefined}
      />

      <Menu open={!!menu} anchorEl={menu?.anchor} onClose={() => setMenu(null)}>
        <MenuItem
          onClick={() => {
            if (menu) dispatch(openPaymentDialog({ prefill: { recordId: menu.row.record.id, personId: menu.row.record.personId } }));
            setMenu(null);
          }}
        >
          <ReceiptIndianRupee size={16} style={{ marginRight: 8 }} /> Add payment
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (menu) dispatch(openCashbackDialog({ prefill: { recordId: menu.row.record.id, personId: menu.row.record.personId } }));
            setMenu(null);
          }}
        >
          <Gift size={16} style={{ marginRight: 8 }} /> Add cashback
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (menu) dispatch(openRecordDialog({ editId: menu.row.record.id }));
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
        title="Delete this record?"
        message={`"${confirmDelete?.record.description}" and its ${confirmDelete?.paymentCount ?? 0} payment(s) will be removed permanently.`}
        confirmLabel="Delete"
        onConfirm={() => {
          if (confirmDelete) {
            dispatch(deleteRecord(confirmDelete.record.id));
            dispatch(showSnackbar({ message: `Deleted ${confirmDelete.record.id}`, severity: 'info' }));
            if (recordId === confirmDelete.record.id) navigate('/records');
          }
          setConfirmDelete(null);
        }}
        onCancel={() => setConfirmDelete(null)}
      />

      <RecordDetailsDrawer recordId={recordId ?? null} onClose={() => navigate('/records')} />
    </Box>
  );
}

function Total({ label, value }: { label: string; value: ReactNode }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
        {label} (filtered)
      </Typography>
      {value}
    </Box>
  );
}
