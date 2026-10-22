import { Typography, type TypographyProps } from '@mui/material';
import { formatINR } from '../../utils/currency';
import { toPaise } from '../../utils/money';

type Tone = 'default' | 'received' | 'pending' | 'overdue' | 'cashback' | 'muted' | 'auto';

interface Props extends Omit<TypographyProps, 'children' | 'color'> {
  value: number;
  tone?: Tone;
  fixed?: boolean;
  signed?: boolean;
  /** When true, zero renders as a muted dash-like value. */
  dimZero?: boolean;
}

/** Renders ₹1,00,000 with tabular figures and a semantic colour. */
export default function CurrencyDisplay({ value, tone = 'default', fixed, signed, dimZero, sx, ...rest }: Props) {
  const resolvedTone: Tone =
    tone === 'auto' ? (toPaise(value) > 0 ? 'received' : toPaise(value) < 0 ? 'overdue' : 'muted') : tone;
  const isZero = toPaise(value) === 0;
  return (
    <Typography
      component="span"
      {...rest}
      sx={{
        fontVariantNumeric: 'tabular-nums',
        whiteSpace: 'nowrap',
        fontWeight: 600,
        color: (theme) => {
          if (dimZero && isZero) return theme.palette.text.disabled;
          switch (resolvedTone) {
            case 'received':
              return theme.app.received;
            case 'pending':
              return theme.app.pending;
            case 'overdue':
              return theme.app.overdue;
            case 'cashback':
              return theme.app.cashback;
            case 'muted':
              return theme.palette.text.secondary;
            default:
              return theme.palette.text.primary;
          }
        },
        ...sx,
      }}
    >
      {formatINR(value, { fixed, signed })}
    </Typography>
  );
}
