import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from './store';
import type { Dataset } from '../types/models';
import {
  computeMonthlyBuckets,
  computeTotals,
  indexById,
  statusDistribution,
  summarizePeople,
  summarizeRecords,
} from '../utils/calculations';
import { listYears } from '../utils/dates';

export const selectData = (s: RootState) => s.data;
export const selectMeta = (s: RootState) => s.data.meta;
export const selectPeople = (s: RootState) => s.data.people;
export const selectRecords = (s: RootState) => s.data.records;
export const selectPayments = (s: RootState) => s.data.payments;
export const selectCashbacks = (s: RootState) => s.data.cashbacks;

export const selectDataset = createSelector(
  [selectPeople, selectRecords, selectPayments, selectCashbacks],
  (people, records, payments, cashbacks): Dataset => ({ people, records, payments, cashbacks }),
);

export const selectRecordSummaries = createSelector([selectDataset], (data) => summarizeRecords(data));

export const selectRecordSummaryMap = createSelector([selectRecordSummaries], (list) =>
  new Map(list.map((s) => [s.record.id, s])),
);

export const selectPersonSummaries = createSelector([selectDataset, selectRecordSummaries], (data, recs) =>
  summarizePeople(data, recs),
);

export const selectPersonSummaryMap = createSelector([selectPersonSummaries], (list) =>
  new Map(list.map((s) => [s.person.id, s])),
);

export const selectPeopleMap = createSelector([selectPeople], (people) => indexById(people));
export const selectRecordsMap = createSelector([selectRecords], (records) => indexById(records));

export const selectTotals = createSelector([selectDataset, selectRecordSummaries], (data, recs) =>
  computeTotals(data, recs),
);

export const selectStatusDistribution = createSelector([selectRecordSummaries], statusDistribution);

export const selectAllMonthlyBuckets = createSelector([selectDataset], (data) => computeMonthlyBuckets(data));

export const selectAvailableYears = createSelector([selectDataset], (data) =>
  listYears([
    ...data.records.map((r) => r.dateGiven),
    ...data.payments.map((p) => p.date),
    ...data.cashbacks.map((c) => c.date),
  ]),
);

export const selectActivePeople = createSelector([selectPeople], (people) => people.filter((p) => !p.archived));

export const selectIsDirty = (s: RootState) => s.data.meta.dirty;
export const selectIsDemo = (s: RootState) => s.data.meta.source === 'demo';
export const selectIsEmpty = (s: RootState) =>
  s.data.people.length === 0 && s.data.records.length === 0 && s.data.payments.length === 0;
