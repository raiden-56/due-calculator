import { Box, Button, Chip, Divider, Drawer, IconButton, LinearProgress, Menu, MenuItem, Stack, Typography, useMediaQuery, useTheme } from '@mui/material';
import { EllipsisVertical, Gift, Pencil, ReceiptIndianRupee, Trash2, X } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { selectCashbacks, selectPayments, selectRecordSummaryMap } from '../../app/selectors';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import CurrencyDisplay from '../../components/common/CurrencyDisplay';
import EmptyState from '../../components/common/EmptyState';
import StatusChip from '../../components/common/StatusChip';
import type { Cashback, Payment } from '../../types/models';
import { formatINR, formatPercent } from '../../utils/currency';
import { formatDate } from '../../utils/dates';
import { deleteCashback, deletePayment, deleteRecord } from '../data/dataSlice';
import { openCashbackDialog, openPaymentDialog, openRecordDialog, showSnackbar } from '../ui/uiSlice';

interface Props {
  recordId: string | null;
  onClose: () => void;
}

export default function RecordDetailsDrawer({ recordId, onClose }: Props) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const summaries = useAppSelector(selectRecordSummaryMap);
  const payments = useAppSelector(selectPayments);
  const cashbacks = useAppSelector(selectCashbacks);
  const [menu, setMenu] = useState<{ anchor: HTMLElement; kind: 'payment' | 'cashback'; item: Payment | Cashback } | null>(null);
  const [confirm, setConfirm] = useState<{ kind: 'record' | 'payment' | 'cashback'; id: string; label: string } | null>(null);

  const s = recordId ? summaries.get(recordId) : undefined;
  const recordPayments = s ? payments.filter((p) => p.recordId === s.record.id).sort((a, b) => b.date.localeCompare(a.date)) : [];
  const recordCashback = s ? cashbacks.filter((c) => c.recordId === s.record.id).sort((a, b) => b.date.localeCompare(a.date)) : [];

  const runDelete = () => {
    if (!confirm) return;
    if (confirm.kind === 'record') {
      dispatch(deleteRecord(confirm.id));
      dispatch(showSnackbar({ message: `Deleted record ${confirm.id}`, severity: 'info' }));
      onClose();
    } else if (confirm.kind === 'payment') {
      dispatch(deletePayment(confirm.id));
      dispatch(showSnackbar({ message: `Deleted payment ${confirm.id}`, severity: 'info' }));
    } else {
      dispatch(deleteCashback(confirm.id));
      dispatch(showSnackbar({ message: `Deleted cashback ${confirm.id}`, severity: 'info' }));
    }
    setConfirm(null);
  };

  return (
    <>
      <Drawer anchor="right" open={!!recordId} onClose={onClose} sx={{ '& .MuiDrawer-paper': { width: fullScreen ? '100%' : 540, maxWidth: '100%', borderRadius: 0, border: 'none' } }}>
        {s && (
          <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Box sx={{ p: { xs: 2, sm: 3 }, borderBottom: `1px solid ${theme.app.border}` }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="caption" color="text.secondary">
                    {s.record.id} · {s.record.category}
                  </Typography>
                  <Typography variant="h6" sx={{ overflowWrap: 'anywhere', lineHeight: 1.3 }}>
                    {s.record.description}
                  </Typography>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', mt: 0.75 }} useFlexGap>
                    <StatusChip status={s.status} />
                    <Button size="small" sx={{ minWidth: 0, p: 0.25, textTransform: 'none' }} onClick={() => navigate(`/people/${s.record.personId}`)}>
                      {s.personName}
                    </Button>
                  </Stack>
                </Box>
                <IconButton onClick={onClose} aria-label="close" size="small">
                  <X size={18} />
                </IconButton>
              </Box>

              <Box sx={{ mt: 2, p: 1.5, borderRadius: 2, bgcolor: theme.palette.mode === 'light' ? '#F8FAFC' : 'rgba(255,255,255,0.04)', border: `1px solid ${theme.app.border}` }}>
                <Line label="Original amount" value={<CurrencyDisplay value={s.record.originalAmount} />} />
                <Line label={`− Payments received (${s.paymentCount})`} value={<CurrencyDisplay value={s.totalPaid} tone="received" dimZero />} />
                {s.cashbackApplied > 0 && <Line label="− Cashback applied to debt" value={<CurrencyDisplay value={s.cashbackApplied} tone="cashback" />} />}
                <Divider sx={{ my: 1 }} />
                <Line
                  label={s.overpaid > 0 ? '= Overpaid (credit to person)' : '= Outstanding balance'}
                  value={<CurrencyDisplay value={s.overpaid > 0 ? s.overpaid : s.outstanding} tone={s.overpaid > 0 ? 'cashback' : s.isOverdue ? 'overdue' : s.outstanding > 0 ? 'pending' : 'received'} variant="h6" />}
                  bold
                />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                  <LinearProgress variant="determinate" value={Math.min(100, s.collectionPct)} sx={{ flex: 1, height: 6, borderRadius: 3, bgcolor: theme.app.grid, '& .MuiLinearProgress-bar': { bgcolor: theme.app.received } }} />
                  <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                    {formatPercent(s.collectionPct)} collected
                  </Typography>
                </Box>
                {s.cashbackTotal > 0 && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                    Cashback earned on this record: {formatINR(s.cashbackTotal)}
                    {s.cashbackApplied === 0 ? ' (tracked separately, not deducted)' : ''}
                  </Typography>
                )}
              </Box>

              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.5, mt: 2 }}>
                <Meta label="Date given" value={formatDate(s.record.dateGiven)} />
                <Meta label="Due date" value={s.record.dueDate ? `${formatDate(s.record.dueDate)}${s.isOverdue ? ` · ${s.daysOverdue} days overdue` : ''}` : 'Not set'} />
                {s.record.notes && <Meta label="Notes" value={s.record.notes} full />}
              </Box>

              <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: 'wrap', gap: 1 }} useFlexGap>
                <Button size="small" variant="contained" startIcon={<ReceiptIndianRupee size={14} />} onClick={() => dispatch(openPaymentDialog({ prefill: { recordId: s.record.id, personId: s.record.personId } }))}>
                  Add payment
                </Button>
                <Button size="small" variant="outlined" startIcon={<Gift size={14} />} onClick={() => dispatch(openCashbackDialog({ prefill: { recordId: s.record.id, personId: s.record.personId } }))}>
                  Add cashback
                </Button>
                <Button size="small" startIcon={<Pencil size={14} />} onClick={() => dispatch(openRecordDialog({ editId: s.record.id }))}>
                  Edit
                </Button>
                <Button size="small" color="error" startIcon={<Trash2 size={14} />} onClick={() => setConfirm({ kind: 'record', id: s.record.id, label: s.record.description })}>
                  Delete
                </Button>
              </Stack>
            </Box>

            <Box sx={{ flex: 1, overflowY: 'auto', p: { xs: 2, sm: 3 } }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Payment history ({recordPayments.length})
              </Typography>
              {recordPayments.length === 0 ? (
                <EmptyState compact title="No payments yet" description="Each payment is stored as its own transaction." actionLabel="Add payment" onAction={() => dispatch(openPaymentDialog({ prefill: { recordId: s.record.id, personId: s.record.personId } }))} />
              ) : (
                <Stack divider={<Divider />} sx={{ mb: 3 }}>
                  {recordPayments.map((p) => (
                    <Box key={p.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, py: 1 }}>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {formatDate(p.date)} <Chip size="small" label={p.method} variant="outlined" sx={{ ml: 0.5, height: 20 }} />
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>
                          {p.id}
                          {p.reference ? ` · ${p.reference}` : ''}
                          {p.notes ? ` · ${p.notes}` : ''}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <CurrencyDisplay value={p.amount} tone="received" variant="body2" />
                        <IconButton size="small" onClick={(e) => setMenu({ anchor: e.currentTarget, kind: 'payment', item: p })} aria-label="payment actions">
                          <EllipsisVertical size={16} />
                        </IconButton>
                      </Box>
                    </Box>
                  ))}
                </Stack>
              )}

              <Typography variant="subtitle2" sx={{ mb: 1, mt: 2 }}>
                Cashback ({recordCashback.length})
              </Typography>
              {recordCashback.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No cashback recorded for this record.
                </Typography>
              ) : (
                <Stack divider={<Divider />}>
                  {recordCashback.map((c) => (
                    <Box key={c.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, py: 1 }}>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {formatDate(c.date)} · {c.source}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {c.id}
                          {c.appliedToDebt ? ' · applied to debt' : ' · tracked separately'}
                          {c.notes ? ` · ${c.notes}` : ''}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <CurrencyDisplay value={c.amount} tone="cashback" variant="body2" />
                        <IconButton size="small" onClick={(e) => setMenu({ anchor: e.currentTarget, kind: 'cashback', item: c })} aria-label="cashback actions">
                          <EllipsisVertical size={16} />
                        </IconButton>
                      </Box>
                    </Box>
                  ))}
                </Stack>
              )}
            </Box>
          </Box>
        )}
      </Drawer>

      <Menu open={!!menu} anchorEl={menu?.anchor} onClose={() => setMenu(null)}>
        <MenuItem
          onClick={() => {
            if (menu?.kind === 'payment') dispatch(openPaymentDialog({ editId: menu.item.id }));
            if (menu?.kind === 'cashback') dispatch(openCashbackDialog({ editId: menu.item.id }));
            setMenu(null);
          }}
        >
          <Pencil size={16} style={{ marginRight: 8 }} /> Edit
        </MenuItem>
        <MenuItem
          sx={{ color: 'error.main' }}
          onClick={() => {
            if (menu) setConfirm({ kind: menu.kind, id: menu.item.id, label: formatINR(menu.item.amount) });
            setMenu(null);
          }}
        >
          <Trash2 size={16} style={{ marginRight: 8 }} /> Delete
        </MenuItem>
      </Menu>

      <ConfirmDialog
        open={!!confirm}
        danger
        title={confirm?.kind === 'record' ? 'Delete this record?' : confirm?.kind === 'payment' ? 'Delete this payment?' : 'Delete this cashback?'}
        message={
          confirm?.kind === 'record'
            ? `"${confirm.label}" and all of its payments and cashback entries will be removed permanently.`
            : `The ${confirm?.kind} of ${confirm?.label} will be removed and balances recalculated.`
        }
        confirmLabel="Delete"
        onConfirm={runDelete}
        onCancel={() => setConfirm(null)}
      />
    </>
  );
}

function Line({ label, value, bold }: { label: string; value: ReactNode; bold?: boolean }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 1, py: 0.25 }}>
      <Typography variant="body2" color={bold ? 'text.primary' : 'text.secondary'} sx={{ fontWeight: bold ? 700 : 400 }}>
        {label}
      </Typography>
      {value}
    </Box>
  );
}

function Meta({ label, value, full }: { label: string; value: string; full?: boolean }) {
  return (
    <Box sx={{ minWidth: 0, gridColumn: full ? '1 / -1' : undefined }}>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ overflowWrap: 'anywhere' }}>
        {value}
      </Typography>
    </Box>
  );
}
