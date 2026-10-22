Put your Excel workbook in this folder, for example:

    public/data/MyMoney.xlsx

Then open  src/config/excelSource.ts  and set:

    export const EXCEL_SHEET_URL = '/data/MyMoney.xlsx';

The app loads that file automatically when it starts.
Start from the blank template at  public/MyMoney_Template.xlsx  (also available
from the app: Excel Import / Export → Download blank template).

After making changes in the app, click "Export Updated Excel" and replace the
file in this folder with the downloaded one.
