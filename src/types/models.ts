/** Core domain models. All dates are ISO strings (YYYY-MM-DD). Amounts are rupees (max 2 decimals). */

export const CATEGORIES = [
  'Credit Card',
  'Cash',
  'Bank Transfer',
  'Personal Loan',
  'Shopping',
  'Travel',
  'Other',
] as const;
export type Category = (typeof CATEGORIES)[number];

export const PAYMENT_METHODS = ['UPI', 'Cash', 'Bank Transfer', 'Cheque', 'Other'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const RECORD_STATUSES = ['Pending', 'Partially Paid', 'Settled', 'Overpaid', 'Overdue'] as const;
export type RecordStatus = (typeof RECORD_STATUSES)[number];

export type PersonStatus = 'Pending' | 'Settled' | 'Overdue' | 'Credit' | 'No Records';

export interface Person {
  id: string;
  name: string;
  phone?: string;
  notes?: string;
  archived: boolean;
  createdAt: string;
}

export interface MoneyRecord {
  id: string;
  personId: string;
  description: string;
  category: Category;
  dateGiven: string;
  originalAmount: number;
  dueDate?: string;
  notes?: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  recordId: string;
  personId: string;
  date: string;
  amount: number;
  method: PaymentMethod;
  reference?: string;
  notes?: string;
  createdAt: string;
}

export interface Cashback {
  id: string;
  recordId: string;
  personId: string;
  date: string;
  amount: number;
  source: string;
  /** When true the cashback is explicitly applied toward the person's debt (recorded as a separate adjustment). */
  appliedToDebt: boolean;
  notes?: string;
  createdAt: string;
}

export interface Dataset {
  people: Person[];
  records: MoneyRecord[];
  payments: Payment[];
  cashbacks: Cashback[];
}

export type DataSource = 'empty' | 'demo' | 'imported' | 'manual';

export interface DataMeta {
  source: DataSource;
  sourceFileName?: string;
  lastImportedAt?: string;
  lastExportedAt?: string;
  /** True when there are changes not yet exported to Excel. */
  dirty: boolean;
}

/** Derived summary for a single money record. */
export interface RecordSummary {
  record: MoneyRecord;
  person?: Person;
  personName: string;
  totalPaid: number;
  cashbackTotal: number;
  cashbackApplied: number;
  outstanding: number;
  overpaid: number;
  collectionPct: number;
  status: RecordStatus;
  paymentCount: number;
  isOverdue: boolean;
  daysOverdue: number;
}

/** Derived summary for a person across all of their records. */
export interface PersonSummary {
  person: Person;
  totalGiven: number;
  totalPaid: number;
  totalCashback: number;
  cashbackApplied: number;
  outstanding: number;
  overpaid: number;
  recordCount: number;
  pendingRecords: number;
  settledRecords: number;
  overdueRecords: number;
  status: PersonStatus;
  lastPaymentDate?: string;
}

export interface Totals {
  totalGiven: number;
  totalReceived: number;
  totalOutstanding: number;
  totalOverpaid: number;
  totalCashback: number;
  cashbackApplied: number;
  peopleWithPending: number;
  fullySettledRecords: number;
  recordCount: number;
  paymentCount: number;
  overdueRecords: number;
}

export interface MonthlyBucket {
  key: string; // YYYY-MM
  year: number;
  month: number; // 1-12
  label: string; // e.g. "Jan 2026"
  given: number;
  received: number;
  cashback: number;
  paymentCount: number;
  recordCount: number;
  cashbackCount: number;
}
