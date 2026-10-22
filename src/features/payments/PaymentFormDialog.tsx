import { Alert, Box, MenuItem, TextField, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { selectPayments, selectRecordSummaryMap } from '../../app/selectors';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import FormDialog from '../../components/common/FormDialog';
import MoneyField from '../../components/common/MoneyField';
import PersonSelect from '../../components/common/PersonSelect';
import RecordSelect from '../../components/common/RecordSelect';
import { PAYMENT_METHODS, type PaymentMethod } from '../../types/models';
import { formatINR } from '../../utils/currency';
import { today } from '../../utils/dates';
import { addMoney, parseMoney, subMoney, toPaise } from '../../utils/money';
import { hasErrors, optionalText, validateAmount, validateDate } from '../../utils/validation';
import { addPayment, updatePayment } from '../data/dataSlice';
import { closePaymentDialog, showSnackbar } from '../ui/uiSlice';

interface FormState {
  personId?: string;
  recordId?: string;
  date: string;
  amount: string;
  method: PaymentMethod;
  reference: string;
  notes: string;
}

const blank = (): FormState => ({
  personId: undefined,
  recordId: undefined,
  date: today(),
  amount: '',
  method: 'UPI',
  reference: '',
  notes: '',
});

export default function PaymentFormDialog() {
  const dispatch = useAppDispatch();
  const { open, editId, prefill } = useAppSelector((s) => s.ui.paymentDialog);
  const payments = useAppSelector(selectPayments);
  const summaries = useAppSelector(selectRecordSummaryMap);
  const editing = editId ? payments.find((p) => p.id === editId) : undefined;
  const [form, setForm] = useState<FormState>(blank());
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [confirmOver, setConfirmOver] = useState(false);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setConfirmOver(false);
    if (editing) {
      setForm({
        personId: editing.personId,
        recordId: editing.recordId,
        date: editing.date,
        amount: String(editing.amount),
        method: editing.method,
        reference: editing.reference ?? '',
        notes: editing.notes ?? '',
      });
    } else {
      const rec = prefill?.recordId ? summaries.get(prefill.recordId) : undefined;
      setForm({ ...blank(), personId: prefill?.personId ?? rec?.record.personId, recordId: prefill?.recordId });
    }
  }, [open, editing, prefill, summaries]);

  const summary = form.recordId ? summaries.get(form.recordId) : undefined;
  const amount = parseMoney(form.amount);
  // When editing, the current payment's own amount is not "already received".
  const alreadyReceived = summary
    ? subMoney(addMoney(summary.totalPaid, summary.cashbackApplied), editing && editing.recordId === form.recordId ? editing.amount : 0)
    : 0;
  const remaining = summary ? subMoney(summary.record.originalAmount, alreadyReceived) : 0;
  const exceeds = amount !== null && summary !== undefined && toPaise(amount) > toPaise(remaining);
  const afterPayment = amount !== null && summary ? subMoney(remaining, amount) : null;

  const validate = () => {
    const next: Partial<Record<keyof FormState, string>> = {
      personId: form.personId ? undefined : 'Select a person',
      recordId: form.recordId ? undefined : 'Select the related money record',
      amount: validateAmount(form.amount, 'Amount received'),
      date: validateDate(form.date, 'Payment date'),
      reference: optionalText(form.reference, 'Reference', 100),
      notes: optionalText(form.notes, 'Notes'),
    };
    if (summary && form.date < summary.record.dateGiven) {
      next.date = `Payment date is before the record's date given (${summary.record.dateGiven})`;
    }
    setErrors(next);
    return !hasErrors(next);
  };

  const commit = () => {
    if (!form.personId || !form.recordId || amount === null) return;
    const payload = {
      personId: form.personId,
      recordId: form.recordId,
      date: form.date,
      amount,
      method: form.method,
      reference: form.reference.trim() || undefined,
      notes: form.notes.trim() || undefined,
    };
    if (editing) {
      dispatch(updatePayment({ id: editing.id, ...payload }));
      dispatch(showSnackbar({ message: `Updated payment ${editing.id}` }));
    } else {
      dispatch(addPayment(payload));
      dispatch(showSnackbar({ message: `Recorded payment of ${formatINR(amount)}` }));
    }
    setConfirmOver(false);
    dispatch(closePaymentDialog());
  };

  const submit = () => {
    if (!validate()) return;
    if (exceeds) {
      setConfirmOver(true);
      return;
    }
    commit();
  };

  return (
    <>
      <FormDialog
        open={open}
        onClose={() => dispatch(closePaymentDialog())}
        onSubmit={submit}
        title={editing ? `Edit payment ${editing.id}` : 'Add payment'}
        subtitle="Each payment is stored as its own transaction. Earlier payments are never overwritten."
        submitLabel={editing ? 'Save changes' : 'Record payment'}
      >
        <PersonSelect
          value={form.personId}
          onChange={(personId) => setForm({ ...form, personId, recordId: undefined })}
          error={errors.personId}
          autoFocus={!editing && !form.personId}
        />
        <RecordSelect
          personId={form.personId}
          value={form.recordId}
          onChange={(recordId) => setForm({ ...form, recordId })}
          error={errors.recordId}
          disabled={!form.personId}
        />
        {summary && (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 1,
              p: 1.5,
              borderRadius: 2,
              bgcolor: (t) => (t.palette.mode === 'light' ? '#F8FAFC' : 'rgba(255,255,255,0.04)'),
              border: (t) => `1px solid ${t.app.border}`,
            }}
          >
            <Info label="Original" value={formatINR(summary.record.originalAmount)} />
            <Info label="Received so far" value={formatINR(alreadyReceived)} />
            <Info label="Outstanding" value={formatINR(remaining > 0 ? remaining : 0)} />
          </Box>
        )}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
          <MoneyField
            label="Amount received"
            value={form.amount}
            onChange={(v) => setForm({ ...form, amount: v })}
            error={!!errors.amount}
            helperText={
              errors.amount ??
              (afterPayment !== null
                ? toPaise(afterPayment) >= 0
                  ? `Outstanding after this payment: ${formatINR(afterPayment)}`
                  : `Overpayment of ${formatINR(-afterPayment)}`
                : ' ')
            }
            required
          />
          <TextField
            label="Payment date"
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            error={!!errors.date}
            helperText={errors.date}
            required
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            select
            label="Payment method"
            value={form.method}
            onChange={(e) => setForm({ ...form, method: e.target.value as PaymentMethod })}
          >
            {PAYMENT_METHODS.map((m) => (
              <MenuItem key={m} value={m}>
                {m}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Transaction reference (optional)"
            value={form.reference}
            onChange={(e) => setForm({ ...form, reference: e.target.value })}
            error={!!errors.reference}
            helperText={errors.reference}
          />
        </Box>
        <TextField
          label="Notes"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          multiline
          minRows={2}
          error={!!errors.notes}
          helperText={errors.notes}
        />
        {exceeds && amount !== null && (
          <Alert severity="warning" sx={{ borderRadius: 2 }}>
            This payment exceeds the outstanding balance by {formatINR(subMoney(amount, remaining))}. The record will be marked
            as <strong>Overpaid</strong>. You will be asked to confirm.
          </Alert>
        )}
      </FormDialog>

      <ConfirmDialog
        open={confirmOver}
        title="Payment exceeds outstanding balance"
        message={
          <Typography variant="body2">
            Outstanding is {formatINR(remaining > 0 ? remaining : 0)} but you are recording {amount !== null ? formatINR(amount) : ''}.
            Record it anyway and show the record as overpaid?
          </Typography>
        }
        confirmLabel="Record anyway"
        onConfirm={commit}
        onCancel={() => setConfirmOver(false)}
      />
    </>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', overflowWrap: 'anywhere' }}>
        {value}
      </Typography>
    </Box>
  );
}
