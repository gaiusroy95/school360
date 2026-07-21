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
    .replace(/\s+/g, ' ');
}

function classesMatch(a: string, b: string): boolean {
  if (!a.trim() || !b.trim()) return false;
  const na = normalizeClassKey(a);
  const nb = normalizeClassKey(b);
  return na === nb || na.includes(nb) || nb.includes(na);
}

export function parseFeeSchedulesFromSetup(feeGroupSetup: unknown): FeeSchedule[] {
  const tile = (feeGroupSetup || {}) as {
    records?: Array<Record<string, string>>;
  };
  const records = tile.records || [];
  return records.map((row) => {
    const heads: FeeHead[] = [];
    for (const key of FEE_HEAD_KEYS) {
      const amount = parseAmount(row[key]);
      if (amount > 0) {
        heads.push({ key, label: FEE_HEAD_LABELS[key], amount });
      }
    }
    const total = heads.reduce((s, h) => s + h.amount, 0);
    return {
      class: (row.class || row.className || '').trim(),
      section: (row.section || row.sectionName || 'A').trim() || 'A',
      frequency: row.frequency || 'One-time',
      refundable: row.refundable || 'No',
      heads,
      total,
    };
  });
}

export function findFeeSchedule(
  schedules: FeeSchedule[],
  className: string,
  sectionName: string,
): FeeSchedule | null {
  const exact = schedules.find(
    (s) => classesMatch(className, s.class) && s.section.toLowerCase() === sectionName.toLowerCase(),
  );
  if (exact) return exact;

  const classOnly = schedules.find((s) => classesMatch(className, s.class));
  if (classOnly) return classOnly;

  return schedules[0] || null;
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
    feeConfigured: schedules.length > 0,
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
