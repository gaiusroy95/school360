import { prisma } from './prisma.js';

export const FEE_HEAD_LABELS: Record<string, string> = {
  admissionFee: 'Admission Fee',
  registrationFee: 'Registration Fee',
  tuitionFee: 'Tuition Fee',
  transportFee: 'Transport Fee',
  hostelFee: 'Hostel Fee',
  librarySecurityDeposit: 'Library Security Deposit',
  cautionMoney: 'Caution Money',
  computerLabFee: 'Computer Lab Fee',
  picnicFieldTrip: 'Picnic / Field Trip',
  addOnFee: 'Add-on Fee',
  examinationFee: 'Examination Fee',
  annualCharges: 'Annual Charges',
  sportsFee: 'Sports Fee',
  lateFine: 'Late Fine',
};

export const FEE_HEAD_KEYS = Object.keys(FEE_HEAD_LABELS);

export type FeeHead = {
  key: string;
  label: string;
  amount: number;
};

export type FeeSchedule = {
  class: string;
  section: string;
  frequency: string;
  refundable: string;
  heads: FeeHead[];
  total: number;
};

function flattenSetupSections(tile: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  const sections = tile.sections as Record<string, Record<string, string>> | undefined;
  if (sections) {
    for (const sec of Object.values(sections)) {
      if (sec && typeof sec === 'object') {
        for (const [k, v] of Object.entries(sec)) {
          out[k] = String(v ?? '');
        }
      }
    }
  }
  for (const [k, v] of Object.entries(tile)) {
    if (k !== 'records' && k !== 'recordColumns' && k !== 'sections') {
      out[k] = String(v ?? '');
    }
  }
  return out;
}

function parseAmount(value: unknown): number {
  if (value == null || value === '') return 0;
  const n = Number.parseFloat(String(value).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function normalizeClassKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^class\s+/i, '')
    .replace(/^std\.?\s*/i, '')
    .replace(/\s+/g, ' ');
}

function extractClassNumber(value: string): string | null {
  const n = normalizeClassKey(value);
  const match = n.match(/\b(\d{1,2})\b/);
  if (!match) return null;
  const num = match[1].replace(/^0+/, '');
  return num || '0';
}

function classesMatch(a: string, b: string): boolean {
  if (!a.trim() || !b.trim()) return false;
  const na = normalizeClassKey(a);
  const nb = normalizeClassKey(b);
  if (na === nb) return true;
  const numA = extractClassNumber(a);
  const numB = extractClassNumber(b);
  if (numA && numB && numA === numB) return true;
  return na.includes(nb) || nb.includes(na);
}

function normalizeFieldKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

const FEE_META_KEYS = new Set([
  'class',
  'classname',
  'section',
  'sectionname',
  'frequency',
  'refundable',
  'academicyear',
  'year',
]);

const FEE_HEAD_KEY_ALIASES: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  for (const key of FEE_HEAD_KEYS) {
    map[normalizeFieldKey(key)] = key;
    map[normalizeFieldKey(FEE_HEAD_LABELS[key])] = key;
  }
  return map;
})();

function resolveFeeHeadKey(rawKey: string): string | null {
  const norm = normalizeFieldKey(rawKey);
  if (!norm || FEE_META_KEYS.has(norm)) return null;
  return FEE_HEAD_KEY_ALIASES[norm] || null;
}

function extractClassSection(row: Record<string, string>) {
  return {
    class: (row.class || row.className || row.Class || '').trim(),
    section: (row.section || row.sectionName || row.Section || 'A').trim() || 'A',
  };
}

function extractFeeHeadsFromRow(
  row: Record<string, string>,
  recordColumns?: Array<{ key: string; label: string }>,
): FeeHead[] {
  const heads: FeeHead[] = [];
  const seen = new Set<string>();

  const tryAdd = (rawKey: string, amountRaw: unknown) => {
    const canonical = resolveFeeHeadKey(rawKey);
    if (!canonical || seen.has(canonical)) return;
    const amount = parseAmount(amountRaw);
    if (amount > 0) {
      seen.add(canonical);
      heads.push({ key: canonical, label: FEE_HEAD_LABELS[canonical], amount });
    }
  };

  for (const [key, value] of Object.entries(row)) {
    tryAdd(key, value);
  }

  if (recordColumns) {
    for (const col of recordColumns) {
      tryAdd(col.label, row[col.key]);
    }
  }

  return heads;
}

export function parseFeeSchedulesFromSetup(feeGroupSetup: unknown): FeeSchedule[] {
  const tile = (feeGroupSetup || {}) as {
    records?: Array<Record<string, string>>;
    recordColumns?: Array<{ key: string; label: string }>;
  };
  const records = tile.records || [];
  return records
    .map((row) => {
      const { class: className, section } = extractClassSection(row);
      const heads = extractFeeHeadsFromRow(row, tile.recordColumns);
      const total = heads.reduce((s, h) => s + h.amount, 0);
      return {
        class: className,
        section,
        frequency: row.frequency || 'One-time',
        refundable: row.refundable || 'No',
        heads,
        total,
      };
    })
    .filter((s) => s.class);
}

export function findFeeSchedule(
  schedules: FeeSchedule[],
  className: string,
  sectionName: string,
): FeeSchedule | null {
  if (!schedules.length || !className.trim()) return null;

  const sec = (sectionName || '').trim().toLowerCase();
  const classMatches = schedules.filter((s) => classesMatch(className, s.class));
  if (classMatches.length === 0) return null;

  const withAmounts = classMatches.filter((s) => s.heads.length > 0);

  if (sec) {
    const exactWithAmounts = withAmounts.find((s) => s.section.toLowerCase() === sec);
    if (exactWithAmounts) return exactWithAmounts;

    const exactAny = classMatches.find((s) => s.section.toLowerCase() === sec);
    if (exactAny) return exactAny;
  }

  if (withAmounts.length > 0) {
    const sectionA = withAmounts.find((s) => s.section.toLowerCase() === 'a');
    return sectionA || withAmounts[0];
  }

  return classMatches[0] || null;
}

export type InstitutionReceiptProfile = {
  name: string;
  shortName: string;
  registrationNo: string;
  affiliationNo: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  phone: string;
  email: string;
  website: string;
  logoUrl: string;
  currency: string;
  receiptFooter: string;
};

export function buildInstitutionReceiptProfile(
  institutionName: string,
  basicInformation: unknown,
  feeGroupSetup: unknown,
): InstitutionReceiptProfile {
  const basic = flattenSetupSections((basicInformation || {}) as Record<string, unknown>);
  const fee = flattenSetupSections((feeGroupSetup || {}) as Record<string, unknown>);

  const addressParts = [
    basic.addressLine1,
    basic.addressLine2,
    [basic.city, basic.state, basic.pincode].filter(Boolean).join(', '),
    basic.country,
  ].filter(Boolean);

  return {
    name: basic.institutionName || institutionName,
    shortName: basic.shortName || '',
    registrationNo: basic.registrationNo || '',
    affiliationNo: basic.affiliationNo || '',
    addressLine1: basic.addressLine1 || addressParts[0] || '',
    addressLine2: basic.addressLine2 || '',
    city: basic.city || '',
    state: basic.state || '',
    country: basic.country || '',
    pincode: basic.pincode || '',
    phone: basic.phone || '',
    email: basic.email || '',
    website: basic.website || '',
    logoUrl: basic.logoUrl || '',
    currency: fee.defaultCurrency || 'INR',
    receiptFooter:
      fee.receiptFooter ||
      'This is a computer-generated fee receipt. Please retain for your records.',
  };
}

export async function loadFeeCollectionContext(institutionId: string) {
  const institution = await prisma.institution.findUnique({
    where: { id: institutionId },
    include: { setup: true },
  });
  if (!institution) throw new Error('Institution not found');

  const feeGroupSetup = institution.setup?.feeGroupSetup || {};
  const basicInformation = institution.setup?.basicInformation || {};
  const schedules = parseFeeSchedulesFromSetup(feeGroupSetup);
  const institutionProfile = buildInstitutionReceiptProfile(
    institution.name,
    basicInformation,
    feeGroupSetup,
  );

  return {
    institutionProfile,
    schedules,
    feeConfigured: schedules.some((s) => s.heads.length > 0),
    currency: institutionProfile.currency,
  };
}

export async function generateReceiptNumber(institutionId: string): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.feeReceipt.count({ where: { institutionId } });
  for (let i = 0; i < 50; i++) {
    const num = count + i + 1;
    const candidate = `RCP-${year}-${String(num).padStart(5, '0')}`;
    const exists = await prisma.feeReceipt.findFirst({
      where: { institutionId, receiptNumber: candidate },
    });
    if (!exists) return candidate;
  }
  return `RCP-${year}-${Date.now().toString().slice(-6)}`;
}

export const PAYMENT_MODES = [
  { key: 'CASH', label: 'Cash' },
  { key: 'UPI', label: 'UPI' },
  { key: 'CARD', label: 'Card' },
  { key: 'CHEQUE', label: 'Cheque' },
  { key: 'BANK_TRANSFER', label: 'Bank Transfer' },
] as const;
