/** Minimal RFC-4180 CSV writer. */
export const toCSV = (headers: string[], rows: (string | number | boolean | null | undefined)[][]): string => {
  const escape = (v: string | number | boolean | null | undefined): string => {
    if (v === null || v === undefined) return '';
    const s = typeof v === 'number' ? String(v) : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers, ...rows].map((r) => r.map(escape).join(',')).join('\r\n');
};
