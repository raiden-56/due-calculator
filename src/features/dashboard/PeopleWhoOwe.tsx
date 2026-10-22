import { Avatar, Box, Button, Card, LinearProgress, Typography, useTheme } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../../app/hooks';
import { selectPersonSummaries } from '../../app/selectors';
import CurrencyDisplay from '../../components/common/CurrencyDisplay';
import EmptyState from '../../components/common/EmptyState';
import StatusChip from '../../components/common/StatusChip';
import { percentOf } from '../../utils/money';

const initials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join('');

export default function PeopleWhoOwe({ limit = 6 }: { limit?: number }) {
  const theme = useTheme();
  const navigate = useNavigate();
  const people = useAppSelector(selectPersonSummaries);
  const owing = people.filter((p) => p.outstanding > 0).sort((a, b) => b.outstanding - a.outstanding);

  return (
    <Card sx={{ p: { xs: 2, md: 2.5 }, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            People who owe me
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Sorted by highest outstanding
          </Typography>
        </Box>
        <Button size="small" onClick={() => navigate('/people')}>
          All people
        </Button>
      </Box>
      {owing.length === 0 ? (
        <EmptyState compact title="Nobody owes you right now" description="Every record is settled. Nice." />
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {owing.slice(0, limit).map((p) => {
            const pct = percentOf(p.totalPaid + p.cashbackApplied, p.totalGiven);
            return (
              <Box
                key={p.person.id}
                onClick={() => navigate(`/people/${p.person.id}`)}
                sx={{ display: 'flex', alignItems: 'center', gap: 1.5, cursor: 'pointer', '&:hover': { opacity: 0.85 } }}
              >
                <Avatar sx={{ width: 38, height: 38, bgcolor: theme.app.sidebar, color: '#fff', fontSize: 14, fontWeight: 700 }}>
                  {initials(p.person.name)}
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, alignItems: 'baseline' }}>
                    <Typography variant="body2" noWrap sx={{ fontWeight: 700, minWidth: 0 }}>
                      {p.person.name}
                    </Typography>
                    <CurrencyDisplay value={p.outstanding} tone={p.status === 'Overdue' ? 'overdue' : 'pending'} variant="body2" />
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(100, pct)}
                      sx={{
                        flex: 1,
                        height: 6,
                        borderRadius: 3,
                        bgcolor: theme.app.grid,
                        '& .MuiLinearProgress-bar': { bgcolor: theme.app.received, borderRadius: 3 },
                      }}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap', minWidth: 52, textAlign: 'right' }}>
                      {pct}% paid
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                  <StatusChip status={p.status} />
                </Box>
              </Box>
            );
          })}
          {owing.length > limit && (
            <Typography variant="caption" color="text.secondary">
              +{owing.length - limit} more on the People page
            </Typography>
          )}
        </Box>
      )}
    </Card>
  );
}
