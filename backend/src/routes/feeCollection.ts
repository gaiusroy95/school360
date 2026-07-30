import { Router } from 'express';
import { z } from 'zod';
import { AdmissionRecordStatus, FeePaymentMode, StudentStatus } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { getDefaultInstitutionId } from '../lib/institution.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import {
  FEE_HEAD_LABELS,
  PAYMENT_MODES,
  generateReceiptNumber,
  loadFeeCollectionContext,
  resolveCollectionFeeSchedule,
} from '../lib/feeConfig.js';
import {
  ensurePendingFeeInvoiceForStudent,
  generateInvoiceFromReceipt,
} from '../lib/feeFinanceModules.js';

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

function studentDisplayName(firstName: string, lastName: string) {
  return `${firstName} ${lastName}`.trim();
}

feeCollectionRouter.get(
  '/meta',
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const ctx = await loadFeeCollectionContext(institutionId);

    const [activeStudents, confirmedAdmissions, totalReceipts, totalCollected] = await Promise.all([
      prisma.student.findMany({
        where: { institutionId, status: StudentStatus.ACTIVE },
        orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
      }),
      prisma.admissionRecord.findMany({
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
      }),
      prisma.feeReceipt.count({ where: { institutionId } }),
      prisma.feeReceipt.aggregate({
        where: { institutionId },
        _sum: { amountPaid: true },
      }),
    ]);

    const linkedAdmissionIds = new Set(
      activeStudents.map((s) => s.admissionRecordId).filter(Boolean) as string[],
    );

    const studentRows = await Promise.all(
      activeStudents.map(async (s) => {
        const schedule = await resolveCollectionFeeSchedule(institutionId, {
          className: s.className,
          sectionName: s.sectionName,
          studentId: s.id,
          academicYear: s.academicYear,
        });
        let pendingInvoice = null;
        if (schedule?.heads.length) {
          pendingInvoice = await ensurePendingFeeInvoiceForStudent(institutionId, s);
        }
        return {
          studentId: s.id,
          admissionRecordId: s.admissionRecordId || '',
          admissionNumber: s.admissionNumber,
          studentName: studentDisplayName(s.firstName, s.lastName),
          fatherName: s.fatherName,
          mobile: s.mobile || s.fatherMobile,
          email: s.email,
          className: s.className,
          sectionName: s.sectionName,
          academicYear: s.academicYear,
          hasFeeSchedule: Boolean(schedule?.heads.length),
          pendingInvoiceId: pendingInvoice?.id || null,
          pendingInvoiceNumber: pendingInvoice?.invoiceNumber || null,
        };
      }),
    );

    const admissionOnlyRows = confirmedAdmissions
      .filter((a) => !linkedAdmissionIds.has(a.id))
      .map((s) => ({
        studentId: '',
        admissionRecordId: s.id,
        admissionNumber: s.admissionNumber || '',
        studentName: s.application.studentName,
        fatherName: s.application.fatherName,
        mobile: s.application.mobile,
        email: s.application.email,
        className: s.className,
        sectionName: s.sectionName,
        academicYear: s.academicYear,
        hasFeeSchedule: false,
        pendingInvoiceId: null as string | null,
        pendingInvoiceNumber: null as string | null,
      }));

    const students = [...studentRows, ...admissionOnlyRows];

    return res.json({
      institution: ctx.institutionProfile,
      currency: ctx.currency,
      feeConfigured: ctx.feeConfigured,
      schedules: ctx.schedules,
      feeHeadLabels: FEE_HEAD_LABELS,
      paymentModes: PAYMENT_MODES,
      students,
      summary: {
        activeStudents: activeStudents.length,
        confirmedAdmissions: confirmedAdmissions.length,
        totalReceipts,
        totalCollected: totalCollected._sum.amountPaid ?? 0,
      },
      setupHint:
        'Configure fee amounts under Institution Setup → Fee Group Setup or Fees & Finance → Fee Structure.',
    });
  }),
);

feeCollectionRouter.get(
  '/schedule',
  asyncHandler(async (req, res) => {
    const className = String(req.query.className || '');
    const sectionName = String(req.query.sectionName || '');
    const studentId = String(req.query.studentId || '');
    const academicYear = String(req.query.academicYear || '2025-26');
    const institutionId = await getDefaultInstitutionId();

    const schedule = await resolveCollectionFeeSchedule(institutionId, {
      className,
      sectionName,
      studentId: studentId || undefined,
      academicYear,
    });

    if (!schedule) {
      return res.status(404).json({
        error: `No fee schedule found for class "${className}"${sectionName ? ` section "${sectionName}"` : ''}. Configure fees in Institution Setup → Fee Group Setup or Fees & Finance → Fee Structure.`,
      });
    }

    if (schedule.heads.length === 0) {
      return res.status(404).json({
        error: `Fee row exists for ${schedule.class}-${schedule.section} but no fee amounts are set.`,
        schedule,
      });
    }

    let pendingInvoice = null;
    if (studentId) {
      const student = await prisma.student.findFirst({
        where: { id: studentId, institutionId },
      });
      if (student) {
        pendingInvoice = await ensurePendingFeeInvoiceForStudent(institutionId, student);
      }
    }

    const ctx = await loadFeeCollectionContext(institutionId);
    return res.json({
      schedule,
      currency: ctx.currency,
      source: schedule.source,
      pendingInvoice,
    });
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

type CollectionTarget = {
  admissionRecordId: string | null;
  studentName: string;
  admissionNumber: string;
  className: string;
  sectionName: string;
  academicYear: string;
};

async function resolveCollectionTarget(
  institutionId: string,
  opts: { studentId?: string; admissionRecordId?: string },
): Promise<CollectionTarget | null> {
  if (opts.studentId) {
    const student = await prisma.student.findFirst({
      where: { id: opts.studentId, institutionId, status: StudentStatus.ACTIVE },
    });
    if (!student) return null;
    return {
      admissionRecordId: student.admissionRecordId,
      studentName: studentDisplayName(student.firstName, student.lastName),
      admissionNumber: student.admissionNumber,
      className: student.className,
      sectionName: student.sectionName,
      academicYear: student.academicYear,
    };
  }

  if (opts.admissionRecordId) {
    const admission = await prisma.admissionRecord.findFirst({
      where: {
        id: opts.admissionRecordId,
        institutionId,
        status: AdmissionRecordStatus.CONFIRMED,
      },
      include: { application: { select: { studentName: true } } },
    });
    if (!admission) return null;
    return {
      admissionRecordId: admission.id,
      studentName: admission.application.studentName,
      admissionNumber: admission.admissionNumber || '',
      className: admission.className,
      sectionName: admission.sectionName,
      academicYear: admission.academicYear,
    };
  }

  return null;
}

feeCollectionRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const schema = z
      .object({
        studentId: z.string().optional(),
        admissionRecordId: z.string().optional(),
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
      })
      .refine((d) => Boolean(d.studentId || d.admissionRecordId), {
        message: 'studentId or admissionRecordId is required',
      });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const institutionId = await getDefaultInstitutionId();
    const ctx = await loadFeeCollectionContext(institutionId);

    const target = await resolveCollectionTarget(institutionId, {
      studentId: parsed.data.studentId,
      admissionRecordId: parsed.data.admissionRecordId,
    });

    if (!target) {
      return res.status(400).json({
        error: parsed.data.studentId
          ? 'Active student not found.'
          : 'Student must have a confirmed admission before fee collection.',
      });
    }

    if (parsed.data.studentId) {
      const student = await prisma.student.findFirst({
        where: { id: parsed.data.studentId, institutionId },
      });
      if (student) {
        await ensurePendingFeeInvoiceForStudent(institutionId, student);
      }
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
        admissionRecordId: target.admissionRecordId,
        receiptNumber,
        studentName: target.studentName,
        admissionNumber: target.admissionNumber,
        className: target.className,
        sectionName: target.sectionName,
        academicYear: target.academicYear,
        paymentMode,
        amountPaid,
        feeBreakdown,
        remarks: parsed.data.remarks?.trim() || '',
        collectedBy,
        institutionSnapshot: ctx.institutionProfile,
      },
    });

    const invoice = await generateInvoiceFromReceipt(institutionId, receipt.id, {
      preparedBy: collectedBy,
    });

    return res.status(201).json({
      receipt: serializeReceipt(receipt),
      invoice,
      message: `Fee collected. Receipt ${receiptNumber} generated and synced to Finance Invoices.`,
    });
  }),
);
