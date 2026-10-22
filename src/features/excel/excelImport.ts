import * as XLSX from 'xlsx';
import type { Cashback, Dataset, MoneyRecord, Payment, Person } from '../../types/models';
import { nowISO, parseDateInput } from '../../utils/dates';
import { idAllocator } from '../../utils/ids';
import { parseMoney, toPaise } from '../../utils/money';
import { normalizeCategory, normalizeName, normalizePaymentMethod, parseBoolean } from '../../utils/validation';
import { HEADER_ALIASES, SHEET, normalizeHeader } from './excelSchema';

export interface RowIssue {
  sheet: string;
  row: number; // 1-based Excel row number
  message: string;
  severity: 'error' | 'warning';
}

export interface ImportResult {
  dataset: Dataset;
  issues: RowIssue[];
  errors: RowIssue[];
  warnings: RowIssue[];
  sheetsFound: string[];
  counts: { people: number; records: number; payments: number; cashbacks: number };
  skipped: { people: number; records: number; payments: number; cashbacks: number };
}

type Row = Record<string, unknown>;

/* ------------------------------------------------------------------ */
/* Sheet reading                                                      */
/* ------------------------------------------------------------------ */

const findSheet = (wb: XLSX.WorkBook, name: string): XLSX.WorkSheet | undefined => {
  const key = normalizeHeader(name);
  const actual = wb.SheetNames.find((n) => normalizeHeader(n) === key);
  return actual ? wb.Sheets[actual] : undefined;
};

/** Reads a sheet into rows keyed by normalised canonical header. */
const readRows = (ws: XLSX.WorkSheet | undefined, canonical: readonly string[]): { rows: Row[]; rowNumbers: number[] } => {
  if (!ws) return { rows: [], rowNumbers: [] };
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, defval: '' });
  if (matrix.length === 0) return { rows: [], rowNumbers: [] };

  // Find the header row (first row that matches at least 2 canonical headers / aliases).
  const canonKeys = canonical.map(normalizeHeader);
  let headerIdx = -1;
  let mapping: (string | null)[] = [];
  for (let i = 0; i < Math.min(matrix.length, 10); i += 1) {
    const cells = (matrix[i] ?? []).map(normalizeHeader);
    const map = cells.map((cell) => {
      if (!cell) return null;
      const direct = canonKeys.find((k) => k === cell);
      if (direct) return direct;
      const viaAlias = canonKeys.find((k) => (HEADER_ALIASES[k] ?? []).includes(cell));
      return viaAlias ?? null;
    });
    // Prevent one canonical header from being claimed by two columns (keep first).
    const seen = new Set<string>();
    const dedup = map.map((k) => {
      if (!k || seen.has(k)) return null;
      seen.add(k);
      return k;
    });
    const matches = dedup.filter(Boolean).length;
    if (matches >= 2) {
      headerIdx = i;
      mapping = dedup;
      break;
    }
  }
  if (headerIdx < 0) return { rows: [], rowNumbers: [] };

  const rows: Row[] = [];
  const rowNumbers: number[] = [];
  for (let i = headerIdx + 1; i < matrix.length; i += 1) {
    const cells = matrix[i] ?? [];
    const row: Row = {};
    let hasValue = false;
    mapping.forEach((key, col) => {
      if (!key) return;
      const v = cells[col];
      row[key] = typeof v === 'string' ? v.trim() : v;
      if (v !== '' && v !== null && v !== undefined) hasValue = true;
    });
    if (!hasValue) continue;
    rows.push(row);
    rowNumbers.push(i + 1);
  }
  return { rows, rowNumbers };
};

const str = (v: unknown): string => (v === null || v === undefined ? '' : String(v).trim());

/* ------------------------------------------------------------------ */
/* Parse workbook                                                     */
/* ------------------------------------------------------------------ */

export const parseWorkbook = (buffer: ArrayBuffer): ImportResult => {
  const wb = XLSX.read(buffer, { type: 'array', cellDates: true });
  const issues: RowIssue[] = [];
  const err = (sheet: string, row: number, message: string) => issues.push({ sheet, row, message, severity: 'error' });
  const warn = (sheet: string, row: number, message: string) => issues.push({ sheet, row, message, severity: 'warning' });
  const created = nowISO();

  const sheetsFound = wb.SheetNames.slice();
  const peopleSheet = findSheet(wb, SHEET.people);
  const recordsSheet = findSheet(wb, SHEET.records);
  const paymentsSheet = findSheet(wb, SHEET.payments);
  const cashbackSheet = findSheet(wb, SHEET.cashback);

  if (!peopleSheet && !recordsSheet && !paymentsSheet && !cashbackSheet) {
    err('Workbook', 0, `No recognised sheets. Expected "${SHEET.people}", "${SHEET.records}", "${SHEET.payments}" and "${SHEET.cashback}".`);
  }

  const people: Person[] = [];
  const records: MoneyRecord[] = [];
  const payments: Payment[] = [];
  const cashbacks: Cashback[] = [];
  const skipped = { people: 0, records: 0, payments: 0, cashbacks: 0 };

  const personIds = idAllocator('PER', []);
  const recordIds = idAllocator('REC', []);
  const paymentIds = idAllocator('PAY', []);
  const cashbackIds = idAllocator('CB', []);
  const peopleByName = new Map<string, Person>();

  const ensurePersonByName = (name: string, sheet: string, row: number): Person => {
    const key = normalizeName(name);
    const existing = peopleByName.get(key);
    if (existing) return existing;
    const p: Person = { id: personIds.next(), name: name.trim(), archived: false, createdAt: created };
    people.push(p);
    peopleByName.set(key, p);
    warn(sheet, row, `Person "${name.trim()}" was not on the People sheet — created as ${p.id}.`);
    return p;
  };

  const resolvePerson = (idRaw: unknown, nameRaw: unknown, sheet: string, row: number): Person | null => {
    const id = str(idRaw);
    const name = str(nameRaw);
    if (id) {
      const byId = people.find((p) => p.id.toLowerCase() === id.toLowerCase());
      if (byId) return byId;
      if (name) {
        warn(sheet, row, `Person ID "${id}" not found — matched by name "${name}" instead.`);
        return ensurePersonByName(name, sheet, row);
      }
      err(sheet, row, `Person ID "${id}" does not exist on the People sheet.`);
      return null;
    }
    if (name) return ensurePersonByName(name, sheet, row);
    err(sheet, row, 'Person ID or Person Name is required.');
    return null;
  };

  /* ---------------- People ---------------- */
  {
    const { rows, rowNumbers } = readRows(peopleSheet, ['Person ID', 'Name', 'Phone', 'Notes', 'Archived']);
    rows.forEach((r, i) => {
      const row = rowNumbers[i];
      const name = str(r.name);
      if (!name) {
        err(SHEET.people, row, 'Name is required.');
        skipped.people += 1;
        return;
      }
      const key = normalizeName(name);
      if (peopleByName.has(key)) {
        warn(SHEET.people, row, `Duplicate person "${name}" — row skipped, first occurrence kept.`);
        skipped.people += 1;
        return;
      }
      let id = str(r.personid);
      if (id && personIds.has(id)) {
        warn(SHEET.people, row, `Duplicate Person ID "${id}" — a new ID was assigned.`);
        id = '';
      }
      if (id) personIds.register(id);
      else id = personIds.next();
      const p: Person = {
        id,
        name,
        phone: str(r.phone) || undefined,
        notes: str(r.notes) || undefined,
        archived: parseBoolean(r.archived),
        createdAt: created,
      };
      people.push(p);
      peopleByName.set(key, p);
    });
  }

  /* ---------------- Money Records ---------------- */
  {
    const { rows, rowNumbers } = readRows(recordsSheet, [
      'Record ID',
      'Person ID',
      'Person Name',
      'Description',
      'Category',
      'Date Given',
      'Original Amount',
      'Due Date',
      'Notes',
    ]);
    rows.forEach((r, i) => {
      const row = rowNumbers[i];
      const problems: string[] = [];
      const person = resolvePerson(r.personid, r.personname, SHEET.records, row);
      if (!person) problems.push('person');
      const description = str(r.description);
      if (!description) {
        err(SHEET.records, row, 'Description is required.');
        problems.push('description');
      }
      const categoryRaw = str(r.category);
      let category = normalizeCategory(categoryRaw);
      if (!category) {
        if (categoryRaw) warn(SHEET.records, row, `Unknown category "${categoryRaw}" — set to Other.`);
        category = 'Other';
      }
      const dateGiven = parseDateInput(r.dategiven);
      if (!dateGiven) {
        err(SHEET.records, row, `Date Given "${str(r.dategiven)}" is missing or invalid.`);
        problems.push('date');
      }
      const amount = parseMoney(r.originalamount);
      if (amount === null || toPaise(amount) <= 0) {
        err(SHEET.records, row, `Original Amount "${str(r.originalamount)}" must be a number greater than zero.`);
        problems.push('amount');
      }
      const dueRaw = r.duedate;
      const dueDate = parseDateInput(dueRaw);
      if (str(dueRaw) && !dueDate) warn(SHEET.records, row, `Due Date "${str(dueRaw)}" is not a valid date — ignored.`);
      let id = str(r.recordid);
      if (id && recordIds.has(id)) {
        err(SHEET.records, row, `Duplicate Record ID "${id}" — row skipped.`);
        problems.push('id');
      }
      if (problems.length > 0) {
        skipped.records += 1;
        return;
      }
      if (id) recordIds.register(id);
      else id = recordIds.next();
      records.push({
        id,
        personId: person!.id,
        description,
        category,
        dateGiven: dateGiven!,
        originalAmount: amount!,
        dueDate: dueDate ?? undefined,
        notes: str(r.notes) || undefined,
        createdAt: created,
      });
    });
  }

  const recordById = new Map(records.map((r) => [r.id.toLowerCase(), r]));

  const resolveRecord = (idRaw: unknown, sheet: string, row: number): MoneyRecord | null => {
    const id = str(idRaw);
    if (!id) {
      err(sheet, row, 'Record ID is required so the row can be linked to a money record.');
      return null;
    }
    const rec = recordById.get(id.toLowerCase());
    if (!rec) {
      err(sheet, row, `Record ID "${id}" does not exist on the Money Records sheet.`);
      return null;
    }
    return rec;
  };

  /* ---------------- Payments ---------------- */
  {
    const { rows, rowNumbers } = readRows(paymentsSheet, [
      'Payment ID',
      'Record ID',
      'Person ID',
      'Person Name',
      'Payment Date',
      'Amount',
      'Method',
      'Reference',
      'Notes',
    ]);
    rows.forEach((r, i) => {
      const row = rowNumbers[i];
      let ok = true;
      const rec = resolveRecord(r.recordid, SHEET.payments, row);
      if (!rec) ok = false;
      const date = parseDateInput(r.paymentdate);
      if (!date) {
        err(SHEET.payments, row, `Payment Date "${str(r.paymentdate)}" is missing or invalid.`);
        ok = false;
      }
      const amount = parseMoney(r.amount);
      if (amount === null || toPaise(amount) <= 0) {
        err(SHEET.payments, row, `Amount "${str(r.amount)}" must be a number greater than zero.`);
        ok = false;
      }
      const methodRaw = str(r.method);
      let method = normalizePaymentMethod(methodRaw);
      if (!method) {
        if (methodRaw) warn(SHEET.payments, row, `Unknown method "${methodRaw}" — set to Other.`);
        method = 'Other';
      }
      let id = str(r.paymentid);
      if (id && paymentIds.has(id)) {
        err(SHEET.payments, row, `Duplicate Payment ID "${id}" — row skipped.`);
        ok = false;
      }
      if (rec) {
        const pid = str(r.personid);
        if (pid && pid.toLowerCase() !== rec.personId.toLowerCase()) {
          warn(SHEET.payments, row, `Person ID "${pid}" differs from the record's person (${rec.personId}) — using the record's person.`);
        }
      }
      if (!ok) {
        skipped.payments += 1;
        return;
      }
      if (id) paymentIds.register(id);
      else id = paymentIds.next();
      payments.push({
        id,
        recordId: rec!.id,
        personId: rec!.personId,
        date: date!,
        amount: amount!,
        method,
        reference: str(r.reference) || undefined,
        notes: str(r.notes) || undefined,
        createdAt: created,
      });
    });
  }

  /* ---------------- Cashback ---------------- */
  {
    const { rows, rowNumbers } = readRows(cashbackSheet, [
      'Cashback ID',
      'Record ID',
      'Person ID',
      'Person Name',
      'Cashback Date',
      'Amount',
      'Source',
      'Applied To Debt',
      'Notes',
    ]);
    rows.forEach((r, i) => {
      const row = rowNumbers[i];
      let ok = true;
      const rec = resolveRecord(r.recordid, SHEET.cashback, row);
      if (!rec) ok = false;
      const date = parseDateInput(r.cashbackdate);
      if (!date) {
        err(SHEET.cashback, row, `Cashback Date "${str(r.cashbackdate)}" is missing or invalid.`);
        ok = false;
      }
      const amount = parseMoney(r.amount);
      if (amount === null || toPaise(amount) <= 0) {
        err(SHEET.cashback, row, `Amount "${str(r.amount)}" must be a number greater than zero.`);
        ok = false;
      }
      let id = str(r.cashbackid);
      if (id && cashbackIds.has(id)) {
        err(SHEET.cashback, row, `Duplicate Cashback ID "${id}" — row skipped.`);
        ok = false;
      }
      if (!ok) {
        skipped.cashbacks += 1;
        return;
      }
      if (id) cashbackIds.register(id);
      else id = cashbackIds.next();
      cashbacks.push({
        id,
        recordId: rec!.id,
        personId: rec!.personId,
        date: date!,
        amount: amount!,
        source: str(r.source) || 'Cashback',
        appliedToDebt: parseBoolean(r.appliedtodebt),
        notes: str(r.notes) || undefined,
        createdAt: created,
      });
    });
  }

  const errors = issues.filter((i) => i.severity === 'error');
  const warnings = issues.filter((i) => i.severity === 'warning');
  return {
    dataset: { people, records, payments, cashbacks },
    issues,
    errors,
    warnings,
    sheetsFound,
    counts: { people: people.length, records: records.length, payments: payments.length, cashbacks: cashbacks.length },
    skipped,
  };
};

export const readFileAsArrayBuffer = (file: File): Promise<ArrayBuffer> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error ?? new Error('Could not read file'));
    reader.readAsArrayBuffer(file);
  });
