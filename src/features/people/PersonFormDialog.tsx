import { Alert, TextField } from '@mui/material';
import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { selectPeople } from '../../app/selectors';
import FormDialog from '../../components/common/FormDialog';
import { addPerson, updatePerson } from '../data/dataSlice';
import { closePersonDialog, showSnackbar } from '../ui/uiSlice';
import { hasErrors, normalizeName, optionalText, requiredText, validatePhone } from '../../utils/validation';

interface FormState {
  name: string;
  phone: string;
  notes: string;
}

const empty: FormState = { name: '', phone: '', notes: '' };

export default function PersonFormDialog() {
  const dispatch = useAppDispatch();
  const { open, editId } = useAppSelector((s) => s.ui.personDialog);
  const people = useAppSelector(selectPeople);
  const editing = editId ? people.find((p) => p.id === editId) : undefined;
  const [form, setForm] = useState<FormState>(empty);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setForm(editing ? { name: editing.name, phone: editing.phone ?? '', notes: editing.notes ?? '' } : empty);
  }, [open, editing]);

  const duplicate = people.find(
    (p) => p.id !== editId && normalizeName(p.name) === normalizeName(form.name) && form.name.trim() !== '',
  );

  const validate = () => {
    const next = {
      name: requiredText(form.name, 'Name', 80) ?? (duplicate ? `A person named "${duplicate.name}" already exists` : undefined),
      phone: validatePhone(form.phone),
      notes: optionalText(form.notes, 'Notes'),
    };
    setErrors(next);
    return !hasErrors(next);
  };

  const submit = () => {
    if (!validate()) return;
    const payload = { name: form.name.trim(), phone: form.phone.trim() || undefined, notes: form.notes.trim() || undefined };
    if (editing) {
      dispatch(updatePerson({ id: editing.id, ...payload }));
      dispatch(showSnackbar({ message: `Updated ${payload.name}` }));
    } else {
      dispatch(addPerson(payload));
      dispatch(showSnackbar({ message: `Added ${payload.name}` }));
    }
    dispatch(closePersonDialog());
  };

  return (
    <FormDialog
      open={open}
      onClose={() => dispatch(closePersonDialog())}
      onSubmit={submit}
      title={editing ? 'Edit person' : 'Add person'}
      subtitle="People are kept separate from money records so one person can have many records."
      submitLabel={editing ? 'Save changes' : 'Add person'}
      maxWidth="xs"
    >
      <TextField
        label="Person name"
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
        error={!!errors.name}
        helperText={errors.name}
        required
        autoFocus
      />
      {duplicate && !errors.name && (
        <Alert severity="warning" sx={{ borderRadius: 2 }}>
          “{duplicate.name}” already exists. Add a surname or nickname to tell them apart.
        </Alert>
      )}
      <TextField
        label="Phone number (optional)"
        value={form.phone}
        onChange={(e) => setForm({ ...form, phone: e.target.value })}
        error={!!errors.phone}
        helperText={errors.phone}
        inputMode="tel"
      />
      <TextField
        label="Notes"
        value={form.notes}
        onChange={(e) => setForm({ ...form, notes: e.target.value })}
        error={!!errors.notes}
        helperText={errors.notes}
        multiline
        minRows={2}
      />
    </FormDialog>
  );
}
