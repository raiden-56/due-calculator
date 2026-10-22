import {
  Box,
  Card,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { type ReactNode, useMemo, useState } from 'react';
import EmptyState from './EmptyState';

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  /** Used for sorting. Return number or string. */
  sortValue?: (row: T) => number | string;
  align?: 'left' | 'right' | 'center';
  width?: number | string;
  /** Hidden in the mobile card layout. */
  hideOnMobile?: boolean;
  /** Rendered as the card title on mobile. */
  primary?: boolean;
  /** Rendered in the card header's right side on mobile (e.g. status). */
  secondary?: boolean;
  minWidth?: number;
}

interface Props<T> {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  /** Rendered at the right of each mobile card / last column on desktop. */
  actions?: (row: T) => ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: { label: string; onClick: () => void };
  pageSize?: number;
  dense?: boolean;
  initialSort?: { key: string; direction: 'asc' | 'desc' };
  /** Rendered below the table on desktop (e.g. totals row). */
  footer?: ReactNode;
  /** Force card layout regardless of width */
  forceCards?: boolean;
  disablePagination?: boolean;
}

export default function ResponsiveTable<T>({
  rows,
  columns,
  rowKey,
  onRowClick,
  actions,
  emptyTitle = 'Nothing here yet',
  emptyDescription,
  emptyAction,
  pageSize = 10,
  dense,
  initialSort,
  footer,
  forceCards,
  disablePagination,
}: Props<T>) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const useCards = forceCards || isMobile;
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(pageSize);
  const [sort, setSort] = useState<{ key: string; direction: 'asc' | 'desc' } | undefined>(initialSort);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col?.sortValue) return rows;
    const sv = col.sortValue;
    return [...rows].sort((a, b) => {
      const va = sv(a);
      const vb = sv(b);
      const cmp = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb));
      return sort.direction === 'asc' ? cmp : -cmp;
    });
  }, [rows, sort, columns]);

  const paged = useMemo(() => {
    if (disablePagination) return sorted;
    const start = page * rowsPerPage;
    return sorted.slice(start, start + rowsPerPage);
  }, [sorted, page, rowsPerPage, disablePagination]);

  const safePage = Math.min(page, Math.max(0, Math.ceil(rows.length / rowsPerPage) - 1));
  if (safePage !== page) setPage(safePage);

  const toggleSort = (key: string) =>
    setSort((prev) =>
      prev?.key === key ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' } : { key, direction: 'desc' },
    );

  if (rows.length === 0) {
    return (
      <Card>
        <EmptyState
          title={emptyTitle}
          description={emptyDescription}
          actionLabel={emptyAction?.label}
          onAction={emptyAction?.onClick}
        />
      </Card>
    );
  }

  const pagination = !disablePagination && rows.length > pageSize ? (
    <TablePagination
      component="div"
      count={rows.length}
      page={page}
      onPageChange={(_, p) => setPage(p)}
      rowsPerPage={rowsPerPage}
      onRowsPerPageChange={(e) => {
        setRowsPerPage(Number(e.target.value));
        setPage(0);
      }}
      rowsPerPageOptions={[5, 10, 25, 50]}
      labelRowsPerPage={isMobile ? 'Rows' : 'Rows per page'}
      sx={{ '& .MuiTablePagination-toolbar': { pl: 1, flexWrap: 'wrap', minHeight: 48 } }}
    />
  ) : null;

  if (useCards) {
    const primary = columns.find((c) => c.primary) ?? columns[0];
    const secondary = columns.find((c) => c.secondary);
    const rest = columns.filter((c) => c !== primary && c !== secondary && !c.hideOnMobile);
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
        {paged.map((row) => (
          <Card
            key={rowKey(row)}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
            sx={{ p: 1.75, cursor: onRowClick ? 'pointer' : 'default', minWidth: 0 }}
          >
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
              <Box sx={{ minWidth: 0, flex: 1, overflowWrap: 'anywhere' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  {primary.render(row)}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
                {secondary?.render(row)}
                {actions && <Box onClick={(e) => e.stopPropagation()}>{actions(row)}</Box>}
              </Box>
            </Box>
            <Divider sx={{ my: 1 }} />
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: 1,
              }}
            >
              {rest.map((c) => (
                <Box key={c.key} sx={{ minWidth: 0 }}>
                  <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                    {c.header}
                  </Typography>
                  <Typography variant="body2" component="div" sx={{ overflowWrap: 'anywhere' }}>
                    {c.render(row)}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Card>
        ))}
        {footer}
        {pagination}
      </Box>
    );
  }

  return (
    <Card sx={{ overflow: 'hidden' }}>
      <TableContainer sx={{ maxWidth: '100%', overflowX: 'auto' }}>
        <Table size={dense ? 'small' : 'medium'} sx={{ minWidth: 640 }}>
          <TableHead>
            <TableRow>
              {columns.map((c) => (
                <TableCell key={c.key} align={c.align} sx={{ width: c.width, minWidth: c.minWidth }}>
                  {c.sortValue ? (
                    <TableSortLabel
                      active={sort?.key === c.key}
                      direction={sort?.key === c.key ? sort.direction : 'desc'}
                      onClick={() => toggleSort(c.key)}
                    >
                      {c.header}
                    </TableSortLabel>
                  ) : (
                    c.header
                  )}
                </TableCell>
              ))}
              {actions && <TableCell align="right" sx={{ width: 64 }} />}
            </TableRow>
          </TableHead>
          <TableBody>
            {paged.map((row) => (
              <TableRow
                key={rowKey(row)}
                hover
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                sx={{ cursor: onRowClick ? 'pointer' : 'default' }}
              >
                {columns.map((c) => (
                  <TableCell key={c.key} align={c.align} sx={{ maxWidth: 320 }}>
                    {c.render(row)}
                  </TableCell>
                ))}
                {actions && (
                  <TableCell align="right" onClick={(e) => e.stopPropagation()} sx={{ whiteSpace: 'nowrap' }}>
                    {actions(row)}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      {footer}
      {pagination}
    </Card>
  );
}
