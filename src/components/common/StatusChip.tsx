import { Chip, alpha, useTheme } from '@mui/material';
import type { PersonStatus, RecordStatus } from '../../types/models';

type Status = RecordStatus | PersonStatus;

const iconFor: Record<string, string> = {
  Settled: '✓',
  'Partially Paid': '◐',
  Pending: '○',
  Overdue: '!',
  Overpaid: '＋',
  Credit: '＋',
  'No Records': '–',
};

export default function StatusChip({ status, size = 'small' }: { status: Status; size?: 'small' | 'medium' }) {
  const theme = useTheme();
  const color =
    status === 'Settled'
      ? theme.app.received
      : status === 'Partially Paid'
        ? theme.app.primary
        : status === 'Pending'
          ? theme.app.pending
          : status === 'Overdue'
            ? theme.app.overdue
            : status === 'Overpaid' || status === 'Credit'
              ? theme.app.cashback
              : theme.app.neutral;
  return (
    <Chip
      size={size}
      label={`${iconFor[status] ?? ''} ${status}`.trim()}
      sx={{
        bgcolor: alpha(color, theme.palette.mode === 'light' ? 0.12 : 0.22),
        color: theme.palette.mode === 'light' ? color : alpha('#fff', 0.92),
        fontWeight: 700,
        height: size === 'small' ? 24 : 30,
        '& .MuiChip-label': { px: 1 },
      }}
    />
  );
}
