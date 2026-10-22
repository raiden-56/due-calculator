import { Autocomplete, Box, TextField, Typography } from '@mui/material';
import { useAppSelector } from '../../app/hooks';
import { selectRecordSummaries } from '../../app/selectors';
import type { RecordSummary } from '../../types/models';
import { formatINR } from '../../utils/currency';
import { formatDate } from '../../utils/dates';

interface Props {
  personId?: string;
  value: string | undefined;
  onChange: (recordId: string | undefined) => void;
  error?: string;
  label?: string;
  disabled?: boolean;
}

export default function RecordSelect({ personId, value, onChange, error, label = 'Related money record', disabled }: Props) {
  const summaries = useAppSelector(selectRecordSummaries);
  const options = summaries
    .filter((s) => !personId || s.record.personId === personId)
    .slice()
    .sort((a, b) => b.record.dateGiven.localeCompare(a.record.dateGiven));
  const selected = options.find((s) => s.record.id === value) ?? null;

  return (
    <Autocomplete<RecordSummary>
      options={options}
      value={selected}
      onChange={(_, v) => onChange(v?.record.id)}
      getOptionLabel={(o) => `${o.record.id} · ${o.record.description}`}
      isOptionEqualToValue={(a, b) => a.record.id === b.record.id}
      disabled={disabled}
      noOptionsText={personId ? 'No money records for this person yet' : 'Select a person first'}
      renderOption={(props, o) => {
        const { key, ...rest } = props as typeof props & { key: string };
        return (
          <Box component="li" key={key} {...rest} sx={{ display: 'block !important' }}>
            <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
              {o.record.description}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {o.record.id} · {formatDate(o.record.dateGiven)} · {o.record.category} · Outstanding {formatINR(o.outstanding)}
              {!personId && ` · ${o.personName}`}
            </Typography>
          </Box>
        );
      }}
      renderInput={(params) => <TextField {...params} label={label} required error={!!error} helperText={error} />}
    />
  );
}
