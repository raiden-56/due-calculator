import { Box, Button, Card, Chip, IconButton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tooltip, Typography, useMediaQuery, useTheme } from '@mui/material';
import { Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../../app/hooks';
import { selectPayments, selectPeopleMap, selectRecordsMap } from '../../app/selectors';
import CurrencyDisplay from '../../components/common/CurrencyDisplay';
import EmptyState from '../../components/common/EmptyState';
import { formatDate } from '../../utils/dates';

export default function RecentPayments({ limit = 5 }: { limit?: number }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();
  const payments = useAppSelector(selectPayments);
  const people = useAppSelector(selectPeopleMap);
  const records = useAppSelector(selectRecordsMap);
  const recent = [...payments].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)).slice(0, limit);

  return (
    <Card sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <Box sx={{ p: { xs: 2, md: 2.5 }, pb: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Recent activity
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Latest {Math.min(limit, payments.length)} of {payments.length} payments
          </Typography>
        </Box>
        <Button size="small" onClick={() => navigate('/payments')}>
          View full history
        </Button>
      </Box>
      {recent.length === 0 ? (
        <EmptyState compact title="No payments yet" description="Payments you record will appear here, newest first." />
      ) : isMobile ? (
        <Box sx={{ px: 2, pb: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
          {recent.map((p) => (
            <Box
              key={p.id}
              onClick={() => navigate(`/records/${p.recordId}`)}
              sx={{ p: 1.5, borderRadius: 2, border: `1px solid ${theme.app.border}`, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', gap: 1 }}
            >
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" noWrap sx={{ fontWeight: 700 }}>
                  {people.get(p.personId)?.name ?? 'Unknown'}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                  {formatDate(p.date)} · {p.method} · {records.get(p.recordId)?.description ?? p.recordId}
                </Typography>
              </Box>
              <CurrencyDisplay value={p.amount} tone="received" variant="body2" />
            </Box>
          ))}
        </Box>
      ) : (
        <TableContainer sx={{ overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: 560 }}>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Person</TableCell>
                <TableCell align="right">Amount</TableCell>
                <TableCell>Method</TableCell>
                <TableCell>Related record</TableCell>
                <TableCell align="right" />
              </TableRow>
            </TableHead>
            <TableBody>
              {recent.map((p) => (
                <TableRow key={p.id} hover>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDate(p.date)}</TableCell>
                  <TableCell sx={{ fontWeight: 600, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {people.get(p.personId)?.name ?? 'Unknown'}
                  </TableCell>
                  <TableCell align="right">
                    <CurrencyDisplay value={p.amount} tone="received" variant="body2" />
                  </TableCell>
                  <TableCell>
                    <Chip size="small" label={p.method} variant="outlined" />
                  </TableCell>
                  <TableCell sx={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <Typography variant="body2" noWrap>
                      {records.get(p.recordId)?.description ?? '—'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {p.recordId}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="View record">
                      <IconButton size="small" onClick={() => navigate(`/records/${p.recordId}`)} aria-label="view record">
                        <Eye size={16} />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Card>
  );
}
