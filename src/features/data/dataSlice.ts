import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Cashback, DataMeta, DataSource, Dataset, MoneyRecord, Payment, Person } from '../../types/models';
import { nextId } from '../../utils/ids';
import { nowISO } from '../../utils/dates';

export interface DataState extends Dataset {
  meta: DataMeta;
}

export const emptyDataset = (): Dataset => ({ people: [], records: [], payments: [], cashbacks: [] });

export const initialDataState: DataState = {
  ...emptyDataset(),
  meta: { source: 'empty', dirty: false },
};

type PersonInput = Omit<Person, 'id' | 'createdAt' | 'archived'> & { archived?: boolean };
type RecordInput = Omit<MoneyRecord, 'id' | 'createdAt'>;
type PaymentInput = Omit<Payment, 'id' | 'createdAt'>;
type CashbackInput = Omit<Cashback, 'id' | 'createdAt'>;

const touch = (state: DataState) => {
  state.meta.dirty = true;
  if (state.meta.source === 'empty') state.meta.source = 'manual';
};

const dataSlice = createSlice({
  name: 'data',
  initialState: initialDataState,
  reducers: {
    /* ---------------- People ---------------- */
    addPerson(state, action: PayloadAction<PersonInput & { id?: string }>) {
      const id = action.payload.id || nextId('PER', state.people.map((p) => p.id));
      state.people.push({
        ...action.payload,
        id,
        archived: action.payload.archived ?? false,
        createdAt: nowISO(),
      });
      touch(state);
    },
    updatePerson(state, action: PayloadAction<Partial<Person> & { id: string }>) {
      const p = state.people.find((x) => x.id === action.payload.id);
      if (p) Object.assign(p, action.payload);
      touch(state);
    },
    setPersonArchived(state, action: PayloadAction<{ id: string; archived: boolean }>) {
      const p = state.people.find((x) => x.id === action.payload.id);
      if (p) p.archived = action.payload.archived;
      touch(state);
    },
    deletePerson(state, action: PayloadAction<string>) {
      const id = action.payload;
      state.people = state.people.filter((p) => p.id !== id);
      const recordIds = new Set(state.records.filter((r) => r.personId === id).map((r) => r.id));
      state.records = state.records.filter((r) => r.personId !== id);
      state.payments = state.payments.filter((p) => !recordIds.has(p.recordId) && p.personId !== id);
      state.cashbacks = state.cashbacks.filter((c) => !recordIds.has(c.recordId) && c.personId !== id);
      touch(state);
    },

    /* ---------------- Records ---------------- */
    addRecord(state, action: PayloadAction<RecordInput & { id?: string }>) {
      const id = action.payload.id || nextId('REC', state.records.map((r) => r.id));
      state.records.push({ ...action.payload, id, createdAt: nowISO() });
      touch(state);
    },
    updateRecord(state, action: PayloadAction<Partial<MoneyRecord> & { id: string }>) {
      const r = state.records.find((x) => x.id === action.payload.id);
      if (r) {
        Object.assign(r, action.payload);
        // Keep child rows linked to the (possibly changed) person.
        for (const p of state.payments) if (p.recordId === r.id) p.personId = r.personId;
        for (const c of state.cashbacks) if (c.recordId === r.id) c.personId = r.personId;
      }
      touch(state);
    },
    deleteRecord(state, action: PayloadAction<string>) {
      const id = action.payload;
      state.records = state.records.filter((r) => r.id !== id);
      state.payments = state.payments.filter((p) => p.recordId !== id);
      state.cashbacks = state.cashbacks.filter((c) => c.recordId !== id);
      touch(state);
    },

    /* ---------------- Payments ---------------- */
    addPayment(state, action: PayloadAction<PaymentInput & { id?: string }>) {
      const id = action.payload.id || nextId('PAY', state.payments.map((p) => p.id));
      state.payments.push({ ...action.payload, id, createdAt: nowISO() });
      touch(state);
    },
    updatePayment(state, action: PayloadAction<Partial<Payment> & { id: string }>) {
      const p = state.payments.find((x) => x.id === action.payload.id);
      if (p) Object.assign(p, action.payload);
      touch(state);
    },
    deletePayment(state, action: PayloadAction<string>) {
      state.payments = state.payments.filter((p) => p.id !== action.payload);
      touch(state);
    },

    /* ---------------- Cashback ---------------- */
    addCashback(state, action: PayloadAction<CashbackInput & { id?: string }>) {
      const id = action.payload.id || nextId('CB', state.cashbacks.map((c) => c.id));
      state.cashbacks.push({ ...action.payload, id, createdAt: nowISO() });
      touch(state);
    },
    updateCashback(state, action: PayloadAction<Partial<Cashback> & { id: string }>) {
      const c = state.cashbacks.find((x) => x.id === action.payload.id);
      if (c) Object.assign(c, action.payload);
      touch(state);
    },
    deleteCashback(state, action: PayloadAction<string>) {
      state.cashbacks = state.cashbacks.filter((c) => c.id !== action.payload);
      touch(state);
    },

    /* ---------------- Whole dataset ---------------- */
    replaceDataset(
      state,
      action: PayloadAction<{ dataset: Dataset; source: DataSource; fileName?: string; dirty?: boolean }>,
    ) {
      const { dataset, source, fileName, dirty } = action.payload;
      state.people = dataset.people;
      state.records = dataset.records;
      state.payments = dataset.payments;
      state.cashbacks = dataset.cashbacks;
      state.meta = {
        source,
        sourceFileName: fileName,
        lastImportedAt: source === 'imported' ? nowISO() : undefined,
        lastExportedAt: undefined,
        dirty: dirty ?? source !== 'imported',
      };
    },
    /** Merge: rows with an existing ID are updated, new IDs are appended. */
    mergeDataset(state, action: PayloadAction<{ dataset: Dataset; fileName?: string }>) {
      const merge = <T extends { id: string }>(current: T[], incoming: T[]): T[] => {
        const map = new Map(current.map((i) => [i.id, i]));
        for (const item of incoming) map.set(item.id, item);
        return [...map.values()];
      };
      const { dataset, fileName } = action.payload;
      state.people = merge(state.people, dataset.people);
      state.records = merge(state.records, dataset.records);
      state.payments = merge(state.payments, dataset.payments);
      state.cashbacks = merge(state.cashbacks, dataset.cashbacks);
      state.meta.source = 'imported';
      state.meta.sourceFileName = fileName;
      state.meta.lastImportedAt = nowISO();
      state.meta.dirty = true;
    },
    clearAll(state) {
      Object.assign(state, initialDataState, { meta: { source: 'empty', dirty: false } });
    },
    markExported(state, action: PayloadAction<{ fileName: string }>) {
      state.meta.dirty = false;
      state.meta.lastExportedAt = nowISO();
      state.meta.sourceFileName = action.payload.fileName;
      if (state.meta.source === 'demo' || state.meta.source === 'empty') state.meta.source = 'manual';
    },
    hydrate(_state, action: PayloadAction<DataState>) {
      return action.payload;
    },
  },
});

export const {
  addPerson,
  updatePerson,
  setPersonArchived,
  deletePerson,
  addRecord,
  updateRecord,
  deleteRecord,
  addPayment,
  updatePayment,
  deletePayment,
  addCashback,
  updateCashback,
  deleteCashback,
  replaceDataset,
  mergeDataset,
  clearAll,
  markExported,
  hydrate,
} = dataSlice.actions;

export default dataSlice.reducer;
