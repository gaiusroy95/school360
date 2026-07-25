import { prisma } from './prisma.js';
import { seedBookCatalogue } from './libraryCatalogue.js';
import { formatLocationLabel } from './libraryRacks.js';
import { createLibraryFine, getMemberOutstanding } from './libraryFines.js';

const ACADEMIC_YEARS = ['2023-24', '2024-25', '2025-26', '2026-27'];

const DEFAULT_RULES: Record<string, { maxBooks: number; issueDays: number }> = {
  STUDENT: { maxBooks: 3, issueDays: 14 },
  TEACHER: { maxBooks: 5, issueDays: 30 },
  STAFF: { maxBooks: 4, issueDays: 21 },
  OTHER: { maxBooks: 2, issueDays: 14 },
};

function todayDate() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function formatDate(d: Date) {
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatInr(amount: number) {
  return `₹ ${Math.round(amount).toLocaleString('en-IN')}`;
}

function addDays(d: Date, days: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + days);
  return r;
}

async function ensureSettings(institutionId: string) {
  let row = await prisma.libSettings.findUnique({ where: { institutionId } });
  if (!row) {
    row = await prisma.libSettings.create({
      data: {
        institutionId,
        circulationRules: DEFAULT_RULES,
        unpaidFineThreshold: 100,
      },
    });
  } else if (!row.circulationRules || Object.keys(row.circulationRules as object).length === 0) {
    row = await prisma.libSettings.update({
      where: { institutionId },
      data: { circulationRules: DEFAULT_RULES },
    });
  }
  return row;
}

function getMemberRules(settings: { circulationRules: unknown }, memberType: string) {
  const rules = (settings.circulationRules ?? DEFAULT_RULES) as Record<string, { maxBooks: number; issueDays: number }>;
  return rules[memberType] ?? rules.STUDENT ?? DEFAULT_RULES.STUDENT;
}

async function nextTxnNumber(institutionId: string) {
  const count = await prisma.libCirculationTxn.count({ where: { institutionId } });
  const year = new Date().getFullYear();
  return `CIR-${year}-${String(count + 1).padStart(5, '0')}`;
}

async function logActivity(institutionId: string, entityType: string, action: string, details = '', entityId = '') {
  await prisma.libActivityLog.create({
    data: { institutionId, entityType, entityId, action, details, performedBy: 'Circulation Desk' },
  });
}

async function sendNotification(
  institutionId: string,
  memberName: string,
  mobile: string,
  message: string,
  channels: string[] = ['Push', 'SMS', 'Email'],
) {
  await logActivity(
    institutionId,
    'Notification',
    'CIRCULATION_ALERT',
    `To ${memberName} (${mobile}): ${message} via ${channels.join('/')}`,
  );
  return { sent: true, channels, message };
}

export async function lookupMember(institutionId: string, memberCode: string) {
  const member = await prisma.libMember.findFirst({
    where: {
      institutionId,
      OR: [
        { memberCode: { equals: memberCode, mode: 'insensitive' } },
        { id: memberCode },
      ],
      status: 'ACTIVE',
    },
  });
  if (!member) return null;

  const settings = await ensureSettings(institutionId);
  const rules = getMemberRules(settings, member.memberType);

  const [activeIssues, unpaidTotal] = await Promise.all([
    prisma.libIssue.count({
      where: { institutionId, memberId: member.id, status: { in: ['ISSUED', 'OVERDUE'] } },
    }),
    getMemberOutstanding(institutionId, member.id),
  ]);
  const canIssue = activeIssues < rules.maxBooks && unpaidTotal < settings.unpaidFineThreshold;

  return {
    id: member.id,
    memberCode: member.memberCode,
    memberName: member.memberName,
    memberType: member.memberType,
    className: member.className,
    sectionName: member.sectionName,
    mobile: member.mobile,
    email: member.email,
    activeIssues,
    maxBooks: rules.maxBooks,
    issueDays: rules.issueDays,
    unpaidFines: unpaidTotal,
    unpaidFineThreshold: settings.unpaidFineThreshold,
    canIssue,
    blockReason: !canIssue
      ? activeIssues >= rules.maxBooks
        ? `Maximum book limit (${rules.maxBooks}) reached`
        : `Unpaid fines (${formatInr(unpaidTotal)}) exceed threshold (${formatInr(settings.unpaidFineThreshold)})`
      : null,
  };
}

export async function lookupBook(institutionId: string, accessionNo: string) {
  const code = accessionNo.trim();
  const copy = await prisma.libBookCopy.findFirst({
    where: {
      institutionId,
      OR: [
        { copyCode: { equals: code, mode: 'insensitive' } },
        { id: code },
      ],
    },
    include: { book: { include: { category: true, branch: true } }, shelf: { include: { rack: { include: { location: { include: { parent: true } } } } } } },
  });

  if (copy) {
    const activeIssue = await prisma.libIssue.findFirst({
      where: { institutionId, copyId: copy.id, status: { in: ['ISSUED', 'OVERDUE'] } },
      include: { member: true },
    });
    const shelf = copy.shelf;
    const locationLabel = shelf
      ? formatLocationLabel({
          floorName: shelf.rack.location.parent?.locationName,
          aisleName: shelf.rack.location.locationName,
          rackNumber: shelf.rack.rackNumber,
          shelfNumber: shelf.shelfNumber,
        })
      : copy.rackLocation;
    return {
      bookId: copy.book.id,
      copyId: copy.id,
      accessionNo: copy.copyCode,
      title: copy.book.title,
      author: copy.book.author,
      category: copy.book.category?.categoryName ?? 'General',
      categoryIssuable: copy.book.category?.issuable ?? true,
      issueDaysOverride: copy.book.category?.issueDaysOverride ?? null,
      branch: copy.book.branch.branchName,
      coverColor: copy.book.coverColor,
      copyStatus: copy.status,
      rackLocation: locationLabel,
      locationLabel,
      available: copy.status === 'AVAILABLE' && !activeIssue,
      activeIssue: activeIssue
        ? {
            id: activeIssue.id,
            txnNumber: activeIssue.txnNumber,
            memberName: activeIssue.member.memberName,
            memberCode: activeIssue.member.memberCode,
            issueDate: formatDate(activeIssue.issueDate),
            dueDate: formatDate(activeIssue.dueDate),
            status: activeIssue.status,
            daysOverdue: activeIssue.daysOverdue,
          }
        : null,
    };
  }

  const book = await prisma.libBook.findFirst({
    where: {
      institutionId,
      OR: [
        { bookCode: { equals: code, mode: 'insensitive' } },
        { isbn: { equals: code, mode: 'insensitive' } },
        { id: code },
      ],
    },
    include: { category: true, branch: true, copies: { take: 1 } },
  });
  if (!book) return null;

  const activeIssue = await prisma.libIssue.findFirst({
    where: { institutionId, bookId: book.id, status: { in: ['ISSUED', 'OVERDUE'] } },
    include: { member: true },
    orderBy: { issueDate: 'desc' },
  });

  return {
    bookId: book.id,
    copyId: book.copies[0]?.id ?? null,
    accessionNo: book.copies[0]?.copyCode ?? book.bookCode,
    title: book.title,
    author: book.author,
    category: book.category?.categoryName ?? 'General',
    branch: book.branch.branchName,
    coverColor: book.coverColor,
    copyStatus: book.availableCopies > 0 ? 'AVAILABLE' : 'ISSUED',
    rackLocation: book.copies[0]?.rackLocation ?? '',
    available: book.availableCopies > 0,
    activeIssue: activeIssue
      ? {
          id: activeIssue.id,
          txnNumber: activeIssue.txnNumber,
          memberName: activeIssue.member.memberName,
          memberCode: activeIssue.member.memberCode,
          issueDate: formatDate(activeIssue.issueDate),
          dueDate: formatDate(activeIssue.dueDate),
          status: activeIssue.status,
          daysOverdue: activeIssue.daysOverdue,
        }
      : null,
  };
}

export async function issueBook(
  institutionId: string,
  memberCode: string,
  accessionNo: string,
  academicYear = '2025-26',
  performedBy = 'Librarian',
) {
  const member = await lookupMember(institutionId, memberCode);
  if (!member) throw new Error('Member not found or inactive');
  if (!member.canIssue) throw new Error(member.blockReason ?? 'Member cannot borrow books');

  const bookInfo = await lookupBook(institutionId, accessionNo);
  if (!bookInfo) throw new Error('Book not found — check barcode/accession number');
  if (!bookInfo.available) throw new Error('Book is not available for issue');
  if (bookInfo.categoryIssuable === false) {
    throw new Error(`"${bookInfo.category}" books cannot be issued (non-circulating / reference category)`);
  }

  const settings = await ensureSettings(institutionId);
  const rules = getMemberRules(settings, member.memberType);
  const today = todayDate();
  const issueDays = bookInfo.issueDaysOverride ?? rules.issueDays;
  const dueDate = addDays(today, issueDays);
  const txnNumber = await nextTxnNumber(institutionId);

  const book = await prisma.libBook.findUnique({ where: { id: bookInfo.bookId } });
  if (!book) throw new Error('Book record missing');

  const issue = await prisma.libIssue.create({
    data: {
      institutionId,
      branchId: book.branchId,
      bookId: book.id,
      memberId: member.id,
      copyId: bookInfo.copyId,
      txnNumber,
      accessionNo: bookInfo.accessionNo,
      academicYear,
      issueDate: today,
      dueDate,
      status: 'ISSUED',
      issuedBy: performedBy,
    },
  });

  await prisma.libCirculationTxn.create({
    data: {
      institutionId,
      issueId: issue.id,
      branchId: book.branchId,
      txnNumber,
      txnType: 'ISSUE',
      memberId: member.id,
      bookId: book.id,
      copyId: bookInfo.copyId,
      accessionNo: bookInfo.accessionNo,
      academicYear,
      issueDate: today,
      dueDate,
      performedBy,
    },
  });

  await prisma.libBook.update({
    where: { id: book.id },
    data: {
      availableCopies: Math.max(0, book.availableCopies - 1),
      issueCount: { increment: 1 },
      status: book.availableCopies - 1 <= 0 ? 'ISSUED' : book.status,
    },
  });

  if (bookInfo.copyId) {
    await prisma.libBookCopy.update({
      where: { id: bookInfo.copyId },
      data: { status: 'ISSUED' },
    });
  }

  const msg = `"${book.title}" issued to ${member.memberName}. Due: ${formatDate(dueDate)}`;
  await sendNotification(institutionId, member.memberName, member.mobile, msg);
  await logActivity(institutionId, 'LibIssue', 'ISSUE', msg, issue.id);

  return {
    success: true,
    txnNumber,
    issueId: issue.id,
    memberName: member.memberName,
    bookTitle: book.title,
    accessionNo: bookInfo.accessionNo,
    issueDate: formatDate(today),
    dueDate: formatDate(dueDate),
    message: msg,
    notification: { channels: ['Push', 'SMS', 'Email'], sent: true },
  };
}

export async function returnBook(
  institutionId: string,
  accessionNo: string,
  academicYear = '2025-26',
  performedBy = 'Librarian',
) {
  const bookInfo = await lookupBook(institutionId, accessionNo);
  if (!bookInfo?.activeIssue) throw new Error('No active issue found for this barcode');

  const issue = await prisma.libIssue.findUnique({
    where: { id: bookInfo.activeIssue.id },
    include: { book: true, member: true },
  });
  if (!issue) throw new Error('Circulation record not found');

  const settings = await ensureSettings(institutionId);
  const today = todayDate();
  const daysOverdue = Math.max(0, Math.floor((today.getTime() - issue.dueDate.getTime()) / 86400000));
  const fineAmount = daysOverdue > 0 ? daysOverdue * settings.finePerDay : 0;
  const txnNumber = await nextTxnNumber(institutionId);

  await prisma.libIssue.update({
    where: { id: issue.id },
    data: {
      status: 'RETURNED',
      returnDate: today,
      daysOverdue,
      fineAmount,
      finePaid: fineAmount <= 0,
      returnedBy: performedBy,
    },
  });

  await prisma.libCirculationTxn.create({
    data: {
      institutionId,
      issueId: issue.id,
      branchId: issue.branchId,
      txnNumber,
      txnType: 'RETURN',
      memberId: issue.memberId,
      bookId: issue.bookId,
      copyId: issue.copyId,
      accessionNo: issue.accessionNo || bookInfo.accessionNo,
      academicYear,
      issueDate: issue.issueDate,
      dueDate: issue.dueDate,
      returnDate: today,
      fineAmount,
      performedBy,
    },
  });

  if (fineAmount > 0) {
    await prisma.libFineLedger.create({
      data: {
        institutionId,
        issueId: issue.id,
        memberId: issue.memberId,
        amount: fineAmount,
        fineType: 'OVERDUE',
        description: `Overdue fine — ${daysOverdue} day(s) late for "${issue.book.title}"`,
        status: 'PENDING',
      },
    });
    await createLibraryFine(institutionId, {
      memberId: issue.memberId,
      issueId: issue.id,
      fineType: 'OVERDUE',
      amount: fineAmount,
      description: `Overdue fine — ${daysOverdue} day(s) late for "${issue.book.title}"`,
      academicYear,
    }).catch(() => undefined);
  }

  await prisma.libBook.update({
    where: { id: issue.bookId },
    data: {
      availableCopies: { increment: 1 },
      status: 'AVAILABLE',
    },
  });

  if (issue.copyId) {
    await prisma.libBookCopy.update({
      where: { id: issue.copyId },
      data: { status: 'AVAILABLE' },
    });
  }

  const pendingReservation = await prisma.libReservation.findFirst({
    where: { institutionId, bookId: issue.bookId, status: 'PENDING' },
    orderBy: { reservedAt: 'asc' },
    include: { member: true },
  });
  if (pendingReservation) {
    await sendNotification(
      institutionId,
      pendingReservation.member.memberName,
      pendingReservation.member.mobile,
      `"${issue.book.title}" is now available — your reservation is ready for pickup`,
    );
  }

  const msg = fineAmount > 0
    ? `"${issue.book.title}" returned. Overdue fine: ${formatInr(fineAmount)} (${daysOverdue} days)`
    : `"${issue.book.title}" returned successfully. Thank you!`;
  await sendNotification(institutionId, issue.member.memberName, issue.member.mobile, msg);
  await logActivity(institutionId, 'LibIssue', 'RETURN', msg, issue.id);

  return {
    success: true,
    txnNumber,
    issueId: issue.id,
    memberName: issue.member.memberName,
    bookTitle: issue.book.title,
    accessionNo: issue.accessionNo || bookInfo.accessionNo,
    returnDate: formatDate(today),
    daysOverdue,
    fineAmount,
    fineFormatted: formatInr(fineAmount),
    fineRequired: fineAmount > 0,
    message: msg,
    notification: { channels: ['Push', 'SMS', 'Email'], sent: true },
    feeIntegrationNote: fineAmount > 0
      ? 'Outstanding library fine recorded — blocks no-dues clearance until paid via Fee Management'
      : null,
  };
}

export async function getBookIssueReturn(
  institutionId: string,
  academicYear = '2025-26',
  branchId?: string,
) {
  await ensureSettings(institutionId);
  const settings = await ensureSettings(institutionId);
  const today = todayDate();
  const branchFilter = branchId && branchId !== 'ALL' ? { branchId } : {};

  const [activeIssues, todayTxns, branches, overdueCount, todayIssued, todayReturned] = await Promise.all([
    prisma.libIssue.findMany({
      where: {
        institutionId,
        academicYear,
        status: { in: ['ISSUED', 'OVERDUE'] },
        ...branchFilter,
      },
      include: {
        book: true,
        member: true,
        branch: true,
      },
      orderBy: { dueDate: 'asc' },
      take: 50,
    }),
    prisma.libCirculationTxn.findMany({
      where: {
        institutionId,
        academicYear,
        createdAt: { gte: today },
        ...branchFilter,
      },
      include: { book: true, member: true },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    prisma.libBranch.findMany({ where: { institutionId, status: 'ACTIVE' }, orderBy: { branchName: 'asc' } }),
    prisma.libIssue.count({
      where: { institutionId, academicYear, status: 'OVERDUE', ...branchFilter },
    }),
    prisma.libCirculationTxn.count({
      where: { institutionId, academicYear, txnType: 'ISSUE', createdAt: { gte: today }, ...branchFilter },
    }),
    prisma.libCirculationTxn.count({
      where: { institutionId, academicYear, txnType: 'RETURN', createdAt: { gte: today }, ...branchFilter },
    }),
  ]);

  const now = today.getTime();
  const activeGrid = activeIssues.map((i) => {
    const daysOverdue = Math.max(0, Math.floor((now - i.dueDate.getTime()) / 86400000));
    return {
      id: i.id,
      txnNumber: i.txnNumber,
      accessionNo: i.accessionNo || i.book.bookCode,
      bookTitle: i.book.title,
      author: i.book.author,
      memberName: i.member.memberName,
      memberCode: i.member.memberCode,
      className: i.member.className ? `${i.member.className}-${i.member.sectionName}` : i.member.memberType,
      issueDate: formatDate(i.issueDate),
      dueDate: formatDate(i.dueDate),
      status: i.status,
      daysOverdue: daysOverdue > 0 ? daysOverdue : 0,
      fineAmount: daysOverdue > 0 ? daysOverdue * settings.finePerDay : 0,
      branch: i.branch.branchName,
    };
  });

  const dailyRegister = todayTxns.map((t) => ({
    id: t.id,
    txnNumber: t.txnNumber,
    txnType: t.txnType,
    accessionNo: t.accessionNo,
    bookTitle: t.book.title,
    memberName: t.member.memberName,
    memberCode: t.member.memberCode,
    time: t.createdAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
    fineAmount: t.fineAmount,
    performedBy: t.performedBy,
  }));

  return {
    academicYear,
    academicYears: ACADEMIC_YEARS,
    branches: branches.map((b) => ({ id: b.id, name: b.branchName })),
    circulationRules: settings.circulationRules ?? DEFAULT_RULES,
    finePerDay: settings.finePerDay,
    unpaidFineThreshold: settings.unpaidFineThreshold,
    kpis: {
      activeIssues: activeIssues.length,
      overdueBooks: overdueCount,
      todayIssued,
      todayReturned,
    },
    activeIssues: activeGrid,
    dailyRegister,
    reports: [
      'Daily Issue/Return Register',
      'Overdue Items Report',
      'Circulation History by Member',
    ],
    reminderSchedule: ['2 days before due date', 'On due date', 'Daily when overdue'],
    mobileSync: ['My Issued Books', 'Due Dates', 'Fine History', 'Reserve from OPAC'],
    feeIntegration: 'Outstanding library fines block report card generation and no-dues clearance',
    roles: ['Librarian', 'Library Assistant'],
  };
}

export async function seedLibraryCirculation(institutionId: string) {
  await seedBookCatalogue(institutionId);
  await ensureSettings(institutionId);

  const settings = await prisma.libSettings.findUnique({ where: { institutionId } });
  if (settings) {
    await prisma.libSettings.update({
      where: { institutionId },
      data: {
        circulationRules: DEFAULT_RULES,
        unpaidFineThreshold: 100,
        notificationRules: {
          issueReturn: { channels: ['Push', 'SMS', 'Email'] },
          reminders: { beforeDueDays: 2, onDueDate: true, dailyWhenOverdue: true },
        },
      },
    });
  }

  const overdueIssue = await prisma.libIssue.findFirst({
    where: { institutionId, status: 'OVERDUE' },
  });
  if (overdueIssue) {
    const exists = await prisma.libFineLedger.findFirst({
      where: { institutionId, issueId: overdueIssue.id },
    });
    if (!exists) {
      await prisma.libFineLedger.create({
        data: {
          institutionId,
          issueId: overdueIssue.id,
          memberId: overdueIssue.memberId,
          amount: overdueIssue.fineAmount || overdueIssue.daysOverdue * 10,
          fineType: 'OVERDUE',
          description: 'Sample overdue fine from circulation seed',
          status: 'PENDING',
        },
      });
    }
  }

  const issues = await prisma.libIssue.findMany({
    where: { institutionId, txnNumber: '' },
    take: 50,
  });
  for (const [i, issue] of issues.entries()) {
    await prisma.libIssue.update({
      where: { id: issue.id },
      data: { txnNumber: `CIR-LEGACY-${String(i + 1).padStart(5, '0')}` },
    });
  }

  return getBookIssueReturn(institutionId);
}
