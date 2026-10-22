import { Box, Button, FormControlLabel, IconButton, InputAdornment, Menu, MenuItem, Switch, TextField, Tooltip, Typography } from '@mui/material';
import { Archive, ArchiveRestore, EllipsisVertical, Eye, Pencil, ReceiptIndianRupee, Search, Trash2, UserPlus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { selectPersonSummaries } from '../../app/selectors';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import CurrencyDisplay from '../../components/common/CurrencyDisplay';
import PageHeader from '../../components/common/PageHeader';
import ResponsiveTable, { type Column } from '../../components/common/ResponsiveTable';
import StatusChip from '../../components/common/StatusChip';
import type { PersonSummary } from '../../types/models';
import { formatDate } from '../../utils/dates';
import { deletePerson, setPersonArchived } from '../data/dataSlice';
import { openPaymentDialog, openPersonDialog, showSnackbar } from '../ui/uiSlice';
import PersonDetailsDrawer from './PersonDetailsDrawer';

type StatusFilter = 'all' | 'pending' | 'settled' | 'overdue';

export default function PeoplePage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { personId } = useParams();
  const people = useAppSelector(selectPersonSummaries);
  const globalSearch = useAppSelector((s) => s.ui.globalSearch);
  const [search, setSearch] = useState(globalSearch);
  const [status, setStatus] = useState<StatusFilter>('all');
  const [showArchived, setShowArchived] = useState(false);
  const [menu, setMenu] = useState<{ anchor: HTMLElement; row: PersonSummary } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<PersonSummary | null>(null);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return people
      .filter((p) => showArchived || !p.person.archived)
      .filter((p) => !q || p.person.name.toLowerCase().includes(q) || (p.person.phone ?? '').includes(q) || (p.person.notes ?? '').toLowerCase().includes(q))
      .filter((p) =>
        status === 'all'
          ? true
          : status === 'pending'
            ? p.outstanding > 0
            : status === 'overdue'
              ? p.status === 'Overdue'
              : p.recordCount > 0 && p.outstanding === 0,
      );
  }, [people, search, status, showArchived]);

  const columns: Column<PersonSummary>[] = [
    {
      key: 'name',
      header: 'Person',
      primary: true,
      sortValue: (r) => r.person.name,
      render: (r) => (
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" sx={{ fontWeight: 700, overflowWrap: 'anywhere' }}>
            {r.person.name}
            {r.person.archived ? ' (archived)' : ''}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {r.person.phone || r.person.id}
          </Typography>
        </Box>
      ),
    },
    { key: 'status', header: 'Status', secondary: true, sortValue: (r) => r.status, render: (r) => <StatusChip status={r.status} /> },
    { key: 'records', header: 'Records', align: 'right', sortValue: (r) => r.recordCount, render: (r) => r.recordCount },
    { key: 'given', header: 'Total given', align: 'right', sortValue: (r) => r.totalGiven, render: (r) => <CurrencyDisplay value={r.totalGiven} variant="body2" /> },
    { key: 'paid', header: 'Total paid', align: 'right', sortValue: (r) => r.totalPaid, render: (r) => <CurrencyDisplay value={r.totalPaid} tone="received" variant="body2" dimZero /> },
    {
      key: 'outstanding',
      header: 'Outstanding',
      align: 'right',
      sortValue: (r) => r.outstanding,
      render: (r) => (
        <Box>
          <CurrencyDisplay value={r.outstanding} tone={r.status === 'Overdue' ? 'overdue' : 'pending'} variant="body2" dimZero />
          {r.overpaid > 0 && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              credit <CurrencyDisplay value={r.overpaid} tone="cashback" variant="caption" />
            </Typography>
          )}
        </Box>
      ),
    },
    { key: 'cashback', header: 'Cashback', align: 'right', hideOnMobile: true, sortValue: (r) => r.totalCashback, render: (r) => <CurrencyDisplay value={r.totalCashback} tone="cashback" variant="body2" dimZero /> },
    { key: 'last', header: 'Last payment', hideOnMobile: true, sortValue: (r) => r.lastPaymentDate ?? '', render: (r) => formatDate(r.lastPaymentDate) },
  ];

  return (
    <Box>
      <PageHeader
        title="People"
        subtitle={`${people.filter((p) => !p.person.archived).length} active · ${people.filter((p) => p.outstanding > 0).length} with pending balances`}
        crumbs={[{ label: 'Dashboard', to: '/' }, { label: 'People' }]}
        actions={
          <Button variant="contained" startIcon={<UserPlus size={16} />} onClick={() => dispatch(openPersonDialog())}>
            Add person
          </Button>
        }
      />

      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center', mb: 2 }}>
        <TextField
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or phone"
          sx={{ flex: '1 1 220px', maxWidth: { sm: 360 } }}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search size={16} /></InputAdornment> } }}
        />
        <TextField select value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)} sx={{ flex: '0 1 170px', minWidth: 150 }}>
          <MenuItem value="all">All statuses</MenuItem>
          <MenuItem value="pending">Pending balance</MenuItem>
          <MenuItem value="overdue">Overdue</MenuItem>
          <MenuItem value="settled">Settled</MenuItem>
        </TextField>
        <FormControlLabel control={<Switch size="small" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />} label={<Typography variant="body2">Show archived</Typography>} />
      </Box>

      <ResponsiveTable
        rows={rows}
        columns={columns}
        rowKey={(r) => r.person.id}
        onRowClick={(r) => navigate(`/people/${r.person.id}`)}
        initialSort={{ key: 'outstanding', direction: 'desc' }}
        emptyTitle={people.length === 0 ? 'No people yet' : 'No people match these filters'}
        emptyDescription={people.length === 0 ? 'Add the people you lend to or pay for. Each person can have many money records.' : undefined}
        emptyAction={people.length === 0 ? { label: 'Add person', onClick: () => dispatch(openPersonDialog()) } : undefined}
        actions={(r) => (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Tooltip title="View">
              <IconButton size="small" onClick={() => navigate(`/people/${r.person.id}`)} aria-label="view person">
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
            if (menu) dispatch(openPaymentDialog({ prefill: { personId: menu.row.person.id } }));
            setMenu(null);
          }}
          disabled={!menu || menu.row.recordCount === 0}
        >
          <ReceiptIndianRupee size={16} style={{ marginRight: 8 }} /> Add payment
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (menu) dispatch(openPersonDialog({ editId: menu.row.person.id }));
            setMenu(null);
          }}
        >
          <Pencil size={16} style={{ marginRight: 8 }} /> Edit
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (menu) {
              dispatch(setPersonArchived({ id: menu.row.person.id, archived: !menu.row.person.archived }));
              dispatch(showSnackbar({ message: menu.row.person.archived ? 'Person restored' : 'Person archived', severity: 'info' }));
            }
            setMenu(null);
          }}
        >
          {menu?.row.person.archived ? <ArchiveRestore size={16} style={{ marginRight: 8 }} /> : <Archive size={16} style={{ marginRight: 8 }} />}
          {menu?.row.person.archived ? 'Restore' : 'Archive'}
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (menu) setConfirmDelete(menu.row);
            setMenu(null);
          }}
          sx={{ color: 'error.main' }}
        >
          <Trash2 size={16} style={{ marginRight: 8 }} /> Delete
        </MenuItem>
      </Menu>

      <ConfirmDialog
        open={!!confirmDelete}
        danger
        title={`Delete ${confirmDelete?.person.name}?`}
        message={
          confirmDelete && confirmDelete.recordCount > 0
            ? `This person has ${confirmDelete.recordCount} money record(s) and their payments. Deleting removes all of them permanently. Consider archiving instead.`
            : 'This person will be removed permanently.'
        }
        confirmLabel="Delete"
        onConfirm={() => {
          if (confirmDelete) {
            dispatch(deletePerson(confirmDelete.person.id));
            dispatch(showSnackbar({ message: `Deleted ${confirmDelete.person.name}`, severity: 'info' }));
            if (personId === confirmDelete.person.id) navigate('/people');
          }
          setConfirmDelete(null);
        }}
        onCancel={() => setConfirmDelete(null)}
      />

      <PersonDetailsDrawer personId={personId ?? null} onClose={() => navigate('/people')} />
    </Box>
  );
}
