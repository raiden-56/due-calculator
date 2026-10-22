/**
 * Single source of truth for workbook sheet names and column headers. Both the
 * exporter and the importer read from here so the two never drift apart.
 */
export const SHEET = {
  dashboard: 'Dashboard',
  people: 'People',
  records: 'Money Records',
  payments: 'Payments',
  cashback: 'Cashback',
  instructions: 'Instructions',
} as const;

export const PEOPLE_HEADERS = [
  'Person ID',
  'Name',
  'Phone',
  'Notes',
  'Archived',
  'Total Given',
  'Total Paid',
  'Total Cashback',
  'Outstanding',
] as const;

export const RECORD_HEADERS = [
  'Record ID',
  'Person ID',
  'Person Name',
  'Description',
  'Category',
  'Date Given',
  'Original Amount',
  'Amount Received',
  'Cashback Applied',
  'Outstanding',
  'Total Cashback',
  'Due Date',
  'Status',
  'Notes',
] as const;

export const PAYMENT_HEADERS = [
  'Payment ID',
  'Record ID',
  'Person ID',
  'Person Name',
  'Payment Date',
  'Amount',
  'Method',
  'Reference',
  'Notes',
] as const;

export const CASHBACK_HEADERS = [
  'Cashback ID',
  'Record ID',
  'Person ID',
  'Person Name',
  'Cashback Date',
  'Amount',
  'Source',
  'Applied To Debt',
  'Notes',
] as const;

/** Columns the importer reads. Computed columns (totals, status) are ignored on import. */
export const IMPORTED_COLUMNS = {
  people: ['Person ID', 'Name', 'Phone', 'Notes', 'Archived'],
  records: ['Record ID', 'Person ID', 'Person Name', 'Description', 'Category', 'Date Given', 'Original Amount', 'Due Date', 'Notes'],
  payments: ['Payment ID', 'Record ID', 'Person ID', 'Person Name', 'Payment Date', 'Amount', 'Method', 'Reference', 'Notes'],
  cashback: ['Cashback ID', 'Record ID', 'Person ID', 'Person Name', 'Cashback Date', 'Amount', 'Source', 'Applied To Debt', 'Notes'],
} as const;

/** Normalises a header for tolerant matching: "Date given " -> "dategiven". */
export const normalizeHeader = (h: unknown): string =>
  String(h ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

/** Accepted aliases per canonical header (normalised). */
export const HEADER_ALIASES: Record<string, string[]> = {
  personid: ['personid', 'pid', 'person'],
  name: ['name', 'personname', 'fullname'],
  phone: ['phone', 'phonenumber', 'mobile', 'contact'],
  notes: ['notes', 'note', 'remarks', 'comment', 'comments'],
  archived: ['archived', 'isarchived', 'inactive'],
  recordid: ['recordid', 'rid', 'record', 'moneyrecordid'],
  personname: ['personname', 'name', 'person'],
  description: ['description', 'desc', 'details', 'purpose'],
  category: ['category', 'type'],
  dategiven: ['dategiven', 'date', 'givendate', 'transactiondate'],
  originalamount: ['originalamount', 'amount', 'amountgiven', 'principal', 'total'],
  duedate: ['duedate', 'due'],
  paymentid: ['paymentid', 'payid', 'id'],
  paymentdate: ['paymentdate', 'date', 'paidon', 'receiveddate'],
  amount: ['amount', 'amountreceived', 'paid', 'received', 'cashbackamount'],
  method: ['method', 'paymentmethod', 'mode', 'paymentmode'],
  reference: ['reference', 'ref', 'transactionreference', 'txnref', 'utr'],
  cashbackid: ['cashbackid', 'cbid', 'id'],
  cashbackdate: ['cashbackdate', 'date', 'receivedon'],
  source: ['source', 'description', 'from', 'cashbacksource'],
  appliedtodebt: ['appliedtodebt', 'applied', 'applytodebt', 'adjusted'],
};
