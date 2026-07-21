import { Router } from 'express';
import { z } from 'zod';
import { AdmissionRecordStatus, FeePaymentMode } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { getDefaultInstitutionId } from '../lib/institution.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import {
  FEE_HEAD_LABELS,
  PAYMENT_MODES,
  findFeeSchedule,
  generateReceiptNumber,
  loadFeeCollectionContext,
} from '../lib/feeConfig.js';

export const feeCollectionRouter = Router();
feeCollectionRouter.use(requireAuth);

const MODE_UI_TO_DB: Record<string, FeePaymentMode> = {
  Cash: FeePaymentMode.CASH,
  CASH: FeePaymentMode.CASH,
  UPI: FeePaymentMode.UPI,
  Card: FeePaymentMode.CARD,
  CARD: FeePaymentMode.CARD,
  Cheque: FeePaymentMode.CHEQUE,
  CHEQUE: FeePaymentMode.CHEQUE,
  'Bank Transfer': FeePaymentMode.BANK_TRANSFER,
  BANK_TRANSFER: FeePaymentMode.BANK_TRANSFER,
};

const MODE_DB_TO_UI: Record<FeePaymentMode, string> = {
  CASH: 'Cash',
  UPI: 'UPI',
  CARD: 'Card',
  CHEQUE: 'Cheque',
  BANK_TRANSFER: 'Bank Transfer',
};

function serializeReceipt(r: {
  id: string;
  receiptNumber: string;
  studentName: string;
  admissionNumber: string;
  className: string;
  sectionName: string;
  academicYear: string;
  paymentMode: FeePaymentMode;
  amountPaid: number;
  feeBreakdown: unknown;
  remarks: string;
  collectedBy: string;
  collectedAt: Date;
  institutionSnapshot: unknown;
  admissionRecordId: string | null;
}) {
  const breakdown = Array.isArray(r.feeBreakdown) ? r.feeBreakdown : [];
  const snapshot = (r.institutionSnapshot || {}) as Record<string, string>;
  return {
    id: r.id,
    receiptNumber: r.receiptNumber,
    admissionRecordId: r.admissionRecordId,
    studentName: r.studentName,
    admissionNumber: r.admissionNumber,
    className: r.className,
    sectionName: r.sectionName,
    academicYear: r.academicYear,
    paymentMode: MODE_DB_TO_UI[r.paymentMode],
    paymentModeKey: r.paymentMode,
    amountPaid: r.amountPaid,
    feeBreakdown: breakdown,
    remarks: r.remarks,
    collectedBy: r.collectedBy,
    collectedAt: r.collectedAt.toISOString(),
    institution: snapshot,
  };
}

feeCollectionRouter.get(
  '/meta',
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const ctx = await loadFeeCollectionContext(institutionId);

    const students = await prisma.admissionRecord.findMany({
      where: {
        institutionId,
        status: AdmissionRecordStatus.CONFIRMED,
      },
      include: {
        application: {
          select: {
            studentName: true,
            fatherName: true,
            mobile: true,
            email: true,
          },
        },
      },
      orderBy: [{ confirmedAt: 'desc' }],
    });

    const [totalReceipts, totalCollected] = await Promise.all([
      prisma.feeReceipt.count({ where: { institutionId } }),
      prisma.feeReceipt.aggregate({
        where: { institutionId },
        _sum: { amountPaid: true },
      }),
    ]);

    return res.json({
      institution: ctx.institutionProfile,
      currency: ctx.currency,
      feeConfigured: ctx.feeConfigured,
      schedules: ctx.schedules,
      feeHeadLabels: FEE_HEAD_LABELS,
      paymentModes: PAYMENT_MODES,
      students: students.map((s) => ({
        admissionRecordId: s.id,
        admissionNumber: s.admissionNumber || '',
        studentName: s.application.studentName,
        fatherName: s.application.fatherName,
        mobile: s.application.mobile,
        email: s.application.email,
        className: s.className,
        sectionName: s.sectionName,
        academicYear: s.academicYear,
      })),
      summary: {
        confirmedAdmissions: students.length,
        totalReceipts,
        totalCollected: totalCollected._sum.amountPaid ?? 0,
      },
      setupHint:
        'Configure fee amounts under Institution Setup → Fee Group Setup (Finance department).',
    });
  }),
);

feeCollectionRouter.get(
  '/schedule',
  asyncHandler(async (req, res) => {
    const className = String(req.query.className || '');
    const sectionName = String(req.query.sectionName || '');
    const institutionId = await getDefaultInstitutionId();
    const ctx = await loadFeeCollectionContext(institutionId);

    if (!ctx.feeConfigured) {
      return res.status(400).json({
        error: 'Fee structure not configured. Set up Fee Group in Institution Setup first.',
      });
    }

    const schedule = findFeeSchedule(ctx.schedules, className, sectionName);
    if (!schedule) {
      return res.status(404).json({
        error: `No fee schedule found for ${className} ${sectionName}. Add it in Institution Setup → Fee Group Setup.`,
      });
    }

    return res.json({ schedule, currency: ctx.currency });
  }),
);

feeCollectionRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const schema = z.object({
      q: z.string().optional(),
      from: z.string().optional(),
      to: z.string().optional(),
    });
    const parsed = schema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const institutionId = await getDefaultInstitutionId();
    const where: {
      institutionId: string;
      collectedAt?: { gte?: Date; lte?: Date };
      OR?: Array<Record<string, unknown>>;
    } = { institutionId };

    if (parsed.data.from) {
      const from = new Date(parsed.data.from);
      if (!Number.isNaN(from.getTime())) {
        where.collectedAt = { ...where.collectedAt, gte: from };
      }
    }
    if (parsed.data.to) {
      const to = new Date(parsed.data.to);
      if (!Number.isNaN(to.getTime())) {
        where.collectedAt = { ...where.collectedAt, lte: to };
      }
    }
    if (parsed.data.q) {
      where.OR = [
        { receiptNumber: { contains: parsed.data.q, mode: 'insensitive' } },
        { studentName: { contains: parsed.data.q, mode: 'insensitive' } },
        { admissionNumber: { contains: parsed.data.q, mode: 'insensitive' } },
      ];
    }

    const receipts = await prisma.feeReceipt.findMany({
      where,
      orderBy: { collectedAt: 'desc' },
      take: 100,
    });

    return res.json({
      receipts: receipts.map(serializeReceipt),
    });
  }),
);

feeCollectionRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const receipt = await prisma.feeReceipt.findFirst({
      where: { id: req.params.id, institutionId },
    });
    if (!receipt) return res.status(404).json({ error: 'Receipt not found' });
    return res.json({ receipt: serializeReceipt(receipt) });
  }),
);

feeCollectionRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const schema = z.object({
      admissionRecordId: z.string().min(1),
      paymentMode: z.string().min(1),
      feeItems: z
        .array(
          z.object({
            key: z.string(),
            label: z.string().optional(),
            amount: z.number().min(0),
          }),
        )
        .min(1),
      remarks: z.string().optional(),
      amountPaid: z.number().positive().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const institutionId = await getDefaultInstitutionId();
    const ctx = await loadFeeCollectionContext(institutionId);

    const admission = await prisma.admissionRecord.findFirst({
      where: {
        id: parsed.data.admissionRecordId,
        institutionId,
        status: AdmissionRecordStatus.CONFIRMED,
      },
      include: {
        application: {
          select: { studentName: true },
        },
      },
    });

    if (!admission) {
      return res.status(400).json({
        error: 'Student must have a confirmed admission before fee collection.',
      });
    }

    const feeBreakdown = parsed.data.feeItems
      .filter((f) => f.amount > 0)
      .map((f) => ({
        key: f.key,
        label: f.label || FEE_HEAD_LABELS[f.key] || f.key,
        amount: f.amount,
      }));

    if (feeBreakdown.length === 0) {
      return res.status(400).json({ error: 'Select at least one fee head with amount > 0' });
    }

    const computedTotal = feeBreakdown.reduce((s, f) => s + f.amount, 0);
    const amountPaid = parsed.data.amountPaid ?? computedTotal;
    if (Math.abs(amountPaid - computedTotal) > 0.01 && !parsed.data.amountPaid) {
      return res.status(400).json({ error: 'Invalid fee total' });
    }

    const paymentMode = MODE_UI_TO_DB[parsed.data.paymentMode] || FeePaymentMode.CASH;
    const receiptNumber = await generateReceiptNumber(institutionId);
    const collectedBy = req.user?.email || 'Cashier';

    const receipt = await prisma.feeReceipt.create({
      data: {
        institutionId,
        admissionRecordId: admission.id,
        receiptNumber,
        studentName: admission.application.studentName,
        admissionNumber: admission.admissionNumber || '',
        className: admission.className,
        sectionName: admission.sectionName,
        academicYear: admission.academicYear,
        paymentMode,
        amountPaid,
        feeBreakdown,
        remarks: parsed.data.remarks?.trim() || '',
        collectedBy,
        institutionSnapshot: ctx.institutionProfile,
      },
    });

    return res.status(201).json({
      receipt: serializeReceipt(receipt),
      message: `Fee collected. Receipt ${receiptNumber} generated.`,
    });
  }),
);
