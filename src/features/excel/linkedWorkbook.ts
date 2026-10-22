import { EXCEL_SHEET_URL } from '../../config/excelSource';
import { parseWorkbook, type ImportResult } from './excelImport';

export const isLinkedSheetConfigured = (): boolean => EXCEL_SHEET_URL.trim() !== '';

/** Human-readable name for the linked source, used in the sidebar and Excel page. */
export const linkedSheetName = (): string => {
  const url = EXCEL_SHEET_URL.trim();
  if (!url) return '';
  if (url.includes('docs.google.com')) return 'Google Sheet (linked)';
  try {
    const u = new URL(url, window.location.origin);
    const last = decodeURIComponent(u.pathname.split('/').filter(Boolean).at(-1) ?? '');
    return last || u.hostname;
  } catch {
    return url;
  }
};

export class LinkedSheetError extends Error {}

/** Downloads the linked workbook and runs it through the same validation as a manual import. */
export const fetchLinkedWorkbook = async (): Promise<ImportResult> => {
  const url = EXCEL_SHEET_URL.trim();
  if (!url) throw new LinkedSheetError('No Excel link configured. Set EXCEL_SHEET_URL in src/config/excelSource.ts.');
  let res: Response;
  try {
    res = await fetch(url, { cache: 'no-store' });
  } catch (e) {
    throw new LinkedSheetError(
      `Could not download the linked workbook (${e instanceof Error ? e.message : 'network error'}). ` +
        'If it is a cloud link, make sure it is shared publicly and allows cross-origin downloads; otherwise copy the file to public/data/.',
    );
  }
  if (!res.ok) throw new LinkedSheetError(`The linked workbook returned HTTP ${res.status}. Check the URL in src/config/excelSource.ts.`);
  const type = res.headers.get('content-type') ?? '';
  if (type.includes('text/html')) {
    throw new LinkedSheetError('The link returned a web page instead of an .xlsx file. Use a direct download link (see src/config/excelSource.ts).');
  }
  const buffer = await res.arrayBuffer();
  try {
    return parseWorkbook(buffer);
  } catch {
    throw new LinkedSheetError('The downloaded file is not a readable Excel workbook.');
  }
};
