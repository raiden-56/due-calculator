import * as XLSX from 'xlsx';
import type { Dataset } from '../../types/models';
import {
  computeMonthlyBuckets,
  computeTotals,
  filterByMonth,
  indexById,
  summarizePeople,
  summarizeRecords,
} from '../../utils/calculations';
import { MONTH_NAMES, isValidISODate, isoToDate } from '../../utils/dates';
import { CASHBACK_HEADERS, PAYMENT_HEADERS, PEOPLE_HEADERS, RECORD_HEADERS, SHEET } from './excelSchema';

type Cell = XLSX.CellObject | string | number | boolean | null | undefined;

const MONEY_FMT = '#,##0.00';
const DATE_FMT = 'dd-mmm-yyyy';

const money = (v: number): XLSX.CellObject => ({ t: 'n', v, z: MONEY_FMT });
const date = (iso: string | undefined): XLSX.CellObject | '' =>
  isValidISODate(iso) ? { t: 'd', v: isoToDate(iso), z: DATE_FMT } : '';
/** Formula cell carrying the TypeScript-computed value as its cached result. */
const formula = (f: string, cached: number | string, z?: string): XLSX.CellObject =>
  typeof cached === 'number' ? { t: 'n', v: cached, f, z: z ?? MONEY_FMT } : { t: 's', v: cached, f };

const sheetFromRows = (rows: Cell[][], widths: number[]): XLSX.WorkSheet => {
  const ws = XLSX.utils.aoa_to_sheet(rows as unknown[][], { cellDates: true });
  ws['!cols'] = widths.map((wch) => ({ wch }));
  return ws;
};

const yes = (b: boolean) => (b ? 'Yes' : 'No');

export interface ExportOptions {
  /** Year used for the twelve monthly sheets. */
  year: number;
}

export const buildWorkbook = (data: Dataset, options: ExportOptions): XLSX.WorkBook => {
  const { year } = options;
  const recordSummaries = summarizeRecords(data);
  const personSummaries = summarizePeople(data, recordSummaries);
  const totals = computeTotals(data, recordSummaries);
  const peopleById = indexById(data.people);
  const recordsById = indexById(data.records);
  const wb = XLSX.utils.book_new();

  /* ---------------- Dashboard ---------------- */
  const dash: Cell[][] = [
    ['MyMoney — Personal Money Tracker', ''],
    ['Exported on', { t: 'd', v: new Date(), z: 'dd-mmm-yyyy hh:mm' }],
    ['Values are computed by the app; formulas recalculate in Excel.', ''],
    [],
    ['Metric', 'Value'],
    ['Total Amount Given', formula(`SUM('${SHEET.records}'!G:G)`, totals.totalGiven)],
    ['Total Received', formula(`SUM('${SHEET.payments}'!F:F)`, totals.totalReceived)],
    ['Total Outstanding', formula(`SUMIF('${SHEET.records}'!J:J,">0")`, totals.totalOutstanding)],
    ['Total Overpaid (credit)', formula(`-SUMIF('${SHEET.records}'!J:J,"<0")`, totals.totalOverpaid)],
    ['Total Cashback', formula(`SUM('${SHEET.cashback}'!F:F)`, totals.totalCashback)],
    ['Cashback Applied To Debt', formula(`SUMIF('${SHEET.cashback}'!H:H,"Yes",'${SHEET.cashback}'!F:F)`, totals.cashbackApplied)],
    ['People With Pending Balances', formula(`COUNTIF('${SHEET.people}'!I:I,">0")`, totals.peopleWithPending, '0')],
    ['Fully Settled Records', formula(`COUNTIF('${SHEET.records}'!M:M,"Settled")`, totals.fullySettledRecords, '0')],
    ['Overdue Records', formula(`COUNTIF('${SHEET.records}'!M:M,"Overdue")`, totals.overdueRecords, '0')],
    ['Total Records', formula(`COUNTA('${SHEET.records}'!A:A)-1`, totals.recordCount, '0')],
    ['Total Payments', formula(`COUNTA('${SHEET.payments}'!A:A)-1`, totals.paymentCount, '0')],
    [],
    ['People Who Owe Me', 'Outstanding', 'Total Given', 'Total Paid', 'Status'],
    ...personSummaries
      .filter((p) => p.outstanding > 0)
      .sort((a, b) => b.outstanding - a.outstanding)
      .map((p) => [p.person.name, money(p.outstanding), money(p.totalGiven), money(p.totalPaid), p.status] as Cell[]),
    [],
    [`Monthly summary ${year}`, 'Money Given', 'Money Received', 'Cashback', 'Payments'],
    ...computeMonthlyBuckets(data, year).map((b) => {
      const start = `DATE(${year},${b.month},1)`;
      const end = `DATE(${year},${b.month + 1},1)`;
      return [
        b.label,
        formula(
          `SUMIFS('${SHEET.records}'!$G:$G,'${SHEET.records}'!$F:$F,">="&${start},'${SHEET.records}'!$F:$F,"<"&${end})`,
          b.given,
        ),
        formula(
          `SUMIFS('${SHEET.payments}'!$F:$F,'${SHEET.payments}'!$E:$E,">="&${start},'${SHEET.payments}'!$E:$E,"<"&${end})`,
          b.received,
        ),
        formula(
          `SUMIFS('${SHEET.cashback}'!$F:$F,'${SHEET.cashback}'!$E:$E,">="&${start},'${SHEET.cashback}'!$E:$E,"<"&${end})`,
          b.cashback,
        ),
        formula(
          `COUNTIFS('${SHEET.payments}'!$E:$E,">="&${start},'${SHEET.payments}'!$E:$E,"<"&${end})`,
          b.paymentCount,
          '0',
        ),
      ] as Cell[];
    }),
  ];
  XLSX.utils.book_append_sheet(wb, sheetFromRows(dash, [34, 18, 16, 16, 14]), SHEET.dashboard);

  /* ---------------- People ---------------- */
  const peopleRows: Cell[][] = [[...PEOPLE_HEADERS]];
  const psById = new Map(personSummaries.map((p) => [p.person.id, p]));
  data.people.forEach((p, i) => {
    const r = i + 2;
    const s = psById.get(p.id);
    peopleRows.push([
      p.id,
      p.name,
      p.phone ?? '',
      p.notes ?? '',
      yes(p.archived),
      formula(`SUMIFS('${SHEET.records}'!$G:$G,'${SHEET.records}'!$B:$B,A${r})`, s?.totalGiven ?? 0),
      formula(`SUMIFS('${SHEET.payments}'!$F:$F,'${SHEET.payments}'!$C:$C,A${r})`, s?.totalPaid ?? 0),
      formula(`SUMIFS('${SHEET.cashback}'!$F:$F,'${SHEET.cashback}'!$C:$C,A${r})`, s?.totalCashback ?? 0),
      formula(
        `F${r}-G${r}-SUMIFS('${SHEET.cashback}'!$F:$F,'${SHEET.cashback}'!$C:$C,A${r},'${SHEET.cashback}'!$H:$H,"Yes")`,
        (s?.outstanding ?? 0) - (s?.overpaid ?? 0),
      ),
    ]);
  });
  XLSX.utils.book_append_sheet(wb, sheetFromRows(peopleRows, [12, 24, 16, 30, 10, 14, 14, 14, 14]), SHEET.people);

  /* ---------------- Money Records ---------------- */
  const recRows: Cell[][] = [[...RECORD_HEADERS]];
  const rsById = new Map(recordSummaries.map((s) => [s.record.id, s]));
  data.records.forEach((rec, i) => {
    const r = i + 2;
    const s = rsById.get(rec.id);
    recRows.push([
      rec.id,
      rec.personId,
      peopleById.get(rec.personId)?.name ?? '',
      rec.description,
      rec.category,
      date(rec.dateGiven),
      money(rec.originalAmount),
      formula(`SUMIFS('${SHEET.payments}'!$F:$F,'${SHEET.payments}'!$B:$B,A${r})`, s?.totalPaid ?? 0),
      formula(
        `SUMIFS('${SHEET.cashback}'!$F:$F,'${SHEET.cashback}'!$B:$B,A${r},'${SHEET.cashback}'!$H:$H,"Yes")`,
        s?.cashbackApplied ?? 0,
      ),
      formula(`G${r}-H${r}-I${r}`, (s?.outstanding ?? 0) - (s?.overpaid ?? 0)),
      formula(`SUMIFS('${SHEET.cashback}'!$F:$F,'${SHEET.cashback}'!$B:$B,A${r})`, s?.cashbackTotal ?? 0),
      date(rec.dueDate),
      formula(
        `IF(J${r}<0,"Overpaid",IF(J${r}=0,"Settled",IF(AND(L${r}<>"",L${r}<TODAY()),"Overdue",IF(H${r}+I${r}=0,"Pending","Partially Paid"))))`,
        s?.status ?? 'Pending',
      ),
      rec.notes ?? '',
    ]);
  });
  XLSX.utils.book_append_sheet(
    wb,
    sheetFromRows(recRows, [12, 12, 20, 32, 14, 13, 15, 15, 15, 14, 14, 13, 14, 30]),
    SHEET.records,
  );

  /* ---------------- Payments ---------------- */
  const payRows: Cell[][] = [[...PAYMENT_HEADERS]];
  for (const p of [...data.payments].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))) {
    payRows.push([
      p.id,
      p.recordId,
      p.personId,
      peopleById.get(p.personId)?.name ?? '',
      date(p.date),
      money(p.amount),
      p.method,
      p.reference ?? '',
      p.notes ?? '',
    ]);
  }
  XLSX.utils.book_append_sheet(wb, sheetFromRows(payRows, [12, 12, 12, 20, 13, 14, 14, 18, 30]), SHEET.payments);

  /* ---------------- Cashback ---------------- */
  const cbRows: Cell[][] = [[...CASHBACK_HEADERS]];
  for (const c of [...data.cashbacks].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))) {
    cbRows.push([
      c.id,
      c.recordId,
      c.personId,
      peopleById.get(c.personId)?.name ?? '',
      date(c.date),
      money(c.amount),
      c.source,
      yes(c.appliedToDebt),
      c.notes ?? '',
    ]);
  }
  XLSX.utils.book_append_sheet(wb, sheetFromRows(cbRows, [12, 12, 12, 20, 13, 14, 26, 14, 30]), SHEET.cashback);

  /* ---------------- Monthly sheets ---------------- */
  for (let m = 1; m <= 12; m += 1) {
    const start = `DATE(${year},${m},1)`;
    const end = `DATE(${year},${m + 1},1)`;
    const bucket = computeMonthlyBuckets(data, year).find((b) => b.month === m)!;
    const given = filterByMonth(data.records, (r) => r.dateGiven, year, m);
    const paid = filterByMonth(data.payments, (p) => p.date, year, m);
    const cb = filterByMonth(data.cashbacks, (c) => c.date, year, m);
    const rows: Cell[][] = [
      [`${MONTH_NAMES[m - 1]} ${year}`, ''],
      [],
      ['Metric', 'Value'],
      [
        'Money Given This Month',
        formula(`SUMIFS('${SHEET.records}'!$G:$G,'${SHEET.records}'!$F:$F,">="&${start},'${SHEET.records}'!$F:$F,"<"&${end})`, bucket.given),
      ],
      [
        'Payments Received This Month',
        formula(`SUMIFS('${SHEET.payments}'!$F:$F,'${SHEET.payments}'!$E:$E,">="&${start},'${SHEET.payments}'!$E:$E,"<"&${end})`, bucket.received),
      ],
      [
        'Cashback This Month',
        formula(`SUMIFS('${SHEET.cashback}'!$F:$F,'${SHEET.cashback}'!$E:$E,">="&${start},'${SHEET.cashback}'!$E:$E,"<"&${end})`, bucket.cashback),
      ],
      [
        'Number of Payment Transactions',
        formula(`COUNTIFS('${SHEET.payments}'!$E:$E,">="&${start},'${SHEET.payments}'!$E:$E,"<"&${end})`, bucket.paymentCount, '0'),
      ],
      ['Current Total Outstanding (all time)', formula(`'${SHEET.dashboard}'!B8`, totals.totalOutstanding)],
      [],
      ['Money given this month'],
      ['Record ID', 'Person', 'Description', 'Category', 'Date Given', 'Original Amount', 'Outstanding Now'],
      ...given.map(
        (r) =>
          [
            r.id,
            peopleById.get(r.personId)?.name ?? '',
            r.description,
            r.category,
            date(r.dateGiven),
            money(r.originalAmount),
            money(rsById.get(r.id)?.outstanding ?? 0),
          ] as Cell[],
      ),
      given.length === 0 ? ['(none)'] : [],
      [],
      ['Payments received this month'],
      ['Payment ID', 'Person', 'Record', 'Payment Date', 'Amount', 'Method', 'Reference'],
      ...paid.map(
        (p) =>
          [
            p.id,
            peopleById.get(p.personId)?.name ?? '',
            `${p.recordId} · ${recordsById.get(p.recordId)?.description ?? ''}`,
            date(p.date),
            money(p.amount),
            p.method,
            p.reference ?? '',
          ] as Cell[],
      ),
      paid.length === 0 ? ['(none)'] : [],
      [],
      ['Cashback this month'],
      ['Cashback ID', 'Person', 'Record', 'Cashback Date', 'Amount', 'Source', 'Applied To Debt'],
      ...cb.map(
        (c) =>
          [
            c.id,
            peopleById.get(c.personId)?.name ?? '',
            `${c.recordId} · ${recordsById.get(c.recordId)?.description ?? ''}`,
            date(c.date),
            money(c.amount),
            c.source,
            yes(c.appliedToDebt),
          ] as Cell[],
      ),
      cb.length === 0 ? ['(none)'] : [],
    ];
    XLSX.utils.book_append_sheet(wb, sheetFromRows(rows, [34, 20, 32, 14, 14, 16, 16]), MONTH_NAMES[m - 1]);
  }

  return wb;
};

export const workbookToBlob = (wb: XLSX.WorkBook): Blob => {
  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array', cellDates: true });
  return new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
};

/** Blank template: same structure, instructions sheet, no data rows. */
export const buildTemplateWorkbook = (year: number): XLSX.WorkBook => {
  const wb = buildWorkbook({ people: [], records: [], payments: [], cashbacks: [] }, { year });
  const instructions: Cell[][] = [
    ['MyMoney Excel template — how to fill it'],
    [],
    ['1. People sheet: one row per person. Person ID is optional; leave it blank and the app assigns PER-0001, PER-0002…'],
    ['2. Money Records sheet: one row per amount you gave. Link to a person by Person ID or (if blank) by Person Name.'],
    ['   Category must be one of: Credit Card, Cash, Bank Transfer, Personal Loan, Shopping, Travel, Other.'],
    ['   Date Given and Due Date accept Excel dates or text like 21-01-2026 / 2026-01-21.'],
    ['   Amount Received, Cashback Applied, Outstanding, Total Cashback and Status are calculated — leave them empty.'],
    ['3. Payments sheet: one row per payment received. Record ID is required. Method: UPI, Cash, Bank Transfer, Cheque, Other.'],
    ['4. Cashback sheet: one row per cashback. Set "Applied To Debt" to Yes only if the cashback should reduce what the person owes.'],
    ['5. Dashboard and the monthly sheets are regenerated by the app on export — do not type into them.'],
    ['6. Import this workbook from "Excel Import / Export" in the app. The app recalculates every total in TypeScript.'],
  ];
  XLSX.utils.book_append_sheet(wb, sheetFromRows(instructions, [120]), SHEET.instructions);
  // Put instructions first
  wb.SheetNames = [SHEET.instructions, ...wb.SheetNames.filter((n) => n !== SHEET.instructions)];
  return wb;
};
