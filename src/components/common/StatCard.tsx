import { Box, Card, Skeleton, Typography, alpha, useTheme } from '@mui/material';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

type Accent = 'primary' | 'received' | 'pending' | 'overdue' | 'cashback' | 'neutral';

interface Props {
  label: string;
  value: ReactNode;
  caption?: ReactNode;
  icon: LucideIcon;
  accent?: Accent;
  loading?: boolean;
  onClick?: () => void;
}

export default function StatCard({ label, value, caption, icon: Icon, accent = 'primary', loading, onClick }: Props) {
  const theme = useTheme();
  const color =
    accent === 'received'
      ? theme.app.received
      : accent === 'pending'
        ? theme.app.pending
        : accent === 'overdue'
          ? theme.app.overdue
          : accent === 'cashback'
            ? theme.app.cashback
            : accent === 'neutral'
              ? theme.app.neutral
              : theme.app.primary;

  return (
    <Card
      onClick={onClick}
      sx={{
        p: { xs: 2, md: 2.5 },
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 120ms ease, box-shadow 120ms ease',
        '&:hover': onClick ? { transform: 'translateY(-2px)', boxShadow: `0 8px 24px ${alpha(color, 0.12)}` } : undefined,
        minWidth: 0,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
        <Typography variant="body2" color="text.secondary" noWrap sx={{ fontWeight: 600 }}>
          {label}
        </Typography>
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: 2,
            display: 'grid',
            placeItems: 'center',
            bgcolor: alpha(color, 0.12),
            color,
            flexShrink: 0,
          }}
        >
          <Icon size={18} strokeWidth={2.2} />
        </Box>
      </Box>
      {loading ? (
        <Skeleton width="60%" height={36} />
      ) : (
        <Typography
          variant="h5"
          sx={{
            fontVariantNumeric: 'tabular-nums',
            fontSize: { xs: '1.25rem', sm: '1.45rem', lg: '1.6rem' },
            lineHeight: 1.2,
            overflowWrap: 'anywhere',
          }}
        >
          {value}
        </Typography>
      )}
      {caption && (
        <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.4 }}>
          {caption}
        </Typography>
      )}
    </Card>
  );
}
