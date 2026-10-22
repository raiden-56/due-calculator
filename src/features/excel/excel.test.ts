import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { demoDataset } from '../../test/fixtures';
import { computeTotals, summarizeRecords } from '../../utils/calculations';
import { buildTemplateWorkbook, buildWorkbook } from './excelExport';
import { parseWorkbook } from './excelImport';
import { SHEET } from './excelSchema';

const toBuffer = (wb: XLSX.WorkBook): ArrayBuffer => {
  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array', cellDates: true }) as ArrayBuffer;
  return out;
};

describe('Excel export → import round trip', () => {
  it('writes all required sheets', () => {
    const wb = buildWorkbook(demoDataset(), { year: 2026 });
    expect(wb.SheetNames.slice(0, 5)).toEqual([SHEET.dashboard, SHEET.people, SHEET.records, SHEET.payments, SHEET.cashback]);
    expect(wb.SheetNames).toContain('January');
    expect(wb.SheetNames).toContain('December');
    expect(wb.SheetNames).toHaveLength(17);
  });

  it('round-trips the demo data exactly', () => {
    const original = demoDataset();
    const result = parseWorkbook(toBuffer(buildWorkbook(original, { year: 2026 })));
    expect(result.errors).toEqual([]);
    expect(result.counts).toEqual({ people: 4, records: 6, payments: 10, cashbacks: 3 });

    const strip = <T extends { createdAt: string }>(items: T[]) =>
      items.map(({ createdAt: _c, ...rest }) => rest as unknown as { id: string }).sort((a, b) => a.id.localeCompare(b.id));
    expect(strip(result.dataset.people)).toEqual(strip(original.people));
    expect(strip(result.dataset.records)).toEqual(strip(original.records));
    expect(strip(result.dataset.payments)).toEqual(strip(original.payments));
    expect(strip(result.dataset.cashbacks)).toEqual(strip(original.cashbacks));

    // Totals must be identical after the round trip.
    const before = computeTotals(original, summarizeRecords(original, '2026-10-21'));
    const after = computeTotals(result.dataset, summarizeRecords(result.dataset, '2026-10-21'));
    expect(after).toEqual(before);
  });

  it('exports formulas with cached values', () => {
    const wb = buildWorkbook(demoDataset(), { year: 2026 });
    const records = wb.Sheets[SHEET.records];
    const outstanding = records['J2'] as XLSX.CellObject; // REC-0001 Teja
    expect(outstanding.f).toBe('G2-H2-I2');
    expect(outstanding.v).toBe(60000);
    const dash = wb.Sheets[SHEET.dashboard];
    expect((dash['B6'] as XLSX.CellObject).v).toBe(202900); // total given
    expect((dash['B8'] as XLSX.CellObject).v).toBe(94000); // total outstanding
  });

  it('reports invalid rows instead of silently importing them', () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([
        ['Person ID', 'Name'],
        ['PER-0001', 'Teja'],
        ['', ''],
        ['PER-0002', ''],
      ]),
      'People',
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([
        ['Record ID', 'Person Name', 'Description', 'Category', 'Date Given', 'Original Amount'],
        ['REC-0001', 'Teja', 'Card', 'credit card', '12-01-2026', '₹1,00,000'],
        ['REC-0002', 'Teja', 'Bad amount', 'Cash', '2026-02-01', 'abc'],
        ['REC-0003', 'New Guy', 'Auto person', 'Cash', '2026-02-01', 500],
      ]),
      'Money Records',
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([
        ['Payment ID', 'Record ID', 'Payment Date', 'Amount', 'Method'],
        ['', 'REC-0001', '2026-02-10', 25000, 'upi'],
        ['', 'REC-9999', '2026-02-10', 100, 'UPI'],
        ['', 'REC-0001', 'not a date', 100, 'UPI'],
        ['', 'REC-0001', '2026-03-10', -5, 'UPI'],
      ]),
      'Payments',
    );
    const result = parseWorkbook(toBuffer(wb));
    expect(result.counts.people).toBe(2); // Teja + auto-created New Guy
    expect(result.counts.records).toBe(2);
    expect(result.counts.payments).toBe(1);
    expect(result.dataset.records[0].category).toBe('Credit Card');
    expect(result.dataset.records[0].originalAmount).toBe(100000);
    expect(result.dataset.records[0].dateGiven).toBe('2026-01-12');
    expect(result.dataset.payments[0].id).toBe('PAY-0001');
    expect(result.dataset.payments[0].method).toBe('UPI');
    expect(result.errors.map((e) => e.row)).toEqual(expect.arrayContaining([4, 3, 3, 4, 5]));
    expect(result.errors.length).toBe(5);
    expect(result.warnings.some((w) => w.message.includes('New Guy'))).toBe(true);
  });

  it('builds a blank template with instructions', () => {
    const wb = buildTemplateWorkbook(2026);
    expect(wb.SheetNames[0]).toBe(SHEET.instructions);
    const result = parseWorkbook(toBuffer(wb));
    expect(result.errors).toEqual([]);
    expect(result.counts).toEqual({ people: 0, records: 0, payments: 0, cashbacks: 0 });
  });
});
