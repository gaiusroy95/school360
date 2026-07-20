import * as XLSX from 'xlsx';
import type { Enquiry, EnquiryInput } from './admissionServices';

const HEADERS = [
  'Enquiry ID',
  'Enquiry Date',
  'Enquirer Name',
  'Mobile',
  'Email',
  'Class Interested',
  'Source',
  'Status',
  'Assigned To',
  'Next Follow Up',
  'Notes',
] as const;

function cell(v: unknown): string {
  if (v == null) return '';
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v.toISOString().slice(0, 10);
  if (typeof v === 'number' && Number.isFinite(v)) {
    // Excel serial date heuristic
    if (v > 20000 && v < 80000) {
      const utc = Math.round((v - 25569) * 86400 * 1000);
      return new Date(utc).toISOString().slice(0, 10);
    }
    return String(v);
  }
  return String(v).replace(/^\uFEFF/, '').trim();
}

function normalizeHeader(h: string) {
  return h.toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
}

export function downloadEnquiryTemplate(existing: Enquiry[] = []) {
  const wb = XLSX.utils.book_new();
  const sample =
    existing.length > 0
      ? existing.map((e) => [
          e.enquiryId,
          (e.enquiryDate || '').slice(0, 10),
          e.enquirerName,
          e.mobile,
          e.email,
          e.classInterested,
          e.source,
          e.status,
          e.assignedTo,
          e.nextFollowUp || '',
          e.notes || '',
        ])
      : [
          [
            '',
            '2026-07-20',
            'Rahul Sharma',
            '9876543210',
            'rahul@example.com',
            'Nursery',
            'Meta Ads',
            'New',
            'Counselor A',
            '2026-07-25',
            'From Facebook campaign',
          ],
          [
            '',
            '2026-07-19',
            'Priya Patel',
            '9123456780',
            'priya@example.com',
            'Class 1',
            'Google Ads',
            'In Process',
            'Counselor B',
            '2026-07-22',
            '',
          ],
        ];

  const ws = XLSX.utils.aoa_to_sheet([[...HEADERS], ...sample]);
  ws['!cols'] = HEADERS.map(() => ({ wch: 16 }));
  XLSX.utils.book_append_sheet(wb, ws, 'Enquiries');

  const guide = [
    ['Field', 'Notes'],
    ['Enquiry ID', 'Optional. Leave blank to auto-generate.'],
    ['Enquiry Date', 'YYYY-MM-DD'],
    ['Enquirer Name', 'Required'],
    ['Mobile', 'Required'],
    ['Source', 'Website, Walk-in, Phone Call, Facebook, Meta Ads, Google Ads, Referral, Others'],
    ['Status', 'New, In Process, Follow Up, Converted, Not Interested'],
    ['Class Interested', 'Use class names from Institution Setup → Classes & Sections'],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(guide), 'Instructions');
  XLSX.writeFile(wb, existing.length ? 'Enquiries_Export.xlsx' : 'Enquiries_Import_Template.xlsx');
}

export function parseEnquiryWorkbook(file: ArrayBuffer): EnquiryInput[] {
  const wb = XLSX.read(new Uint8Array(file), { type: 'array', cellDates: true });
  const sheetName =
    wb.SheetNames.find((n) => normalizeHeader(n) === 'enquiries') ||
    wb.SheetNames.find((n) => normalizeHeader(n) !== 'instructions') ||
    wb.SheetNames[0];
  if (!sheetName) return [];

  const matrix = XLSX.utils.sheet_to_json<(string | number | Date | null)[]>(wb.Sheets[sheetName], {
    header: 1,
    defval: '',
    raw: true,
    blankrows: false,
  }) as (string | number | Date | null)[][];

  const nonEmpty = matrix.filter((row) => (row || []).some((c) => cell(c) !== ''));
  if (nonEmpty.length < 2) return [];

  const header = (nonEmpty[0] || []).map((h) => normalizeHeader(cell(h)));
  const idx = (names: string[]) =>
    header.findIndex((h) => names.some((n) => h === normalizeHeader(n) || h.replace(/\s/g, '') === normalizeHeader(n).replace(/\s/g, '')));

  const map = {
    enquiryId: idx(['enquiry id', 'enquiryid', 'id']),
    enquiryDate: idx(['enquiry date', 'date']),
    enquirerName: idx(['enquirer name', 'name', 'parent name', 'student name']),
    mobile: idx(['mobile', 'phone', 'mobile number']),
    email: idx(['email', 'email address']),
    classInterested: idx(['class interested', 'class', 'grade']),
    source: idx(['source', 'lead source', 'campaign source']),
    status: idx(['status', 'enquiry status']),
    assignedTo: idx(['assigned to', 'assignee', 'counselor']),
    nextFollowUp: idx(['next follow up', 'follow up', 'followup date']),
    notes: idx(['notes', 'remark', 'comments']),
  };

  const rows: EnquiryInput[] = [];
  for (let r = 1; r < nonEmpty.length; r++) {
    const raw = nonEmpty[r] || [];
    const get = (i: number) => (i >= 0 ? cell(raw[i]) : '');
    const enquirerName = get(map.enquirerName);
    const mobile = get(map.mobile);
    if (!enquirerName || !mobile) continue;
    rows.push({
      enquiryId: get(map.enquiryId) || undefined,
      enquiryDate: get(map.enquiryDate) || undefined,
      enquirerName,
      mobile,
      email: get(map.email),
      classInterested: get(map.classInterested),
      source: get(map.source) || 'Others',
      status: get(map.status) || 'New',
      assignedTo: get(map.assignedTo),
      nextFollowUp: get(map.nextFollowUp) || undefined,
      notes: get(map.notes) || undefined,
    });
  }
  return rows;
}
