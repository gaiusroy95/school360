import * as XLSX from 'xlsx';
import type { SetupTileSchema } from '../../../lib/institutionSetupSchema';

export type RecordColumn = { key: string; label: string };

export type ParsedMasterList = {
  columns: RecordColumn[];
  rows: Record<string, string>[];
};

function masterListSheetName() {
  return 'MasterList';
}

function cellToText(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (value instanceof Date) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return String(value).replace(/^\uFEFF/, '').trim();
}

function normalizeHeader(value: unknown): string {
  return cellToText(value)
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function labelToKey(label: string, used: Set<string>): string {
  let base = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  if (!base) base = 'col';
  let key = base;
  let n = 2;
  while (used.has(key)) {
    key = `${base}_${n++}`;
  }
  used.add(key);
  return key;
}

export function downloadMasterListTemplate(
  schema: SetupTileSchema,
  columns: RecordColumn[],
  currentRecords: Record<string, string>[] = [],
) {
  const cols = columns.length ? columns : schema.recordColumns || [];
  if (!cols.length) return;

  const useSamples =
    currentRecords.length === 0 &&
    !!schema.sampleRecords?.length &&
    cols.length === (schema.recordColumns || []).length &&
    cols.every((c, i) => c.key === schema.recordColumns![i]?.key);

  const dataRows = currentRecords.length
    ? currentRecords.map((r) => cols.map((c) => r[c.key] ?? ''))
    : useSamples
      ? schema.sampleRecords!.map((r) => cols.map((c) => r[c.key] || ''))
      : [cols.map(() => '')];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([cols.map((c) => c.label), ...dataRows]);
  ws['!cols'] = cols.map(() => ({ wch: 18 }));
  XLSX.utils.book_append_sheet(wb, ws, masterListSheetName());

  const guide = [
    ['How to use this template', ''],
    ['1', 'Edit the MasterList sheet. Row 1 becomes the Master List table headers.'],
    ['2', 'Add, rename, or reorder columns as needed — upload applies those headers on the page.'],
    ['3', 'One Excel data row = one master-list row.'],
    ['4', 'Upload Excel updates the page preview. Click Save Configuration to store changes in the database.'],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(guide), 'Instructions');

  const safeName = schema.title.replace(/[^a-zA-Z0-9]+/g, '_');
  XLSX.writeFile(wb, `${safeName}_Master_List_Template.xlsx`);
}

/**
 * Excel row 1 → table headers; remaining rows → data.
 * Structure follows the spreadsheet exactly (not hardcoded schema columns).
 */
export function parseMasterListWorkbook(
  file: ArrayBuffer | Uint8Array,
  knownColumns?: RecordColumn[],
): ParsedMasterList {
  const bytes = file instanceof Uint8Array ? file : new Uint8Array(file);
  const wb = XLSX.read(bytes, { type: 'array', cellDates: true });

  const sheetMatrix = (name: string) =>
    XLSX.utils.sheet_to_json<(string | number | Date | null | undefined)[]>(wb.Sheets[name], {
      header: 1,
      defval: '',
      raw: true,
      blankrows: false,
    }) as (string | number | Date | null | undefined)[][];

  let preferred =
    wb.SheetNames.find((n) => {
      const nrm = normalizeHeader(n);
      return nrm === 'masterlist' || nrm === 'master list';
    }) || '';

  if (!preferred) {
    preferred =
      wb.SheetNames.find((n) => normalizeHeader(n) !== 'instructions') || wb.SheetNames[0] || '';
  }

  if (!preferred || !wb.Sheets[preferred]) {
    throw new Error('Could not read Excel sheet. Download the Excel Template and upload that file.');
  }

  const matrix = sheetMatrix(preferred);
  const nonEmpty = matrix.filter((row) => (row || []).some((c) => cellToText(c) !== ''));
  if (nonEmpty.length === 0) {
    return { columns: [], rows: [] };
  }

  const headerRow = nonEmpty[0] || [];
  let lastHeaderIdx = -1;
  for (let i = 0; i < headerRow.length; i++) {
    if (cellToText(headerRow[i]) !== '') lastHeaderIdx = i;
  }
  if (lastHeaderIdx < 0) {
    throw new Error('Excel header row is empty. Row 1 must contain column titles.');
  }

  const usedKeys = new Set<string>();
  const columns: RecordColumn[] = [];
  for (let i = 0; i <= lastHeaderIdx; i++) {
    const label = cellToText(headerRow[i]) || `Column ${i + 1}`;
    const norm = normalizeHeader(label);
    const known = knownColumns?.find((c) => normalizeHeader(c.label) === norm);
    const key = known?.key || labelToKey(label, usedKeys);
    columns.push({ key, label: known?.label || label });
  }

  const rows: Record<string, string>[] = [];
  for (let r = 1; r < nonEmpty.length; r++) {
    const raw = nonEmpty[r] || [];
    if (raw.every((c) => cellToText(c) === '')) continue;
    const obj: Record<string, string> = {};
    let hasAny = false;
    columns.forEach((col, idx) => {
      const val = cellToText(raw[idx]);
      obj[col.key] = val;
      if (val) hasAny = true;
    });
    if (hasAny) rows.push(obj);
  }

  return { columns, rows };
}
