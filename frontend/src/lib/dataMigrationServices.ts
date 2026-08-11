import * as XLSX from 'xlsx';
import { api } from './api';

export type MigrationSheetKey = 'students' | 'teachers' | 'accounts' | 'results';

export type MigrationTemplateMeta = {
  sheets: Array<{
    key: MigrationSheetKey;
    label: string;
    description: string;
    headers: string[];
    sample: Record<string, unknown>[];
  }>;
  instructions: string[];
};

export type SheetImportResult = {
  sheet: MigrationSheetKey;
  total: number;
  created: number;
  updated: number;
  skipped: number;
  errors: Array<{ row: number; message: string }>;
};

export type MasterMigrationSummary = {
  fileName: string;
  updateExisting: boolean;
  sheets: SheetImportResult[];
  totals: { created: number; updated: number; skipped: number; errors: number };
  syncedAt: string;
  note: string;
};

export async function fetchMigrationTemplateMeta() {
  return api<MigrationTemplateMeta>('/api/data-migration/template-meta');
}

export async function runMasterMigration(body: {
  fileName?: string;
  updateExisting?: boolean;
  sheets: Partial<Record<MigrationSheetKey, Record<string, unknown>[]>>;
}) {
  return api<MasterMigrationSummary>('/api/data-migration/import', {
    method: 'POST',
    body: JSON.stringify(body),
    timeoutMs: 120_000,
  });
}

function sheetKeyFromName(name: string): MigrationSheetKey | null {
  const n = name.toLowerCase().replace(/[^a-z]/g, '');
  if (n.includes('student')) return 'students';
  if (n.includes('teacher') || n.includes('staff') || n.includes('employee')) return 'teachers';
  if (n.includes('account') || n.includes('fee') || n.includes('due')) return 'accounts';
  if (n.includes('result') || n.includes('mark') || n.includes('exam')) return 'results';
  return null;
}

export function parseMasterMigrationWorkbook(file: ArrayBuffer): Partial<
  Record<MigrationSheetKey, Record<string, unknown>[]>
> {
  const wb = XLSX.read(file, { type: 'array', cellDates: true });
  const out: Partial<Record<MigrationSheetKey, Record<string, unknown>[]>> = {};

  for (const sheetName of wb.SheetNames) {
    const key = sheetKeyFromName(sheetName);
    if (!key) continue;
    const sheet = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
    if (rows.length) out[key] = rows;
  }

  // Fallback: if only one sheet and unnamed oddly, try first sheet as students
  if (Object.keys(out).length === 0 && wb.SheetNames[0]) {
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[wb.SheetNames[0]], {
      defval: '',
    });
    if (rows.length) out.students = rows;
  }

  return out;
}

export function downloadMasterMigrationTemplate(meta: MigrationTemplateMeta) {
  const wb = XLSX.utils.book_new();
  const sheetOrder: MigrationSheetKey[] = ['students', 'teachers', 'accounts', 'results'];
  const titles: Record<MigrationSheetKey, string> = {
    students: 'Students',
    teachers: 'Teachers',
    accounts: 'Accounts',
    results: 'Results',
  };

  for (const key of sheetOrder) {
    const def = meta.sheets.find((s) => s.key === key);
    if (!def) continue;
    const sample = def.sample[0] || {};
    const aoa: unknown[][] = [def.headers];
    aoa.push(def.headers.map((h) => sample[h] ?? ''));
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    XLSX.utils.book_append_sheet(wb, ws, titles[key]);
  }

  // Instructions sheet
  const instructions = [
    ['Master Data Migration — Instructions'],
    [''],
    ...meta.instructions.map((line) => [line]),
    [''],
    ['Import order: Students → Teachers → Accounts → Results'],
    ['Accounts & Results must use Admission No. that exists on Students sheet (or already in system).'],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(instructions), 'Instructions');

  XLSX.writeFile(wb, '360_Master_Data_Migration_Template.xlsx');
}
