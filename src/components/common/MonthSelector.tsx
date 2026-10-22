import { Box, IconButton, MenuItem, TextField, Tooltip } from '@mui/material';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { MONTH_NAMES } from '../../utils/dates';

interface Props {
  year: number;
  /** null = whole year */
  month: number | null;
  years: number[];
  allowWholeYear?: boolean;
  onChange: (next: { year: number; month: number | null }) => void;
  size?: 'small' | 'medium';
}

export default function MonthSelector({ year, month, years, allowWholeYear = true, onChange, size = 'small' }: Props) {
  const yearOptions = years.includes(year) ? years : [year, ...years].sort((a, b) => b - a);

  const step = (delta: number) => {
    if (month === null) {
      onChange({ year: year + delta, month: null });
      return;
    }
    let m = month + delta;
    let y = year;
    if (m < 1) {
      m = 12;
      y -= 1;
    } else if (m > 12) {
      m = 1;
      y += 1;
    }
    onChange({ year: y, month: m });
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'nowrap' }}>
      <Tooltip title={month === null ? 'Previous year' : 'Previous month'}>
        <IconButton size="small" onClick={() => step(-1)} aria-label="previous period">
          <ChevronLeft size={18} />
        </IconButton>
      </Tooltip>
      <TextField
        select
        size={size}
        value={month ?? 0}
        onChange={(e) => onChange({ year, month: Number(e.target.value) === 0 ? null : Number(e.target.value) })}
        sx={{ minWidth: 130 }}
        aria-label="month"
      >
        {allowWholeYear && <MenuItem value={0}>Whole year</MenuItem>}
        {MONTH_NAMES.map((name, i) => (
          <MenuItem key={name} value={i + 1}>
            {name}
          </MenuItem>
        ))}
      </TextField>
      <TextField
        select
        size={size}
        value={year}
        onChange={(e) => onChange({ year: Number(e.target.value), month })}
        sx={{ minWidth: 90 }}
        aria-label="year"
      >
        {yearOptions.map((y) => (
          <MenuItem key={y} value={y}>
            {y}
          </MenuItem>
        ))}
      </TextField>
      <Tooltip title={month === null ? 'Next year' : 'Next month'}>
        <IconButton size="small" onClick={() => step(1)} aria-label="next period">
          <ChevronRight size={18} />
        </IconButton>
      </Tooltip>
    </Box>
  );
}
