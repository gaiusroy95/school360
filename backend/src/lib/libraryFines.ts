import { prisma } from './prisma.js';
import { seedStockVerification } from './libraryStockVerification.js';

const ACADEMIC_YEARS = ['2023-24', '2024-25', '2025-26', '2026-27'];

function formatInr(amount: number) {
  return `₹ ${Math.round(amount).toLocaleString('en-IN')}`;
}

function todayDate() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function monthStart() {
  const d = todayDate();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

async function logActivity(institutionId: string, action: string, details: string, entityId = '') {
  await prisma.libActivityLog.create({
    data: { institutionId, entityType: 'LibFine', entityId, action, details, performedBy: 'Librarian' },
  });
}

async function ensureSettings(institutionId: string) {
  let row = await prisma.libSettings.findUnique({ where: { institutionId } });
  if (!row) {
    row = await prisma.libSettings.create({
      data: { institutionId, librarianWaiverThreshold: 100, unpaidFineThreshold: 100 },
    });
  }
  return row;
}

async function nextFineRef(institutionId: string) {
  const count = await prisma.libFine.count({ where: { institutionId } });
  return `FIN-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
}

async function nextReceiptNo(institutionId: string) {
  const count = await prisma.libFinePayment.count({ where: { institutionId } });
  return `REC-LIB-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
}

async function nextTxnRef(institutionId: string) {
  const count = await prisma.libFinePayment.count({ where: { institutionId } });
  return `TXN-LIB-${Date.now()}-${String(count + 1).padStart(4, '0')}`;
}

export async function getMemberOutstanding(institutionId: string, memberId: string) {
  const [fines, legacy] = await Promise.all([
    prisma.libFine.aggregate({
      where: { institutionId, memberId, status: { in: ['PENDING', 'PARTIAL'] } },
      _sum: { balance: true },
    }),
    prisma.libFineLedger.aggregate({
      where: { institutionId, memberId, status: 'PENDING' },
      _sum: { amount: true },
    }),
  ]);
  return (fines._sum.balance ?? 0) + (legacy._sum.amount ?? 0);
}

function mapFineRow(f: {
  id: string;
  transactionRef: string;
  fineType: string;
  amount: number;
  paidAmount: number;
  waivedAmount: number;
  balance: number;
  fineDate: Date;
  status: string;
  description: string;
  academicYear: string;
  member?: { memberCode: string; memberName: string; className: string; sectionName: string };
  issue?: { accessionNo: string; book?: { title: string } } | null;
}) {
  return {
    id: f.id,
    transactionRef: f.transactionRef,
    fineType: f.fineType,
    amount: f.amount,
    paidAmount: f.paidAmount,
    waivedAmount: f.waivedAmount,
    balance: f.balance,
    amountFormatted: formatInr(f.amount),
    balanceFormatted: formatInr(f.balance),
    fineDate: f.fineDate.toISOString().slice(0, 10),
    status: f.status,
    description: f.description,
    academicYear: f.academicYear,
    memberCode: f.member?.memberCode ?? '',
    memberName: f.member?.memberName ?? '',
    memberClass: f.member ? `${f.member.className}${f.member.sectionName ? `-${f.member.sectionName}` : ''}` : '',
    bookTitle: f.issue?.book?.title ?? '',
    accessionNo: f.issue?.accessionNo ?? '',
  };
}

export async function getFineManagement(institutionId: string, memberId?: string) {
  const settings = await ensureSettings(institutionId);
  const startOfMonth = monthStart();
  const today = todayDate();

  const [
    members,
    fines,
    payments,
    waivers,
    collectedMonth,
    pendingAgg,
    defaulters,
  ] = await Promise.all([
    prisma.libMember.findMany({
      where: { institutionId, status: 'ACTIVE' },
      orderBy: { memberName: 'asc' },
      take: 200,
    }),
    prisma.libFine.findMany({
      where: {
        institutionId,
        ...(memberId ? { memberId } : {}),
      },
      include: {
        member: true,
        issue: { include: { book: { select: { title: true } } } },
      },
      orderBy: { fineDate: 'desc' },
      take: memberId ? 100 : 50,
    }),
    prisma.libFinePayment.findMany({
      where: { institutionId, status: 'SUCCESS', paidAt: { gte: startOfMonth } },
      include: { member: true, fine: true },
      orderBy: { paidAt: 'desc' },
      take: 30,
    }),
    prisma.libFineWaiver.findMany({
      where: { institutionId },
      include: { member: true, fine: true },
      orderBy: { createdAt: 'desc' },
      take: 30,
    }),
    prisma.libFinePayment.aggregate({
      where: { institutionId, status: 'SUCCESS', paidAt: { gte: startOfMonth } },
      _sum: { amount: true },
    }),
    prisma.libFine.aggregate({
      where: { institutionId, status: { in: ['PENDING', 'PARTIAL'] } },
      _sum: { balance: true },
      _count: true,
    }),
    prisma.libFine.groupBy({
      by: ['memberId'],
      where: { institutionId, status: { in: ['PENDING', 'PARTIAL'] }, balance: { gt: 0 } },
      _sum: { balance: true },
      orderBy: { _sum: { balance: 'desc' } },
      take: 20,
    }),
  ]);

  const defaulterMembers = await prisma.libMember.findMany({
    where: { institutionId, id: { in: defaulters.map((d) => d.memberId) } },
  });
  const defaulterMap = new Map(defaulters.map((d) => [d.memberId, d._sum.balance ?? 0]));

  const dailyCollection = await prisma.libFinePayment.findMany({
    where: { institutionId, status: 'SUCCESS', paidAt: { gte: today } },
    include: { member: true },
    orderBy: { paidAt: 'desc' },
  });

  const waivedMonth = waivers
    .filter((w) => w.status === 'APPROVED' && w.approvedAt && w.approvedAt >= startOfMonth)
    .reduce((s, w) => s + w.waiverAmount, 0);

  let memberLedger = null;
  if (memberId) {
    const member = members.find((m) => m.id === memberId)
      ?? await prisma.libMember.findFirst({ where: { institutionId, id: memberId } });
    if (member) {
      const memberFines = fines.filter((f) => f.memberId === memberId);
      const memberPayments = await prisma.libFinePayment.findMany({
        where: { institutionId, memberId },
        orderBy: { paidAt: 'desc' },
        take: 20,
      });
      const outstanding = await getMemberOutstanding(institutionId, memberId);
      memberLedger = {
        member: {
          id: member.id,
          code: member.memberCode,
          name: member.memberName,
          className: `${member.className}${member.sectionName ? `-${member.sectionName}` : ''}`,
          mobile: member.mobile,
          email: member.email,
        },
        outstanding,
        outstandingFormatted: formatInr(outstanding),
        canIssue: outstanding < settings.unpaidFineThreshold,
        noDuesBlocked: outstanding > 0,
        fines: memberFines.map(mapFineRow),
        payments: memberPayments.map((p) => ({
          id: p.id,
          transactionRef: p.transactionRef,
          receiptNo: p.receiptNo,
          amount: p.amount,
          amountFormatted: formatInr(p.amount),
          paymentMethod: p.paymentMethod,
          paidAt: p.paidAt.toISOString(),
          collectedBy: p.collectedBy,
        })),
      };
    }
  }

  return {
    academicYears: ACADEMIC_YEARS,
    settings: {
      finePerDay: settings.finePerDay,
      unpaidFineThreshold: settings.unpaidFineThreshold,
      librarianWaiverThreshold: settings.librarianWaiverThreshold,
    },
    kpis: {
      collectedThisMonth: collectedMonth._sum.amount ?? 0,
      collectedThisMonthFormatted: formatInr(collectedMonth._sum.amount ?? 0),
      pendingTotal: pendingAgg._sum.balance ?? 0,
      pendingTotalFormatted: formatInr(pendingAgg._sum.balance ?? 0),
      pendingFinesCount: pendingAgg._count,
      defaultersCount: defaulters.length,
      waivedThisMonth: waivedMonth,
      waivedThisMonthFormatted: formatInr(waivedMonth),
      todayCollection: dailyCollection.reduce((s, p) => s + p.amount, 0),
      todayCollectionFormatted: formatInr(dailyCollection.reduce((s, p) => s + p.amount, 0)),
    },
    members: members.map((m) => ({
      id: m.id,
      code: m.memberCode,
      name: m.memberName,
      className: `${m.className}${m.sectionName ? `-${m.sectionName}` : ''}`,
    })),
    fines: fines.map(mapFineRow),
    memberLedger,
    dailyCollectionRegister: dailyCollection.map((p) => ({
      id: p.id,
      receiptNo: p.receiptNo,
      transactionRef: p.transactionRef,
      memberName: p.member.memberName,
      memberCode: p.member.memberCode,
      amount: p.amount,
      amountFormatted: formatInr(p.amount),
      paymentMethod: p.paymentMethod,
      time: p.paidAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      collectedBy: p.collectedBy,
    })),
    defaultersList: defaulterMembers.map((m) => ({
      memberId: m.id,
      memberCode: m.memberCode,
      memberName: m.memberName,
      className: `${m.className}${m.sectionName ? `-${m.sectionName}` : ''}`,
      outstanding: defaulterMap.get(m.id) ?? 0,
      outstandingFormatted: formatInr(defaulterMap.get(m.id) ?? 0),
      mobile: m.mobile,
    })),
    waivedFinesReport: waivers
      .filter((w) => w.status === 'APPROVED')
      .map((w) => ({
        id: w.id,
        memberName: w.member.memberName,
        memberCode: w.member.memberCode,
        fineType: w.fine.fineType,
        waiverAmount: w.waiverAmount,
        waiverAmountFormatted: formatInr(w.waiverAmount),
        reason: w.reason,
        approvedBy: w.approvedBy,
        approvedAt: w.approvedAt?.toISOString() ?? '',
      })),
    pendingWaivers: waivers
      .filter((w) => w.status === 'PENDING')
      .map((w) => ({
        id: w.id,
        memberName: w.member.memberName,
        fineType: w.fine.fineType,
        waiverAmount: w.waiverAmount,
        waiverAmountFormatted: formatInr(w.waiverAmount),
        reason: w.reason,
        requestedBy: w.requestedBy,
        requiresPrincipal: w.waiverAmount > settings.librarianWaiverThreshold,
      })),
    recentPayments: payments.map((p) => ({
      id: p.id,
      receiptNo: p.receiptNo,
      memberName: p.member.memberName,
      amount: p.amount,
      amountFormatted: formatInr(p.amount),
      paymentMethod: p.paymentMethod,
      paidAt: p.paidAt.toISOString(),
    })),
    paymentMethods: ['CASH', 'ONLINE', 'UPI', 'CARD'],
    reports: ['Daily Collection Register', 'Defaulters List', 'Waived Fines Report'],
    notifications: ['Fine accrual', 'Payment success', 'Waiver approval'],
    mobileSync: ['Student/Parent app — view & pay outstanding fines via payment gateway'],
    feeIntegration: 'Fines pushed to central fee ledger; No Dues certificate blocked if library fines exist',
    financeIntegration: 'Write-off journal entries for lost/damaged assets linked to fee module',
    roles: ['Librarian (Collect)', 'Principal/Admin (Waive)'],
    automationRules: ['Fines accrue daily at midnight for all overdue items'],
  };
}

export async function createLibraryFine(
  institutionId: string,
  data: {
    memberId: string;
    fineType: string;
    amount: number;
    issueId?: string;
    description?: string;
    academicYear?: string;
  },
) {
  if (data.issueId) {
    const exists = await prisma.libFine.findFirst({ where: { institutionId, issueId: data.issueId } });
    if (exists) return exists;
  }
  const ref = await nextFineRef(institutionId);
  const fine = await prisma.libFine.create({
    data: {
      institutionId,
      memberId: data.memberId,
      issueId: data.issueId ?? null,
      transactionRef: ref,
      fineType: data.fineType,
      amount: data.amount,
      balance: data.amount,
      description: data.description ?? '',
      academicYear: data.academicYear ?? '2025-26',
      feeLedgerPushed: true,
    },
  });
  await logActivity(institutionId, 'CREATE_FINE', `${data.fineType} fine ${formatInr(data.amount)} for member`, fine.id);
  return fine;
}

export async function accrueDailyFines(institutionId: string) {
  const settings = await ensureSettings(institutionId);
  const today = todayDate();
  let accrued = 0;

  const overdueIssues = await prisma.libIssue.findMany({
    where: { institutionId, status: 'OVERDUE' },
    include: { book: { select: { title: true } }, member: true },
  });

  for (const issue of overdueIssues) {
    const existing = await prisma.libFine.findFirst({
      where: { institutionId, issueId: issue.id, status: { in: ['PENDING', 'PARTIAL'] } },
    });

    if (existing) {
      const lastAccrued = existing.lastAccruedAt
        ? new Date(existing.lastAccruedAt.getFullYear(), existing.lastAccruedAt.getMonth(), existing.lastAccruedAt.getDate())
        : null;
      if (lastAccrued && lastAccrued.getTime() >= today.getTime()) continue;

      const newAmount = existing.amount + settings.finePerDay;
      const newBalance = newAmount - existing.paidAmount - existing.waivedAmount;
      await prisma.libFine.update({
        where: { id: existing.id },
        data: {
          amount: newAmount,
          balance: Math.max(0, newBalance),
          status: newBalance <= 0 ? 'PAID' : existing.paidAmount > 0 ? 'PARTIAL' : 'PENDING',
          lastAccruedAt: new Date(),
        },
      });
      accrued += 1;
    } else {
      const daysOverdue = Math.max(1, Math.floor((today.getTime() - issue.dueDate.getTime()) / 86400000));
      const amount = daysOverdue * settings.finePerDay;
      await createLibraryFine(institutionId, {
        memberId: issue.memberId,
        issueId: issue.id,
        fineType: 'OVERDUE',
        amount,
        description: `Daily accrual — ${daysOverdue} day(s) overdue for "${issue.book.title}"`,
        academicYear: issue.academicYear,
      });
      await prisma.libFine.updateMany({
        where: { institutionId, issueId: issue.id },
        data: { lastAccruedAt: new Date() },
      });
      accrued += 1;

      await prisma.libNotice.create({
        data: {
          institutionId,
          title: `Fine accrued: ${formatInr(amount)} for ${issue.member.memberName} — overdue "${issue.book.title}"`,
          issuedBy: 'Library System',
          iconColor: 'amber',
          academicYear: issue.academicYear,
        },
      });
    }
  }

  await logActivity(institutionId, 'DAILY_ACCRUAL', `Daily fine accrual processed — ${accrued} record(s) updated`);
  return { accrued, message: `Accrued fines for ${accrued} overdue item(s)` };
}

export async function collectFinePayment(
  institutionId: string,
  data: {
    memberId: string;
    amount: number;
    paymentMethod: string;
    transactionRef?: string;
    collectedBy: string;
    fineIds?: string[];
  },
) {
  if (!data.amount || data.amount <= 0) throw new Error('Payment amount must be positive');

  const member = await prisma.libMember.findFirst({ where: { institutionId, id: data.memberId } });
  if (!member) throw new Error('Member not found');

  const txnRef = data.transactionRef?.trim() || await nextTxnRef(institutionId);
  const receiptNo = await nextReceiptNo(institutionId);

  let remaining = data.amount;
  const fines = data.fineIds?.length
    ? await prisma.libFine.findMany({
        where: { institutionId, memberId: data.memberId, id: { in: data.fineIds }, balance: { gt: 0 } },
        orderBy: { fineDate: 'asc' },
      })
    : await prisma.libFine.findMany({
        where: { institutionId, memberId: data.memberId, status: { in: ['PENDING', 'PARTIAL'] }, balance: { gt: 0 } },
        orderBy: { fineDate: 'asc' },
      });

  if (!fines.length && remaining > 0) {
    throw new Error('No outstanding fines to pay');
  }

  const payment = await prisma.libFinePayment.create({
    data: {
      institutionId,
      memberId: data.memberId,
      fineId: fines[0]?.id ?? null,
      transactionRef: txnRef,
      amount: data.amount,
      paymentMethod: data.paymentMethod,
      receiptNo,
      collectedBy: data.collectedBy,
      status: 'SUCCESS',
    },
  });

  for (const fine of fines) {
    if (remaining <= 0) break;
    const pay = Math.min(remaining, fine.balance);
    const newPaid = fine.paidAmount + pay;
    const newBalance = fine.amount - newPaid - fine.waivedAmount;
    await prisma.libFine.update({
      where: { id: fine.id },
      data: {
        paidAmount: newPaid,
        balance: Math.max(0, newBalance),
        status: newBalance <= 0 ? 'PAID' : 'PARTIAL',
      },
    });
    remaining -= pay;
  }

  await logActivity(
    institutionId,
    'PAYMENT',
    `Collected ${formatInr(data.amount)} from ${member.memberName} — Receipt ${receiptNo}`,
    payment.id,
  );

  return {
    success: true,
    paymentId: payment.id,
    receiptNo,
    transactionRef: txnRef,
    amount: data.amount,
    amountFormatted: formatInr(data.amount),
    memberName: member.memberName,
    paidAt: payment.paidAt.toISOString(),
    feeLedgerNote: `Pushed ${formatInr(data.amount)} to central fee ledger for ${member.memberName}`,
    notification: { channels: ['Push', 'Email'], message: `Payment of ${formatInr(data.amount)} received — Receipt ${receiptNo}` },
    receipt: {
      receiptNo,
      transactionRef: txnRef,
      memberCode: member.memberCode,
      memberName: member.memberName,
      amount: data.amount,
      amountFormatted: formatInr(data.amount),
      paymentMethod: data.paymentMethod,
      collectedBy: data.collectedBy,
      paidAt: payment.paidAt.toISOString(),
      institutionNote: 'Library Fine Receipt — valid for fee reconciliation',
    },
    data: await getFineManagement(institutionId, data.memberId),
  };
}

export async function requestFineWaiver(
  institutionId: string,
  data: {
    fineId: string;
    waiverAmount: number;
    reason?: string;
    requestedBy: string;
  },
) {
  const settings = await ensureSettings(institutionId);
  const fine = await prisma.libFine.findFirst({
    where: { institutionId, id: data.fineId },
    include: { member: true },
  });
  if (!fine) throw new Error('Fine not found');
  if (data.waiverAmount <= 0) throw new Error('Waiver amount must be positive');
  if (data.waiverAmount > fine.balance) {
    throw new Error(`Waiver amount cannot exceed outstanding balance (${formatInr(fine.balance)})`);
  }

  const requiresPrincipal = data.waiverAmount > settings.librarianWaiverThreshold;
  const waiver = await prisma.libFineWaiver.create({
    data: {
      institutionId,
      fineId: fine.id,
      memberId: fine.memberId,
      waiverAmount: data.waiverAmount,
      reason: data.reason ?? '',
      requestedBy: data.requestedBy,
      status: requiresPrincipal ? 'PENDING' : 'APPROVED',
      approvedBy: requiresPrincipal ? '' : data.requestedBy,
      approvedAt: requiresPrincipal ? null : new Date(),
    },
  });

  if (!requiresPrincipal) {
    const newWaived = fine.waivedAmount + data.waiverAmount;
    const newBalance = fine.amount - fine.paidAmount - newWaived;
    await prisma.libFine.update({
      where: { id: fine.id },
      data: {
        waivedAmount: newWaived,
        balance: Math.max(0, newBalance),
        status: newBalance <= 0 ? 'WAIVED' : fine.paidAmount > 0 ? 'PARTIAL' : 'PENDING',
      },
    });
  }

  await logActivity(
    institutionId,
    requiresPrincipal ? 'WAIVER_REQUEST' : 'WAIVER_AUTO',
    `Waiver ${formatInr(data.waiverAmount)} for ${fine.member.memberName}`,
    waiver.id,
  );

  return {
    waiverId: waiver.id,
    requiresPrincipal,
    message: requiresPrincipal
      ? `Waiver pending Principal approval (exceeds ${formatInr(settings.librarianWaiverThreshold)} threshold)`
      : 'Waiver applied successfully',
    data: await getFineManagement(institutionId, fine.memberId),
  };
}

export async function approveFineWaiver(
  institutionId: string,
  waiverId: string,
  approvedBy: string,
  approve: boolean,
) {
  const waiver = await prisma.libFineWaiver.findFirst({
    where: { institutionId, id: waiverId },
    include: { fine: true, member: true },
  });
  if (!waiver) throw new Error('Waiver request not found');
  if (waiver.status !== 'PENDING') throw new Error('Waiver already processed');

  if (!approve) {
    await prisma.libFineWaiver.update({
      where: { id: waiverId },
      data: { status: 'REJECTED', approvedBy, approvedAt: new Date() },
    });
    return { success: true, message: 'Waiver rejected', data: await getFineManagement(institutionId) };
  }

  if (waiver.waiverAmount > waiver.fine.balance) {
    throw new Error('Waiver amount exceeds current fine balance');
  }

  const fine = waiver.fine;
  const newWaived = fine.waivedAmount + waiver.waiverAmount;
  const newBalance = fine.amount - fine.paidAmount - newWaived;

  await prisma.libFineWaiver.update({
    where: { id: waiverId },
    data: { status: 'APPROVED', approvedBy, approvedAt: new Date() },
  });

  await prisma.libFine.update({
    where: { id: fine.id },
    data: {
      waivedAmount: newWaived,
      balance: Math.max(0, newBalance),
      status: newBalance <= 0 ? 'WAIVED' : fine.paidAmount > 0 ? 'PARTIAL' : 'PENDING',
    },
  });

  await prisma.libNotice.create({
    data: {
      institutionId,
      title: `Fine waiver approved: ${formatInr(waiver.waiverAmount)} for ${waiver.member.memberName}`,
      issuedBy: approvedBy,
      iconColor: 'green',
      academicYear: fine.academicYear,
    },
  });

  await logActivity(institutionId, 'WAIVER_APPROVED', `Principal approved waiver ${formatInr(waiver.waiverAmount)}`, waiverId);

  return {
    success: true,
    message: 'Waiver approved and applied',
    notification: { channels: ['Push', 'Email'], message: `Your fine waiver of ${formatInr(waiver.waiverAmount)} has been approved` },
    data: await getFineManagement(institutionId, waiver.memberId),
  };
}

export async function getPaymentReceipt(institutionId: string, paymentId: string) {
  const payment = await prisma.libFinePayment.findFirst({
    where: { institutionId, id: paymentId },
    include: { member: true },
  });
  if (!payment) throw new Error('Payment not found');

  return {
    receiptNo: payment.receiptNo,
    transactionRef: payment.transactionRef,
    memberCode: payment.member.memberCode,
    memberName: payment.member.memberName,
    amount: payment.amount,
    amountFormatted: formatInr(payment.amount),
    paymentMethod: payment.paymentMethod,
    collectedBy: payment.collectedBy,
    paidAt: payment.paidAt.toISOString(),
    status: payment.status,
  };
}

export async function seedFineManagement(institutionId: string) {
  await seedStockVerification(institutionId);

  const existing = await prisma.libFine.count({ where: { institutionId } });
  if (existing >= 3) return getFineManagement(institutionId);

  const members = await prisma.libMember.findMany({ where: { institutionId }, take: 5 });
  const overdueIssues = await prisma.libIssue.findMany({
    where: { institutionId, status: { in: ['OVERDUE', 'RETURNED'] }, fineAmount: { gt: 0 } },
    include: { book: true },
    take: 5,
  });

  for (const issue of overdueIssues.slice(0, 3)) {
    const exists = await prisma.libFine.findFirst({ where: { institutionId, issueId: issue.id } });
    if (!exists) {
      await createLibraryFine(institutionId, {
        memberId: issue.memberId,
        issueId: issue.id,
        fineType: 'OVERDUE',
        amount: issue.fineAmount || 50,
        description: `Overdue fine for "${issue.book.title}"`,
        academicYear: issue.academicYear,
      });
    }
  }

  if (members[0]) {
    await createLibraryFine(institutionId, {
      memberId: members[0].id,
      fineType: 'DAMAGE',
      amount: 200,
      description: 'Damaged cover — replacement cost partial',
    });
  }

  if (members[1]) {
    const lostFine = await createLibraryFine(institutionId, {
      memberId: members[1].id,
      fineType: 'LOST',
      amount: 850,
      description: 'Lost book replacement charge',
    });

    await collectFinePayment(institutionId, {
      memberId: members[1].id,
      amount: 300,
      paymentMethod: 'UPI',
      collectedBy: 'Librarian',
      fineIds: [lostFine.id],
    });
  }

  const pendingFine = await prisma.libFine.findFirst({
    where: { institutionId, status: { in: ['PENDING', 'PARTIAL'] }, balance: { gt: 150 } },
  });
  if (pendingFine) {
    await requestFineWaiver(institutionId, {
      fineId: pendingFine.id,
      waiverAmount: 50,
      reason: 'First-time offender — partial waiver',
      requestedBy: 'Librarian',
    });

    const bigFine = await prisma.libFine.findFirst({
      where: { institutionId, balance: { gt: 200 } },
    });
    if (bigFine) {
      const w = await requestFineWaiver(institutionId, {
        fineId: bigFine.id,
        waiverAmount: 250,
        reason: 'Principal discretionary waiver',
        requestedBy: 'Librarian',
      });
      if (w.requiresPrincipal) {
        await approveFineWaiver(institutionId, w.waiverId, 'Principal', true);
      }
    }
  }

  await accrueDailyFines(institutionId);
  await logActivity(institutionId, 'SEED', 'Fine management demo data seeded');
  return getFineManagement(institutionId);
}
