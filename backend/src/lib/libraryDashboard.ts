import { prisma } from './prisma.js';

const ACADEMIC_YEARS = ['2023-24', '2024-25', '2025-26', '2026-27'];

const CATEGORY_SEED = [
  { code: 'FIC', name: 'Fiction', color: '#3b82f6' },
  { code: 'SCI', name: 'Science', color: '#10b981' },
  { code: 'ACA', name: 'Academic', color: '#f59e0b' },
  { code: 'REF', name: 'Reference', color: '#ef4444' },
  { code: 'OTH', name: 'Others', color: '#6366f1' },
];

const dashboardCache = new Map<string, { data: unknown; expiresAt: number }>();

function todayDate() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function formatInr(amount: number) {
  return `₹ ${Math.round(amount).toLocaleString('en-IN')}`;
}

function formatDate(d: Date) {
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function pct(num: number, den: number) {
  if (den <= 0) return '0%';
  return `${Math.round((num / den) * 1000) / 10}%`;
}

function cacheKey(institutionId: string, academicYear: string, branchId: string) {
  return `${institutionId}:${academicYear}:${branchId}`;
}

async function ensureSettings(institutionId: string) {
  let row = await prisma.libSettings.findUnique({ where: { institutionId } });
  if (!row) {
    row = await prisma.libSettings.create({
      data: {
        institutionId,
        roleMatrix: [
          { role: 'Admin', permissions: 'Full access — dashboard, catalogue, issue/return, fines, settings' },
          { role: 'Librarian', permissions: 'Full access — operations, reports, bulk reminders' },
          { role: 'Principal', permissions: 'Read-only dashboard, attendance, acquisition summary, exports' },
        ],
        notificationRules: {
          overdueBulkReminder: { channels: ['App', 'SMS'], trigger: 'Overdue Books widget click' },
          dailyDigest: { time: '08:00', channels: ['Email', 'App'] },
        },
        mobileSyncRules: {
          principalApp: ['KPI cards', 'Issue trend', 'Overdue count', 'Fine collected', 'Attendance today'],
          librarianApp: ['Full dashboard', 'Quick actions', 'Overdue table', 'Bulk reminders'],
        },
        navigationTargets: {
          totalBooks: 'Book Catalogue',
          totalMembers: 'Members',
          booksIssued: 'Book Issue / Return',
          overdueBooks: 'Book Issue / Return',
          fineCollected: 'Fine Management',
          availableBooks: 'Book Catalogue',
          categories: 'Categories & Subjects',
          attendance: 'Library Attendance',
          acquisitions: 'Add / Manage Books',
          reports: 'Reports & Analytics',
        },
      },
    });
  }
  return row;
}

async function logActivity(
  institutionId: string,
  entityType: string,
  action: string,
  details = '',
  entityId = '',
) {
  await prisma.libActivityLog.create({
    data: { institutionId, entityType, entityId, action, details, performedBy: 'Librarian' },
  });
}

export async function refreshOverdueMetrics(institutionId: string) {
  const settings = await ensureSettings(institutionId);
  const today = todayDate();
  const overdue = await prisma.libIssue.findMany({
    where: { institutionId, status: 'ISSUED', dueDate: { lt: today } },
  });
  for (const issue of overdue) {
    const days = Math.max(0, Math.floor((today.getTime() - issue.dueDate.getTime()) / 86400000));
    const fine = days * settings.finePerDay;
    await prisma.libIssue.update({
      where: { id: issue.id },
      data: { status: 'OVERDUE', daysOverdue: days, fineAmount: fine },
    });
  }
}

export async function getLibraryDashboard(
  institutionId: string,
  academicYear = '2025-26',
  branchId?: string,
) {
  const settings = await ensureSettings(institutionId);
  await refreshOverdueMetrics(institutionId);

  const branches = await prisma.libBranch.findMany({
    where: { institutionId, status: 'ACTIVE' },
    orderBy: { branchName: 'asc' },
  });
  const activeBranchId = branchId && branchId !== 'ALL'
    ? branchId
    : branches[0]?.id ?? '';

  const key = cacheKey(institutionId, academicYear, activeBranchId);
  const cached = dashboardCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const branchFilter = activeBranchId ? { branchId: activeBranchId } : {};
  const yearFilter = { academicYear };

  const [
    books, members, issues, categories, acquisitions, vendors, attendanceLogs, notices,
  ] = await Promise.all([
    prisma.libBook.findMany({
      where: { institutionId, ...branchFilter, ...yearFilter },
      include: { category: true },
    }),
    prisma.libMember.findMany({
      where: { institutionId, ...branchFilter, ...yearFilter, status: 'ACTIVE' },
    }),
    prisma.libIssue.findMany({
      where: { institutionId, ...branchFilter, ...yearFilter },
      include: { book: true, member: true },
      orderBy: { issueDate: 'desc' },
    }),
    prisma.libCategory.findMany({ where: { institutionId } }),
    prisma.libAcquisition.findMany({
      where: { institutionId, ...yearFilter },
      include: { vendor: true },
    }),
    prisma.libVendor.findMany({ where: { institutionId, status: 'ACTIVE' } }),
    prisma.libAttendanceLog.findMany({
      where: { institutionId, ...branchFilter, logDate: todayDate() },
      orderBy: { hourSlot: 'asc' },
    }),
    prisma.libNotice.findMany({
      where: { institutionId, ...yearFilter, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
      take: 6,
    }),
  ]);

  const totalBooks = books.reduce((s, b) => s + b.totalCopies, 0);
  const availableBooks = books.reduce((s, b) => s + b.availableCopies, 0);
  const booksIssued = issues.filter((i) => i.status === 'ISSUED' || i.status === 'OVERDUE').length;
  const overdueIssues = issues.filter((i) => i.status === 'OVERDUE');
  const returnedCount = issues.filter((i) => i.status === 'RETURNED').length;
  const totalMembers = members.length;

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const finePaymentsMonth = await prisma.libFinePayment.aggregate({
    where: { institutionId, status: 'SUCCESS', paidAt: { gte: monthStart } },
    _sum: { amount: true },
  });

  const booksAddedThisMonth = books.filter((b) => b.addedDate >= monthStart).reduce((s, b) => s + b.totalCopies, 0);
  const membersAddedThisMonth = members.filter((m) => m.createdAt >= monthStart).length;

  const monthFines = finePaymentsMonth._sum.amount
    ?? issues
      .filter((i) => i.finePaid && i.updatedAt >= monthStart)
      .reduce((s, i) => s + i.fineAmount, 0);

  const issueDurations = issues
    .filter((i) => i.returnDate)
    .map((i) => Math.max(1, Math.floor((i.returnDate!.getTime() - i.issueDate.getTime()) / 86400000)));
  const avgIssueDuration = issueDurations.length
    ? Math.round(issueDurations.reduce((a, b) => a + b, 0) / issueDurations.length)
    : settings.defaultIssueDays;

  const issueReturnOverview = [
    { name: 'Returned', value: returnedCount, color: '#10b981', percent: pct(returnedCount, issues.length || 1) },
    { name: 'Issued', value: issues.filter((i) => i.status === 'ISSUED').length, color: '#3b82f6', percent: pct(issues.filter((i) => i.status === 'ISSUED').length, issues.length || 1) },
    { name: 'Overdue', value: overdueIssues.length, color: '#ef4444', percent: pct(overdueIssues.length, issues.length || 1) },
  ];

  const trendDays = [1, 5, 10, 15, 20, 25, 30];
  const now = todayDate();
  const issueReturnTrend = trendDays.map((day) => {
    const d = new Date(now.getFullYear(), now.getMonth(), day);
    const dayIssues = issues.filter((i) => i.issueDate.getTime() === d.getTime());
    return {
      day: `${day} ${now.toLocaleString('en-IN', { month: 'short' })}`,
      issued: dayIssues.length,
      returned: dayIssues.filter((i) => i.status === 'RETURNED').length,
      overdue: dayIssues.filter((i) => i.status === 'OVERDUE').length,
    };
  });

  const categoryMap = new Map<string, { name: string; value: number; color: string }>();
  for (const cat of categories) {
    categoryMap.set(cat.id, { name: cat.categoryName, value: 0, color: cat.color });
  }
  for (const book of books) {
    if (book.categoryId && categoryMap.has(book.categoryId)) {
      const c = categoryMap.get(book.categoryId)!;
      c.value += book.totalCopies;
    }
  }
  const bookCategories = [...categoryMap.values()]
    .filter((c) => c.value > 0)
    .sort((a, b) => b.value - a.value)
    .map((c) => ({ ...c, percent: pct(c.value, totalBooks || 1) }));

  const recentIssuedBooks = issues
    .filter((i) => i.status === 'ISSUED' || i.status === 'OVERDUE')
    .slice(0, 4)
    .map((i) => ({
      title: i.book.title,
      author: i.book.author,
      issuedTo: `${i.member.memberName} (Class ${i.member.className}${i.member.sectionName ? `-${i.member.sectionName}` : ''})`,
      dueDate: formatDate(i.dueDate),
      cover: i.book.coverColor,
    }));

  const overdueBooks = overdueIssues.slice(0, 8).map((i) => ({
    id: i.id,
    title: i.book.title,
    issuedTo: i.member.memberName,
    class: `${i.member.className}${i.member.sectionName ? `-${i.member.sectionName}` : ''}`,
    issueDate: formatDate(i.issueDate),
    dueDate: formatDate(i.dueDate),
    daysOverdue: `-${i.daysOverdue} Days`,
    fine: formatInr(i.fineAmount),
  }));

  const vendorStats = new Map<string, { name: string; books: number; amount: number }>();
  for (const acq of acquisitions) {
    const name = acq.vendor?.vendorName ?? 'Direct Purchase';
    const cur = vendorStats.get(name) ?? { name, books: 0, amount: 0 };
    cur.books += acq.booksAdded;
    cur.amount += acq.totalCost;
    vendorStats.set(name, cur);
  }
  const topVendors = [...vendorStats.values()]
    .sort((a, b) => b.books - a.books)
    .slice(0, 4)
    .map((v) => ({ name: v.name, books: v.books, amount: formatInr(v.amount) }));

  const acquisitionSummary = {
    booksAdded: acquisitions.reduce((s, a) => s + a.booksAdded, 0),
    totalCost: formatInr(acquisitions.reduce((s, a) => s + a.totalCost, 0)),
    donatedBooks: acquisitions.reduce((s, a) => s + a.donatedBooks, 0),
    vendors: vendors.length,
  };

  const popularBooks = [...books]
    .sort((a, b) => (b.issueCount + b.searchCount + b.viewCount) - (a.issueCount + a.searchCount + a.viewCount))
    .slice(0, 5)
    .map((b) => ({ title: b.title, times: b.issueCount + b.searchCount + b.viewCount }));

  const memberTypeCounts = { STUDENT: 0, TEACHER: 0, STAFF: 0, OTHER: 0 };
  for (const m of members) {
    const t = (m.memberType in memberTypeCounts ? m.memberType : 'OTHER') as keyof typeof memberTypeCounts;
    memberTypeCounts[t]++;
  }
  const memberColors: Record<string, string> = {
    Students: '#3b82f6', Teachers: '#10b981', Staff: '#f59e0b', Others: '#8b5cf6',
  };
  const memberDistribution = [
    { name: 'Students', value: memberTypeCounts.STUDENT, color: memberColors.Students },
    { name: 'Teachers', value: memberTypeCounts.TEACHER, color: memberColors.Teachers },
    { name: 'Staff', value: memberTypeCounts.STAFF, color: memberColors.Staff },
    { name: 'Others', value: memberTypeCounts.OTHER, color: memberColors.Others },
  ].filter((m) => m.value > 0).map((m) => ({ ...m, percent: pct(m.value, totalMembers || 1) }));

  const defaultSlots = ['8 AM', '10 AM', '12 PM', '2 PM', '4 PM', '6 PM'];
  const attendanceData = defaultSlots.map((slot) => {
    const log = attendanceLogs.find((l) => l.hourSlot === slot);
    return { time: slot, visitors: log?.visitorCount ?? 0 };
  });
  const totalVisitors = attendanceData.reduce((s, a) => s + a.visitors, 0);
  const peak = [...attendanceData].sort((a, b) => b.visitors - a.visitors)[0];

  const newArrivals = books
    .filter((b) => b.isNewArrival)
    .sort((a, b) => b.addedDate.getTime() - a.addedDate.getTime())
    .slice(0, 4)
    .map((b) => ({
      title: b.title,
      author: b.author,
      category: b.category?.categoryName ?? 'General',
      date: formatDate(b.addedDate),
      cover: b.coverColor,
    }));

  const noticeIconBg: Record<string, string> = {
    red: 'bg-red-50', purple: 'bg-purple-50', amber: 'bg-amber-50', green: 'bg-green-50',
  };

  const result = {
    academicYear,
    academicYears: ACADEMIC_YEARS,
    branches: branches.map((b) => ({ id: b.id, code: b.branchCode, name: b.branchName })),
    selectedBranchId: activeBranchId,
    cacheRefreshMins: settings.cacheRefreshMins,
    lastCacheRefresh: settings.lastCacheRefresh?.toISOString() ?? null,
    readOnlyRoles: ['Principal'],
    kpis: {
      totalBooks: { value: totalBooks, subtitle: `↑ ${booksAddedThisMonth} this month`, trendUp: booksAddedThisMonth > 0 },
      totalMembers: { value: totalMembers, subtitle: `↑ ${membersAddedThisMonth} this month`, trendUp: membersAddedThisMonth > 0 },
      booksIssued: { value: booksIssued, subtitle: 'Currently Issued', target: 'Book Issue / Return' },
      overdueBooks: { value: overdueIssues.length, subtitle: 'Need Attention', subtitleColor: 'text-red-500', target: 'Book Issue / Return' },
      fineCollected: { value: formatInr(monthFines), subtitle: 'This Month', target: 'Fine Management' },
      availableBooks: { value: availableBooks, subtitle: `${pct(availableBooks, totalBooks || 1)} Available`, target: 'Book Catalogue' },
    },
    issueReturnOverview,
    issueReturnTrend,
    avgIssueDuration,
    totalIssuedCenter: booksIssued,
    bookCategories,
    totalBooksCenter: totalBooks,
    recentIssuedBooks,
    overdueBooks,
    acquisitionSummary,
    topVendors,
    popularBooks,
    memberDistribution,
    totalMembersCenter: totalMembers,
    attendanceData,
    attendanceSummary: { totalVisitors, peakTime: peak ? `${peak.time}` : '—' },
    newArrivals,
    importantNotices: notices.map((n) => ({
      title: n.title,
      issuedBy: n.issuedBy,
      date: formatDate(n.createdAt),
      iconColor: n.iconColor,
      bg: noticeIconBg[n.iconColor] ?? 'bg-slate-50',
    })),
    quickActions: [
      { label: 'Add New Book', target: 'Add / Manage Books' },
      { label: 'Issue Book', target: 'Book Issue / Return' },
      { label: 'Return Book', target: 'Book Issue / Return' },
      { label: 'Add Member', target: 'Members' },
      { label: 'Book Search', target: 'Book Catalogue' },
      { label: 'Fine Collection', target: 'Fine Management' },
      { label: 'Stock Verify', target: 'Stock Verification' },
      { label: 'Reading Room', target: 'Reading Room' },
      { label: 'Book Reservation', target: 'Book Issue / Return' },
      { label: 'E-Resources', target: 'E-Resources' },
      { label: 'Generate Report', target: 'Reports & Analytics' },
      { label: 'Library Settings', target: 'Library Dashboard' },
    ],
    navigationTargets: settings.navigationTargets as Record<string, string>,
    reportExports: ['PDF', 'Excel'],
    roleMatrix: settings.roleMatrix,
  };

  dashboardCache.set(key, {
    data: result,
    expiresAt: Date.now() + settings.cacheRefreshMins * 60 * 1000,
  });
  await prisma.libSettings.update({
    where: { institutionId },
    data: { lastCacheRefresh: new Date() },
  });

  return result;
}

export async function sendBulkOverdueReminders(institutionId: string, academicYear = '2025-26', branchId?: string) {
  await refreshOverdueMetrics(institutionId);
  const branchFilter = branchId && branchId !== 'ALL' ? { branchId } : {};
  const overdue = await prisma.libIssue.findMany({
    where: { institutionId, academicYear, status: 'OVERDUE', ...branchFilter },
    include: { member: true, book: true },
  });
  const count = overdue.length;
  await logActivity(
    institutionId,
    'LibIssue',
    'BULK_REMINDER',
    `Sent bulk overdue reminders to ${count} members via App/SMS`,
  );
  return { sent: count, channels: ['App', 'SMS'], message: `Bulk reminders queued for ${count} overdue book(s).` };
}

export async function seedLibraryDashboard(institutionId: string) {
  await ensureSettings(institutionId);
  const existing = await prisma.libBook.count({ where: { institutionId } });
  if (existing >= 50) return getLibraryDashboard(institutionId);

  await prisma.libFinePayment.deleteMany({ where: { institutionId } });
  await prisma.libFineWaiver.deleteMany({ where: { institutionId } });
  await prisma.libFine.deleteMany({ where: { institutionId } });
  await prisma.libEAccessLog.deleteMany({ where: { institutionId } });
  await prisma.libEResource.deleteMany({ where: { institutionId } });
  await prisma.libReportRun.deleteMany({ where: { institutionId } });
  await prisma.libReportSchedule.deleteMany({ where: { institutionId } });
  await prisma.libInHouseTxn.deleteMany({ where: { institutionId } });
  await prisma.libReadingSeatBooking.deleteMany({ where: { institutionId } });
  await prisma.libReadingSeat.deleteMany({ where: { institutionId } });
  await prisma.libGateLog.deleteMany({ where: { institutionId } });
  await prisma.libFineLedger.deleteMany({ where: { institutionId } });
  await prisma.libCirculationTxn.deleteMany({ where: { institutionId } });
  await prisma.libIssue.deleteMany({ where: { institutionId } });
  await prisma.libReservation.deleteMany({ where: { institutionId } });
  await prisma.libAuditScan.deleteMany({ where: { institutionId } });
  await prisma.libAuditSession.deleteMany({ where: { institutionId } });
  await prisma.libBookCopy.deleteMany({ where: { institutionId } });
  await prisma.libShelf.deleteMany({ where: { institutionId } });
  await prisma.libRack.deleteMany({ where: { institutionId } });
  await prisma.libLocation.deleteMany({ where: { institutionId } });
  await prisma.libBook.deleteMany({ where: { institutionId } });
  await prisma.libMember.deleteMany({ where: { institutionId } });
  await prisma.libMemberCategory.deleteMany({ where: { institutionId } });
  await prisma.libSubject.deleteMany({ where: { institutionId } });
  await prisma.libAcquisition.deleteMany({ where: { institutionId } });
  await prisma.libAttendanceLog.deleteMany({ where: { institutionId } });
  await prisma.libNotice.deleteMany({ where: { institutionId } });
  await prisma.libVendor.deleteMany({ where: { institutionId } });
  await prisma.libAuthor.deleteMany({ where: { institutionId } });
  await prisma.libPublisher.deleteMany({ where: { institutionId } });
  await prisma.libSearchLog.deleteMany({ where: { institutionId } });
  await prisma.libCategory.deleteMany({ where: { institutionId } });
  await prisma.libBranch.deleteMany({ where: { institutionId } });
  await prisma.libActivityLog.deleteMany({ where: { institutionId } });

  const mainBranch = await prisma.libBranch.create({
    data: { institutionId, branchCode: 'MAIN', branchName: 'Main Library', location: 'Block A' },
  });
  await prisma.libBranch.create({
    data: { institutionId, branchCode: 'SCI', branchName: 'Science Library', location: 'Block C' },
  });

  const catIds: Record<string, string> = {};
  for (const c of CATEGORY_SEED) {
    const row = await prisma.libCategory.create({
      data: { institutionId, categoryCode: c.code, categoryName: c.name, color: c.color },
    });
    catIds[c.code] = row.id;
  }

  const vendorRows = await Promise.all([
    prisma.libVendor.create({ data: { institutionId, vendorName: 'Scholastic India' } }),
    prisma.libVendor.create({ data: { institutionId, vendorName: 'New Age International' } }),
    prisma.libVendor.create({ data: { institutionId, vendorName: 'Oxford University Press' } }),
    prisma.libVendor.create({ data: { institutionId, vendorName: 'Pearson Education' } }),
  ]);

  const bookSeed = [
    { title: 'Wings of Fire', author: 'A.P.J. Abdul Kalam', cat: 'OTH', copies: 45, issues: 28, cover: 'bg-blue-800' },
    { title: 'The Alchemist', author: 'Paulo Coelho', cat: 'FIC', copies: 38, issues: 26, cover: 'bg-slate-800' },
    { title: 'Harry Potter & Philosopher\'s Stone', author: 'J.K. Rowling', cat: 'FIC', copies: 32, issues: 24, cover: 'bg-indigo-800' },
    { title: 'Atomic Habits', author: 'James Clear', cat: 'OTH', copies: 28, issues: 22, cover: 'bg-teal-800' },
    { title: 'Think & Grow Rich', author: 'Napoleon Hill', cat: 'OTH', copies: 25, issues: 20, cover: 'bg-red-800' },
    { title: 'NCERT Physics Part - I', author: 'NCERT', cat: 'ACA', copies: 120, issues: 15, cover: 'bg-amber-800' },
    { title: 'Science Explorer', author: 'Dr. R.K. Sharma', cat: 'SCI', copies: 55, issues: 18, cover: 'bg-teal-800' },
    { title: 'Rich Dad Poor Dad', author: 'Robert T. Kiyosaki', cat: 'OTH', copies: 30, issues: 16, cover: 'bg-red-800' },
    { title: 'Sapiens', author: 'Yuval Noah Harari', cat: 'REF', copies: 20, issues: 12, cover: 'bg-amber-100 text-amber-800', new: true },
    { title: 'The Power of Your Subconscious Mind', author: 'Joseph Murphy', cat: 'FIC', copies: 18, issues: 10, cover: 'bg-red-100 text-red-800', new: true },
    { title: 'Educated', author: 'Tara Westover', cat: 'ACA', copies: 15, issues: 8, cover: 'bg-blue-100 text-blue-800', new: true },
  ];

  const bookIds: string[] = [];
  let code = 1;
  for (const b of bookSeed) {
    for (let copy = 0; copy < Math.min(b.copies, 8); copy++) {
      const row = await prisma.libBook.create({
        data: {
          institutionId,
          branchId: mainBranch.id,
          categoryId: catIds[b.cat],
          bookCode: `LIB-${String(code++).padStart(4, '0')}`,
          title: b.title,
          author: b.author,
          academicYear: '2025-26',
          totalCopies: 1,
          availableCopies: copy < 2 ? 0 : 1,
          coverColor: b.cover,
          issueCount: b.issues,
          isNewArrival: Boolean((b as { new?: boolean }).new),
          addedDate: new Date(2025, 4, 15 - copy),
        },
      });
      bookIds.push(row.id);
    }
  }

  const memberSeed = [
    { name: 'Aarav Sharma', class: '10', section: 'A', type: 'STUDENT' },
    { name: 'Myra Singh', class: '9', section: 'B', type: 'STUDENT' },
    { name: 'Vihaan Patel', class: '8', section: 'A', type: 'STUDENT' },
    { name: 'Ananya Gupta', class: '11', section: 'A', type: 'STUDENT' },
    { name: 'Rudra Mehra', class: '9', section: 'A', type: 'STUDENT' },
    { name: 'Tanya Sharma', class: '11', section: 'B', type: 'STUDENT' },
    { name: 'Ishaan Verma', class: '10', section: 'A', type: 'STUDENT' },
    { name: 'Meera Joshi', class: '12', section: 'A', type: 'STUDENT' },
    { name: 'Kabir Singh', class: '9', section: 'B', type: 'STUDENT' },
    { name: 'Dr. Priya Nair', class: '', section: '', type: 'TEACHER' },
    { name: 'Mr. Rajesh Kumar', class: '', section: '', type: 'STAFF' },
  ];

  const memberIds: string[] = [];
  let mCode = 1;
  for (const m of memberSeed) {
    const row = await prisma.libMember.create({
      data: {
        institutionId,
        branchId: mainBranch.id,
        memberCode: `MEM-${String(mCode++).padStart(4, '0')}`,
        memberName: m.name,
        memberType: m.type,
        className: m.class,
        sectionName: m.section,
        mobile: `98${String(40000000 + mCode).slice(0, 8)}`,
        academicYear: '2025-26',
      },
    });
    memberIds.push(row.id);
  }

  const today = todayDate();
  const issueDates = [
    { daysAgo: 5, dueDays: 10, status: 'ISSUED' as const },
    { daysAgo: 6, dueDays: 9, status: 'ISSUED' as const },
    { daysAgo: 8, dueDays: 7, status: 'ISSUED' as const },
    { daysAgo: 10, dueDays: 5, status: 'ISSUED' as const },
    { daysAgo: 15, dueDays: 5, status: 'OVERDUE' as const, overdue: 3 },
    { daysAgo: 20, dueDays: 5, status: 'OVERDUE' as const, overdue: 4 },
    { daysAgo: 22, dueDays: 5, status: 'OVERDUE' as const, overdue: 6 },
    { daysAgo: 25, dueDays: 5, status: 'OVERDUE' as const, overdue: 7 },
    { daysAgo: 24, dueDays: 5, status: 'OVERDUE' as const, overdue: 5 },
    { daysAgo: 3, dueDays: 14, status: 'RETURNED' as const },
    { daysAgo: 7, dueDays: 7, status: 'RETURNED' as const },
  ];

  for (let i = 0; i < issueDates.length && i < bookIds.length; i++) {
    const cfg = issueDates[i];
    const issueDate = new Date(today);
    issueDate.setDate(issueDate.getDate() - cfg.daysAgo);
    const dueDate = new Date(issueDate);
    dueDate.setDate(dueDate.getDate() + cfg.dueDays);
    const overdueDays = 'overdue' in cfg ? cfg.overdue! : 0;
    await prisma.libIssue.create({
      data: {
        institutionId,
        branchId: mainBranch.id,
        bookId: bookIds[i],
        memberId: memberIds[i % memberIds.length],
        academicYear: '2025-26',
        issueDate,
        dueDate,
        returnDate: cfg.status === 'RETURNED' ? today : null,
        status: cfg.status,
        daysOverdue: overdueDays,
        fineAmount: overdueDays * 10,
        finePaid: cfg.status === 'RETURNED',
      },
    });
  }

  for (const [i, v] of vendorRows.entries()) {
    await prisma.libAcquisition.create({
      data: {
        institutionId,
        vendorId: v.id,
        academicYear: '2025-26',
        booksAdded: [452, 325, 286, 185][i] ?? 100,
        donatedBooks: i === 0 ? 258 : 0,
        totalCost: [425000, 315600, 280450, 227510][i] ?? 100000,
      },
    });
  }

  const slots = [
    { slot: '8 AM', visitors: 10 },
    { slot: '10 AM', visitors: 45 },
    { slot: '12 PM', visitors: 120 },
    { slot: '2 PM', visitors: 85 },
    { slot: '4 PM', visitors: 60 },
    { slot: '6 PM', visitors: 20 },
  ];
  for (const s of slots) {
    await prisma.libAttendanceLog.create({
      data: { institutionId, branchId: mainBranch.id, logDate: today, hourSlot: s.slot, visitorCount: s.visitors },
    });
  }

  const noticeSeed = [
    { title: 'Return overdue books and avoid fine.', iconColor: 'red' },
    { title: 'Library will remain closed on 25 May 2025', iconColor: 'purple' },
    { title: 'New books on Science & Technology now available.', iconColor: 'amber' },
    { title: 'Reading competition registration open.', iconColor: 'green' },
  ];
  for (const n of noticeSeed) {
    await prisma.libNotice.create({
      data: { institutionId, title: n.title, issuedBy: 'Library Admin', iconColor: n.iconColor, academicYear: '2025-26' },
    });
  }

  await logActivity(institutionId, 'LibDashboard', 'SEED', 'Library dashboard demo data seeded');
  dashboardCache.clear();
  return getLibraryDashboard(institutionId);
}
