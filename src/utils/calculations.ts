import type {
  Cashback,
  Dataset,
  MoneyRecord,
  MonthlyBucket,
  Payment,
  Person,
  PersonStatus,
  PersonSummary,
  RecordStatus,
  RecordSummary,
  Totals,
} from '../types/models';
import { addMoney, isPositiveMoney, isZeroMoney, percentOf, subMoney, sumMoney, toPaise } from './money';
import { daysBetween, isValidISODate, monthKey, monthLabel, monthOf, today as todayISO, yearOf } from './dates';

/* ------------------------------------------------------------------ */
/* Indexing helpers                                                   */
/* ------------------------------------------------------------------ */

export const groupBy = <T>(items: T[], key: (item: T) => string): Map<string, T[]> => {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const k = key(item);
    const list = map.get(k);
    if (list) list.push(item);
    else map.set(k, [item]);
  }
  return map;
};

export const indexById = <T extends { id: string }>(items: T[]): Map<string, T> =>
  new Map(items.map((i) => [i.id, i]));

/* ------------------------------------------------------------------ */
/* Record level                                                       */
/* ------------------------------------------------------------------ */

/**
 * Outstanding = Original − Payments − Cashback explicitly applied to debt.
 * Cashback that is NOT applied never reduces what is owed.
 */
export const computeOutstanding = (
  originalAmount: number,
  totalPaid: number,
  cashbackApplied = 0,
): number => subMoney(subMoney(originalAmount, totalPaid), cashbackApplied);

export const deriveStatus = (
  originalAmount: number,
  totalPaid: number,
  cashbackApplied: number,
  dueDate: string | undefined,
  today: string,
): { status: RecordStatus; isOverdue: boolean; daysOverdue: number } => {
  const net = computeOutstanding(originalAmount, totalPaid, cashbackApplied);
  const netP = toPaise(net);
  const receivedP = toPaise(totalPaid) + toPaise(cashbackApplied);

  if (netP < 0) return { status: 'Overpaid', isOverdue: false, daysOverdue: 0 };
  if (netP === 0) return { status: 'Settled', isOverdue: false, daysOverdue: 0 };

  const overdueDays = isValidISODate(dueDate) ? daysBetween(dueDate, today) : 0;
  const isOverdue = overdueDays > 0;
  if (isOverdue) return { status: 'Overdue', isOverdue, daysOverdue: overdueDays };
  if (receivedP === 0) return { status: 'Pending', isOverdue: false, daysOverdue: 0 };
  return { status: 'Partially Paid', isOverdue: false, daysOverdue: 0 };
};

export const summarizeRecord = (
  record: MoneyRecord,
  payments: Payment[],
  cashbacks: Cashback[],
  person: Person | undefined,
  today: string = todayISO(),
): RecordSummary => {
  const totalPaid = sumMoney(payments.map((p) => p.amount));
  const cashbackTotal = sumMoney(cashbacks.map((c) => c.amount));
  const cashbackApplied = sumMoney(cashbacks.filter((c) => c.appliedToDebt).map((c) => c.amount));
  const net = computeOutstanding(record.originalAmount, totalPaid, cashbackApplied);
  const outstanding = isPositiveMoney(net) ? net : 0;
  const overpaid = toPaise(net) < 0 ? subMoney(0, net) : 0;
  const { status, isOverdue, daysOverdue } = deriveStatus(
    record.originalAmount,
    totalPaid,
    cashbackApplied,
    record.dueDate,
    today,
  );
  return {
    record,
    person,
    personName: person?.name ?? 'Unknown person',
    totalPaid,
    cashbackTotal,
    cashbackApplied,
    outstanding,
    overpaid,
    collectionPct: percentOf(addMoney(totalPaid, cashbackApplied), record.originalAmount),
    status,
    paymentCount: payments.length,
    isOverdue,
    daysOverdue,
  };
};

export const summarizeRecords = (data: Dataset, today: string = todayISO()): RecordSummary[] => {
  const people = indexById(data.people);
  const paymentsByRecord = groupBy(data.payments, (p) => p.recordId);
  const cashbackByRecord = groupBy(data.cashbacks, (c) => c.recordId);
  return data.records.map((r) =>
    summarizeRecord(
      r,
      paymentsByRecord.get(r.id) ?? [],
      cashbackByRecord.get(r.id) ?? [],
      people.get(r.personId),
      today,
    ),
  );
};

/* ------------------------------------------------------------------ */
/* Person level                                                       */
/* ------------------------------------------------------------------ */

const derivePersonStatus = (
  recordCount: number,
  outstanding: number,
  overpaid: number,
  overdueRecords: number,
): PersonStatus => {
  if (recordCount === 0) return 'No Records';
  if (overdueRecords > 0) return 'Overdue';
  if (isPositiveMoney(outstanding)) return 'Pending';
  if (isPositiveMoney(overpaid)) return 'Credit';
  return 'Settled';
};

export const summarizePeople = (
  data: Dataset,
  recordSummaries: RecordSummary[] = summarizeRecords(data),
): PersonSummary[] => {
  const byPerson = groupBy(recordSummaries, (s) => s.record.personId);
  const paymentsByPerson = groupBy(data.payments, (p) => p.personId);
  return data.people.map((person) => {
    const recs = byPerson.get(person.id) ?? [];
    const payments = paymentsByPerson.get(person.id) ?? [];
    const outstanding = sumMoney(recs.map((r) => r.outstanding));
    const overpaid = sumMoney(recs.map((r) => r.overpaid));
    const overdueRecords = recs.filter((r) => r.isOverdue).length;
    const lastPaymentDate = payments.map((p) => p.date).sort().at(-1);
    return {
      person,
      totalGiven: sumMoney(recs.map((r) => r.record.originalAmount)),
      totalPaid: sumMoney(recs.map((r) => r.totalPaid)),
      totalCashback: sumMoney(recs.map((r) => r.cashbackTotal)),
      cashbackApplied: sumMoney(recs.map((r) => r.cashbackApplied)),
      outstanding,
      overpaid,
      recordCount: recs.length,
      pendingRecords: recs.filter((r) => isPositiveMoney(r.outstanding)).length,
      settledRecords: recs.filter((r) => r.status === 'Settled').length,
      overdueRecords,
      status: derivePersonStatus(recs.length, outstanding, overpaid, overdueRecords),
      lastPaymentDate,
    };
  });
};

/* ------------------------------------------------------------------ */
/* Totals                                                             */
/* ------------------------------------------------------------------ */

export const computeTotals = (
  data: Dataset,
  recordSummaries: RecordSummary[] = summarizeRecords(data),
): Totals => {
  const peopleWithPending = new Set(
    recordSummaries.filter((r) => isPositiveMoney(r.outstanding)).map((r) => r.record.personId),
  ).size;
  return {
    totalGiven: sumMoney(data.records.map((r) => r.originalAmount)),
    totalReceived: sumMoney(data.payments.map((p) => p.amount)),
    totalOutstanding: sumMoney(recordSummaries.map((r) => r.outstanding)),
    totalOverpaid: sumMoney(recordSummaries.map((r) => r.overpaid)),
    totalCashback: sumMoney(data.cashbacks.map((c) => c.amount)),
    cashbackApplied: sumMoney(data.cashbacks.filter((c) => c.appliedToDebt).map((c) => c.amount)),
    peopleWithPending,
    fullySettledRecords: recordSummaries.filter((r) => r.status === 'Settled').length,
    recordCount: data.records.length,
    paymentCount: data.payments.length,
    overdueRecords: recordSummaries.filter((r) => r.isOverdue).length,
  };
};

/* ------------------------------------------------------------------ */
/* Monthly grouping                                                   */
/* ------------------------------------------------------------------ */

const emptyBucket = (key: string): MonthlyBucket => ({
  key,
  year: yearOf(key),
  month: monthOf(key),
  label: monthLabel(yearOf(key), monthOf(key)),
  given: 0,
  received: 0,
  cashback: 0,
  paymentCount: 0,
  recordCount: 0,
  cashbackCount: 0,
});

/**
 * Money given is grouped by the record's date given; payments by payment date;
 * cashback by cashback date. Returns buckets sorted ascending by month.
 */
export const computeMonthlyBuckets = (data: Dataset, year?: number): MonthlyBucket[] => {
  const buckets = new Map<string, MonthlyBucket>();
  const get = (iso: string): MonthlyBucket | null => {
    if (!isValidISODate(iso)) return null;
    if (year !== undefined && yearOf(iso) !== year) return null;
    const k = monthKey(iso);
    let b = buckets.get(k);
    if (!b) {
      b = emptyBucket(k);
      buckets.set(k, b);
    }
    return b;
  };
  for (const r of data.records) {
    const b = get(r.dateGiven);
    if (b) {
      b.given = addMoney(b.given, r.originalAmount);
      b.recordCount += 1;
    }
  }
  for (const p of data.payments) {
    const b = get(p.date);
    if (b) {
      b.received = addMoney(b.received, p.amount);
      b.paymentCount += 1;
    }
  }
  for (const c of data.cashbacks) {
    const b = get(c.date);
    if (b) {
      b.cashback = addMoney(b.cashback, c.amount);
      b.cashbackCount += 1;
    }
  }
  if (year !== undefined) {
    for (let m = 1; m <= 12; m += 1) {
      const k = `${year}-${String(m).padStart(2, '0')}`;
      if (!buckets.has(k)) buckets.set(k, emptyBucket(k));
    }
  }
  return [...buckets.values()].sort((a, b) => a.key.localeCompare(b.key));
};

export const bucketForMonth = (data: Dataset, year: number, month: number): MonthlyBucket =>
  computeMonthlyBuckets(data, year).find((b) => b.month === month) ?? emptyBucket(`${year}-${String(month).padStart(2, '0')}`);

/* ------------------------------------------------------------------ */
/* Status distribution for the donut chart                            */
/* ------------------------------------------------------------------ */

export const statusDistribution = (
  recordSummaries: RecordSummary[],
): { status: RecordStatus; count: number; amount: number }[] => {
  const order: RecordStatus[] = ['Settled', 'Partially Paid', 'Pending', 'Overpaid', 'Overdue'];
  return order
    .map((status) => {
      const list = recordSummaries.filter((r) => r.status === status);
      return {
        status,
        count: list.length,
        amount: sumMoney(list.map((r) => r.record.originalAmount)),
      };
    })
    .filter((s) => s.count > 0);
};

/* ------------------------------------------------------------------ */
/* Misc                                                               */
/* ------------------------------------------------------------------ */

export const isSettled = (summary: RecordSummary): boolean =>
  isZeroMoney(summary.outstanding) && isZeroMoney(summary.overpaid);

export const filterByYear = <T>(items: T[], date: (i: T) => string, year?: number): T[] =>
  year === undefined ? items : items.filter((i) => isValidISODate(date(i)) && yearOf(date(i)) === year);

export const filterByMonth = <T>(items: T[], date: (i: T) => string, year: number, month: number): T[] =>
  items.filter((i) => isValidISODate(date(i)) && yearOf(date(i)) === year && monthOf(date(i)) === month);
