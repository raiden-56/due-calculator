import { Autocomplete, Box, TextField, Typography } from '@mui/material';
import { useAppSelector } from '../../app/hooks';
import { selectPeople, selectPersonSummaryMap } from '../../app/selectors';
import type { Person } from '../../types/models';
import { formatINR } from '../../utils/currency';

interface Props {
  value: string | undefined;
  onChange: (personId: string | undefined) => void;
  error?: string;
  label?: string;
  includeArchived?: boolean;
  autoFocus?: boolean;
  disabled?: boolean;
}

export default function PersonSelect({ value, onChange, error, label = 'Person', includeArchived, autoFocus, disabled }: Props) {
  const people = useAppSelector(selectPeople);
  const summaries = useAppSelector(selectPersonSummaryMap);
  const options = people
    .filter((p) => includeArchived || !p.archived || p.id === value)
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name));
  const selected = options.find((p) => p.id === value) ?? null;

  return (
    <Autocomplete<Person>
      options={options}
      value={selected}
      onChange={(_, v) => onChange(v?.id)}
      getOptionLabel={(o) => o.name}
      isOptionEqualToValue={(a, b) => a.id === b.id}
      disabled={disabled}
      noOptionsText="No people yet — add one from the People page"
      renderOption={(props, option) => {
        const s = summaries.get(option.id);
        const { key, ...rest } = props as typeof props & { key: string };
        return (
          <Box component="li" key={key} {...rest} sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
            <Typography variant="body2" noWrap>
              {option.name}
              {option.archived ? ' (archived)' : ''}
            </Typography>
            {s && (
              <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                owes {formatINR(s.outstanding)}
              </Typography>
            )}
          </Box>
        );
      }}
      renderInput={(params) => (
        <TextField {...params} label={label} required error={!!error} helperText={error} autoFocus={autoFocus} />
      )}
    />
  );
}
