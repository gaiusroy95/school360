import * as XLSX from 'xlsx';

export type DesignationUploadRow = {
  name: string;
  department?: string;
  departmentCode?: string;
  designationType?: string;
  totalPositions?: number;
  filledPositions?: number;
  status?: string;
};

export type DesignationExportRow = {
  name: string;
  department: string;
  designationType: string;
  totalPositions: number;
  filledPositions: number;
  vacantPositions: number;
  utilizationPct: number;
  statusLabel: string;
};

export type DesignationDepartmentOption = {
  code: string;
  name: string;
};

const HEADERS = [
  'designationName',
  'department',
  'departmentCode',
  'designationType',
  'totalPositions',
  'filledPositions',
  'status',
] as const;

function cell(row: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    if (row[key] != null && String(row[key]).trim() !== '') return String(row[key]).trim();
    const found = Object.entries(row).find(
      ([k]) => k.toLowerCase().replace(/[\s_]+/g, '') === key.toLowerCase().replace(/[\s_]+/g, ''),
    );
    if (found && found[1] != null && String(found[1]).trim() !== '') return String(found[1]).trim();
  }
  return '';
}

function num(row: Record<string, unknown>, ...keys: string[]) {
  const raw = cell(row, ...keys);
  if (!raw) return undefined;
  const n = Number(String(raw).replace(/,/g, ''));
  return Number.isFinite(n) ? n : undefined;
}

export function downloadDesignationTemplate(
  departments: DesignationDepartmentOption[] = [],
  filename = 'Designations_Bulk_Upload_Template.xlsx',
) {
  const samples: DesignationUploadRow[] = [
    {
      name: 'PGT Mathematics',
      department: departments[0]?.name || 'Academics',
      departmentCode: departments[0]?.code || 'ACAD',
      designationType: 'Teaching',
      totalPositions: 4,
      filledPositions: 3,
      status: 'ACTIVE',
    },
    {
      name: 'Office Assistant',
      department: departments.find((d) => /admin/i.test(d.name))?.name || 'Administration',
      departmentCode: departments.find((d) => /admin/i.test(d.name))?.code || 'ADMIN',
      designationType: 'Non Teaching',
      totalPositions: 2,
      filledPositions: 1,
      status: 'ACTIVE',
    },
  ];

  const sheet = XLSX.utils.json_to_sheet(
    samples.map((row) => ({
      designationName: row.name,
      department: row.department || '',
      departmentCode: row.departmentCode || '',
      designationType: row.designationType || '',
      totalPositions: row.totalPositions ?? 1,
      filledPositions: row.filledPositions ?? 0,
      status: row.status || 'ACTIVE',
    })),
    { header: [...HEADERS] },
  );

  const deptSheet = XLSX.utils.aoa_to_sheet([
    ['departmentCode', 'departmentName', 'notes'],
    ...(departments.length
      ? departments.map((d) => [d.code, d.name, 'Use this code or name in the Designations sheet'])
      : [['ADMIN', 'Administration', 'Add HR departments first, or type the department name']]),
  ]);

  const notes = XLSX.utils.aoa_to_sheet([
    ['Designations bulk upload'],
    [''],
    ['1. Fill the Designations sheet. Delete the sample rows before uploading live data.'],
    ['2. designationName is required.'],
    ['3. Map each designation to a department using department (name) and/or departmentCode.'],
    ['4. departmentCode / department are matched against HR Departments (case-insensitive).'],
    ['5. If the department does not exist, it is created in HR Departments so mapping stays in sync.'],
    ['6. Existing designation + department rows are updated; new combinations are created.'],
    ['7. designationType examples: Management, Teaching, Support Staff, Finance, IT, Non Teaching, Administration.'],
    ['8. status: ACTIVE or INACTIVE.'],
    [''],
    ['Columns'],
    ...HEADERS.map((h) => [h]),
  ]);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, 'Designations');
  XLSX.utils.book_append_sheet(wb, deptSheet, 'Departments');
  XLSX.utils.book_append_sheet(wb, notes, 'Instructions');
  XLSX.writeFile(wb, filename);
}

export function exportDesignationsToExcel(
  rows: DesignationExportRow[],
  filename = 'Designations_Export.xlsx',
) {
  const aoa = [
    ['#', 'designationName', 'department', 'designationType', 'totalPositions', 'filled', 'vacant', 'utilizationPct', 'status'],
    ...rows.map((row, i) => [
      i + 1,
      row.name,
      row.department,
      row.designationType,
      row.totalPositions,
      row.filledPositions,
      row.vacantPositions,
      row.utilizationPct,
      row.statusLabel,
    ]),
  ];
  const sheet = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, 'Designations');
  XLSX.writeFile(wb, filename);
}

export async function parseDesignationUploadFile(file: File): Promise<DesignationUploadRow[]> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array' });
  const sheetName =
    wb.SheetNames.find((n) => n.toLowerCase().includes('designation')) || wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  if (!sheet) throw new Error('No worksheet found in Excel file');
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

  const out: DesignationUploadRow[] = [];
  for (const row of rows) {
    const name = cell(row, 'designationName', 'name', 'designation', 'title', 'position');
    if (!name) continue;
    if (/^(designation\s*name|name)$/i.test(name)) continue;

    out.push({
      name,
      department: cell(row, 'department', 'departmentName', 'dept') || undefined,
      departmentCode: cell(row, 'departmentCode', 'deptCode', 'code') || undefined,
      designationType: cell(row, 'designationType', 'type') || undefined,
      totalPositions: num(row, 'totalPositions', 'sanctioned', 'positions'),
      filledPositions: num(row, 'filledPositions', 'filled'),
      status: cell(row, 'status') || undefined,
    });
  }

  if (!out.length) throw new Error('No valid designation rows found. Ensure designationName is filled.');
  return out;
}
