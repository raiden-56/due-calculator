import { Box, IconButton, LinearProgress, Tooltip, Typography, useTheme } from '@mui/material';
import { EllipsisVertical, Eye } from 'lucide-react';
import type { MouseEvent } from 'react';
import CurrencyDisplay from '../../components/common/CurrencyDisplay';
import ResponsiveTable, { type Column } from '../../components/common/ResponsiveTable';
import StatusChip from '../../components/common/StatusChip';
import type { RecordSummary } from '../../types/models';
import { formatDate } from '../../utils/dates';

interface Props {
  rows: RecordSummary[];
  onView: (row: RecordSummary) => void;
  onMenu?: (anchor: HTMLElement, row: RecordSummary) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: { label: string; onClick: () => void };
  pageSize?: number;
  compact?: boolean;
}

export default function MoneyRecordsTable({ rows, onView, onMenu, emptyTitle, emptyDescription, emptyAction, pageSize = 10, compact }: Props) {
  const theme = useTheme();
  const columns: Column<RecordSummary>[] = [
    {
      key: 'description',
      header: 'Record',
      primary: true,
      sortValue: (r) => r.record.description,
      minWidth: 200,
      render: (r) => (
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" sx={{ fontWeight: 700, overflowWrap: 'anywhere' }}>
            {r.record.description}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {r.record.id} · {r.record.category}
          </Typography>
        </Box>
      ),
    },
    { key: 'person', header: 'Person', sortValue: (r) => r.personName, render: (r) => <Typography variant="body2" sx={{ overflowWrap: 'anywhere' }}>{r.personName}</Typography> },
    { key: 'date', header: 'Date given', sortValue: (r) => r.record.dateGiven, render: (r) => formatDate(r.record.dateGiven) },
    { key: 'original', header: 'Original', align: 'right', sortValue: (r) => r.record.originalAmount, render: (r) => <CurrencyDisplay value={r.record.originalAmount} variant="body2" /> },
    { key: 'received', header: 'Received', align: 'right', sortValue: (r) => r.totalPaid, render: (r) => <CurrencyDisplay value={r.totalPaid} tone="received" variant="body2" dimZero /> },
    {
      key: 'outstanding',
      header: 'Outstanding',
      align: 'right',
      sortValue: (r) => r.outstanding,
      render: (r) => (
        <Box sx={{ minWidth: 110 }}>
          {r.overpaid > 0 ? (
            <Box>
              <CurrencyDisplay value={r.overpaid} tone="cashback" variant="body2" signed />
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                overpaid
              </Typography>
            </Box>
          ) : (
            <>
              <CurrencyDisplay value={r.outstanding} tone={r.isOverdue ? 'overdue' : 'pending'} variant="body2" dimZero />
              {!compact && (
                <LinearProgress
                  variant="determinate"
                  value={Math.min(100, r.collectionPct)}
                  sx={{ mt: 0.5, height: 4, borderRadius: 2, bgcolor: theme.app.grid, '& .MuiLinearProgress-bar': { bgcolor: theme.app.received } }}
                />
              )}
            </>
          )}
        </Box>
      ),
    },
    { key: 'cashback', header: 'Cashback', align: 'right', hideOnMobile: true, sortValue: (r) => r.cashbackTotal, render: (r) => <CurrencyDisplay value={r.cashbackTotal} tone="cashback" variant="body2" dimZero /> },
    {
      key: 'due',
      header: 'Due',
      hideOnMobile: compact,
      sortValue: (r) => r.record.dueDate ?? '',
      render: (r) => (
        <Typography variant="body2" color={r.isOverdue ? 'error.main' : 'text.primary'} sx={{ fontWeight: r.isOverdue ? 700 : 400 }}>
          {formatDate(r.record.dueDate)}
          {r.isOverdue && (
            <Typography variant="caption" color="error.main" sx={{ display: 'block' }}>
              {r.daysOverdue}d overdue
            </Typography>
          )}
        </Typography>
      ),
    },
    { key: 'status', header: 'Status', secondary: true, sortValue: (r) => r.status, render: (r) => <StatusChip status={r.status} /> },
  ];

  return (
    <ResponsiveTable
      rows={rows}
      columns={columns}
      rowKey={(r) => r.record.id}
      onRowClick={onView}
      pageSize={pageSize}
      initialSort={{ key: 'date', direction: 'desc' }}
      emptyTitle={emptyTitle}
      emptyDescription={emptyDescription}
      emptyAction={emptyAction}
      actions={(r) => (
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Tooltip title="View details">
            <IconButton size="small" onClick={() => onView(r)} aria-label="view record">
              <Eye size={16} />
            </IconButton>
          </Tooltip>
          {onMenu && (
            <IconButton size="small" onClick={(e: MouseEvent<HTMLElement>) => onMenu(e.currentTarget, r)} aria-label="more actions">
              <EllipsisVertical size={16} />
            </IconButton>
          )}
        </Box>
      )}
    />
  );
}
