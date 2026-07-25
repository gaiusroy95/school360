import { prisma } from './prisma.js';
import { seedLibraryCirculation } from './libraryCirculation.js';

const ACADEMIC_YEARS = ['2023-24', '2024-25', '2025-26', '2026-27'];

const CATEGORY_SEED = [
  { code: 'STU-REG', name: 'Regular Student', memberType: 'STUDENT', maxBooks: 3, issueDays: 14, color: '#3b82f6' },
  { code: 'STU-HON', name: 'Honours Student', memberType: 'STUDENT', maxBooks: 4, issueDays: 14, color: '#6366f1' },
  { code: 'TCH-FAC', name: 'Faculty', memberType: 'TEACHER', maxBooks: 5, issueDays: 30, color: '#10b981' },
  { code: 'STF-ADM', name: 'Administrative Staff', memberType: 'STAFF', maxBooks: 4, issueDays: 21, color: '#f59e0b' },
  { code: 'STF-LIB', name: 'Library Staff', memberType: 'STAFF', maxBooks: 6, issueDays: 30, color: '#8b5cf6' },
  { code: 'OTH-GST', name: 'Guest Member', memberType: 'OTHER', maxBooks: 2, issueDays: 7, color: '#64748b' },
];

function formatDate(d: Date) {
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

async function logActivity(institutionId: string, action: string, details: string, entityId = '') {
  await prisma.libActivityLog.create({
    data: { institutionId, entityType: 'LibMember', entityId, action, details, performedBy: 'Librarian' },
  });
}

async function ensureCategories(institutionId: string) {
  const existing = await prisma.libMemberCategory.count({ where: { institutionId } });
  if (existing > 0) {
    return prisma.libMemberCategory.findMany({ where: { institutionId, status: 'ACTIVE' } });
  }
  for (const c of CATEGORY_SEED) {
    await prisma.libMemberCategory.create({
      data: {
        institutionId,
        categoryCode: c.code,
        categoryName: c.name,
        memberType: c.memberType,
        maxBooks: c.maxBooks,
        issueDays: c.issueDays,
        color: c.color,
        description: `${c.name} borrowing privileges`,
      },
    });
  }
  return prisma.libMemberCategory.findMany({ where: { institutionId, status: 'ACTIVE' } });
}

function mapMemberTypeFromStaff(designation: string, department: string): string {
  const d = `${designation} ${department}`.toLowerCase();
  if (d.includes('teacher') || d.includes('faculty') || d.includes('professor') || d.includes('lecturer')) {
    return 'TEACHER';
  }
  if (d.includes('librarian') || department.toLowerCase().includes('library')) return 'STAFF';
  return 'STAFF';
}

function pickCategory(
  categories: { id: string; memberType: string; categoryCode: string; categoryName: string; maxBooks: number; issueDays: number }[],
  memberType: string,
) {
  return categories.find((c) => c.memberType === memberType) ?? categories[0];
}

async function mapMemberRow(
  m: {
    id: string;
    memberCode: string;
    memberName: string;
    memberType: string;
    className: string;
    sectionName: string;
    mobile: string;
    email: string;
    barcodeUid: string;
    cardType: string;
    cardIssuedAt: Date | null;
    status: string;
    erpUserId: string;
    erpSource: string;
    academicYear: string;
    suspendedReason: string;
    lastSyncedAt: Date | null;
    category: { categoryName: string; maxBooks: number; issueDays: number; color: string } | null;
    categoryId: string | null;
    branch: { branchName: string };
  },
  extras?: { activeIssues?: number; pendingFines?: number },
) {
  return {
    id: m.id,
    erpUserId: m.erpUserId,
    erpSource: m.erpSource,
    memberCode: m.memberCode,
    memberName: m.memberName,
    memberType: m.memberType,
    category: m.category?.categoryName ?? 'Unassigned',
    categoryId: m.categoryId,
    categoryColor: m.category?.color ?? '#94a3b8',
    maxBooks: m.category?.maxBooks ?? 3,
    issueDays: m.category?.issueDays ?? 14,
    className: m.className,
    sectionName: m.sectionName,
    classLabel: m.className ? `${m.className}${m.sectionName ? `-${m.sectionName}` : ''}` : m.memberType,
    mobile: m.mobile,
    email: m.email,
    barcodeUid: m.barcodeUid || m.memberCode,
    cardType: m.cardType,
    cardIssued: Boolean(m.cardIssuedAt),
    cardIssuedAt: m.cardIssuedAt ? formatDate(m.cardIssuedAt) : null,
    branch: m.branch.branchName,
    academicYear: m.academicYear,
    status: m.status,
    suspendedReason: m.suspendedReason,
    lastSyncedAt: m.lastSyncedAt ? formatDate(m.lastSyncedAt) : null,
    activeIssues: extras?.activeIssues ?? 0,
    pendingFines: extras?.pendingFines ?? 0,
    isDefaulter: (extras?.pendingFines ?? 0) > 0 || (extras?.activeIssues ?? 0) > 0 && m.status === 'SUSPENDED',
  };
}

export async function getLibraryMembers(
  institutionId: string,
  academicYear = '2025-26',
  filters: { q?: string; status?: string; memberType?: string; categoryId?: string; branchId?: string } = {},
) {
  await ensureCategories(institutionId);
  const where: Record<string, unknown> = { institutionId, academicYear };
  if (filters.status && filters.status !== 'ALL') where.status = filters.status;
  if (filters.memberType && filters.memberType !== 'ALL') where.memberType = filters.memberType;
  if (filters.categoryId && filters.categoryId !== 'ALL') where.categoryId = filters.categoryId;
  if (filters.branchId && filters.branchId !== 'ALL') where.branchId = filters.branchId;
  if (filters.q?.trim()) {
    where.OR = [
      { memberName: { contains: filters.q, mode: 'insensitive' } },
      { memberCode: { contains: filters.q, mode: 'insensitive' } },
      { barcodeUid: { contains: filters.q, mode: 'insensitive' } },
      { mobile: { contains: filters.q, mode: 'insensitive' } },
      { email: { contains: filters.q, mode: 'insensitive' } },
    ];
  }

  const [members, categories, branches, activeCount, inactiveCount, defaulterIds] = await Promise.all([
    prisma.libMember.findMany({
      where,
      include: { category: true, branch: true },
      orderBy: { memberName: 'asc' },
      take: 100,
    }),
    prisma.libMemberCategory.findMany({ where: { institutionId, status: 'ACTIVE' }, orderBy: { categoryName: 'asc' } }),
    prisma.libBranch.findMany({ where: { institutionId, status: 'ACTIVE' }, orderBy: { branchName: 'asc' } }),
    prisma.libMember.count({ where: { institutionId, academicYear, status: 'ACTIVE' } }),
    prisma.libMember.count({ where: { institutionId, academicYear, status: { in: ['SUSPENDED', 'INACTIVE'] } } }),
    prisma.libFineLedger.findMany({
      where: { institutionId, status: 'PENDING' },
      select: { memberId: true },
      distinct: ['memberId'],
    }),
  ]);

  const memberIds = members.map((m) => m.id);
  const [issueCounts, fineSums] = await Promise.all([
    prisma.libIssue.groupBy({
      by: ['memberId'],
      where: { memberId: { in: memberIds }, status: { in: ['ISSUED', 'OVERDUE'] } },
      _count: true,
    }),
    prisma.libFineLedger.groupBy({
      by: ['memberId'],
      where: { memberId: { in: memberIds }, status: 'PENDING' },
      _sum: { amount: true },
    }),
  ]);

  const issueMap = new Map(issueCounts.map((i) => [i.memberId, i._count]));
  const fineMap = new Map(fineSums.map((f) => [f.memberId, f._sum.amount ?? 0]));

  const typeDist = await prisma.libMember.groupBy({
    by: ['memberType'],
    where: { institutionId, academicYear, status: 'ACTIVE' },
    _count: true,
  });

  const rows = await Promise.all(
    members.map((m) => mapMemberRow(m, {
      activeIssues: issueMap.get(m.id) ?? 0,
      pendingFines: fineMap.get(m.id) ?? 0,
    })),
  );

  const defaulters = rows.filter((r) => r.pendingFines > 0 || (r.activeIssues > 0 && r.status === 'SUSPENDED'));

  return {
    academicYear,
    academicYears: ACADEMIC_YEARS,
    branches: branches.map((b) => ({ id: b.id, name: b.branchName })),
    categories: categories.map((c) => ({
      id: c.id,
      code: c.categoryCode,
      name: c.categoryName,
      memberType: c.memberType,
      maxBooks: c.maxBooks,
      issueDays: c.issueDays,
      color: c.color,
    })),
    members: rows,
    kpis: {
      totalMembers: activeCount + inactiveCount,
      activeMembers: activeCount,
      inactiveMembers: inactiveCount,
      defaulters: defaulterIds.length,
    },
    memberTypeDistribution: typeDist.map((t) => ({
      name: t.memberType === 'STUDENT' ? 'Students' : t.memberType === 'TEACHER' ? 'Teachers' : t.memberType === 'STAFF' ? 'Staff' : 'Others',
      memberType: t.memberType,
      value: t._count,
      percent: activeCount > 0 ? `${Math.round((t._count / activeCount) * 1000) / 10}%` : '0%',
      color: t.memberType === 'STUDENT' ? '#3b82f6' : t.memberType === 'TEACHER' ? '#10b981' : t.memberType === 'STAFF' ? '#f59e0b' : '#8b5cf6',
    })),
    defaulters: defaulters.slice(0, 10),
    reports: ['Active vs. Inactive Members', 'Defaulter List', 'Member Type Distribution'],
    mobileSync: ['Digital Library Card', 'Barcode/QR Code', 'Borrowing limits', 'Fine history'],
    erpIntegration: ['Student Management', 'Staff Management', 'Admission auto-onboarding'],
    roles: ['Librarian', 'Admin'],
  };
}

export async function getLibraryMemberDetail(institutionId: string, memberId: string) {
  const member = await prisma.libMember.findFirst({
    where: { institutionId, id: memberId },
    include: { category: true, branch: true },
  });
  if (!member) throw new Error('Member not found');

  const [issues, fines, reservations, circulation] = await Promise.all([
    prisma.libIssue.findMany({
      where: { institutionId, memberId },
      include: { book: true },
      orderBy: { issueDate: 'desc' },
      take: 20,
    }),
    prisma.libFineLedger.findMany({
      where: { institutionId, memberId },
      orderBy: { createdAt: 'desc' },
      take: 15,
    }),
    prisma.libReservation.findMany({
      where: { institutionId, memberId },
      include: { book: true },
      orderBy: { reservedAt: 'desc' },
      take: 10,
    }),
    prisma.libCirculationTxn.findMany({
      where: { institutionId, memberId },
      include: { book: true },
      orderBy: { createdAt: 'desc' },
      take: 15,
    }),
  ]);

  const activeIssues = issues.filter((i) => i.status === 'ISSUED' || i.status === 'OVERDUE').length;
  const pendingFines = fines.filter((f) => f.status === 'PENDING').reduce((s, f) => s + f.amount, 0);

  return {
    ...(await mapMemberRow(member, { activeIssues, pendingFines })),
    demographics: {
      erpUserId: member.erpUserId,
      erpSource: member.erpSource,
      gender: member.memberType,
      enrolledSince: formatDate(member.createdAt),
    },
    borrowingHistory: issues.map((i) => ({
      id: i.id,
      txnNumber: i.txnNumber,
      bookTitle: i.book.title,
      accessionNo: i.accessionNo || i.book.bookCode,
      issueDate: formatDate(i.issueDate),
      dueDate: formatDate(i.dueDate),
      returnDate: i.returnDate ? formatDate(i.returnDate) : null,
      status: i.status,
      fineAmount: i.fineAmount,
    })),
    fineHistory: fines.map((f) => ({
      id: f.id,
      amount: f.amount,
      fineType: f.fineType,
      description: f.description,
      status: f.status,
      date: formatDate(f.createdAt),
    })),
    reservations: reservations.map((r) => ({
      id: r.id,
      bookTitle: r.book.title,
      status: r.status,
      reservedAt: formatDate(r.reservedAt),
    })),
    activityLog: circulation.map((c) => ({
      id: c.id,
      txnType: c.txnType,
      txnNumber: c.txnNumber,
      bookTitle: c.book.title,
      date: formatDate(c.createdAt),
      fineAmount: c.fineAmount,
    })),
    digitalCard: {
      memberCode: member.memberCode,
      barcodeUid: member.barcodeUid || member.memberCode,
      qrPayload: `LIBCARD:${member.memberCode}:${member.id}`,
      cardType: member.cardType,
    },
    canDelete: activeIssues === 0 && pendingFines === 0,
  };
}

export async function syncErpMembers(institutionId: string, academicYear = '2025-26') {
  const categories = await ensureCategories(institutionId);
  const branch = await prisma.libBranch.findFirst({
    where: { institutionId, status: 'ACTIVE' },
    orderBy: { branchName: 'asc' },
  });
  if (!branch) throw new Error('No library branch configured');

  const [students, staff] = await Promise.all([
    prisma.student.findMany({
      where: { institutionId, academicYear },
      take: 500,
      orderBy: { firstName: 'asc' },
    }),
    prisma.staffAttendanceProfile.findMany({
      where: { institutionId, academicYear },
      take: 200,
      orderBy: { staffName: 'asc' },
    }),
  ]);

  let created = 0;
  let updated = 0;
  let suspended = 0;
  const now = new Date();

  for (const s of students) {
    const memberType = 'STUDENT';
    const category = pickCategory(categories, memberType);
    const memberName = `${s.firstName} ${s.lastName}`.trim();
    const memberCode = s.admissionNumber || `STU-${s.id.slice(0, 8)}`;
    const erpStatus = s.status === 'ACTIVE' ? 'ACTIVE' : 'SUSPENDED';
    const suspendedReason = erpStatus === 'SUSPENDED' ? `Student status: ${s.status}` : '';

    const existing = await prisma.libMember.findUnique({
      where: { institutionId_erpUserId_erpSource: { institutionId, erpUserId: s.id, erpSource: 'STUDENT' } },
    });

    if (existing) {
      await prisma.libMember.update({
        where: { id: existing.id },
        data: {
          memberName,
          memberCode,
          className: s.className,
          sectionName: s.sectionName,
          mobile: s.mobile || s.fatherMobile,
          email: s.email,
          barcodeUid: s.rfidTag || existing.barcodeUid,
          memberType,
          categoryId: category?.id,
          status: erpStatus,
          suspendedReason,
          lastSyncedAt: now,
          academicYear,
        },
      });
      updated++;
      if (erpStatus === 'SUSPENDED') suspended++;
    } else if (erpStatus === 'ACTIVE') {
      const row = await prisma.libMember.create({
        data: {
          institutionId,
          branchId: branch.id,
          erpUserId: s.id,
          erpSource: 'STUDENT',
          memberCode,
          memberName,
          memberType,
          categoryId: category?.id,
          className: s.className,
          sectionName: s.sectionName,
          mobile: s.mobile || s.fatherMobile,
          email: s.email,
          barcodeUid: s.rfidTag || memberCode,
          cardType: 'VIRTUAL',
          cardIssuedAt: now,
          academicYear,
          status: 'ACTIVE',
          lastSyncedAt: now,
        },
      });
      await logActivity(institutionId, 'ERP_SYNC', `Auto-created library profile for student ${memberName}`, row.id);
      await sendWelcome(institutionId, memberName, s.email || s.mobile, category);
      created++;
    }
  }

  for (const st of staff) {
    const memberType = mapMemberTypeFromStaff(st.designation, st.department);
    const category = pickCategory(categories, memberType);
    const memberCode = st.employeeCode || st.recordId;
    const erpStatus = st.isActive ? 'ACTIVE' : 'SUSPENDED';
    const suspendedReason = erpStatus === 'SUSPENDED' ? 'Staff resigned or deactivated in HR module' : '';

    const existing = await prisma.libMember.findUnique({
      where: { institutionId_erpUserId_erpSource: { institutionId, erpUserId: st.id, erpSource: 'STAFF' } },
    });

    if (existing) {
      await prisma.libMember.update({
        where: { id: existing.id },
        data: {
          memberName: st.staffName,
          memberCode,
          mobile: st.mobile,
          email: st.email,
          memberType,
          categoryId: category?.id,
          status: erpStatus,
          suspendedReason,
          lastSyncedAt: now,
          academicYear,
        },
      });
      updated++;
      if (erpStatus === 'SUSPENDED') suspended++;
    } else if (erpStatus === 'ACTIVE') {
      const row = await prisma.libMember.create({
        data: {
          institutionId,
          branchId: branch.id,
          erpUserId: st.id,
          erpSource: 'STAFF',
          memberCode,
          memberName: st.staffName,
          memberType,
          categoryId: category?.id,
          mobile: st.mobile,
          email: st.email,
          barcodeUid: memberCode,
          cardType: 'VIRTUAL',
          cardIssuedAt: now,
          academicYear,
          status: 'ACTIVE',
          lastSyncedAt: now,
        },
      });
      await logActivity(institutionId, 'ERP_SYNC', `Auto-created library profile for staff ${st.staffName}`, row.id);
      await sendWelcome(institutionId, st.staffName, st.email || st.mobile, category);
      created++;
    }
  }

  await logActivity(
    institutionId,
    'ERP_SYNC',
    `ERP sync complete — ${created} created, ${updated} updated, ${suspended} suspended`,
  );

  return {
    created,
    updated,
    suspended,
    studentsProcessed: students.length,
    staffProcessed: staff.length,
    message: `Synced ${created + updated} members from ERP (${created} new, ${updated} updated)`,
  };
}

async function sendWelcome(
  institutionId: string,
  memberName: string,
  contact: string,
  category: { categoryName: string; maxBooks: number; issueDays: number } | undefined,
) {
  const limits = category ? `${category.maxBooks} books for ${category.issueDays} days` : 'standard borrowing limits';
  await logActivity(
    institutionId,
    'WELCOME',
    `Welcome notification sent to ${memberName} (${contact}) — ${limits} via Email/App`,
  );
}

export async function updateMemberCategory(
  institutionId: string,
  memberId: string,
  categoryId: string,
) {
  const category = await prisma.libMemberCategory.findFirst({
    where: { institutionId, id: categoryId, status: 'ACTIVE' },
  });
  if (!category) throw new Error('Category not found');

  await prisma.libMember.update({
    where: { id: memberId },
    data: { categoryId, memberType: category.memberType },
  });
  return getLibraryMemberDetail(institutionId, memberId);
}

export async function issueLibraryCard(
  institutionId: string,
  memberId: string,
  cardType: 'VIRTUAL' | 'PHYSICAL',
  barcodeUid?: string,
) {
  const member = await prisma.libMember.findFirst({ where: { institutionId, id: memberId } });
  if (!member) throw new Error('Member not found');

  await prisma.libMember.update({
    where: { id: memberId },
    data: {
      cardType,
      cardIssuedAt: new Date(),
      barcodeUid: barcodeUid || member.barcodeUid || member.memberCode,
    },
  });
  await logActivity(institutionId, 'ISSUE_CARD', `${cardType} library card issued`, memberId);
  return getLibraryMemberDetail(institutionId, memberId);
}

export async function deleteLibraryMember(institutionId: string, memberId: string) {
  const detail = await getLibraryMemberDetail(institutionId, memberId);
  if (!detail.canDelete) {
    throw new Error('Cannot delete — member has active issued books or pending fines');
  }
  await prisma.libMember.delete({ where: { id: memberId } });
  await logActivity(institutionId, 'DELETE', `Member ${detail.memberName} removed`, memberId);
  return { success: true, message: 'Member deleted successfully' };
}

export async function seedLibraryMembers(institutionId: string) {
  await seedLibraryCirculation(institutionId);
  await ensureCategories(institutionId);

  const categories = await prisma.libMemberCategory.findMany({ where: { institutionId } });
  const members = await prisma.libMember.findMany({ where: { institutionId } });

  for (const m of members) {
    if (!m.categoryId) {
      const cat = pickCategory(categories, m.memberType);
      if (cat) {
        await prisma.libMember.update({
          where: { id: m.id },
          data: {
            categoryId: cat.id,
            erpUserId: m.erpUserId || m.id,
            erpSource: m.erpSource === 'MANUAL' ? 'MANUAL' : m.erpSource,
            barcodeUid: m.barcodeUid || m.memberCode,
            cardIssuedAt: m.cardIssuedAt ?? new Date(),
          },
        });
      }
    }
  }

  await syncErpMembers(institutionId);
  return getLibraryMembers(institutionId);
}
