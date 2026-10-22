/**
 * ============================================================================
 *  LINK YOUR EXCEL SHEET HERE
 * ============================================================================
 *
 * Paste the link to your workbook into EXCEL_SHEET_URL. When the app starts it
 * downloads that workbook, validates it and loads it as the current data.
 * You can also reload it any time from "Excel Import / Export" → "Linked workbook".
 *
 * Accepted links (the URL must return the .xlsx file itself):
 *
 *   1. A file inside this project (simplest, always works offline):
 *        - copy your workbook to   public/data/MyMoney.xlsx
 *        - set                     EXCEL_SHEET_URL = '/data/MyMoney.xlsx'
 *
 *   2. Google Sheets (share the sheet as "Anyone with the link can view"):
 *        'https://docs.google.com/spreadsheets/d/<SHEET_ID>/export?format=xlsx'
 *
 *   3. OneDrive / SharePoint direct-download link (add &download=1 to a share link),
 *      Dropbox (replace ?dl=0 with ?dl=1), or any other HTTPS address of an .xlsx file.
 *
 * Leave it as an empty string '' to disable linking. The app will then start with
 * the local draft (or demo data) and you can import a workbook manually.
 *
 * Browsers cannot write back to a file or a cloud sheet, so saving is always done
 * through "Export Updated Excel", which downloads a fresh copy for you to replace
 * the linked file with.
 */
export const EXCEL_SHEET_URL = '';

/**
 * What to do when the linked workbook is fetched on startup while the browser
 * still holds a local draft with changes that were never exported:
 *   'ask'     → keep the draft and show a banner offering to reload from the link
 *   'replace' → always load the linked workbook (unexported changes are lost)
 */
export const LINKED_SHEET_CONFLICT: 'ask' | 'replace' = 'ask';
