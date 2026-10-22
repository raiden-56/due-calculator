import { describe, expect, it } from 'vitest';
import type { Dataset } from '../types/models';
import {
  bucketForMonth,
  computeMonthlyBuckets,
  computeOutstanding,
  computeTotals,
  deriveStatus,
  statusDistribution,
  summarizePeople,
  summarizeRecords,
} from './calculations';
import { addMoney, parseMoney, percentOf, subMoney, sumMoney } from './money';
import { formatINR, formatINRCompact } from './currency';
import { parseDateInput } from './dates';

const TODAY = '2026-10-21';

const base: Dataset = {
  people: [
    { id: 'PER-0001', name: 'Teja', archived: false, createdAt: '2026-01-01T00:00:00.000Z' },
    { id: 'PER-0002', name: 'Ravi', archived: false, createdAt: '2026-01-01T00:00:00.000Z' },
  ],
  records: [
    {
      id: 'REC-0001',
      personId: 'PER-0001',
      description: 'Credit card usage',
      category: 'Credit Card',
      dateGiven: '2026-01-10',
      originalAmount: 100000,
      createdAt: '2026-01-10T00:00:00.000Z',
    },
    {
      id: 'REC-0002',
      personId: 'PER-0002',
      description: 'Cash loan',
      category: 'Cash',
      dateGiven: '2026-02-05',
      originalAmount: 5000,
      dueDate: '2026-03-01',
      createdAt: '2026-02-05T00:00:00.000Z',
    },
  ],
  payments: [
    { id: 'PAY-0001', recordId: 'REC-0001', personId: 'PER-0001', date: '2026-02-01', amount: 25000, method: 'UPI', createdAt: '' },
    { id: 'PAY-0002', recordId: 'REC-0001', personId: 'PER-0001', date: '2026-03-01', amount: 15000, method: 'UPI', createdAt: '' },
  ],
  cashbacks: [
    { id: 'CB-0001', recordId: 'REC-0001', personId: 'PER-0001', date: '2026-02-15', amount: 500, source: 'Card reward', appliedToDebt: false, createdAt: '' },
  ],
};

describe('money arithmetic', () => {
  it('is exact for decimal inputs', () => {
    expect(addMoney(0.1, 0.2)).toBe(0.3);
    expect(subMoney(1.1, 1)).toBe(0.1);
    expect(sumMoney([0.1, 0.1, 0.1])).toBe(0.3);
    expect(sumMoney([33333.33, 33333.33, 33333.34])).toBe(100000);
  });
  it('computes percentages from paise', () => {
    expect(percentOf(40000, 100000)).toBe(40);
    expect(percentOf(1, 3)).toBe(33.3);
    expect(percentOf(10, 0)).toBe(0);
  });
  it('parses Indian currency strings', () => {
    expect(parseMoney('₹1,00,000')).toBe(100000);
    expect(parseMoney('Rs. 2,500.50')).toBe(2500.5);
    expect(parseMoney(' 100 ')).toBe(100);
    expect(parseMoney('abc')).toBeNull();
    expect(parseMoney('')).toBeNull();
  });
  it('formats INR in lakh grouping', () => {
    expect(formatINR(100000)).toBe('₹1,00,000');
    expect(formatINR(1234567.5)).toBe('₹12,34,567.5');
    expect(formatINR(-250)).toBe('−₹250');
    expect(formatINRCompact(100000)).toBe('₹1L');
    expect(formatINRCompact(2500)).toBe('₹2.5K');
    expect(formatINRCompact(12500000)).toBe('₹1.25Cr');
  });
});

describe('dates', () => {
  it('parses multiple formats', () => {
    expect(parseDateInput('2026-01-10')).toBe('2026-01-10');
    expect(parseDateInput('10-01-2026')).toBe('2026-01-10');
    expect(parseDateInput('10/01/2026')).toBe('2026-01-10');
    expect(parseDateInput('10 Jan 2026')).toBe('2026-01-10');
    expect(parseDateInput(new Date(2026, 0, 10, 12))).toBe('2026-01-10');
    expect(parseDateInput(46032)).toBe('2026-01-10'); // Excel serial
    expect(parseDateInput('nope')).toBeNull();
  });
});

describe('record summaries', () => {
  it('matches the Teja example exactly', () => {
    const [teja] = summarizeRecords(base, TODAY);
    expect(teja.totalPaid).toBe(40000);
    expect(teja.outstanding).toBe(60000);
    expect(teja.cashbackTotal).toBe(500);
    expect(teja.cashbackApplied).toBe(0);
    expect(teja.collectionPct).toBe(40);
    expect(teja.status).toBe('Partially Paid');
    expect(teja.paymentCount).toBe(2);
  });

  it('does not reduce debt by cashback unless applied', () => {
    expect(computeOutstanding(1000, 200, 0)).toBe(800);
    expect(computeOutstanding(1000, 200, 100)).toBe(700);
  });

  it('flags overdue when due date passed with balance', () => {
    const [, ravi] = summarizeRecords(base, TODAY);
    expect(ravi.status).toBe('Overdue');
    expect(ravi.isOverdue).toBe(true);
    expect(ravi.daysOverdue).toBeGreaterThan(0);
  });

  it('derives Settled and Overpaid instead of negative debt', () => {
    expect(deriveStatus(1000, 1000, 0, undefined, TODAY).status).toBe('Settled');
    expect(deriveStatus(1000, 1200, 0, '2020-01-01', TODAY).status).toBe('Overpaid');
    expect(deriveStatus(1000, 0, 0, undefined, TODAY).status).toBe('Pending');
    expect(deriveStatus(1000, 0, 0, '2099-01-01', TODAY).status).toBe('Pending');
    const data: Dataset = {
      ...base,
      payments: [{ id: 'PAY-0009', recordId: 'REC-0002', personId: 'PER-0002', date: '2026-02-10', amount: 6000, method: 'Cash', createdAt: '' }],
    };
    const ravi = summarizeRecords(data, TODAY)[1];
    expect(ravi.outstanding).toBe(0);
    expect(ravi.overpaid).toBe(1000);
    expect(ravi.status).toBe('Overpaid');
  });
});

describe('people and totals', () => {
  it('aggregates per person', () => {
    const people = summarizePeople(base, summarizeRecords(base, TODAY));
    const teja = people.find((p) => p.person.name === 'Teja')!;
    expect(teja.totalGiven).toBe(100000);
    expect(teja.totalPaid).toBe(40000);
    expect(teja.outstanding).toBe(60000);
    expect(teja.totalCashback).toBe(500);
    expect(teja.status).toBe('Pending');
    expect(teja.lastPaymentDate).toBe('2026-03-01');
    const ravi = people.find((p) => p.person.name === 'Ravi')!;
    expect(ravi.status).toBe('Overdue');
  });

  it('computes dashboard totals', () => {
    const totals = computeTotals(base, summarizeRecords(base, TODAY));
    expect(totals.totalGiven).toBe(105000);
    expect(totals.totalReceived).toBe(40000);
    expect(totals.totalOutstanding).toBe(65000);
    expect(totals.totalCashback).toBe(500);
    expect(totals.peopleWithPending).toBe(2);
    expect(totals.fullySettledRecords).toBe(0);
    expect(totals.overdueRecords).toBe(1);
  });

  it('builds status distribution in fixed order', () => {
    const dist = statusDistribution(summarizeRecords(base, TODAY));
    expect(dist.map((d) => d.status)).toEqual(['Partially Paid', 'Overdue']);
  });
});

describe('monthly buckets', () => {
  it('groups by the right dates', () => {
    const buckets = computeMonthlyBuckets(base, 2026);
    expect(buckets).toHaveLength(12);
    expect(bucketForMonth(base, 2026, 1).given).toBe(100000);
    expect(bucketForMonth(base, 2026, 2).given).toBe(5000);
    expect(bucketForMonth(base, 2026, 2).received).toBe(25000);
    expect(bucketForMonth(base, 2026, 2).cashback).toBe(500);
    expect(bucketForMonth(base, 2026, 3).received).toBe(15000);
    expect(bucketForMonth(base, 2026, 3).paymentCount).toBe(1);
    expect(bucketForMonth(base, 2026, 4).received).toBe(0);
  });
  it('ignores other years when filtered', () => {
    expect(computeMonthlyBuckets(base, 2025).every((b) => b.given === 0 && b.received === 0)).toBe(true);
  });
});
