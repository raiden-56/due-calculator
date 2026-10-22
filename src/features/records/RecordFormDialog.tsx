import { Alert, Box, Button, MenuItem, TextField, Typography } from '@mui/material';
import { UserPlus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { selectRecordSummaryMap, selectRecords } from '../../app/selectors';
import FormDialog from '../../components/common/FormDialog';
import MoneyField from '../../components/common/MoneyField';
import PersonSelect from '../../components/common/PersonSelect';
import { CATEGORIES, type Category } from '../../types/models';
import { formatINR } from '../../utils/currency';
import { today } from '../../utils/dates';
import { parseMoney, toPaise } from '../../utils/money';
import { hasErrors, optionalText, requiredText, validateAmount, validateDate } from '../../utils/validation';
import { addRecord, updateRecord } from '../data/dataSlice';
import { closeRecordDialog, openPersonDialog, showSnackbar } from '../ui/uiSlice';

interface FormState {
  personId?: string;
  description: string;
  category: Category;
  dateGiven: string;
  originalAmount: string;
  dueDate: string;
  notes: string;
}

const blank = (): FormState => ({
  personId: undefined,
  description: '',
  category: 'Credit Card',
  dateGiven: today(),
  originalAmount: '',
  dueDate: '',
  notes: '',
});

export default function RecordFormDialog() {
  const dispatch = useAppDispatch();
  const { open, editId, prefill } = useAppSelector((s) => s.ui.recordDialog);
  const records = useAppSelector(selectRecords);
  const summaries = useAppSelector(selectRecordSummaryMap);
  const editing = editId ? records.find((r) => r.id === editId) : undefined;
  const editingSummary = editId ? summaries.get(editId) : undefined;
  const [form, setForm] = useState<FormState>(blank());
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  useEffect(() => {
    if (!open) return;
    setErrors({});
    if (editing) {
      setForm({
        personId: editing.personId,
        description: editing.description,
        category: editing.category,
        dateGiven: editing.dateGiven,
        originalAmount: String(editing.originalAmount),
        dueDate: editing.dueDate ?? '',
        notes: editing.notes ?? '',
      });
    } else {
      setForm({ ...blank(), personId: prefill?.personId });
    }
  }, [open, editing, prefill]);

  const amount = parseMoney(form.originalAmount);
  const receivedSoFar = editingSummary ? editingSummary.totalPaid + editingSummary.cashbackApplied : 0;
  const amountBelowReceived = editing && amount !== null && toPaise(amount) < toPaise(receivedSoFar);

  const validate = () => {
    const next = {
      personId: form.personId ? undefined : 'Select a person',
      description: requiredText(form.description, 'Description', 200),
      originalAmount: validateAmount(form.originalAmount, 'Original amount'),
      dateGiven: validateDate(form.dateGiven, 'Date given'),
      dueDate: validateDate(form.dueDate || undefined, 'Due date', false),
      notes: optionalText(form.notes, 'Notes'),
    } as Partial<Record<keyof FormState, string>>;
    if (!next.dueDate && form.dueDate && form.dateGiven && form.dueDate < form.dateGiven) {
      next.dueDate = 'Due date cannot be before the date given';
    }
    setErrors(next);
    return !hasErrors(next);
  };

  const submit = () => {
    if (!validate() || !form.personId || amount === null) return;
    const payload = {
      personId: form.personId,
      description: form.description.trim(),
      category: form.category,
      dateGiven: form.dateGiven,
      originalAmount: amount,
      dueDate: form.dueDate || undefined,
      notes: form.notes.trim() || undefined,
    };
    if (editing) {
      dispatch(updateRecord({ id: editing.id, ...payload }));
      dispatch(showSnackbar({ message: `Updated record ${editing.id}` }));
    } else {
      dispatch(addRecord(payload));
      dispatch(showSnackbar({ message: `Recorded ${formatINR(amount)} given` }));
    }
    dispatch(closeRecordDialog());
  };

  return (
    <FormDialog
      open={open}
      onClose={() => dispatch(closeRecordDialog())}
      onSubmit={submit}
      title={editing ? `Edit record ${editing.id}` : 'Add money record'}
      subtitle="Record the original amount you gave or spent on someone's behalf. Payments are added separately."
      submitLabel={editing ? 'Save changes' : 'Add record'}
      extraActions={
        !editing ? (
          <Button size="small" startIcon={<UserPlus size={16} />} onClick={() => dispatch(openPersonDialog())}>
            New person
          </Button>
        ) : undefined
      }
    >
      <PersonSelect value={form.personId} onChange={(personId) => setForm({ ...form, personId })} error={errors.personId} autoFocus={!editing} />
      <TextField
        label="Description"
        placeholder="e.g. Used my credit card for laptop"
        value={form.description}
        onChange={(e) => setForm({ ...form, description: e.target.value })}
        error={!!errors.description}
        helperText={errors.description}
        required
      />
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
        <TextField
          select
          label="Category"
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value as Category })}
        >
          {CATEGORIES.map((c) => (
            <MenuItem key={c} value={c}>
              {c}
            </MenuItem>
          ))}
        </TextField>
        <MoneyField
          label="Original amount"
          value={form.originalAmount}
          onChange={(v) => setForm({ ...form, originalAmount: v })}
          error={!!errors.originalAmount}
          helperText={errors.originalAmount ?? (amount !== null ? formatINR(amount) : ' ')}
          required
        />
        <TextField
          label="Date given"
          type="date"
          value={form.dateGiven}
          onChange={(e) => setForm({ ...form, dateGiven: e.target.value })}
          error={!!errors.dateGiven}
          helperText={errors.dateGiven}
          required
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <TextField
          label="Due date (optional)"
          type="date"
          value={form.dueDate}
          onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
          error={!!errors.dueDate}
          helperText={errors.dueDate}
          slotProps={{ inputLabel: { shrink: true } }}
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
      {amountBelowReceived && (
        <Alert severity="warning" sx={{ borderRadius: 2 }}>
          <Typography variant="body2">
            {formatINR(receivedSoFar)} has already been received against this record. Setting the original amount lower will
            mark it as overpaid.
          </Typography>
        </Alert>
      )}
    </FormDialog>
  );
}
