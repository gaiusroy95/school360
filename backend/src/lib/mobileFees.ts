import { FeeDueStatus, FeePaymentMode } from '@prisma/client';
import { prisma } from './prisma.js';
import { FEE_HEAD_LABELS, findFeeSchedule, loadFeeCollectionContext, generateReceiptNumber } from './feeConfig.js';
import type { MobileAuthUser } from './mobileAuth.js';
import { resolveStudentId } from './mobileScope.js';
import { createRazorpayOrder, isRazorpayConfigured, verifyRazorpayPaymentSignature } from './razorpay.js';

export async function getMobileFeesSummary(
  user: MobileAuthUser,
  opts: { studentId?: string; academicYear?: string },
) {
  const studentId = resolveStudentId(user, opts.studentId);
  const student = await prisma.student.findFirst({
    where: { id: studentId, institutionId: user.institutionId },
  });
  if (!student) throw new Error('Student not found');

  const academicYear = opts.academicYear || student.academicYear;

  let dues = await prisma.feeDue.findMany({
    where: { institutionId: user.institutionId, studentId, academicYear },
    orderBy: { dueDate: 'asc' },
  });

  if (dues.length === 0) {
    const { schedules } = await loadFeeCollectionContext(user.institutionId);
    const schedule = findFeeSchedule(schedules, student.className, student.sectionName);
    if (schedule && schedule.total > 0) {
      const dueDate = new Date();
      dueDate.setUTCMonth(dueDate.getUTCMonth() + 1);
      const created = await prisma.feeDue.create({
        data: {
          institutionId: user.institutionId,
          studentId,
          admissionNumber: student.admissionNumber,
          academicYear,
          title: `${schedule.class} ${schedule.section} — Term Fee`,
          feeHead: 'tuitionFee',
          amount: schedule.total,
          dueDate,
          status: FeeDueStatus.PENDING,
          remarks: 'Generated from institution fee schedule',
        },
      });
      dues = [created];
    }
  }

  const receipts = await prisma.feeReceipt.findMany({
    where: {
      institutionId: user.institutionId,
      admissionNumber: student.admissionNumber,
      academicYear,
    },
    orderBy: { collectedAt: 'desc' },
    take: 20,
  });

  const pendingAmount = dues
    .filter((d) => d.status === FeeDueStatus.PENDING || d.status === FeeDueStatus.OVERDUE)
    .reduce((sum, d) => sum + d.amount, 0);
  const paidAmount = receipts.reduce((sum, r) => sum + r.amountPaid, 0);

  return {
    studentId,
    admissionNumber: student.admissionNumber,
    academicYear,
    paymentsEnabled: isRazorpayConfigured(),
    summary: {
      pendingAmount,
      paidAmount,
      currency: 'INR',
    },
    dues: dues.map((d) => ({
      id: d.id,
      title: d.title,
      feeHead: d.feeHead,
      feeHeadLabel: FEE_HEAD_LABELS[d.feeHead] || d.feeHead,
      amount: d.amount,
      dueDate: d.dueDate.toISOString().slice(0, 10),
      status: d.status,
    })),
    receipts: receipts.map((r) => ({
      id: r.id,
      receiptNumber: r.receiptNumber,
      amountPaid: r.amountPaid,
      paymentMode: r.paymentMode,
      collectedAt: r.collectedAt.toISOString(),
    })),
  };
}

export async function createFeePaymentOrder(user: MobileAuthUser, feeDueId: string) {
  if (user.role === 'STUDENT') {
    throw new Error('Fee payments must be initiated by a parent account');
  }

  const due = await prisma.feeDue.findFirst({
    where: { id: feeDueId, institutionId: user.institutionId },
  });
  if (!due) throw new Error('Fee due not found');
  if (due.status === FeeDueStatus.PAID) throw new Error('This fee is already paid');

  resolveStudentId(user, due.studentId);

  const order = await prisma.paymentOrder.create({
    data: {
      institutionId: user.institutionId,
      feeDueId: due.id,
      accountId: user.accountId,
      amount: due.amount,
      status: 'CREATED',
      provider: 'RAZORPAY',
    },
  });

  if (!isRazorpayConfigured()) {
    await prisma.paymentOrder.update({
      where: { id: order.id },
      data: { providerOrderId: `stub_${order.id}` },
    });

    return {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      provider: order.provider,
      razorpayKeyId: null,
      providerOrderId: `stub_${order.id}`,
      stub: true,
      message:
        'Payment gateway is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET on the server.',
    };
  }

  const razorpayOrder = await createRazorpayOrder({
    amountInr: due.amount,
    receipt: order.id,
    notes: {
      feeDueId: due.id,
      studentId: due.studentId,
      institutionId: user.institutionId,
    },
  });

  await prisma.paymentOrder.update({
    where: { id: order.id },
    data: { providerOrderId: razorpayOrder.id },
  });

  return {
    orderId: order.id,
    amount: order.amount,
    amountPaise: razorpayOrder.amount,
    currency: razorpayOrder.currency,
    provider: order.provider,
    razorpayKeyId: process.env.RAZORPAY_KEY_ID,
    providerOrderId: razorpayOrder.id,
    stub: false,
  };
}

async function markFeeDuePaid(
  institutionId: string,
  feeDueId: string,
  paymentOrderId: string,
  providerPaymentId: string,
) {
  const due = await prisma.feeDue.findFirst({ where: { id: feeDueId, institutionId } });
  if (!due || due.status === FeeDueStatus.PAID) return null;

  const student = await prisma.student.findUnique({ where: { id: due.studentId } });
  if (!student) throw new Error('Student not found');

  await prisma.$transaction([
    prisma.feeDue.update({
      where: { id: feeDueId },
      data: { status: FeeDueStatus.PAID },
    }),
    prisma.paymentOrder.update({
      where: { id: paymentOrderId },
      data: { status: 'PAID', providerPaymentId },
    }),
    prisma.feeReceipt.create({
      data: {
        institutionId,
        receiptNumber: await generateReceiptNumber(institutionId),
        studentName: [student.firstName, student.lastName].filter(Boolean).join(' '),
        admissionNumber: student.admissionNumber,
        className: student.className,
        sectionName: student.sectionName,
        academicYear: due.academicYear,
        paymentMode: FeePaymentMode.UPI,
        amountPaid: due.amount,
        feeBreakdown: { [due.feeHead]: due.amount },
        remarks: `Online payment ${providerPaymentId}`,
        collectedBy: 'Razorpay',
      },
    }),
  ]);

  return due;
}

export async function verifyMobileFeePayment(
  user: MobileAuthUser,
  input: {
    orderId: string;
    razorpayPaymentId: string;
    razorpayOrderId: string;
    razorpaySignature: string;
  },
) {
  const order = await prisma.paymentOrder.findFirst({
    where: { id: input.orderId, institutionId: user.institutionId, accountId: user.accountId },
  });
  if (!order) throw new Error('Payment order not found');

  if (order.status === 'PAID') {
    return { ok: true, alreadyPaid: true };
  }

  if (!verifyRazorpayPaymentSignature({
    orderId: input.razorpayOrderId,
    paymentId: input.razorpayPaymentId,
    signature: input.razorpaySignature,
  })) {
    throw new Error('Invalid payment signature');
  }

  const due = await markFeeDuePaid(
    user.institutionId,
    order.feeDueId,
    order.id,
    input.razorpayPaymentId,
  );

  return { ok: true, feeDueId: due?.id ?? order.feeDueId };
}

export async function handleRazorpayWebhook(rawBody: string, signature: string) {
  const { verifyRazorpayWebhookSignature } = await import('./razorpay.js');
  if (!verifyRazorpayWebhookSignature(rawBody, signature)) {
    throw new Error('Invalid webhook signature');
  }

  const payload = JSON.parse(rawBody) as {
    event?: string;
    payload?: {
      payment?: { entity?: { id?: string; order_id?: string; status?: string } };
    };
  };

  if (payload.event !== 'payment.captured') {
    return { handled: false, event: payload.event };
  }

  const payment = payload.payload?.payment?.entity;
  if (!payment?.order_id || !payment.id) {
    return { handled: false, reason: 'missing_payment_entity' };
  }

  const order = await prisma.paymentOrder.findFirst({
    where: { providerOrderId: payment.order_id },
  });
  if (!order) return { handled: false, reason: 'order_not_found' };

  await markFeeDuePaid(order.institutionId, order.feeDueId, order.id, payment.id);

  return { handled: true, orderId: order.id };
}
