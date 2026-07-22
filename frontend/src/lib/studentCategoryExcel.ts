import * as XLSX from 'xlsx';
import type { StudentCategory, StudentCategoryAssignment } from './studentCategoryServices';

export function downloadCategoriesExcel(
  categories: StudentCategory[],
  assignments: StudentCategoryAssignment[],
) {
  const wb = XLSX.utils.book_new();

  const catSheet = XLSX.utils.aoa_to_sheet([
    ['Category Group', 'Name', 'Short Code', 'Type', 'Description', 'Status', 'Display Order', 'Color', 'Icon'],
    ...categories.map((c) => [
      c.categoryGroupLabel,
      c.name,
      c.shortCode,
      c.categoryTypeLabel,
      c.description,
      c.statusLabel,
      c.displayOrder,
      c.colorCode,
      c.icon,
    ]),
  ]);
  XLSX.utils.book_append_sheet(wb, catSheet, 'Categories');

  const asgSheet = XLSX.utils.aoa_to_sheet([
    ['Record ID', 'Student Name', 'Class / Group', 'Category', 'Category Group', 'Details', 'Status', 'Updated'],
    ...assignments.map((a) => [
      a.recordId,
      a.name,
      a.classGroup,
      a.categoryName,
      a.categoryGroupLabel,
      a.details,
      a.statusLabel,
      new Date(a.updatedAt).toLocaleDateString('en-IN'),
    ]),
  ]);
  XLSX.utils.book_append_sheet(wb, asgSheet, 'Assignments');

  XLSX.writeFile(wb, `Student_Categories_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function parseCategoriesImport(file: File): Promise<{
  categories: Record<string, unknown>[];
  assignments: Record<string, unknown>[];
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = new Uint8Array(reader.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const categories: Record<string, unknown>[] = [];
        const assignments: Record<string, unknown>[] = [];

        const catSheet = wb.Sheets['Categories'] || wb.Sheets[wb.SheetNames[0]];
        if (catSheet) {
          const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(catSheet, { defval: '' });
          for (const row of rows) {
            const name = String(row.Name || row.name || '').trim();
            if (!name) continue;
            categories.push({
              categoryGroup: mapGroup(String(row['Category Group'] || row.categoryGroup || '')),
              name,
              shortCode: String(row['Short Code'] || row.shortCode || name.slice(0, 3)).toUpperCase(),
              categoryType: String(row.Type || row.categoryType || 'INTERNAL').toUpperCase().includes('GOV')
                ? 'GOVERNMENT'
                : 'INTERNAL',
              description: String(row.Description || row.description || ''),
              status: String(row.Status || row.status || 'ACTIVE').toUpperCase(),
              displayOrder: Number(row['Display Order'] || row.displayOrder || 0),
              colorCode: String(row.Color || row.colorCode || '#6366f1'),
              icon: String(row.Icon || row.icon || ''),
            });
          }
        }

        const asgSheet = wb.Sheets['Assignments'] || wb.Sheets[wb.SheetNames[1]];
        if (asgSheet) {
          const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(asgSheet, { defval: '' });
          for (const row of rows) {
            const admissionNumber = String(row['Admission No'] || row.admissionNumber || '').trim();
            const categoryName = String(row.Category || row.categoryName || '').trim();
            if (!admissionNumber && !categoryName) continue;
            assignments.push({
              admissionNumber,
              categoryShortCode: String(row['Short Code'] || row.categoryShortCode || '').trim(),
              categoryGroup: mapGroup(String(row['Category Group'] || row.categoryGroup || '')),
              details: String(row.Details || row.details || categoryName),
              status: String(row.Status || row.status || 'ACTIVE').toUpperCase(),
            });
          }
        }

        resolve({ categories, assignments });
      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

function mapGroup(label: string): string {
  const l = label.toLowerCase();
  if (l.includes('talent')) return 'TALENT';
  if (l.includes('attendance')) return 'ATTENDANCE';
  if (l.includes('government') || l.includes('reservation')) return 'GOVERNMENT_RESERVATION';
  return 'ADMISSION';
}
