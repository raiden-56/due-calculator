/**
 * Writes the blank Excel template to public/MyMoney_Template.xlsx and
 * templates/MyMoney_Template.xlsx. Run with:  npm run template
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import * as XLSX from 'xlsx';
import { buildTemplateWorkbook } from '../src/features/excel/excelExport';

const year = new Date().getFullYear();
const wb = buildTemplateWorkbook(year);
const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer', cellDates: true }) as Buffer;

for (const dir of ['public', 'templates']) {
  mkdirSync(dir, { recursive: true });
  const path = `${dir}/MyMoney_Template.xlsx`;
  writeFileSync(path, buffer);
  console.log('wrote', path);
}
