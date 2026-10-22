import {
  Box,
  Button,
  Chip,
  Divider,
  Drawer,
  IconButton,
  Stack,
  Tab,
  Tabs,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { Archive, ArchiveRestore, Gift, Pencil, Phone, Plus, ReceiptIndianRupee, X } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { selectCashbacks, selectPayments, selectPersonSummaryMap, selectRecordSummaries } from '../../app/selectors';
import CurrencyDisplay from '../../components/common/CurrencyDisplay';
import EmptyState from '../../components/common/EmptyState';
import StatusChip from '../../components/common/StatusChip';
import { formatINR, formatPercent } from '../../utils/currency';
import { formatDate } from '../../utils/dates';
import { percentOf } from '../../utils/money';
import { setPersonArchived } from '../data/dataSlice';
import { openCashbackDialog, openPaymentDialog, openPersonDialog, openRecordDialog, showSnackbar } from '../ui/uiSlice';

interface Props {
  personId: string | null;
  onClose: () => void;
}

export default function PersonDetailsDrawer({ personId, onClose }: Props) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const summaries = useAppSelector(selectPersonSummaryMap);
  const recordSummaries = useAppSelector(selectRecordSummaries);
  const payments = useAppSelector(selectPayments);
  const cashbacks = useAppSelector(selectCashbacks);
  const [tab, setTab] = useState(0);

  const s = personId ? summaries.get(personId) : undefined;
  const records = s ? recordSummaries.filter((r) => r.record.personId === s.person.id).sort((a, b) => b.record.dateGiven.localeCompare(a.record.dateGiven)) : [];
  const personPayments = s ? payments.filter((p) => p.personId === s.person.id).sort((a, b) => b.date.localeCompare(a.date)) : [];
  const personCashback = s ? cashbacks.filter((c) => c.personId === s.person.id).sort((a, b) => b.date.localeCompare(a.date)) : [];

  // Combined timeline, newest first
  const timeline = s
    ? [
        ...records.map((r) => ({ date: r.record.dateGiven, kind: 'given' as const, label: r.record.description, amount: r.record.originalAmount, id: r.record.id, sub: `${r.record.category} · ${r.record.id}` })),
        ...personPayments.map((p) => ({ date: p.date, kind: 'payment' as const, label: `Payment via ${p.method}`, amount: p.amount, id: p.id, sub: `${p.recordId}${p.reference ? ` · ${p.reference}` : ''}` })),
        ...personCashback.map((c) => ({ date: c.date, kind: 'cashback' as const, label: c.source, amount: c.amount, id: c.id, sub: `${c.recordId}${c.appliedToDebt ? ' · applied to debt' : ''}` })),
      ].sort((a, b) => b.date.localeCompare(a.date))
    : [];

  return (
    <Drawer
      anchor="right"
      open={!!personId}
      onClose={onClose}
      sx={{ '& .MuiDrawer-paper': { width: fullScreen ? '100%' : 520, maxWidth: '100%', borderRadius: 0, border: 'none' } }}
    >
      {s && (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Box sx={{ p: { xs: 2, sm: 3 }, pb: 2, borderBottom: `1px solid ${theme.app.border}` }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="h6" sx={{ overflowWrap: 'anywhere' }}>
                  {s.person.name}
                </Typography>
                <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap', mt: 0.5 }}>
                  <StatusChip status={s.status} />
                  {s.person.archived && <Chip size="small" label="Archived" />}
                  <Typography variant="caption" color="text.secondary">
                    {s.person.id}
                  </Typography>
                  {s.person.phone && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                      <Phone size={12} /> {s.person.phone}
                    </Typography>
                  )}
                </Stack>
              </Box>
              <IconButton onClick={onClose} aria-label="close" size="small">
                <X size={18} />
              </IconButton>
            </Box>
            {s.person.notes && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {s.person.notes}
              </Typography>
            )}

            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.5, mt: 2 }}>
              <Metric label="Total given" value={<CurrencyDisplay value={s.totalGiven} />} />
              <Metric label="Total paid" value={<CurrencyDisplay value={s.totalPaid} tone="received" />} />
              <Metric
                label="Outstanding"
                value={<CurrencyDisplay value={s.outstanding} tone={s.status === 'Overdue' ? 'overdue' : s.outstanding > 0 ? 'pending' : 'muted'} />}
                hint={s.overpaid > 0 ? `Overpaid ${formatINR(s.overpaid)}` : `${formatPercent(percentOf(s.totalPaid + s.cashbackApplied, s.totalGiven))} collected`}
              />
              <Metric label="Cashback" value={<CurrencyDisplay value={s.totalCashback} tone="cashback" />} hint={s.cashbackApplied > 0 ? `${formatINR(s.cashbackApplied)} applied to debt` : undefined} />
            </Box>

            <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: 'wrap', gap: 1 }} useFlexGap>
              <Button size="small" variant="contained" startIcon={<ReceiptIndianRupee size={14} />} onClick={() => dispatch(openPaymentDialog({ prefill: { personId: s.person.id } }))} disabled={records.length === 0}>
                Add payment
              </Button>
              <Button size="small" variant="outlined" startIcon={<Plus size={14} />} onClick={() => dispatch(openRecordDialog({ prefill: { personId: s.person.id } }))}>
                Add record
              </Button>
              <Button size="small" variant="outlined" startIcon={<Gift size={14} />} onClick={() => dispatch(openCashbackDialog({ prefill: { personId: s.person.id } }))} disabled={records.length === 0}>
                Cashback
              </Button>
              <Button size="small" startIcon={<Pencil size={14} />} onClick={() => dispatch(openPersonDialog({ editId: s.person.id }))}>
                Edit
              </Button>
              <Button
                size="small"
                color={s.person.archived ? 'primary' : 'inherit'}
                startIcon={s.person.archived ? <ArchiveRestore size={14} /> : <Archive size={14} />}
                onClick={() => {
                  dispatch(setPersonArchived({ id: s.person.id, archived: !s.person.archived }));
                  dispatch(showSnackbar({ message: s.person.archived ? `${s.person.name} restored` : `${s.person.name} archived`, severity: 'info' }));
                }}
              >
                {s.person.archived ? 'Restore' : 'Archive'}
              </Button>
            </Stack>
          </Box>

          <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="fullWidth" sx={{ borderBottom: `1px solid ${theme.app.border}` }}>
            <Tab label={`Records (${records.length})`} />
            <Tab label={`Payments (${personPayments.length})`} />
            <Tab label={`History (${timeline.length})`} />
          </Tabs>

          <Box sx={{ flex: 1, overflowY: 'auto', p: { xs: 2, sm: 3 } }}>
            {tab === 0 &&
              (records.length === 0 ? (
                <EmptyState compact title="No money records" description="Add a record to start tracking what this person owes." actionLabel="Add record" onAction={() => dispatch(openRecordDialog({ prefill: { personId: s.person.id } }))} />
              ) : (
                <Stack spacing={1.25}>
                  {records.map((r) => (
                    <Box
                      key={r.record.id}
                      onClick={() => navigate(`/records/${r.record.id}`)}
                      sx={{ p: 1.5, borderRadius: 2, border: `1px solid ${theme.app.border}`, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, alignItems: 'flex-start' }}>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="body2" sx={{ fontWeight: 700, overflowWrap: 'anywhere' }}>
                            {r.record.description}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {r.record.id} · {r.record.category} · {formatDate(r.record.dateGiven)}
                            {r.record.dueDate ? ` · due ${formatDate(r.record.dueDate)}` : ''}
                          </Typography>
                        </Box>
                        <StatusChip status={r.status} />
                      </Box>
                      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, mt: 1 }}>
                        <Metric label="Original" value={<CurrencyDisplay value={r.record.originalAmount} variant="body2" />} />
                        <Metric label="Received" value={<CurrencyDisplay value={r.totalPaid} tone="received" variant="body2" />} />
                        <Metric label={r.overpaid > 0 ? 'Overpaid' : 'Outstanding'} value={<CurrencyDisplay value={r.overpaid > 0 ? r.overpaid : r.outstanding} tone={r.overpaid > 0 ? 'cashback' : r.isOverdue ? 'overdue' : 'pending'} variant="body2" dimZero />} />
                      </Box>
                    </Box>
                  ))}
                </Stack>
              ))}

            {tab === 1 &&
              (personPayments.length === 0 ? (
                <EmptyState compact title="No payments yet" description="Payments received from this person will be listed here." />
              ) : (
                <Stack spacing={1} divider={<Divider />}>
                  {personPayments.map((p) => (
                    <Box key={p.id} sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, py: 0.5 }}>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {formatDate(p.date)} · {p.method}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>
                          {p.id} · {p.recordId}
                          {p.reference ? ` · ${p.reference}` : ''}
                          {p.notes ? ` · ${p.notes}` : ''}
                        </Typography>
                      </Box>
                      <CurrencyDisplay value={p.amount} tone="received" variant="body2" />
                    </Box>
                  ))}
                </Stack>
              ))}

            {tab === 2 &&
              (timeline.length === 0 ? (
                <EmptyState compact title="No history yet" />
              ) : (
                <Stack spacing={0}>
                  {timeline.map((t) => (
                    <Box key={`${t.kind}-${t.id}`} sx={{ display: 'flex', gap: 1.5, py: 1 }}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <Box
                          sx={{
                            width: 10,
                            height: 10,
                            borderRadius: '50%',
                            mt: 0.75,
                            bgcolor: t.kind === 'given' ? theme.app.given : t.kind === 'payment' ? theme.app.received : theme.app.cashback,
                          }}
                        />
                        <Box sx={{ flex: 1, width: 2, bgcolor: theme.app.grid, mt: 0.5 }} />
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0, pb: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, overflowWrap: 'anywhere' }}>
                            {t.kind === 'given' ? 'Money given — ' : t.kind === 'payment' ? 'Payment — ' : 'Cashback — '}
                            {t.label}
                          </Typography>
                          <CurrencyDisplay value={t.amount} tone={t.kind === 'given' ? 'default' : t.kind === 'payment' ? 'received' : 'cashback'} variant="body2" signed={t.kind === 'payment'} />
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          {formatDate(t.date)} · {t.sub}
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Stack>
              ))}
          </Box>
        </Box>
      )}
    </Drawer>
  );
}

function Metric({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
        {label}
      </Typography>
      <Box sx={{ overflowWrap: 'anywhere' }}>{value}</Box>
      {hint && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
          {hint}
        </Typography>
      )}
    </Box>
  );
}
