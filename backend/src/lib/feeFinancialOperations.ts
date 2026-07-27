import type { Prisma } from '@prisma/client';
import { FeeMasterStatus } from '@prisma/client';
import { prisma } from './prisma.js';
import { getDefaultAcademicYear } from './academicSetupSync.js';
import { FEE_HEAD_LABELS, PAYMENT_MODES, parseFeeSchedulesFromSetup } from './feeConfig.js';
import { importFeeStructuresFromSetup } from './feeStructure.js';

type SetupSections = Record<string, Record<string, unknown>>;

const DEFAULT_FEE_GROUPS = [
  { code: 'TUITION', name: 'Annual Tuition' },
  { code: 'TRANSPORT', name: 'Transport Fee' },
  { code: 'HOSTEL', name: 'Hostel Fee' },
  { code: 'MISC', name: 'Miscellaneous Charges' },
];

const DEFAULT_PAYMENT_METHODS = [
  { code: 'CASH', name: 'Cash' },
  { code: 'UPI', name: 'UPI' },
  { code: 'CARD', name: 'Card / POS' },
  { code: 'CHEQUE', name: 'Cheque' },
  { code: 'BANK_TRANSFER', name: 'Bank Transfer' },
  { code: 'ONLINE', name: 'Online Portal' },
];

function readSetupSections(tile: unknown): SetupSections {
  if (!tile || typeof tile !== 'object') return {};
  return (tile as { sections?: SetupSections }).sections || {};
}

function readField(sections: SetupSections, sectionKeys: string | string[], key: string, fallback = '') {
  const keys = Array.isArray(sectionKeys) ? sectionKeys : [sectionKeys];
  for (const sectionKey of keys) {
    const val = sections[sectionKey]?.[key];
    if (val != null && String(val) !== '') return String(val);
  }
  return fallback;
}

function parseJsonArray(raw: string, fallback: unknown[] = []) {
  if (!raw.trim()) return fallback;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // fall through
  }
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

function maskSecret(value: string) {
  if (!value) return '';
  if (value.length <= 4) return '****';
  return `****${value.slice(-4)}`;
}

function slugCode(name: string) {
  return name.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 24) || 'FEE';
}

function parseLateFee(raw: string) {
  const trimmed = raw.trim();
  if (trimmed.endsWith('%')) {
    return { fineType: 'percent', fineAmount: 0, finePercent: Number(trimmed.replace('%', '')) || 0 };
  }
  const amount = Number(trimmed.replace(/[^0-9.]/g, '')) || 50;
  return { fineType: 'flat', fineAmount: amount, finePercent: 0 };
}

function buildInstallmentSchedule(count: number, scheduleType: string) {
  const items = [];
  const monthsPer = scheduleType.toLowerCase().includes('month') ? 1
    : scheduleType.toLowerCase().includes('bi') ? 6
      : scheduleType.toLowerCase().includes('quarter') ? 3 : 12 / Math.max(count, 1);
  const start = new Date();
  start.setDate(1);
  for (let i = 0; i < count; i++) {
    const due = new Date(start);
    due.setMonth(start.getMonth() + Math.round(i * monthsPer));
    items.push({ installment: i + 1, dueDate: due.toISOString().slice(0, 10), percent: Math.round((100 / count) * 100) / 100 });
  }
  return items;
}

export function loadFeeFinancialSetup(setup: {
  feeGroupSetup?: unknown;
  integrationSetup?: unknown;
  notificationSetup?: unknown;
} | null) {
  const fee = readSetupSections(setup?.feeGroupSetup);
  const integration = readSetupSections(setup?.integrationSetup);
  const notification = readSetupSections(setup?.notificationSetup);

  const defaultFeeTypes = readField(fee, ['Fee Type Setup', 'feeTypeSetup'], 'defaultFeeTypes');
  const feeTypes = defaultFeeTypes ? defaultFeeTypes.split(',').map((s) => s.trim()).filter(Boolean) : Object.values(FEE_HEAD_LABELS);

  const installmentCount = Number(readField(fee, ['Installment Setup', 'installmentSetup'], 'defaultInstallments', '4')) || 4;
  const scheduleType = readField(fee, ['Installment Setup', 'installmentSetup'], 'scheduleType', 'Quarterly');

  const lateRaw = readField(fee, ['Late Fee Configuration', 'lateFeeConfiguration'], 'lateFeeAmount', '50');
  const lateFee = parseLateFee(lateRaw);

  const enabledMethodsRaw = readField(fee, ['Fee Payment Methods', 'feePaymentMethods'], 'enabledMethods', 'Cash,UPI,Card,Cheque,Bank Transfer,Online');
  const enabledMethods = enabledMethodsRaw.split(',').map((s) => s.trim()).filter(Boolean);

  const refundApproval = readField(fee, ['Refund & Cancellation', 'refundCancellation'], 'requireApproval', 'Yes') === 'Yes';
  const refundLevels = readField(fee, ['Refund & Cancellation', 'refundCancellation'], 'approvalLevels', 'Accounts,Principal');

  const reminderChannels = readField(fee, ['Payment Reminders', 'paymentReminders'], 'channels', 'Email,SMS,WhatsApp');
  const daysBefore = readField(fee, ['Payment Reminders', 'paymentReminders'], 'daysBeforeDue', '7,3,1');
  const daysAfter = readField(fee, ['Payment Reminders', 'paymentReminders'], 'daysAfterDue', '1,7,15');

  return {
    currency: readField(fee, ['Fee Group Master', 'feeGroupMaster'], 'defaultCurrency', 'INR'),
    receiptFooter: readField(fee, ['Fee Group Master', 'feeGroupMaster'], 'receiptFooter'),
    feeTypes,
    installmentCount,
    scheduleType,
    scheduleJson: buildInstallmentSchedule(installmentCount, scheduleType),
    concession: {
      allowConcessions: readField(fee, ['Concession & Discount', 'concessionDiscount'], 'allowConcession', 'Yes') === 'Yes',
      maxDiscountPercent: Number(readField(fee, ['Concession & Discount', 'concessionDiscount'], 'maxDiscountPercent', '50')) || 50,
      approvalLevel: readField(fee, ['Concession & Discount', 'concessionDiscount'], 'approvalLevel', 'Principal'),
    },
    lateFee: {
      graceDays: Number(readField(fee, ['Late Fee Configuration', 'lateFeeConfiguration'], 'graceDays', '5')) || 5,
      ...lateFee,
    },
    paymentMethods: enabledMethods,
    onlinePayment: {
      provider: readField(integration, ['Payment Gateway', 'paymentGateway'], 'provider', 'Razorpay'),
      apiKey: readField(integration, ['Payment Gateway', 'paymentGateway'], 'apiKey'),
      apiSecret: readField(integration, ['Payment Gateway', 'paymentGateway'], 'apiSecret'),
      webhookUrl: readField(integration, ['API Integrations', 'apiIntegrations'], 'webhookUrl'),
      enabled: readField(integration, ['Payment Gateway', 'paymentGateway'], 'enabled', 'No') === 'Yes',
    },
    refundPolicy: {
      requireApproval: refundApproval,
      approvalLevels: parseJsonArray(refundLevels, ['Accounts', 'Principal']),
      autoCreditLedger: readField(fee, ['Refund & Cancellation', 'refundCancellation'], 'autoCreditLedger', 'Yes') === 'Yes',
    },
    reminders: {
      channels: parseJsonArray(reminderChannels, ['Email', 'SMS']),
      daysBeforeDue: parseJsonArray(daysBefore, [7, 3, 1]).map(Number),
      daysAfterDue: parseJsonArray(daysAfter, [1, 7, 15]).map(Number),
      cronSchedule: readField(fee, ['Payment Reminders', 'paymentReminders'], 'cronSchedule', '0 9 * * *'),
      isActive: readField(fee, ['Payment Reminders', 'paymentReminders'], 'remindersEnabled', 'Yes') === 'Yes',
    },
  };
}

async function logAudit(institutionId: string, category: string, action: string, details: string, userEmail = 'system') {
  await prisma.feeFinancialAuditLog.create({
    data: { institutionId, category, action, details, userEmail },
  });
}

async function syncFeeGroups(institutionId: string, academicYear: string, loaded: ReturnType<typeof loadFeeFinancialSetup>) {
  let created = 0;
  let updated = 0;
  const groups = [
    ...DEFAULT_FEE_GROUPS,
    ...loaded.feeTypes.map((name) => ({ code: slugCode(name), name: `${name} Group` })),
  ];
  const seen = new Set<string>();
  for (const g of groups) {
    if (seen.has(g.code)) continue;
    seen.add(g.code);
    const existing = await prisma.feeGroupMaster.findFirst({
      where: { institutionId, academicYear, groupCode: g.code },
    });
    if (existing) {
      await prisma.feeGroupMaster.update({
        where: { id: existing.id },
        data: { groupName: g.name, currency: loaded.currency, isActive: true },
      });
      updated += 1;
    } else {
      await prisma.feeGroupMaster.create({
        data: { institutionId, academicYear, groupCode: g.code, groupName: g.name, currency: loaded.currency },
      });
      created += 1;
    }
  }
  return { created, updated };
}

async function syncFeeTypes(institutionId: string, loaded: ReturnType<typeof loadFeeFinancialSetup>) {
  let created = 0;
  let updated = 0;
  const glPrefix = readField({}, [], 'glPrefix', '4100');

  for (const name of loaded.feeTypes) {
    const code = slugCode(name);
    const glAccount = `${glPrefix}-${code}`;
    const existing = await prisma.feeTypeConfig.findFirst({ where: { institutionId, code } });
    const masterExisting = await prisma.feeMaster.findFirst({ where: { institutionId, code } });

    const payload = {
      name,
      glAccount,
      category: name.toUpperCase(),
      isRefundable: name.toLowerCase().includes('deposit') || name.toLowerCase().includes('caution'),
      isActive: true,
    };

    if (existing) {
      await prisma.feeTypeConfig.update({ where: { id: existing.id }, data: payload });
      updated += 1;
    } else {
      await prisma.feeTypeConfig.create({ data: { institutionId, code, ...payload } });
      created += 1;
    }

    if (masterExisting) {
      await prisma.feeMaster.update({
        where: { id: masterExisting.id },
        data: { name, category: payload.category, isRefundable: payload.isRefundable, status: FeeMasterStatus.ACTIVE },
      });
    } else {
      await prisma.feeMaster.create({
        data: {
          institutionId,
          code,
          name,
          category: payload.category,
          isRefundable: payload.isRefundable,
          status: FeeMasterStatus.ACTIVE,
          schoolDetails: { glAccount } as Prisma.InputJsonValue,
        },
      });
    }
  }

  for (const [key, label] of Object.entries(FEE_HEAD_LABELS)) {
    const code = slugCode(key);
    const exists = await prisma.feeTypeConfig.findFirst({ where: { institutionId, code } });
    if (exists) continue;
    await prisma.feeTypeConfig.create({
      data: {
        institutionId,
        code,
        name: label,
        glAccount: `4100-${code}`,
        category: key,
        isRefundable: key.toLowerCase().includes('deposit') || key.toLowerCase().includes('caution'),
      },
    });
    created += 1;
  }

  return { created, updated };
}

async function syncPaymentMethods(institutionId: string, loaded: ReturnType<typeof loadFeeFinancialSetup>) {
  let created = 0;
  let updated = 0;
  const enabledSet = new Set(loaded.paymentMethods.map((m) => m.toLowerCase()));

  for (const method of DEFAULT_PAYMENT_METHODS) {
    const isEnabled = [...enabledSet].some((e) =>
      method.name.toLowerCase().includes(e) || method.code.toLowerCase().includes(e.replace(/\s+/g, '_').toLowerCase()),
    ) || enabledSet.size === 0;

    const existing = await prisma.feePaymentMethodConfig.findFirst({
      where: { institutionId, methodCode: method.code },
    });
    if (existing) {
      await prisma.feePaymentMethodConfig.update({
        where: { id: existing.id },
        data: { methodName: method.name, isEnabled },
      });
      updated += 1;
    } else {
      await prisma.feePaymentMethodConfig.create({
        data: { institutionId, methodCode: method.code, methodName: method.name, isEnabled },
      });
      created += 1;
    }
  }
  return { created, updated };
}

export async function syncFeeFinancialOperationsFromSetup(
  institutionId: string,
  academicYear?: string,
  actorEmail = 'system',
) {
  const year = academicYear || (await getDefaultAcademicYear(institutionId));
  const setup = await prisma.institutionSetup.findUnique({ where: { institutionId } });
  const loaded = loadFeeFinancialSetup(setup);

  const feeGroups = await syncFeeGroups(institutionId, year, loaded);
  const feeTypes = await syncFeeTypes(institutionId, loaded);

  const installment = await prisma.feeInstallmentRule.upsert({
    where: { institutionId_academicYear: { institutionId, academicYear: year } },
    create: {
      institutionId,
      academicYear: year,
      installmentCount: loaded.installmentCount,
      scheduleType: loaded.scheduleType,
      scheduleJson: loaded.scheduleJson as Prisma.InputJsonValue,
    },
    update: {
      installmentCount: loaded.installmentCount,
      scheduleType: loaded.scheduleType,
      scheduleJson: loaded.scheduleJson as Prisma.InputJsonValue,
    },
  });

  const concession = await prisma.feeConcessionPolicy.upsert({
    where: { institutionId_academicYear: { institutionId, academicYear: year } },
    create: {
      institutionId,
      academicYear: year,
      allowConcessions: loaded.concession.allowConcessions,
      maxDiscountPercent: loaded.concession.maxDiscountPercent,
      approvalLevel: loaded.concession.approvalLevel,
      discountRules: { maxPercent: loaded.concession.maxDiscountPercent } as Prisma.InputJsonValue,
    },
    update: {
      allowConcessions: loaded.concession.allowConcessions,
      maxDiscountPercent: loaded.concession.maxDiscountPercent,
      approvalLevel: loaded.concession.approvalLevel,
      discountRules: { maxPercent: loaded.concession.maxDiscountPercent } as Prisma.InputJsonValue,
    },
  });

  const lateFee = await prisma.feeLateFeeRule.upsert({
    where: { institutionId_academicYear: { institutionId, academicYear: year } },
    create: {
      institutionId,
      academicYear: year,
      graceDays: loaded.lateFee.graceDays,
      fineType: loaded.lateFee.fineType,
      fineAmount: loaded.lateFee.fineAmount,
      finePercent: loaded.lateFee.finePercent,
      isActive: true,
    },
    update: {
      graceDays: loaded.lateFee.graceDays,
      fineType: loaded.lateFee.fineType,
      fineAmount: loaded.lateFee.fineAmount,
      finePercent: loaded.lateFee.finePercent,
    },
  });

  const paymentMethods = await syncPaymentMethods(institutionId, loaded);

  const online = await prisma.feeOnlinePaymentSetting.upsert({
    where: { institutionId },
    create: {
      institutionId,
      provider: loaded.onlinePayment.provider,
      apiKeyMasked: maskSecret(loaded.onlinePayment.apiKey),
      apiSecretStored: loaded.onlinePayment.apiSecret,
      webhookUrl: loaded.onlinePayment.webhookUrl,
      isEnabled: loaded.onlinePayment.enabled,
      testMode: true,
    },
    update: {
      provider: loaded.onlinePayment.provider,
      apiKeyMasked: maskSecret(loaded.onlinePayment.apiKey),
      ...(loaded.onlinePayment.apiSecret ? { apiSecretStored: loaded.onlinePayment.apiSecret } : {}),
      webhookUrl: loaded.onlinePayment.webhookUrl,
      isEnabled: loaded.onlinePayment.enabled,
    },
  });

  const refund = await prisma.feeRefundPolicy.upsert({
    where: { institutionId_academicYear: { institutionId, academicYear: year } },
    create: {
      institutionId,
      academicYear: year,
      requireApproval: loaded.refundPolicy.requireApproval,
      approvalLevels: loaded.refundPolicy.approvalLevels as Prisma.InputJsonValue,
      autoCreditLedger: loaded.refundPolicy.autoCreditLedger,
    },
    update: {
      requireApproval: loaded.refundPolicy.requireApproval,
      approvalLevels: loaded.refundPolicy.approvalLevels as Prisma.InputJsonValue,
      autoCreditLedger: loaded.refundPolicy.autoCreditLedger,
    },
  });

  const reminders = await prisma.feePaymentReminderRule.upsert({
    where: { institutionId_academicYear: { institutionId, academicYear: year } },
    create: {
      institutionId,
      academicYear: year,
      channels: loaded.reminders.channels as Prisma.InputJsonValue,
      daysBeforeDue: loaded.reminders.daysBeforeDue as Prisma.InputJsonValue,
      daysAfterDue: loaded.reminders.daysAfterDue as Prisma.InputJsonValue,
      cronSchedule: loaded.reminders.cronSchedule,
      isActive: loaded.reminders.isActive,
    },
    update: {
      channels: loaded.reminders.channels as Prisma.InputJsonValue,
      daysBeforeDue: loaded.reminders.daysBeforeDue as Prisma.InputJsonValue,
      daysAfterDue: loaded.reminders.daysAfterDue as Prisma.InputJsonValue,
      cronSchedule: loaded.reminders.cronSchedule,
      isActive: loaded.reminders.isActive,
    },
  });

  const structures = await importFeeStructuresFromSetup(institutionId, year, actorEmail);

  await logAudit(
    institutionId,
    'FEE_FINANCIAL_OPS',
    'SYNC_FROM_SETUP',
    `Synced fee financial operations for ${year}. Groups +${feeGroups.created}/~${feeGroups.updated}, types +${feeTypes.created}/~${feeTypes.updated}`,
    actorEmail,
  );

  return {
    academicYear: year,
    feeGroups,
    feeTypes,
    installment,
    concession,
    lateFee,
    paymentMethods,
    onlinePayment: { ...online, apiSecretStored: undefined },
    refund,
    reminders,
    feeStructures: structures,
    loaded,
  };
}

export async function getFeeFinancialOperations(institutionId: string, academicYear?: string) {
  const year = academicYear || (await getDefaultAcademicYear(institutionId));

  let [
    feeGroups,
    feeTypes,
    installment,
    concession,
    lateFee,
    paymentMethods,
    onlinePayment,
    refund,
    reminders,
    auditLogs,
  ] = await Promise.all([
    prisma.feeGroupMaster.findMany({ where: { institutionId, academicYear: year } }),
    prisma.feeTypeConfig.findMany({ where: { institutionId, isActive: true } }),
    prisma.feeInstallmentRule.findUnique({ where: { institutionId_academicYear: { institutionId, academicYear: year } } }),
    prisma.feeConcessionPolicy.findUnique({ where: { institutionId_academicYear: { institutionId, academicYear: year } } }),
    prisma.feeLateFeeRule.findUnique({ where: { institutionId_academicYear: { institutionId, academicYear: year } } }),
    prisma.feePaymentMethodConfig.findMany({ where: { institutionId } }),
    prisma.feeOnlinePaymentSetting.findUnique({ where: { institutionId } }),
    prisma.feeRefundPolicy.findUnique({ where: { institutionId_academicYear: { institutionId, academicYear: year } } }),
    prisma.feePaymentReminderRule.findUnique({ where: { institutionId_academicYear: { institutionId, academicYear: year } } }),
    prisma.feeFinancialAuditLog.findMany({ where: { institutionId }, orderBy: { createdAt: 'desc' }, take: 20 }),
  ]);

  if (!installment) {
    await syncFeeFinancialOperationsFromSetup(institutionId, year);
    return getFeeFinancialOperations(institutionId, year);
  }

  const setup = await prisma.institutionSetup.findUnique({ where: { institutionId } });
  const schedules = parseFeeSchedulesFromSetup(setup?.feeGroupSetup);

  return {
    academicYear: year,
    feeGroups,
    feeTypes,
    installment,
    concession,
    lateFee,
    paymentMethods,
    onlinePayment: onlinePayment
      ? { ...onlinePayment, apiSecretStored: undefined, webhookSecretStored: undefined }
      : null,
    refund,
    reminders,
    auditLogs,
    schedulesCount: schedules.length,
    enabledPaymentMethods: paymentMethods.filter((m) => m.isEnabled),
    defaultPaymentModes: PAYMENT_MODES,
  };
}

export async function getEnabledPaymentModes(institutionId: string) {
  const methods = await prisma.feePaymentMethodConfig.findMany({
    where: { institutionId, isEnabled: true },
    orderBy: { methodCode: 'asc' },
  });
  if (!methods.length) return PAYMENT_MODES;
  return methods.map((m) => ({ key: m.methodCode, label: m.methodName }));
}

export async function validateConcessionRequest(institutionId: string, academicYear: string, discountPercent: number) {
  const policy = await prisma.feeConcessionPolicy.findUnique({
    where: { institutionId_academicYear: { institutionId, academicYear } },
  });
  if (!policy?.allowConcessions) {
    return { valid: false, message: 'Concessions are disabled by institution policy' };
  }
  if (discountPercent > policy.maxDiscountPercent) {
    return { valid: false, message: `Discount exceeds maximum allowed ${policy.maxDiscountPercent}%` };
  }
  return { valid: true, approvalLevel: policy.approvalLevel };
}

export function calculateLateFee(
  outstanding: number,
  daysOverdue: number,
  rule: { graceDays: number; fineType: string; fineAmount: number; finePercent: number },
) {
  if (daysOverdue <= rule.graceDays) return 0;
  const chargeableDays = daysOverdue - rule.graceDays;
  if (rule.fineType === 'percent') {
    return Math.round((outstanding * rule.finePercent) / 100);
  }
  if (rule.fineType === 'daily') {
    return Math.round(rule.fineAmount * chargeableDays);
  }
  return Math.round(rule.fineAmount);
}

export async function onFeeFinancialTileSaved(institutionId: string, tileKey: string, actorEmail = 'system') {
  if (tileKey === 'feeGroupSetup' || tileKey === 'integrationSetup' || tileKey === 'notificationSetup') {
    return { feeFinancialOps: await syncFeeFinancialOperationsFromSetup(institutionId, undefined, actorEmail) };
  }
  return null;
}
