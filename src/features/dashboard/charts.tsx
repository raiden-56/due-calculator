import { Box, Typography, useMediaQuery, useTheme } from '@mui/material';
import type { Theme } from '@mui/material/styles';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { MonthlyBucket, RecordStatus } from '../../types/models';
import { formatINR, formatINRCompact } from '../../utils/currency';

/* ------------------------------------------------------------------ */
/* Shared pieces                                                      */
/* ------------------------------------------------------------------ */

interface TooltipPayloadItem {
  name?: string;
  value?: number | string;
  color?: string;
  dataKey?: string | number;
  payload?: Record<string, unknown>;
}

interface TooltipProps {
  active?: boolean;
  label?: string | number;
  payload?: TooltipPayloadItem[];
  /** Format for values; defaults to INR. */
  format?: (v: number, item: TooltipPayloadItem) => string;
  /** Optional title override from payload */
  title?: (payload: TooltipPayloadItem[]) => string | undefined;
}

export function MoneyTooltip({ active, label, payload, format, title }: TooltipProps) {
  const theme = useTheme();
  if (!active || !payload || payload.length === 0) return null;
  const heading = title?.(payload) ?? (label !== undefined ? String(label) : undefined);
  return (
    <Box
      sx={{
        bgcolor: 'background.paper',
        border: `1px solid ${theme.app.border}`,
        borderRadius: 2,
        px: 1.5,
        py: 1,
        boxShadow: theme.palette.mode === 'light' ? '0 8px 24px rgba(15,23,42,0.12)' : '0 8px 24px rgba(0,0,0,0.5)',
        minWidth: 160,
      }}
    >
      {heading && (
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block', mb: 0.5 }}>
          {heading}
        </Typography>
      )}
      {payload.map((p, i) => (
        <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: p.color ?? theme.app.neutral, flexShrink: 0 }} />
            <Typography variant="caption" noWrap>
              {p.name}
            </Typography>
          </Box>
          <Typography variant="caption" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
            {format ? format(Number(p.value ?? 0), p) : formatINR(Number(p.value ?? 0))}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

const useChartStyle = () => {
  const theme = useTheme();
  const small = useMediaQuery(theme.breakpoints.down('sm'));
  return {
    theme,
    small,
    axis: { fill: theme.palette.text.secondary, fontSize: small ? 10 : 11 },
    grid: theme.app.grid,
    cursor: { fill: theme.palette.mode === 'light' ? 'rgba(15,23,42,0.04)' : 'rgba(255,255,255,0.05)' },
  };
};

const legendStyle = { fontSize: 12, paddingTop: 8 };

/** Tooltip heading: the full "Jan 2026" label stored on each row (axis shows the short form). */
const fullTitle = (payload: TooltipPayloadItem[]): string | undefined =>
  typeof payload[0]?.payload?.full === 'string' ? (payload[0].payload.full as string) : undefined;

/* ------------------------------------------------------------------ */
/* 1. Monthly money given vs received                                 */
/* ------------------------------------------------------------------ */

export function GivenVsReceivedChart({ data }: { data: MonthlyBucket[] }) {
  const { theme, small, axis, grid, cursor } = useChartStyle();
  const rows = data.map((b) => ({ name: b.label.slice(0, 3), full: b.label, Given: b.given, Received: b.received }));
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={2} barCategoryGap="28%">
        <CartesianGrid vertical={false} stroke={grid} />
        <XAxis dataKey="name" tick={axis} axisLine={false} tickLine={false} interval={small ? 1 : 0} />
        <YAxis tick={axis} axisLine={false} tickLine={false} tickFormatter={formatINRCompact} width={small ? 44 : 56} />
        <Tooltip content={<MoneyTooltip title={fullTitle} />} cursor={cursor} />
        <Legend wrapperStyle={legendStyle} iconType="circle" iconSize={8} />
        <Bar isAnimationActive={false} dataKey="Given" fill={theme.app.given} radius={[4, 4, 0, 0]} maxBarSize={28} />
        <Bar isAnimationActive={false} dataKey="Received" fill={theme.app.received} radius={[4, 4, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ------------------------------------------------------------------ */
/* 2. Outstanding balance by person (horizontal bars)                 */
/* ------------------------------------------------------------------ */

export function OutstandingByPersonChart({ data }: { data: { name: string; outstanding: number }[] }) {
  const { theme, small, axis, grid, cursor } = useChartStyle();
  const rows = data.slice(0, 8).map((d) => ({ ...d, name: d.name.length > 16 ? `${d.name.slice(0, 15)}…` : d.name }));
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 48, left: 4, bottom: 0 }} barCategoryGap="30%">
        <CartesianGrid horizontal={false} stroke={grid} />
        <XAxis type="number" tick={axis} axisLine={false} tickLine={false} tickFormatter={formatINRCompact} />
        <YAxis type="category" dataKey="name" tick={axis} axisLine={false} tickLine={false} width={small ? 80 : 110} />
        <Tooltip content={<MoneyTooltip />} cursor={cursor} />
        <Bar
          isAnimationActive={false}
          dataKey="outstanding"
          name="Outstanding"
          fill={theme.app.pending}
          radius={[0, 4, 4, 0]}
          maxBarSize={22}
          label={{ position: 'right', fontSize: 11, fill: theme.palette.text.secondary, formatter: (v: unknown) => formatINRCompact(Number(v)) }}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ------------------------------------------------------------------ */
/* 3. Payment status donut                                            */
/* ------------------------------------------------------------------ */

export const statusColor = (status: RecordStatus, app: Theme['app']): string =>
  status === 'Settled'
    ? app.received
    : status === 'Partially Paid'
      ? app.given
      : status === 'Pending'
        ? app.pending
        : status === 'Overpaid'
          ? app.cashback
          : app.overdue;

export function StatusDonut({ data, total }: { data: { status: RecordStatus; count: number; amount: number }[]; total: number }) {
  const { theme, small } = useChartStyle();
  return (
    <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
          <Pie
            data={data}
            isAnimationActive={false}
            dataKey="count"
            nameKey="status"
            innerRadius={small ? '58%' : '62%'}
            outerRadius={small ? '82%' : '88%'}
            paddingAngle={2}
            stroke={theme.palette.background.paper}
            strokeWidth={2}
            cy="46%"
          >
            {data.map((d) => (
              <Cell key={d.status} fill={statusColor(d.status, theme.app)} />
            ))}
          </Pie>
          <Tooltip
            content={
              <MoneyTooltip
                format={(v, item) => `${v} record${v === 1 ? '' : 's'} · ${formatINR(Number(item.payload?.amount ?? 0))}`}
              />
            }
          />
          <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" iconSize={8} verticalAlign="bottom" />
        </PieChart>
      </ResponsiveContainer>
      <Box
        sx={{
          position: 'absolute',
          top: '46%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          pointerEvents: 'none',
        }}
      >
        <Typography variant="h5" sx={{ lineHeight: 1 }}>
          {total}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          records
        </Typography>
      </Box>
    </Box>
  );
}

/* ------------------------------------------------------------------ */
/* 4. Monthly collection trend (line)                                 */
/* ------------------------------------------------------------------ */

export function CollectionTrendChart({ data }: { data: MonthlyBucket[] }) {
  const { theme, small, axis, grid } = useChartStyle();
  let running = 0;
  const rows = data.map((b) => {
    running = Math.round((running + b.received) * 100) / 100;
    return { name: b.label.slice(0, 3), full: b.label, Received: b.received, Cumulative: running };
  });
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={rows} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={grid} />
        <XAxis dataKey="name" tick={axis} axisLine={false} tickLine={false} interval={small ? 1 : 0} />
        <YAxis tick={axis} axisLine={false} tickLine={false} tickFormatter={formatINRCompact} width={small ? 44 : 56} />
        <Tooltip content={<MoneyTooltip title={fullTitle} />} cursor={{ stroke: theme.app.neutral, strokeDasharray: '3 3' }} />
        <Legend wrapperStyle={legendStyle} iconType="circle" iconSize={8} />
        <Line
          isAnimationActive={false}
          type="monotone"
          dataKey="Received"
          stroke={theme.app.received}
          strokeWidth={2}
          dot={{ r: 3, strokeWidth: 2, fill: theme.palette.background.paper }}
          activeDot={{ r: 5 }}
        />
        <Line
          isAnimationActive={false}
          type="monotone"
          dataKey="Cumulative"
          stroke={theme.app.given}
          strokeWidth={2}
          strokeDasharray="5 4"
          dot={false}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

/* ------------------------------------------------------------------ */
/* 5. Cashback by month                                               */
/* ------------------------------------------------------------------ */

export function CashbackChart({ data }: { data: MonthlyBucket[] }) {
  const { theme, small, axis, grid, cursor } = useChartStyle();
  const rows = data.map((b) => ({ name: b.label.slice(0, 3), full: b.label, Cashback: b.cashback }));
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="35%">
        <CartesianGrid vertical={false} stroke={grid} />
        <XAxis dataKey="name" tick={axis} axisLine={false} tickLine={false} interval={small ? 1 : 0} />
        <YAxis tick={axis} axisLine={false} tickLine={false} tickFormatter={formatINRCompact} width={small ? 44 : 56} />
        <Tooltip content={<MoneyTooltip title={fullTitle} />} cursor={cursor} />
        <Bar isAnimationActive={false} dataKey="Cashback" fill={theme.app.cashback} radius={[4, 4, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}
