import { roundMoney } from './money';

const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const inrFormatterFixed = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** ₹1,00,000 (no decimals when whole, otherwise 2 decimals). Negative values use a true minus sign. */
export const formatINR = (value: number, options?: { fixed?: boolean; signed?: boolean }): string => {
  const v = roundMoney(value);
  const abs = Math.abs(v);
  const text = options?.fixed ? inrFormatterFixed.format(abs) : inrFormatter.format(abs);
  if (v < 0) return `−${text}`;
  if (options?.signed && v > 0) return `+${text}`;
  return text;
};

/** Plain Indian grouping without the symbol: 1,00,000 */
export const formatNumberIN = (value: number): string =>
  new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(roundMoney(value));

/** Compact form for chart axes: ₹1.2L, ₹50K, ₹2.5Cr */
export const formatINRCompact = (value: number): string => {
  const v = roundMoney(value);
  const abs = Math.abs(v);
  const sign = v < 0 ? '−' : '';
  if (abs >= 1_00_00_000) return `${sign}₹${trim(abs / 1_00_00_000)}Cr`;
  if (abs >= 1_00_000) return `${sign}₹${trim(abs / 1_00_000)}L`;
  if (abs >= 1_000) return `${sign}₹${trim(abs / 1_000)}K`;
  return `${sign}₹${trim(abs)}`;
};

const trim = (n: number): string => {
  const s = n.toFixed(n >= 100 ? 0 : n >= 10 ? 1 : 2);
  return s.includes('.') ? s.replace(/\.?0+$/, '') : s;
};

export const formatPercent = (value: number): string =>
  `${Number.isInteger(value) ? value : value.toFixed(1)}%`;
