import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { selectDataset, selectPersonSummaries, selectRecordSummaries } from '../../app/selectors';
import { downloadBlob, downloadText, timestampForFile } from '../../utils/download';
import { markExported } from '../data/dataSlice';
import { showSnackbar } from '../ui/uiSlice';
import { toCSV } from './csvExport';
import { buildTemplateWorkbook, buildWorkbook, workbookToBlob } from './excelExport';

/** Shared export actions used by the Excel page, Settings, Reports and the sidebar banner. */
export const useExcelActions = () => {
  const dispatch = useAppDispatch();
  const data = useAppSelector(selectDataset);
  const recordSummaries = useAppSelector(selectRecordSummaries);
  const personSummaries = useAppSelector(selectPersonSummaries);
  const year = useAppSelector((s) => s.ui.period.year);

  const exportWorkbook = useCallback(
    (opts?: { year?: number; silent?: boolean }) => {
      const y = opts?.year ?? year;
      const fileName = `MyMoney_${timestampForFile()}.xlsx`;
      downloadBlob(workbookToBlob(buildWorkbook(data, { year: y })), fileName);
      dispatch(markExported({ fileName }));
      if (!opts?.silent) dispatch(showSnackbar({ message: `Exported ${fileName}. Keep it as your backup.` }));
      return fileName;
    },
    [data, dispatch, year],
  );

  const downloadTemplate = useCallback(() => {
    const fileName = 'MyMoney_Template.xlsx';
    downloadBlob(workbookToBlob(buildTemplateWorkbook(year)), fileName);
    dispatch(showSnackbar({ message: 'Blank template downloaded', severity: 'info' }));
  }, [dispatch, year]);

  const exportCSV = useCallback(
    (which: 'records' | 'payments' | 'cashback' | 'people') => {
      const stamp = timestampForFile();
      const peopleName = new Map(data.people.map((p) => [p.id, p.name]));
      if (which === 'records') {
        downloadText(
          toCSV(
            ['Record ID', 'Person', 'Description', 'Category', 'Date Given', 'Original Amount', 'Amount Received', 'Cashback Applied', 'Outstanding', 'Overpaid', 'Total Cashback', 'Due Date', 'Status', 'Notes'],
            recordSummaries.map((s) => [
              s.record.id,
              s.personName,
              s.record.description,
              s.record.category,
              s.record.dateGiven,
              s.record.originalAmount,
              s.totalPaid,
              s.cashbackApplied,
              s.outstanding,
              s.overpaid,
              s.cashbackTotal,
              s.record.dueDate ?? '',
              s.status,
              s.record.notes ?? '',
            ]),
          ),
          `MyMoney_Records_${stamp}.csv`,
          'text/csv;charset=utf-8',
        );
      } else if (which === 'payments') {
        downloadText(
          toCSV(
            ['Payment ID', 'Record ID', 'Person', 'Payment Date', 'Amount', 'Method', 'Reference', 'Notes'],
            data.payments.map((p) => [p.id, p.recordId, peopleName.get(p.personId) ?? '', p.date, p.amount, p.method, p.reference ?? '', p.notes ?? '']),
          ),
          `MyMoney_Payments_${stamp}.csv`,
          'text/csv;charset=utf-8',
        );
      } else if (which === 'cashback') {
        downloadText(
          toCSV(
            ['Cashback ID', 'Record ID', 'Person', 'Cashback Date', 'Amount', 'Source', 'Applied To Debt', 'Notes'],
            data.cashbacks.map((c) => [c.id, c.recordId, peopleName.get(c.personId) ?? '', c.date, c.amount, c.source, c.appliedToDebt ? 'Yes' : 'No', c.notes ?? '']),
          ),
          `MyMoney_Cashback_${stamp}.csv`,
          'text/csv;charset=utf-8',
        );
      } else {
        downloadText(
          toCSV(
            ['Person ID', 'Name', 'Phone', 'Total Given', 'Total Paid', 'Total Cashback', 'Outstanding', 'Overpaid', 'Status', 'Archived', 'Notes'],
            personSummaries.map((s) => [
              s.person.id,
              s.person.name,
              s.person.phone ?? '',
              s.totalGiven,
              s.totalPaid,
              s.totalCashback,
              s.outstanding,
              s.overpaid,
              s.status,
              s.person.archived ? 'Yes' : 'No',
              s.person.notes ?? '',
            ]),
          ),
          `MyMoney_People_${stamp}.csv`,
          'text/csv;charset=utf-8',
        );
      }
      dispatch(showSnackbar({ message: 'CSV downloaded', severity: 'info' }));
    },
    [data, dispatch, personSummaries, recordSummaries],
  );

  return { exportWorkbook, downloadTemplate, exportCSV };
};
