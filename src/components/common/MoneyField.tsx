import { InputAdornment, TextField, type TextFieldProps } from '@mui/material';

type Props = Omit<TextFieldProps, 'value' | 'onChange' | 'type'> & {
  value: string;
  onChange: (value: string) => void;
};

/** Amount input with ₹ adornment; keeps the raw string so users can type freely. */
export default function MoneyField({ value, onChange, ...rest }: Props) {
  return (
    <TextField
      {...rest}
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/[^\d.,]/g, ''))}
      inputMode="decimal"
      slotProps={{
        ...rest.slotProps,
        input: {
          startAdornment: <InputAdornment position="start">₹</InputAdornment>,
          ...(rest.slotProps?.input as object | undefined),
        },
        htmlInput: { inputMode: 'decimal', style: { fontVariantNumeric: 'tabular-nums' } },
      }}
    />
  );
}
