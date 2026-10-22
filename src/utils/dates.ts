import dayjs, { Dayjs } from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';

dayjs.extend(customParseFormat);

export const ISO = 'YYYY-MM-DD';

export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

export const MONTH_SHORT = MONTH_NAMES.map((m) => m.slice(0, 3));

export const today = (): string => dayjs().format(ISO);
export const nowISO = (): string => new Date().toISOString();
export const currentYear = (): number => dayjs().year();
export const currentMonth = (): number => dayjs().month() + 1;

export const isValidISODate = (value: string | undefined | null): value is string =>
  !!value && dayjs(value, ISO, true).isValid();

export const formatDate = (iso: string | undefined, fmt = 'DD MMM YYYY'): string =>
  isValidISODate(iso) ? dayjs(iso, ISO, true).format(fmt) : '—';

export const formatDateTime = (isoDateTime: string | undefined): string =>
  isoDateTime ? dayjs(isoDateTime).format('DD MMM YYYY, hh:mm A') : '—';

export const monthKey = (iso: string): string => iso.slice(0, 7);
export const yearOf = (iso: string): number => Number(iso.slice(0, 4));
export const monthOf = (iso: string): number => Number(iso.slice(5, 7));
export const toMonthKey = (year: number, month: number): string =>
  `${year}-${String(month).padStart(2, '0')}`;

export const monthLabel = (year: number, month: number): string => `${MONTH_SHORT[month - 1]} ${year}`;
export const monthLongLabel = (year: number, month: number): string => `${MONTH_NAMES[month - 1]} ${year}`;

export const daysBetween = (fromISO: string, toISO: string): number =>
  dayjs(toISO, ISO, true).startOf('day').diff(dayjs(fromISO, ISO, true).startOf('day'), 'day');

/**
 * Parses many date representations into ISO: Date objects, Excel serial numbers,
 * DD-MM-YYYY, DD/MM/YYYY, YYYY-MM-DD, "21 Jan 2026", "Jan 21, 2026".
 */
export const parseDateInput = (input: unknown): string | null => {
  if (input == null || input === '') return null;
  if (input instanceof Date) {
    if (Number.isNaN(input.getTime())) return null;
    return dayjs(input).format(ISO);
  }
  if (typeof input === 'number') {
    // Excel serial date (days since 1899-12-30). Range covers years ~1954-2119.
    if (input < 20000 || input > 80000) return null;
    const ms = Math.round((input - 25569) * 86400 * 1000);
    return new Date(ms).toISOString().slice(0, 10);
  }
  if (typeof input !== 'string') return null;
  const s = input.trim();
  if (!s) return null;
  const formats = [
    ISO,
    'YYYY/MM/DD',
    'DD-MM-YYYY',
    'DD/MM/YYYY',
    'D-M-YYYY',
    'D/M/YYYY',
    'DD.MM.YYYY',
    'DD MMM YYYY',
    'D MMM YYYY',
    'DD-MMM-YYYY',
    'DD-MMM-YY',
    'MMM D, YYYY',
    'MMMM D, YYYY',
    'YYYY-MM-DDTHH:mm:ss.SSSZ',
    'YYYY-MM-DD HH:mm:ss',
  ];
  for (const f of formats) {
    const d = dayjs(s, f, true);
    if (d.isValid()) return d.format(ISO);
  }
  const loose = dayjs(s);
  return loose.isValid() ? loose.format(ISO) : null;
};

export const toDayjs = (iso: string): Dayjs => dayjs(iso, ISO, true);

/** Local-time Date for Excel export (avoids timezone shifting the day). */
export const isoToDate = (iso: string): Date => {
  const d = toDayjs(iso);
  return new Date(d.year(), d.month(), d.date(), 12, 0, 0);
};

export const listYears = (isoDates: Iterable<string>, fallbackYear = dayjs().year()): number[] => {
  const years = new Set<number>([fallbackYear]);
  for (const d of isoDates) if (isValidISODate(d)) years.add(yearOf(d));
  return [...years].sort((a, b) => b - a);
};
