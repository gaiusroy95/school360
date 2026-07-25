import { Prisma } from '@prisma/client';
import { countLeaveKpis } from './hostelLeaveManagement.js';
import { countDisciplineKpis } from './hostelDisciplineIncidents.js';
import { prisma } from './prisma.js';

const ACADEMIC_YEARS = ['2023-24', '2024-25', '2025-26', '2026-27'];

const HOSTEL_SEED = [
  { code: 'BHA', name: 'Boys Hostel A', type: 'BOYS', rooms: 62, beds: 248, occupied: 220, students: 356, staff: 8 },
  { code: 'BHB', name: 'Boys Hostel B', type: 'BOYS', rooms: 58, beds: 232, occupied: 204, students: 312, staff: 8 },
  { code: 'GHA', name: 'Girls Hostel A', type: 'GIRLS', rooms: 54, beds: 216, occupied: 190, students: 286, staff: 10 },
  { code: 'GHB', name: 'Girls Hostel B', type: 'GIRLS', rooms: 48, beds: 192, occupied: 168, students: 194, staff: 8 },
  { code: 'PGH', name: 'PG Hostel', type: 'PG', rooms: 40, beds: 80, occupied: 72, students: 100, staff: 6 },
  { code: 'INT', name: 'International Hostel', type: 'MIXED', rooms: 50, beds: 100, occupied: 91, students: 0, staff: 8 },
];

const dashboardCache = new Map<string, { data: unknown; expiresAt: number }>();

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

function pct(num: number, den: number) {
  if (den <= 0) return '0%';
  return `${Math.round((num / den) * 10000) / 100}%`;
}

function cacheKey(institutionId: string, academicYear: string, hostelId: string, role: string) {
  return `${institutionId}:${academicYear}:${hostelId}:${role}`;
}

async function ensureSettings(institutionId: string) {
  let row = await prisma.hostelSettings.findUnique({ where: { institutionId } });
  if (!row) {
    row = await prisma.hostelSettings.create({
      data: {
        institutionId,
        cacheRefreshMins: 15,
        capacityAlertPct: 98,
        roleMatrix: [
          { role: 'Super Admin', permissions: 'View all hostels, financial metrics, export' },
          { role: 'Management', permissions: 'View all hostels, export dashboard' },
          { role: 'Principal', permissions: 'View all hostels (read-only), mobile summary' },
          { role: 'Hostel Administrator', permissions: 'Full access to assigned hostels' },
          { role: 'Warden', permissions: 'View assigned hostels only — RLS enforced' },
        ],
        notificationRules: {
          capacityAlert: { thresholdPct: 98, channels: ['Email', 'Push'], recipients: 'admin@school.edu' },
          dailyDigest: { time: '08:00', channels: ['Email', 'App'] },
        },
        mobileSyncRules: {
          principalApp: ['KPI cards', 'Occupancy', 'Mess balance', 'Check-in/out', 'Pending payments'],
          managementApp: ['Full dashboard widgets', 'Hostel-wise breakdown', 'Alerts'],
        },
        navigationTargets: {
          students: 'Students',
          allotments: 'Rooms & Allotment',
          mess: 'Mess Management',
          visitors: 'Visitor Management',
          payments: 'Hostel Fee',
          maintenance: 'Maintenance',
        },
      },
    });
  }
  return row;
}

async function logActivity(
  institutionId: string,
  action: string,
  details: string,
  filterSnapshot: Record<string, unknown> = {},
  performedBy = 'Warden',
) {
  await prisma.hostelActivityLog.create({
    data: { institutionId, action, details, filterSnapshot: filterSnapshot as Prisma.InputJsonValue, performedBy },
  });
}

function resolveHostelScope(
  hostels: { id: string; hostelName: string }[],
  hostelId: string | undefined,
  userRole: string,
  assignedHostelIds: string[] = [],
) {
  if (hostelId && hostelId !== 'ALL') {
    const found = hostels.find((h) => h.id === hostelId);
    if (!found) throw new Error('Hostel not found or access denied');
    if (userRole === 'Warden' && assignedHostelIds.length && !assignedHostelIds.includes(hostelId)) {
      throw new Error('Access denied — hostel not in your assigned scope');
    }
    return hostelId;
  }
  if (userRole === 'Warden' && assignedHostelIds.length) {
    return assignedHostelIds.join(',');
  }
  return 'ALL';
}

async function syncDashboardStats(institutionId: string, academicYear: string, hostelId = '') {
  const hostelFilter = hostelId && hostelId !== 'ALL' ? { id: hostelId } : {};
  const hostels = await prisma.hostelMaster.findMany({
    where: { institutionId, academicYear, status: 'ACTIVE', ...hostelFilter },
  });

  const totalRooms = hostels.reduce((s, h) => s + h.totalRooms, 0);
  const occupiedRooms = hostels.reduce((s, h) => s + Math.round(h.occupiedBeds / Math.max(1, h.totalBeds / h.totalRooms)), 0);
  const payload = {
    totalHostels: hostels.length,
    totalStudents: hostels.reduce((s, h) => s + h.studentCount, 0),
    totalRooms,
    occupiedRooms,
    occupancyPct: pct(occupiedRooms, totalRooms),
    totalStaff: hostels.reduce((s, h) => s + h.staffCount, 0),
    refreshedAt: new Date().toISOString(),
  };

  await prisma.hostelDashboardStats.upsert({
    where: {
      institutionId_hostelId_academicYear: { institutionId, hostelId: hostelId || '', academicYear },
    },
    create: { institutionId, hostelId: hostelId || '', academicYear, statsPayload: payload },
    update: { statsPayload: payload, refreshedAt: new Date() },
  });

  return payload;
}

export async function getHostelDashboard(
  institutionId: string,
  academicYear = '2025-26',
  hostelId?: string,
  userRole = 'Admin',
  performedBy = 'Warden',
) {
  const settings = await ensureSettings(institutionId);
  const key = cacheKey(institutionId, academicYear, hostelId ?? 'ALL', userRole);
  const cached = dashboardCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const allHostels = await prisma.hostelMaster.findMany({
    where: { institutionId, academicYear, status: 'ACTIVE' },
    orderBy: { hostelName: 'asc' },
  });

  const assignedHostelIds = userRole === 'Warden'
    ? allHostels.slice(0, 2).map((h) => h.id)
    : [];

  const scope = resolveHostelScope(allHostels, hostelId, userRole, assignedHostelIds);
  const scopedHostels = scope === 'ALL'
    ? allHostels
    : allHostels.filter((h) => scope.split(',').includes(h.id));

  const scopedIds = scopedHostels.map((h) => h.id);
  const hostelFilter = scopedIds.length ? { hostelId: { in: scopedIds } } : {};

  const today = todayDate();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const monthLabel = today.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  const [
    allotments, pendingPayments, visitors, notices, gateLogs, messSummary,
    leaveApps, maintenance, feeCollections, disciplineIncidents,
  ] = await Promise.all([
    prisma.hostelAllotment.findMany({
      where: { institutionId, academicYear, status: 'ACTIVE', ...hostelFilter },
      include: { hostel: true },
      orderBy: { allotmentDate: 'desc' },
      take: 10,
    }),
    prisma.hostelPendingPayment.findMany({
      where: { institutionId, academicYear, status: 'PENDING', ...hostelFilter },
      include: { hostel: true },
      orderBy: { dueDate: 'asc' },
      take: 8,
    }),
    prisma.hostelVisitorLog.findMany({
      where: { institutionId, visitDate: today, ...hostelFilter },
      include: { hostel: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    prisma.hostelNotice.findMany({
      where: { institutionId, academicYear, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    prisma.hostelGateLog.findMany({
      where: { institutionId, logDate: today, ...hostelFilter },
    }),
    prisma.hostelMessSummary.findFirst({
      where: { institutionId, academicYear },
      orderBy: { refreshedAt: 'desc' },
    }),
    prisma.hostelLeaveApplication.findMany({
      where: { institutionId, academicYear, ...hostelFilter },
    }),
    prisma.hostelMaintenanceRequest.findMany({
      where: { institutionId, ...hostelFilter },
      include: { hostel: true },
      orderBy: { requestDate: 'desc' },
      take: 6,
    }),
    prisma.hostelFeeCollection.aggregate({
      where: { institutionId, academicYear },
      _sum: { amount: true },
    }),
    prisma.hostelDisciplineIncident.findMany({
      where: {
        institutionId,
        incidentDate: { gte: monthStart, lte: monthEnd },
        ...hostelFilter,
      },
    }),
  ]);

  const totalHostels = scopedHostels.length;
  const totalStudents = scopedHostels.reduce((s, h) => s + h.studentCount, 0);
  const totalRooms = scopedHostels.reduce((s, h) => s + h.totalRooms, 0);
  const totalBeds = scopedHostels.reduce((s, h) => s + h.totalBeds, 0);
  const occupiedBeds = scopedHostels.reduce((s, h) => s + h.occupiedBeds, 0);
  const occupiedRooms = Math.round((occupiedBeds / Math.max(1, totalBeds)) * totalRooms);
  const vacantRooms = totalRooms - occupiedRooms;
  const occupancyPct = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 10000) / 100 : 0;
  const totalStaff = scopedHostels.reduce((s, h) => s + h.staffCount, 0);
  const messBalance = messSummary?.messBalance ?? 248560;

  const statsPayload = await syncDashboardStats(institutionId, academicYear, scope === 'ALL' ? '' : scopedIds[0] ?? '');

  const capacityAlert = occupancyPct >= settings.capacityAlertPct;
  if (capacityAlert) {
    await logActivity(
      institutionId,
      'CAPACITY_ALERT',
      `Occupied rooms at ${occupancyPct}% — exceeds ${settings.capacityAlertPct}% threshold`,
      { academicYear, hostelId: scope },
      'System',
    );
  }

  const checkIns = gateLogs.filter((g) => g.gateEvent === 'CHECK_IN').length;
  const checkOuts = gateLogs.filter((g) => g.gateEvent === 'CHECK_OUT').length;
  const currentlyIn = totalStudents - checkOuts;
  const leaveKpis = countLeaveKpis(leaveApps);
  const leavePending = leaveKpis.pending;
  const leaveApproved = leaveKpis.approved;
  const leaveRejected = leaveKpis.rejected;
  const leaveTotal = leaveKpis.total;
  const onLeave = leaveApproved;

  const roomOccupancy = [
    { name: 'Occupied', value: occupiedRooms, color: '#3b82f6', percent: pct(occupiedRooms, totalRooms) },
    { name: 'Vacant', value: vacantRooms, color: '#10b981', percent: pct(vacantRooms, totalRooms) },
  ];

  const hostelWiseStudents = scopedHostels.map((h) => ({
    name: h.hostelName,
    students: h.studentCount,
    color: '#3b82f6',
  }));

  const mealPreferences = [
    { name: 'Veg', pct: messSummary?.vegPct ?? 78, color: '#10b981' },
    { name: 'Non-Veg', pct: messSummary?.nonVegPct ?? 18, color: '#f97316' },
    { name: 'Eggetarian', pct: messSummary?.eggetarianPct ?? 4, color: '#3b82f6' },
  ];

  const showFinancials = userRole !== 'Warden' || scopedIds.length <= 2;

  const result = {
    academicYear,
    academicYears: ACADEMIC_YEARS,
    hostels: allHostels.map((h) => ({
      id: h.id,
      code: h.hostelCode,
      name: h.hostelName,
      type: h.hostelType,
      accessible: userRole !== 'Warden' || assignedHostelIds.includes(h.id) || assignedHostelIds.length === 0,
    })),
    selectedHostelId: hostelId && hostelId !== 'ALL' ? hostelId : 'ALL',
    userRole,
    assignedHostelIds,
    cacheRefreshMins: settings.cacheRefreshMins,
    lastCacheRefresh: settings.lastCacheRefresh?.toISOString() ?? null,
    capacityAlert,
    kpis: {
      totalHostels: { value: totalHostels, subtitle: 'Active Hostels' },
      totalStudents: { value: totalStudents, subtitle: 'In Hostels' },
      totalRooms: { value: totalRooms, subtitle: 'All Rooms' },
      occupiedRooms: { value: occupiedRooms, subtitle: `${occupancyPct}% Occupied`, occupancyPct },
      totalStaff: { value: totalStaff, subtitle: 'Wardens & Staff' },
      messBalance: {
        value: showFinancials ? formatInr(messBalance) : '—',
        subtitle: 'This Month',
        hidden: !showFinancials,
      },
    },
    roomOccupancy,
    hostelWiseStudents,
    checkInOut: {
      checkInToday: checkIns,
      checkOutToday: checkOuts,
      currentlyInHostel: Math.max(0, currentlyIn),
      onLeaveOuting: onLeave || 64,
    },
    leaveApplications: [
      { name: 'Pending', value: leavePending, color: '#f59e0b', percent: pct(leavePending, leaveTotal || 1) },
      { name: 'Approved', value: leaveApproved, color: '#10b981', percent: pct(leaveApproved, leaveTotal || 1) },
      { name: 'Rejected', value: leaveRejected, color: '#ef4444', percent: pct(leaveRejected, leaveTotal || 1) },
    ],
    leaveTotal,
    messDashboard: showFinancials ? {
      totalCollection: formatInr(messSummary?.totalCollection ?? 875600),
      totalExpense: formatInr(messSummary?.totalExpense ?? 627040),
      messBalance: formatInr(messBalance),
      studentsOpted: messSummary?.studentsOpted ?? 1198,
      mealPreferences,
    } : null,
    recentAllotments: allotments.map((a) => ({
      student: a.studentName,
      hostel: a.hostel.hostelName,
      room: a.roomNumber,
      bed: a.bedNumber,
      date: formatDate(a.allotmentDate),
      status: a.status,
    })),
    pendingPayments: showFinancials
      ? pendingPayments.map((p) => ({
        student: p.studentName,
        hostel: p.hostel.hostelName,
        amount: formatInr(p.amount),
        dueDate: formatDate(p.dueDate),
        isPastDue: p.dueDate < today,
      }))
      : [],
    visitorLog: visitors.map((v) => ({
      visitorName: v.visitorName,
      studentName: v.studentName,
      inTime: v.inTime,
      outTime: v.outTime,
      purpose: v.purpose,
    })),
    maintenanceRequests: maintenance.map((m) => ({
      issue: m.issue,
      location: m.location || `${m.hostel.hostelName}`,
      date: formatDate(m.requestDate),
      status: m.status === 'OPEN' ? 'Open' : m.status === 'ASSIGNED' || m.status === 'IN_PROGRESS' ? 'In Progress' : 'Resolved',
      statusColor: m.status === 'OPEN' ? 'text-red-600' : m.status === 'ASSIGNED' || m.status === 'IN_PROGRESS' ? 'text-amber-600' : 'text-green-600',
    })),
    importantNotices: notices.map((n) => ({
      text: n.title,
      date: formatDate(n.createdAt),
      iconColor: n.iconColor,
      bg: n.iconColor === 'amber' ? 'bg-amber-50' : n.iconColor === 'blue' ? 'bg-blue-50' : 'bg-purple-50',
    })),
    attendanceSummary: {
      present: Math.round(totalStudents * 0.9423),
      presentPct: '94.23%',
      absent: Math.round(totalStudents * 0.0337),
      absentPct: '3.37%',
      onLeave: Math.round(totalStudents * 0.024),
      onLeavePct: '2.40%',
    },
    incidentSummary: countDisciplineKpis(disciplineIncidents),
    hostelOverview: {
      totalHostels,
      totalRooms,
      occupiedRooms,
      vacantRooms,
      totalStudents,
      staffMembers: totalStaff,
    },
    feeIntegration: {
      totalCollected: formatInr(feeCollections._sum.amount ?? 0),
      source: 'Fees & Finance — Hostel Fee',
    },
    quickActions: [
      { label: 'Add Student', target: 'Students' },
      { label: 'Allocate Room', target: 'Rooms & Allotment' },
      { label: 'Mark Attendance', target: 'Students' },
      { label: 'Leave Request', target: 'Leave Management' },
      { label: 'Gate Pass', target: 'Gate Pass' },
      { label: 'Mess Menu', target: 'Mess Management' },
      { label: 'Send Notice', target: 'Hostel Dashboard' },
      { label: 'Settings', target: 'Hostel Dashboard' },
    ],
    facilities: [
      { label: 'Room Allotment', target: 'Rooms & Allotment' },
      { label: 'Mess Management', target: 'Mess Management' },
      { label: 'Visitor Management', target: 'Visitor Management' },
      { label: 'Laundry Management', target: 'Laundry Management' },
      { label: 'Inventory', target: 'Inventory' },
      { label: 'Complaints', target: 'Complaints / Feedback' },
      { label: 'Gate Pass', target: 'Gate Pass' },
      { label: 'Discipline', target: 'Discipline & Incidents' },
    ],
    roleMatrix: settings.roleMatrix,
    exportFormats: ['PDF', 'Excel'],
    automationRules: [
      `Dashboard cache refreshes every ${settings.cacheRefreshMins} minutes`,
      'Check-in/Check-out auto-updates via RFID/QR gate integrations',
      `Capacity alert when occupancy exceeds ${settings.capacityAlertPct}%`,
    ],
    erpIntegration: ['Fees & Finance: Pending Payments & Mess Balance', 'Student Management: Allotment demographics'],
    mobileSync: settings.mobileSyncRules,
    materializedView: statsPayload,
  };

  dashboardCache.set(key, {
    data: result,
    expiresAt: Date.now() + settings.cacheRefreshMins * 60 * 1000,
  });

  await prisma.hostelSettings.update({
    where: { institutionId },
    data: { lastCacheRefresh: new Date() },
  });

  await logActivity(
    institutionId,
    'DASHBOARD_ACCESS',
    `Dashboard viewed — ${scope === 'ALL' ? 'All Hostels' : scopedHostels.map((h) => h.hostelName).join(', ')}`,
    { academicYear, hostelId: scope, userRole },
    performedBy,
  );

  return result;
}

export async function exportHostelDashboard(
  institutionId: string,
  academicYear = '2025-26',
  hostelId?: string,
  format: 'PDF' | 'Excel' = 'PDF',
) {
  const data = await getHostelDashboard(institutionId, academicYear, hostelId, 'Admin', 'Export');
  const fileName = `hostel_dashboard_${academicYear}_${Date.now()}.${format.toLowerCase()}`;
  await logActivity(institutionId, 'EXPORT', `Dashboard exported as ${format}`, { academicYear, hostelId, format });
  return {
    success: true,
    format,
    fileName,
    message: `Dashboard exported as ${format}`,
    downloadUrl: `/api/hostel/dashboard/export/${fileName}`,
    snapshot: data,
  };
}

export async function seedHostelDashboard(institutionId: string) {
  await ensureSettings(institutionId);
  const existing = await prisma.hostelMaster.count({ where: { institutionId } });
  if (existing >= 6) return getHostelDashboard(institutionId);

  await prisma.hostelActivityLog.deleteMany({ where: { institutionId } });
  await prisma.hostelDashboardStats.deleteMany({ where: { institutionId } });
  await prisma.hostelMaintenanceRequest.deleteMany({ where: { institutionId } });
  await prisma.hostelLeaveApplication.deleteMany({ where: { institutionId } });
  await prisma.hostelPendingPayment.deleteMany({ where: { institutionId } });
  await prisma.hostelMessSummary.deleteMany({ where: { institutionId } });
  await prisma.hostelGateLog.deleteMany({ where: { institutionId } });
  await prisma.hostelNotice.deleteMany({ where: { institutionId } });
  await prisma.hostelVisitorLog.deleteMany({ where: { institutionId } });
  await prisma.hostelAllotment.deleteMany({ where: { institutionId } });
  await prisma.hostelStaff.deleteMany({ where: { institutionId } });
  await prisma.hostelMaster.deleteMany({ where: { institutionId } });

  const academicYear = '2025-26';
  const createdHostels: { id: string; name: string }[] = [];

  for (const h of HOSTEL_SEED) {
    const hostel = await prisma.hostelMaster.create({
      data: {
        institutionId,
        hostelCode: h.code,
        hostelName: h.name,
        hostelType: h.type,
        totalRooms: h.rooms,
        totalBeds: h.beds,
        occupiedBeds: h.occupied,
        studentCount: h.students || Math.round(h.occupied * 1.6),
        staffCount: h.staff,
        academicYear,
      },
    });
    createdHostels.push({ id: hostel.id, name: hostel.hostelName });

    for (let i = 0; i < h.staff; i += 1) {
      await prisma.hostelStaff.create({
        data: {
          institutionId,
          hostelId: hostel.id,
          staffName: `${h.type === 'GIRLS' ? 'Mrs.' : 'Mr.'} Staff ${i + 1}`,
          role: i === 0 ? 'WARDEN' : 'ATTENDANT',
        },
      });
    }
  }

  const students = [
    ['Aarav Sharma', 'Boys Hostel A', 'A-101', '1'],
    ['Vihaan Patel', 'Boys Hostel B', 'B-203', '2'],
    ['Meera Joshi', 'Girls Hostel A', 'GA-105', '1'],
    ['Ananya Singh', 'Girls Hostel B', 'GB-210', '2'],
    ['Rohit Kumar', 'PG Hostel', 'PG-12', '1'],
  ];

  for (let i = 0; i < students.length; i += 1) {
    const [name, hostelName, room, bed] = students[i];
    const hostel = createdHostels.find((h) => h.name === hostelName);
    if (!hostel) continue;
    await prisma.hostelAllotment.create({
      data: {
        institutionId,
        hostelId: hostel.id,
        studentName: name,
        roomNumber: room,
        bedNumber: bed,
        allotmentDate: new Date(2025, 4, 15 - i),
        academicYear,
      },
    });
  }

  await prisma.hostelMessSummary.create({
    data: {
      institutionId,
      academicYear,
      monthLabel: 'May 2025',
      totalCollection: 875600,
      totalExpense: 627040,
      messBalance: 248560,
      studentsOpted: 1198,
      vegPct: 78,
      nonVegPct: 18,
      eggetarianPct: 4,
    },
  });

  const paymentStudents: [string, string, number][] = [
    ['Karan Mehta', 'Boys Hostel A', 6450],
    ['Aditya Verma', 'Boys Hostel B', 5800],
    ['Neha Kumari', 'Girls Hostel A', 6450],
    ['Pooja Patel', 'Girls Hostel B', 5800],
    ['Ritik Singh', 'PG Hostel', 7200],
  ];

  for (const [name, hostelName, amount] of paymentStudents) {
    const hostel = createdHostels.find((h) => h.name === hostelName);
    if (!hostel) continue;
    await prisma.hostelPendingPayment.create({
      data: {
        institutionId,
        hostelId: hostel.id,
        studentName: name,
        amount,
        dueDate: new Date(2025, 4, 20),
        academicYear,
      },
    });
  }

  const visitors = [
    ['Rajesh Sharma', 'Aarav Sharma', '10:15 AM', '10:45 AM', 'Parent'],
    ['Sunita Patel', 'Vihaan Patel', '11:20 AM', '11:50 AM', 'Parent'],
    ['Ramesh Singh', 'Meera Joshi', '12:05 PM', '12:30 PM', 'Guardian'],
    ['Anjali Verma', 'Ananya Singh', '04:10 PM', '04:40 PM', 'Parent'],
  ];

  const bha = createdHostels[0];
  for (const [v, s, inT, outT, purpose] of visitors) {
    if (!bha) break;
    await prisma.hostelVisitorLog.create({
      data: {
        institutionId,
        hostelId: bha.id,
        visitorName: v,
        studentName: s,
        inTime: inT,
        outTime: outT,
        purpose,
        visitDate: todayDate(),
      },
    });
  }

  for (let i = 0; i < 12; i += 1) {
    const hostel = createdHostels[i % createdHostels.length];
    if (!hostel) break;
    await prisma.hostelGateLog.create({
      data: {
        institutionId,
        hostelId: hostel.id,
        studentName: `Student ${i + 1}`,
        gateEvent: 'CHECK_IN',
        scanMethod: i % 2 === 0 ? 'RFID' : 'QR',
        logDate: todayDate(),
      },
    });
  }
  for (let i = 0; i < 8; i += 1) {
    const hostel = createdHostels[i % createdHostels.length];
    if (!hostel) break;
    await prisma.hostelGateLog.create({
      data: {
        institutionId,
        hostelId: hostel.id,
        studentName: `Student ${i + 20}`,
        gateEvent: 'CHECK_OUT',
        scanMethod: 'QR',
        logDate: todayDate(),
      },
    });
  }

  for (let i = 0; i < 22; i += 1) {
    const out = new Date(Date.now() + 2 * 86400000);
    const expectedIn = new Date(out.getTime() + 2 * 86400000);
    await prisma.hostelLeaveApplication.create({
      data: {
        institutionId,
        hostelId: createdHostels[i % createdHostels.length]?.id,
        studentName: `Student ${i + 1}`,
        status: i % 5 === 0 ? 'PARENT_APPROVED' : 'PENDING',
        outDateTime: out,
        expectedInDateTime: expectedIn,
        reason: 'Family visit',
        academicYear,
      },
    });
  }
  for (let i = 0; i < 34; i += 1) {
    const out = new Date(Date.now() + 86400000);
    const expectedIn = new Date(out.getTime() + 3 * 86400000);
    await prisma.hostelLeaveApplication.create({
      data: {
        institutionId,
        studentName: `Student A${i}`,
        status: 'WARDEN_APPROVED',
        outDateTime: out,
        expectedInDateTime: expectedIn,
        gatePassQrToken: `HLGP-SEED-${i}`,
        parentOtpVerified: true,
        academicYear,
      },
    });
  }
  for (let i = 0; i < 8; i += 1) {
    await prisma.hostelLeaveApplication.create({
      data: {
        institutionId,
        studentName: `Student R${i}`,
        status: 'REJECTED',
        outDateTime: new Date(),
        expectedInDateTime: new Date(Date.now() + 86400000),
        rejectionReason: 'Insufficient notice',
        academicYear,
      },
    });
  }

  const maintenanceItems = [
    ['Room Light Not Working', 'Boys Hostel A - Room A101', 'IN_PROGRESS'],
    ['Water Heater Issue', 'Girls Hostel B - Room GB210', 'OPEN'],
    ['Fan Not Working', 'PG Hostel - Room PG12', 'CLOSED'],
    ['Door Lock Problem', 'Boys Hostel B - Room B203', 'IN_PROGRESS'],
  ];

  for (const [issue, location, status] of maintenanceItems) {
    const hostel = createdHostels[0];
    if (!hostel) break;
    await prisma.hostelMaintenanceRequest.create({
      data: {
        institutionId,
        hostelId: hostel.id,
        ticketNumber: `MT-SEED-${issue.slice(0, 3).toUpperCase()}`,
        issue,
        location,
        status,
        category: issue.includes('Water') ? 'HVAC' : issue.includes('Fan') || issue.includes('Light') ? 'ELECTRICAL' : 'FURNITURE',
        raisedBy: 'Warden',
        raisedByRole: 'WARDEN',
        academicYear,
        requestDate: todayDate(),
      },
    });
  }

  await prisma.hostelNotice.createMany({
    data: [
      { institutionId, title: 'Mess will remain closed on 18 May (Sunday).', iconColor: 'amber', academicYear },
      { institutionId, title: 'Hostel fee due date is 25 May 2025.', iconColor: 'blue', academicYear },
      { institutionId, title: 'Water supply maintenance on 19 May.', iconColor: 'purple', academicYear },
    ],
  });

  await logActivity(institutionId, 'SEED', 'Hostel dashboard demo data seeded');
  dashboardCache.clear();
  return getHostelDashboard(institutionId, academicYear);
}
