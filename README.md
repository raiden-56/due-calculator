# MyMoney — Personal Money Tracker

A local-only React app for tracking money you lend or spend on behalf of other people: the original amount, every payment received, the outstanding balance, and cashback. Your Excel workbook is the source of truth; the app imports it, lets you work on it, and exports an updated copy.

No backend, no database, no login. Everything runs in the browser.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build in dist/
npm run preview    # serve the production build
npm test           # unit tests (calculations + Excel round trip)
```

## Stack

React 19 + Vite, TypeScript, Material UI v9, Redux Toolkit, React Router (hash routing so it works from a file server), Recharts, SheetJS (`xlsx`), Lucide icons, Day.js, Vitest.

## How the numbers work

All money arithmetic goes through `src/utils/money.ts`, which converts rupees to integer paise before adding or subtracting, so `0.1 + 0.2` is exactly `0.3` and totals never drift. Every derived figure lives in `src/utils/calculations.ts` and is unit-tested:

- **Outstanding** = Original amount − Payments received − Cashback explicitly applied to debt
- **Collection %** = (Payments + applied cashback) ÷ Original × 100
- **Status**: Pending (nothing received), Partially Paid, Settled (exactly zero), Overpaid (received more than owed, shown as a credit rather than negative debt), Overdue (due date passed with a balance)
- **Cashback** is always tracked separately. It only reduces a balance when you tick "Apply to debt" on that entry, and then it shows as its own adjustment line on the record.
- Monthly views group money given by *date given*, payments by *payment date* and cashback by *cashback date*. Outstanding is always the current total, never a new monthly debt.

## Connecting your Excel file (saves directly into it)

In Chrome or Edge on a desktop, go to **Excel Import / Export → Your Excel file** and click **Connect existing Excel file** (or **Create new Excel file** to start from scratch). The app reads the workbook and, from then on, writes every record, payment and cashback you add straight back into that same `.xlsx` file. Auto-save (on by default, toggle in Settings) writes about a second after each change; otherwise use **Save to Excel** in the top bar.

This uses the browser's File System Access API. The connection is remembered across reloads; after a browser restart a banner asks you to click **Reconnect** once. Keep the file closed in Excel while the app saves, because Excel locks open files. Firefox and Safari do not support direct file access; there you import and download copies instead.

The app starts empty. There is no demo data.

## Linking a read-only sheet by URL (optional)

**Where to add the link:** open [src/config/excelSource.ts](src/config/excelSource.ts) and set `EXCEL_SHEET_URL`.

```ts
export const EXCEL_SHEET_URL = '/data/MyMoney.xlsx';   // ← your link goes here
```

Accepted values:

| Where your workbook lives | What to put in `EXCEL_SHEET_URL` |
|---|---|
| Inside the project at `public/data/MyMoney.xlsx` (recommended, works offline) | `'/data/MyMoney.xlsx'` |
| Google Sheets, shared as "anyone with the link" | `'https://docs.google.com/spreadsheets/d/<SHEET_ID>/export?format=xlsx'` |
| OneDrive / SharePoint / Dropbox direct-download link | the direct `.xlsx` download URL |

On startup the app downloads the linked workbook, validates it and loads it. The Excel page shows the link status and has a **Reload from linked sheet** button. If the browser holds unexported edits, a banner asks before replacing them (change `LINKED_SHEET_CONFLICT` to `'replace'` to skip the question).

**Template:** a blank workbook with all sheets and an Instructions tab is at [templates/MyMoney_Template.xlsx](templates/MyMoney_Template.xlsx) (also served at `/MyMoney_Template.xlsx` and downloadable from the Excel page). Regenerate it with `npm run template`.

Browsers cannot write to a file or a cloud sheet, so saving is always **Export Updated Excel**, which downloads a fresh copy for you to replace the linked file with.

## Excel workflow

1. **Import** your workbook from the top bar or the Excel page. A preview shows every row with validation errors (bad dates, missing amounts, unknown record IDs). Valid rows can be imported; invalid rows are listed and skipped.
2. Work in the app. A recoverable draft is saved to browser storage after every change, and the sidebar shows an "Unsaved changes" marker until you export.
3. **Export Updated Excel**. Browsers cannot overwrite a file silently, so the app downloads a new timestamped workbook. Replace your old one with it.

The workbook contains **Dashboard, People, Money Records, Payments, Cashback** and **January–December** sheets. Computed columns carry real Excel formulas (SUMIFS/COUNTIFS) with the app's values cached, so they display correctly immediately and recalculate in Excel. On import only the input columns are read; totals are always recomputed in TypeScript.

Demo data is loaded on first run and is clearly labelled. Clear it from Settings or the Excel page before importing real data; importing while demo data is loaded always replaces it (never merges).

## Project layout

```
src/
  app/            store, typed hooks, memoised selectors
  components/     layout (AppShell, Sidebar, TopBar) and shared UI
                  (StatCard, ChartCard, CurrencyDisplay, MonthSelector,
                   ResponsiveTable, ConfirmDialog, EmptyState, FormDialog…)
  features/
    data/         dataSlice — people, records, payments, cashback, meta
    ui/           uiSlice — theme, dialogs, period, snackbar
    dashboard/    KPI cards, charts, recent payments, people who owe
    people/       PeoplePage, PersonFormDialog, PersonDetailsDrawer
    records/      MoneyRecordsPage, MoneyRecordsTable, RecordFormDialog, RecordDetailsDrawer
    payments/     PaymentsPage, PaymentFormDialog
    cashback/     CashbackPage, CashbackFormDialog
    monthly/      MonthlyPage (12 months, any year)
    reports/      ReportsPage (8 reports with filters and CSV export)
    excel/        schema, export, import, template, CSV, import dialog
    settings/     theme, draft, demo data, clear all
  utils/          money (exact paise math), calculations, dates, ids, validation
  types/          domain models
  data/           demo dataset
  storage/        localStorage draft
```

## Responsive behaviour

Tested at 360, 390, 768, 1024 and 1440 px. The sidebar collapses on desktop and becomes a drawer on mobile; tables switch to card lists below the `md` breakpoint; dialogs go full-screen on phones; charts resize with their cards; no page scrolls horizontally.
