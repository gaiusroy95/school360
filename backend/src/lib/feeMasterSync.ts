import { FeeMasterStatus } from '@prisma/client';
import { prisma } from './prisma.js';
import { FEE_HEAD_LABELS } from './feeConfig.js';

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export const FEE_STRUCTURE_HEAD_FIELDS = [
  { key: 'tuitionFee', label: 'Tuition Fee', refundable: false },
  { key: 'admissionFee', label: 'Admission Fee', refundable: false },
  { key: 'registrationFee', label: 'Registration Fee', refundable: false },
  { key: 'librarySecurityDeposit', label: 'Library Security Deposit (Refundable)', refundable: true },
  { key: 'cautionMoney', label: 'Caution Money (Refundable)', refundable: true },
  { key: 'computerLabFee', label: 'Computer Lab Fee', refundable: false },
  { key: 'picnicFieldTrip', label: 'Picnic / Field Trip', refundable: false },
  { key: 'addOnFee', label: 'Add-on Fee', refundable: false },
  { key: 'examinationFee', label: 'Examination Fee', refundable: false },
  { key: 'annualCharges', label: 'Annual Charges', refundable: false },
  { key: 'sportsFee', label: 'Sports Fee', refundable: false },
] as const;

export const STANDARD_STRUCTURE_COLUMN_KEYS: Set<string> = new Set(
  FEE_STRUCTURE_HEAD_FIELDS.map((h) => h.key),
);

export type StructureHeadAmount = {
  code: string;
  name: string;
  amount: number;
  isRefundable?: boolean;
  category?: string;
};

function normalizeCode(code: string) {
  return code.trim().replace(/\s+/g, '_');
}

function categoryForCode(code: string) {
  const upper = code.toUpperCase();
  if (upper.includes('TRANSPORT')) return 'TRANSPORT';
  if (upper.includes('HOSTEL')) return 'HOSTEL';
  if (upper.includes('EXAM')) return 'EXAM';
  if (upper.includes('LIBRARY')) return 'LIBRARY';
  if (upper.includes('LAB')) return 'LAB';
  if (upper.includes('SPORT') || upper.includes('ACTIVITY')) return 'ACTIVITY';
  if (upper.includes('ADMISSION') || upper.includes('REGISTRATION')) return 'ADMISSION';
  if (upper.includes('TUITION')) return 'TUITION';
  if (upper.includes('FINE')) return 'FINE';
  return 'OTHER';
}

export function parseExtraHeads(value: unknown): Record<string, number> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const out: Record<string, number> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    const amount = round2(Number(raw) || 0);
    if (amount > 0) out[normalizeCode(key)] = amount;
  }
  return out;
}

export function collectStructureHeadAmounts(
  row: Record<string, unknown>,
  extraHeads?: unknown,
): StructureHeadAmount[] {
  const items: StructureHeadAmount[] = [];
  const seen = new Set<string>();

  for (const field of FEE_STRUCTURE_HEAD_FIELDS) {
    const amount = round2(Number(row[field.key]) || 0);
    if (amount <= 0) continue;
    seen.add(field.key);
    items.push({
      code: field.key,
      name: field.label,
      amount,
      isRefundable: field.refundable,
      category: categoryForCode(field.key),
    });
  }

  for (const [code, amount] of Object.entries(parseExtraHeads(extraHeads))) {
    if (seen.has(code) || amount <= 0) continue;
    items.push({
      code,
      name: FEE_HEAD_LABELS[code] || code.replace(/_/g, ' '),
      amount,
      category: categoryForCode(code),
    });
  }

  return items;
}

export async function syncFeeMastersFromStructure(
  institutionId: string,
  heads: StructureHeadAmount[],
  newHeads: Array<{ code: string; name: string; category?: string; isRefundable?: boolean }> = [],
) {
  const newHeadMap = new Map(
    newHeads.map((h) => [normalizeCode(h.code), h]),
  );

  for (const head of heads) {
    const code = normalizeCode(head.code);
    if (!code || head.amount <= 0) continue;

    const newMeta = newHeadMap.get(code);
    const name = newMeta?.name?.trim() || head.name?.trim() || FEE_HEAD_LABELS[code] || code;
    const category = newMeta?.category || head.category || categoryForCode(code);
    const isRefundable = newMeta?.isRefundable ?? head.isRefundable ?? false;

    const existing = await prisma.feeMaster.findFirst({
      where: { institutionId, code },
    });

    if (existing) {
      await prisma.feeMaster.update({
        where: { id: existing.id },
        data: {
          name,
          category,
          defaultAmount: head.amount,
          isRefundable: isRefundable || existing.isRefundable,
          status: FeeMasterStatus.ACTIVE,
        },
      });
      continue;
    }

    const count = await prisma.feeMaster.count({ where: { institutionId } });
    await prisma.feeMaster.create({
      data: {
        institutionId,
        code,
        name,
        category,
        defaultAmount: head.amount,
        isRefundable,
        displayOrder: count,
        status: FeeMasterStatus.ACTIVE,
        showInCollection: true,
        showInInvoice: true,
        showInPayment: true,
      },
    });
  }
}

export async function getFeeStructureHeadCatalog(institutionId: string) {
  const masters = await prisma.feeMaster.findMany({
    where: { institutionId, status: FeeMasterStatus.ACTIVE },
    orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
  });

  if (masters.length > 0) {
    return masters.map((m) => ({
      key: m.code,
      label: m.name,
      refundable: m.isRefundable,
      isStandard: STANDARD_STRUCTURE_COLUMN_KEYS.has(m.code),
      defaultAmount: round2(m.defaultAmount),
      showInCollection: m.showInCollection,
      showInInvoice: m.showInInvoice,
      showInPayment: m.showInPayment,
      masterId: m.id,
    }));
  }

  return FEE_STRUCTURE_HEAD_FIELDS.map((h) => ({
    key: h.key,
    label: h.label,
    refundable: h.refundable,
    isStandard: true,
    defaultAmount: 0,
    showInCollection: true,
    showInInvoice: true,
    showInPayment: true,
    masterId: '',
  }));
}

export function amountForHeadKey(
  row: Record<string, unknown>,
  extraHeads: Record<string, number>,
  key: string,
) {
  if (STANDARD_STRUCTURE_COLUMN_KEYS.has(key)) {
    return round2(Number(row[key]) || 0);
  }
  return round2(extraHeads[key] || 0);
}
