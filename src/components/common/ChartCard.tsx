import { Box, Card, Typography } from '@mui/material';
import type { ReactNode } from 'react';

interface Props {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  height?: number;
  /** Rendered instead of children when true. */
  empty?: boolean;
  emptyMessage?: string;
}

export default function ChartCard({ title, subtitle, action, children, height = 280, empty, emptyMessage }: Props) {
  return (
    <Card sx={{ p: { xs: 2, md: 2.5 }, display: 'flex', flexDirection: 'column', minWidth: 0, height: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1, mb: 1.5 }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle1" noWrap sx={{ fontWeight: 700 }}>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="caption" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>
        {action}
      </Box>
      <Box sx={{ width: '100%', height, minWidth: 0, position: 'relative' }}>
        {empty ? (
          <Box
            sx={{
              height: '100%',
              display: 'grid',
              placeItems: 'center',
              color: 'text.secondary',
              textAlign: 'center',
              px: 2,
              border: (t) => `1px dashed ${t.app.border}`,
              borderRadius: 2,
            }}
          >
            <Typography variant="body2">{emptyMessage ?? 'No data for this period yet.'}</Typography>
          </Box>
        ) : (
          children
        )}
      </Box>
    </Card>
  );
}
