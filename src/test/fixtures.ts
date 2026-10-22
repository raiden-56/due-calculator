import type { Dataset } from '../types/models';

const T = '2026-01-01T09:00:00.000Z';

/**
 * Sample dataset used by the unit tests (the app itself starts empty).

 */
export const demoDataset = (): Dataset => ({
  people: [
    { id: 'PER-0001', name: 'Teja', phone: '+91 98450 11223', notes: 'Demo person — credit card usage', archived: false, createdAt: T },
    { id: 'PER-0002', name: 'Ananya Rao', phone: '+91 99000 55667', notes: 'Demo person — settled in full', archived: false, createdAt: T },
    { id: 'PER-0003', name: 'Vikram Shetty', notes: 'Demo person — overdue cash loan', archived: false, createdAt: T },
    { id: 'PER-0004', name: 'Priya Menon', phone: '+91 97400 33445', notes: 'Demo person — travel booking, overpaid', archived: false, createdAt: T },
  ],
  records: [
    {
      id: 'REC-0001',
      personId: 'PER-0001',
      description: 'Credit card usage',
      category: 'Credit Card',
      dateGiven: '2026-01-12',
      originalAmount: 100000,
      dueDate: '2026-12-31',
      notes: 'Demo record. Used my credit card for a laptop purchase.',
      createdAt: T,
    },
    {
      id: 'REC-0002',
      personId: 'PER-0002',
      description: 'Shopping on my card',
      category: 'Shopping',
      dateGiven: '2026-02-03',
      originalAmount: 18500,
      dueDate: '2026-04-30',
      notes: 'Demo record.',
      createdAt: T,
    },
    {
      id: 'REC-0003',
      personId: 'PER-0003',
      description: 'Cash loan for bike repair',
      category: 'Cash',
      dateGiven: '2026-03-15',
      originalAmount: 25000,
      dueDate: '2026-06-30',
      notes: 'Demo record. Promised to repay in three months.',
      createdAt: T,
    },
    {
      id: 'REC-0004',
      personId: 'PER-0004',
      description: 'Flight tickets booked on my card',
      category: 'Travel',
      dateGiven: '2026-04-08',
      originalAmount: 32400,
      notes: 'Demo record.',
      createdAt: T,
    },
    {
      id: 'REC-0005',
      personId: 'PER-0001',
      description: 'Bank transfer for rent deposit',
      category: 'Bank Transfer',
      dateGiven: '2026-06-20',
      originalAmount: 15000,
      dueDate: '2026-09-30',
      notes: 'Demo record. Second record for the same person.',
      createdAt: T,
    },
    {
      id: 'REC-0006',
      personId: 'PER-0002',
      description: 'Personal loan',
      category: 'Personal Loan',
      dateGiven: '2026-08-01',
      originalAmount: 12000,
      dueDate: '2026-11-30',
      createdAt: T,
    },
  ],
  payments: [
    { id: 'PAY-0001', recordId: 'REC-0001', personId: 'PER-0001', date: '2026-02-10', amount: 25000, method: 'UPI', reference: 'UPI-4411', notes: 'Payment 1 (demo)', createdAt: T },
    { id: 'PAY-0002', recordId: 'REC-0001', personId: 'PER-0001', date: '2026-04-15', amount: 15000, method: 'Bank Transfer', reference: 'NEFT-8832', notes: 'Payment 2 (demo)', createdAt: T },
    { id: 'PAY-0003', recordId: 'REC-0002', personId: 'PER-0002', date: '2026-03-01', amount: 10000, method: 'UPI', createdAt: T },
    { id: 'PAY-0004', recordId: 'REC-0002', personId: 'PER-0002', date: '2026-04-02', amount: 8500, method: 'Cash', createdAt: T },
    { id: 'PAY-0005', recordId: 'REC-0003', personId: 'PER-0003', date: '2026-05-10', amount: 5000, method: 'Cash', createdAt: T },
    { id: 'PAY-0006', recordId: 'REC-0004', personId: 'PER-0004', date: '2026-05-05', amount: 20000, method: 'UPI', reference: 'UPI-9921', createdAt: T },
    { id: 'PAY-0007', recordId: 'REC-0004', personId: 'PER-0004', date: '2026-07-18', amount: 13000, method: 'UPI', notes: 'Rounded up — overpaid by ₹600', createdAt: T },
    { id: 'PAY-0008', recordId: 'REC-0005', personId: 'PER-0001', date: '2026-08-12', amount: 5000, method: 'UPI', createdAt: T },
    { id: 'PAY-0009', recordId: 'REC-0006', personId: 'PER-0002', date: '2026-09-05', amount: 4000, method: 'Cheque', reference: 'CHQ-001245', createdAt: T },
    { id: 'PAY-0010', recordId: 'REC-0006', personId: 'PER-0002', date: '2026-10-03', amount: 4000, method: 'UPI', createdAt: T },
  ],
  cashbacks: [
    { id: 'CB-0001', recordId: 'REC-0002', personId: 'PER-0002', date: '2026-02-20', amount: 925, source: 'Card 5% shopping cashback', appliedToDebt: false, notes: 'Demo cashback', createdAt: T },
    { id: 'CB-0002', recordId: 'REC-0004', personId: 'PER-0004', date: '2026-04-25', amount: 1200, source: 'Travel portal reward', appliedToDebt: false, createdAt: T },
    { id: 'CB-0003', recordId: 'REC-0005', personId: 'PER-0001', date: '2026-07-02', amount: 300, source: 'Bank transfer offer', appliedToDebt: false, createdAt: T },
  ],
});
