import { Alert, Box, FormControlLabel, MenuItem, Switch, TextField, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { selectCashbacks, selectRecordSummaryMap } from '../../app/selectors';
import FormDialog from '../../components/common/FormDialog';
import MoneyField from '../../components/common/MoneyField';
import PersonSelect from '../../components/common/PersonSelect';
import RecordSelect from '../../components/common/RecordSelect';
import { formatINR } from '../../utils/currency';
import { today } from '../../utils/dates';
import { parseMoney } from '../../utils/money';
import { hasErrors, optionalText, requiredText, validateAmount, validateDate } from '../../utils/validation';
import { addCashback, updateCashback } from '../data/dataSlice';
import { closeCashbackDialog, showSnackbar } from '../ui/uiSlice';

const SOURCES = ['Credit card cashback', 'UPI reward', 'Bank offer', 'Merchant cashback', 'Travel portal reward', 'Other'];

interface FormState {
  personId?: string;
  recordId?: string;
  date: string;
  amount: string;
  source: string;
  customSource: string;
  appliedToDebt: boolean;
  notes: string;
}

const blank = (): FormState => ({
  personId: undefined,
  recordId: undefined,
  date: today(),
  amount: '',
  source: SOURCES[0],
  customSource: '',
  appliedToDebt: false,
  notes: '',
});

export default function CashbackFormDialog() {
  const dispatch = useAppDispatch();
  const { open, editId, prefill } = useAppSelector((s) => s.ui.cashbackDialog);
  const cashbacks = useAppSelector(selectCashbacks);
  const summaries = useAppSelector(selectRecordSummaryMap);
  const editing = editId ? cashbacks.find((c) => c.id === editId) : undefined;
  const [form, setForm] = useState<FormState>(blank());
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  useEffect(() => {
    if (!open) return;
    setErrors({});
    if (editing) {
      const known = SOURCES.includes(editing.source);
      setForm({
        personId: editing.personId,
        recordId: editing.recordId,
        date: editing.date,
        amount: String(editing.amount),
        source: known ? editing.source : 'Other',
        customSource: known ? '' : editing.source,
        appliedToDebt: editing.appliedToDebt,
        notes: editing.notes ?? '',
      });
    } else {
      const rec = prefill?.recordId ? summaries.get(prefill.recordId) : undefined;
      setForm({ ...blank(), personId: prefill?.personId ?? rec?.record.personId, recordId: prefill?.recordId });
    }
  }, [open, editing, prefill, summaries]);

  const amount = parseMoney(form.amount);
  const sourceText = form.source === 'Other' ? form.customSource : form.source;

  const validate = () => {
    const next: Partial<Record<keyof FormState, string>> = {
      personId: form.personId ? undefined : 'Select a person',
      recordId: form.recordId ? undefined : 'Select the related money record',
      amount: validateAmount(form.amount, 'Cashback amount'),
      date: validateDate(form.date, 'Cashback date'),
      customSource: form.source === 'Other' ? requiredText(form.customSource, 'Source', 120) : undefined,
      notes: optionalText(form.notes, 'Notes'),
    };
    setErrors(next);
    return !hasErrors(next);
  };

  const submit = () => {
    if (!validate() || !form.personId || !form.recordId || amount === null) return;
    const payload = {
      personId: form.personId,
      recordId: form.recordId,
      date: form.date,
      amount,
      source: sourceText.trim(),
      appliedToDebt: form.appliedToDebt,
      notes: form.notes.trim() || undefined,
    };
    if (editing) {
      dispatch(updateCashback({ id: editing.id, ...payload }));
      dispatch(showSnackbar({ message: `Updated cashback ${editing.id}` }));
    } else {
      dispatch(addCashback(payload));
      dispatch(showSnackbar({ message: `Recorded cashback of ${formatINR(amount)}` }));
    }
    dispatch(closeCashbackDialog());
  };

  return (
    <FormDialog
      open={open}
      onClose={() => dispatch(closeCashbackDialog())}
      onSubmit={submit}
      title={editing ? `Edit cashback ${editing.id}` : 'Add cashback'}
      subtitle="Cashback is tracked separately and never counted as money received from the person."
      submitLabel={editing ? 'Save changes' : 'Add cashback'}
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
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
        <MoneyField
          label="Cashback amount"
          value={form.amount}
          onChange={(v) => setForm({ ...form, amount: v })}
          error={!!errors.amount}
          helperText={errors.amount ?? (amount !== null ? formatINR(amount) : ' ')}
          required
        />
        <TextField
          label="Cashback date"
          type="date"
          value={form.date}
          onChange={(e) => setForm({ ...form, date: e.target.value })}
          error={!!errors.date}
          helperText={errors.date}
          required
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <TextField select label="Source" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}>
          {SOURCES.map((s) => (
            <MenuItem key={s} value={s}>
              {s}
            </MenuItem>
          ))}
        </TextField>
        {form.source === 'Other' ? (
          <TextField
            label="Describe the source"
            value={form.customSource}
            onChange={(e) => setForm({ ...form, customSource: e.target.value })}
            error={!!errors.customSource}
            helperText={errors.customSource}
            required
          />
        ) : (
          <Box />
        )}
      </Box>
      <FormControlLabel
        control={<Switch checked={form.appliedToDebt} onChange={(e) => setForm({ ...form, appliedToDebt: e.target.checked })} />}
        label={
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Apply this cashback toward the person's debt
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Recorded as a separate adjustment line so the calculation stays transparent.
            </Typography>
          </Box>
        }
      />
      {form.appliedToDebt && amount !== null && (
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          Outstanding will reduce by {formatINR(amount)} as a cashback adjustment. It is still not counted as a payment.
        </Alert>
      )}
      <TextField
        label="Notes"
        value={form.notes}
        onChange={(e) => setForm({ ...form, notes: e.target.value })}
        multiline
        minRows={2}
        error={!!errors.notes}
        helperText={errors.notes}
      />
    </FormDialog>
  );
}
