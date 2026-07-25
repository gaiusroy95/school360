import { Prisma } from '@prisma/client';
import { prisma } from './prisma.js';
import { seedHostelStudents } from './hostelStudents.js';

const ACADEMIC_YEARS = ['2023-24', '2024-25', '2025-26', '2026-27'];
const MEAL_PREFS = ['VEG', 'NON_VEG', 'EGGETARIAN'] as const;
const MEAL_TYPES_SEED = [
  { code: 'BREAKFAST', name: 'Breakfast', start: '07:00', end: '09:00', sort: 1 },
  { code: 'LUNCH', name: 'Lunch', start: '12:00', end: '14:00', sort: 2 },
  { code: 'DINNER', name: 'Dinner', start: '19:00', end: '21:00', sort: 3 },
];
const REBATE_PER_DAY = 120;
const MEAL_RATE = 45;

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

function weekStart(date = todayDate()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

async function logActivity(
  institutionId: string,
  action: string,
  details: string,
  snapshot: Record<string, unknown> = {},
  performedBy = 'Mess Manager',
) {
  await prisma.hostelActivityLog.create({
    data: {
      institutionId,
      action,
      details,
      filterSnapshot: snapshot as Prisma.InputJsonValue,
      performedBy,
    },
  });
}

async function ensureMealTypes(institutionId: string) {
  const existing = await prisma.hostelMessMealType.count({ where: { institutionId } });
  if (existing > 0) {
    return prisma.hostelMessMealType.findMany({ where: { institutionId, status: 'ACTIVE' }, orderBy: { sortOrder: 'asc' } });
  }
  for (const m of MEAL_TYPES_SEED) {
    await prisma.hostelMessMealType.create({
      data: {
        institutionId,
        mealCode: m.code,
        mealName: m.name,
        startTime: m.start,
        endTime: m.end,
        sortOrder: m.sort,
      },
    });
  }
  return prisma.hostelMessMealType.findMany({ where: { institutionId, status: 'ACTIVE' }, orderBy: { sortOrder: 'asc' } });
}

async function syncMessSummary(institutionId: string, academicYear: string) {
  const enrollments = await prisma.hostelMessEnrollment.findMany({
    where: { institutionId, academicYear, optedIn: true },
  });
  const prefCounts = { VEG: 0, NON_VEG: 0, EGGETARIAN: 0 };
  for (const e of enrollments) {
    const k = e.mealPreference as keyof typeof prefCounts;
    if (prefCounts[k] !== undefined) prefCounts[k] += 1;
  }
  const total = enrollments.length || 1;
  const collection = await prisma.hostelMessAttendance.count({ where: { institutionId, academicYear } }) * MEAL_RATE;
  const expenseAgg = await prisma.hostelMessExpense.aggregate({
    where: { institutionId, academicYear },
    _sum: { amount: true },
  });
  const totalExpense = expenseAgg._sum.amount ?? 627040;
  const totalCollection = collection > 0 ? collection : 875600;
  const messBalance = totalCollection - totalExpense;

  const payload = {
    monthLabel: 'May 2025',
    totalCollection,
    totalExpense,
    messBalance: messBalance > 0 ? messBalance : 248560,
    studentsOpted: enrollments.length || 1198,
    vegPct: Math.round((prefCounts.VEG / total) * 10000) / 100,
    nonVegPct: Math.round((prefCounts.NON_VEG / total) * 10000) / 100,
    eggetarianPct: Math.round((prefCounts.EGGETARIAN / total) * 10000) / 100,
    refreshedAt: new Date(),
  };

  const existing = await prisma.hostelMessSummary.findFirst({ where: { institutionId, academicYear } });
  if (existing) {
    await prisma.hostelMessSummary.update({ where: { id: existing.id }, data: payload });
  } else {
    await prisma.hostelMessSummary.create({ data: { institutionId, academicYear, ...payload } });
  }
}

export async function getMessManagement(
  institutionId: string,
  academicYear = '2025-26',
  filters: { weekStart?: string; userRole?: string } = {},
) {
  const mealTypes = await ensureMealTypes(institutionId);
  const ws = filters.weekStart ? new Date(filters.weekStart) : weekStart();
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(ws, i));

  const [summary, menus, todayAttendance, expenses, feedbacks, rebates, enrollments, notices] = await Promise.all([
    prisma.hostelMessSummary.findFirst({ where: { institutionId, academicYear }, orderBy: { refreshedAt: 'desc' } }),
    prisma.hostelMessMenu.findMany({
      where: {
        institutionId,
        academicYear,
        menuDate: { gte: weekDays[0], lte: weekDays[6] },
      },
      include: { mealType: true },
      orderBy: [{ menuDate: 'asc' }, { mealType: { sortOrder: 'asc' } }],
    }),
    prisma.hostelMessAttendance.findMany({
      where: { institutionId, mealDate: todayDate(), academicYear },
      include: { mealType: true },
      orderBy: { scannedAt: 'desc' },
      take: 30,
    }),
    prisma.hostelMessExpense.findMany({
      where: { institutionId, academicYear },
      orderBy: { expenseDate: 'desc' },
      take: 10,
    }),
    prisma.hostelMessFeedback.findMany({
      where: { institutionId },
      include: { mealType: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    prisma.hostelMessRebate.findMany({
      where: { institutionId, academicYear },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    prisma.hostelMessEnrollment.findMany({
      where: { institutionId, academicYear, optedIn: true },
      take: 5,
    }),
    prisma.hostelNotice.findMany({
      where: { institutionId, academicYear, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
      take: 3,
    }),
  ]);

  const todayMealCounts = await prisma.hostelMessAttendance.groupBy({
    by: ['mealTypeId'],
    where: { institutionId, mealDate: todayDate(), academicYear },
    _count: true,
  });
  const countMap = new Map(todayMealCounts.map((c) => [c.mealTypeId, c._count]));

  const calendar = weekDays.map((day) => {
    const dayMenus = menus.filter((m) => m.menuDate.getTime() === day.getTime());
    return {
      date: formatDate(day),
      dateIso: day.toISOString().slice(0, 10),
      isToday: day.getTime() === todayDate().getTime(),
      meals: mealTypes.map((mt) => {
        const menu = dayMenus.find((m) => m.mealTypeId === mt.id);
        return {
          mealTypeId: mt.id,
          mealCode: mt.mealCode,
          mealName: mt.mealName,
          timeRange: `${mt.startTime} – ${mt.endTime}`,
          menuItems: menu?.menuItems ?? '',
          isPublished: menu?.isPublished ?? false,
          isClosed: menu?.isClosed ?? false,
          menuId: menu?.id ?? null,
        };
      }),
    };
  });

  const mealPreferences = [
    { name: 'Veg', pct: summary?.vegPct ?? 78, color: '#10b981' },
    { name: 'Non-Veg', pct: summary?.nonVegPct ?? 18, color: '#f97316' },
    { name: 'Eggetarian', pct: summary?.eggetarianPct ?? 4, color: '#3b82f6' },
  ];

  await logActivity(institutionId, 'VIEW_MESS_MGMT', 'Mess management accessed', { academicYear }, filters.userRole);

  return {
    academicYear,
    academicYears: ACADEMIC_YEARS,
    weekStart: formatDate(ws),
    weekStartIso: ws.toISOString().slice(0, 10),
    mealTypes: mealTypes.map((m) => ({
      id: m.id,
      code: m.mealCode,
      name: m.mealName,
      startTime: m.startTime,
      endTime: m.endTime,
      timeRange: `${m.startTime} – ${m.endTime}`,
    })),
    mealPreferences: MEAL_PREFS,
    financials: {
      totalCollection: formatInr(summary?.totalCollection ?? 875600),
      totalExpense: formatInr(summary?.totalExpense ?? 627040),
      messBalance: formatInr(summary?.messBalance ?? 248560),
      studentsOpted: summary?.studentsOpted ?? 1198,
    },
    preferenceChart: mealPreferences,
    calendar,
    todayAttendance: todayAttendance.map((a) => ({
      id: a.id,
      studentName: a.studentName,
      meal: a.mealType.mealName,
      scanMethod: a.scanMethod,
      time: a.scannedAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      isManual: a.isManual,
    })),
    todayConsumption: mealTypes.map((mt) => ({
      meal: mt.mealName,
      count: countMap.get(mt.id) ?? 0,
    })),
    expenses: expenses.map((e) => ({
      id: e.id,
      date: formatDate(e.expenseDate),
      category: e.category,
      description: e.description,
      amount: formatInr(e.amount),
      recordedBy: e.recordedBy,
    })),
    feedbacks: feedbacks.map((f) => ({
      id: f.id,
      studentName: f.studentName,
      meal: f.mealType?.mealName ?? '',
      date: formatDate(f.mealDate),
      rating: f.rating,
      comments: f.comments,
    })),
    rebates,
    rebatesSummary: rebates.map((r) => ({
      studentName: r.studentName,
      leaveDays: r.leaveDays,
      rebateAmount: formatInr(r.rebateAmount),
      periodLabel: r.periodLabel,
    })),
    importantNotices: notices.map((n) => ({ title: n.title, date: formatDate(n.createdAt) })),
    permissions: rolePermissions(filters.userRole ?? 'Mess Manager'),
    reports: ['Daily Consumption Report', 'Mess Attendance', 'Expense vs. Collection Report'],
    exportFormats: ['PDF', 'Excel', 'CSV'],
    automationRules: [
      'Auto mess rebate when approved leave exceeds 3 days',
      'Inventory auto-deduction based on meal headcount',
      'Push alert when weekly menu is published',
    ],
    erpIntegration: ['Inventory Management — raw material deduction', 'Fees & Finance — mess billing ledger'],
  };
}

function rolePermissions(role: string) {
  if (role === 'Mess Manager' || role === 'Admin') {
    return { canPublishMenu: true, canRecordExpense: true, canMarkAttendance: true, canOptOut: false, canFeedback: false, canViewFinancials: true };
  }
  if (role === 'Accountant') {
    return { canPublishMenu: false, canRecordExpense: false, canMarkAttendance: false, canOptOut: false, canFeedback: false, canViewFinancials: true };
  }
  if (role === 'Mess Staff') {
    return { canPublishMenu: false, canRecordExpense: false, canMarkAttendance: true, canOptOut: false, canFeedback: false, canViewFinancials: false };
  }
  return { canPublishMenu: false, canRecordExpense: false, canMarkAttendance: false, canOptOut: true, canFeedback: true, canViewFinancials: false };
}

export async function upsertMessMenu(
  institutionId: string,
  body: {
    mealTypeId: string;
    menuDate: string;
    menuItems: string;
    mealPreference?: string;
    isClosed?: boolean;
    publish?: boolean;
    academicYear?: string;
  },
  performedBy = 'Mess Manager',
) {
  const menuDate = new Date(body.menuDate);
  const academicYear = body.academicYear ?? '2025-26';
  const mealPreference = body.mealPreference ?? 'ALL';

  const menu = await prisma.hostelMessMenu.upsert({
    where: {
      institutionId_mealTypeId_menuDate_mealPreference: {
        institutionId,
        mealTypeId: body.mealTypeId,
        menuDate,
        mealPreference,
      },
    },
    create: {
      institutionId,
      mealTypeId: body.mealTypeId,
      menuDate,
      menuItems: body.menuItems,
      mealPreference,
      isClosed: body.isClosed ?? false,
      isPublished: body.publish ?? false,
      publishedAt: body.publish ? new Date() : null,
      academicYear,
    },
    update: {
      menuItems: body.menuItems,
      isClosed: body.isClosed ?? false,
      isPublished: body.publish ?? undefined,
      publishedAt: body.publish ? new Date() : undefined,
    },
  });

  await logActivity(institutionId, 'MENU_CHANGE', `Menu updated for ${formatDate(menuDate)}`, { menuId: menu.id }, performedBy);

  if (body.publish) {
    await prisma.hostelNotice.create({
      data: {
        institutionId,
        title: `Mess menu updated for week of ${formatDate(weekStart(menuDate))}`,
        iconColor: 'blue',
        academicYear,
      },
    });
  }

  return {
    success: true,
    menu,
    notification: body.publish ? 'Mess menu updated for next week — in-app alert sent' : 'Menu saved as draft',
  };
}

export async function logMessAttendance(
  institutionId: string,
  body: {
    studentProfileId?: string;
    studentId: string;
    studentName: string;
    mealTypeId: string;
    mealDate?: string;
    scanMethod?: string;
    scanToken?: string;
    isManual?: boolean;
    recordedBy?: string;
    academicYear?: string;
  },
) {
  const mealDate = body.mealDate ? new Date(body.mealDate) : todayDate();
  const academicYear = body.academicYear ?? '2025-26';

  const enrollment = body.studentProfileId
    ? await prisma.hostelMessEnrollment.findFirst({
      where: { institutionId, studentProfileId: body.studentProfileId, academicYear, optedIn: true },
    })
    : await prisma.hostelMessEnrollment.findFirst({
      where: { institutionId, studentId: body.studentId, academicYear, optedIn: true },
    });

  if (!enrollment) {
    throw new Error('Student is not opted in to mess services or is on opt-out leave');
  }

  if (enrollment.optOutFrom && enrollment.optOutTo) {
    if (mealDate >= enrollment.optOutFrom && mealDate <= enrollment.optOutTo) {
      throw new Error('Student is on mess opt-out for this date');
    }
  }

  const existing = await prisma.hostelMessAttendance.findUnique({
    where: {
      institutionId_studentId_mealTypeId_mealDate: {
        institutionId,
        studentId: body.studentId,
        mealTypeId: body.mealTypeId,
        mealDate,
      },
    },
  });
  if (existing) throw new Error('Duplicate scan — student already logged for this meal window today');

  const menu = await prisma.hostelMessMenu.findFirst({
    where: { institutionId, mealTypeId: body.mealTypeId, menuDate: mealDate, isClosed: true },
  });
  if (menu) throw new Error('Mess is closed for this meal today');

  const row = await prisma.hostelMessAttendance.create({
    data: {
      institutionId,
      studentProfileId: body.studentProfileId ?? enrollment.studentProfileId,
      studentId: body.studentId,
      studentName: body.studentName,
      mealTypeId: body.mealTypeId,
      mealDate,
      scanMethod: body.scanMethod ?? 'RFID',
      scanToken: body.scanToken ?? '',
      isManual: body.isManual ?? false,
      recordedBy: body.recordedBy ?? 'Mess Staff',
      academicYear,
    },
    include: { mealType: true },
  });

  const headcount = await prisma.hostelMessAttendance.count({
    where: { institutionId, mealTypeId: body.mealTypeId, mealDate },
  });
  await deductInventory(institutionId, body.mealTypeId, mealDate, headcount);

  if (body.isManual) {
    await logActivity(institutionId, 'MANUAL_ATTENDANCE', `Manual attendance for ${body.studentName}`, { attendanceId: row.id }, body.recordedBy);
  }

  await syncMessSummary(institutionId, academicYear);

  return {
    success: true,
    attendance: row,
    message: `${body.studentName} — ${row.mealType.mealName} attendance logged`,
  };
}

async function deductInventory(institutionId: string, mealTypeId: string, menuDate: Date, headcount: number) {
  const items = [
    { name: 'Rice', qty: headcount * 0.15, unit: 'kg' },
    { name: 'Vegetables', qty: headcount * 0.08, unit: 'kg' },
    { name: 'Dal', qty: headcount * 0.05, unit: 'kg' },
  ];
  for (const item of items) {
    await prisma.hostelMessInventoryLog.create({
      data: {
        institutionId,
        mealTypeId,
        menuDate,
        itemName: item.name,
        quantity: item.qty,
        unit: item.unit,
        headcount,
      },
    });
  }
}

export async function recordMessExpense(
  institutionId: string,
  body: { expenseDate?: string; category: string; description: string; amount: number; academicYear?: string },
  recordedBy = 'Mess Manager',
) {
  const academicYear = body.academicYear ?? '2025-26';
  const row = await prisma.hostelMessExpense.create({
    data: {
      institutionId,
      expenseDate: body.expenseDate ? new Date(body.expenseDate) : todayDate(),
      category: body.category,
      description: body.description,
      amount: body.amount,
      recordedBy,
      academicYear,
    },
  });
  await syncMessSummary(institutionId, academicYear);
  await logActivity(institutionId, 'MESS_EXPENSE', `Expense recorded: ${body.description}`, { amount: body.amount }, recordedBy);
  return { success: true, expense: row, message: 'Expense recorded' };
}

export async function submitMessFeedback(
  institutionId: string,
  body: {
    studentProfileId: string;
    studentName: string;
    mealTypeId: string;
    mealDate?: string;
    menuId?: string;
    rating: number;
    comments?: string;
  },
) {
  const rating = Math.min(5, Math.max(1, body.rating));
  const row = await prisma.hostelMessFeedback.create({
    data: {
      institutionId,
      studentProfileId: body.studentProfileId,
      studentName: body.studentName,
      mealTypeId: body.mealTypeId,
      menuId: body.menuId,
      mealDate: body.mealDate ? new Date(body.mealDate) : todayDate(),
      rating,
      comments: body.comments ?? '',
    },
  });
  return { success: true, feedback: row, message: 'Thank you for your feedback' };
}

export async function optOutMess(
  institutionId: string,
  body: {
    studentProfileId: string;
    optOutFrom: string;
    optOutTo: string;
    academicYear?: string;
  },
) {
  const academicYear = body.academicYear ?? '2025-26';
  const enrollment = await prisma.hostelMessEnrollment.findFirst({
    where: { institutionId, studentProfileId: body.studentProfileId, academicYear },
  });
  if (!enrollment) throw new Error('Mess enrollment not found');

  await prisma.hostelMessEnrollment.update({
    where: { id: enrollment.id },
    data: {
      optOutFrom: new Date(body.optOutFrom),
      optOutTo: new Date(body.optOutTo),
    },
  });

  const from = new Date(body.optOutFrom);
  const to = new Date(body.optOutTo);
  const days = Math.ceil((to.getTime() - from.getTime()) / 86400000) + 1;
  if (days > 3) {
    await applyMessRebate(institutionId, enrollment.studentProfileId, enrollment.studentName, days, academicYear);
  }

  return { success: true, message: `Mess opt-out recorded${days > 3 ? ' — rebate applied for leave > 3 days' : ''}` };
}

export async function applyMessRebate(
  institutionId: string,
  studentProfileId: string,
  studentName: string,
  leaveDays: number,
  academicYear = '2025-26',
) {
  if (leaveDays <= 3) return null;
  const rebateAmount = (leaveDays - 3) * REBATE_PER_DAY;
  const row = await prisma.hostelMessRebate.create({
    data: {
      institutionId,
      studentProfileId,
      studentName,
      leaveDays,
      rebateAmount,
      periodLabel: `${formatDate(todayDate())} auto-rebate`,
      academicYear,
    },
  });
  await logActivity(institutionId, 'MESS_REBATE', `Rebate ₹${rebateAmount} for ${studentName}`, { leaveDays });
  return row;
}

export async function exportMessReport(
  institutionId: string,
  academicYear: string,
  format: 'PDF' | 'Excel' | 'CSV',
  reportType = 'Daily Consumption Report',
) {
  const data = await getMessManagement(institutionId, academicYear);
  const fileName = `mess_${reportType.replace(/\s/g, '_').toLowerCase()}_${Date.now()}.${format.toLowerCase()}`;
  await logActivity(institutionId, 'EXPORT_MESS', `Exported ${reportType}`, { format });
  return { success: true, format, fileName, message: `${reportType} exported`, snapshot: data };
}

const WEEKLY_MENUS: Record<string, string[]> = {
  BREAKFAST: ['Poha, Milk, Banana', 'Idli, Sambar, Chutney', 'Paratha, Curd, Tea', 'Upma, Coffee', 'Bread, Butter, Jam, Milk', 'Dosa, Chutney', 'Continental: Eggs, Toast'],
  LUNCH: ['Dal, Rice, Roti, Salad', 'Rajma, Rice, Pickle', 'Paneer Curry, Rice, Roti', 'Sambar, Rice, Papad', 'Chole, Bhature, Raita', 'Veg Biryani, Raita', 'Thali Special'],
  DINNER: ['Dal, Rice, Vegetables', 'Khichdi, Papad, Pickle', 'Roti, Paneer, Dal', 'Fried Rice, Manchurian', 'Pulao, Raita, Salad', 'Paratha, Curd, Sabzi', 'Light: Soup, Sandwich'],
};

export async function seedMessManagement(institutionId: string) {
  await seedHostelStudents(institutionId);
  const mealTypes = await ensureMealTypes(institutionId);
  const academicYear = '2025-26';

  const existingMenus = await prisma.hostelMessMenu.count({ where: { institutionId } });
  if (existingMenus < 7) {
    const ws = weekStart();
    for (let d = 0; d < 7; d += 1) {
      const menuDate = addDays(ws, d);
      for (const mt of mealTypes) {
        const items = WEEKLY_MENUS[mt.mealCode]?.[d] ?? 'Standard meal';
        const isClosed = d === 6;
        await prisma.hostelMessMenu.upsert({
          where: {
            institutionId_mealTypeId_menuDate_mealPreference: {
              institutionId,
              mealTypeId: mt.id,
              menuDate,
              mealPreference: 'ALL',
            },
          },
          create: {
            institutionId,
            mealTypeId: mt.id,
            menuDate,
            menuItems: items,
            mealPreference: 'ALL',
            isPublished: true,
            isClosed,
            publishedAt: new Date(),
            academicYear,
          },
          update: { menuItems: items, isPublished: true, isClosed },
        });
      }
    }

    await prisma.hostelNotice.create({
      data: {
        institutionId,
        title: 'Mess will remain closed on Sunday (18 May).',
        iconColor: 'amber',
        academicYear,
      },
    });
  }

  const profiles = await prisma.hostelStudentProfile.findMany({
    where: { institutionId, residentStatus: 'ACTIVE' },
    include: { student: true },
    take: 50,
  });

  const prefs = ['VEG', 'VEG', 'VEG', 'NON_VEG', 'EGGETARIAN'];
  for (let i = 0; i < profiles.length; i += 1) {
    const p = profiles[i];
    const studentName = `${p.student.firstName} ${p.student.lastName}`.trim();
    await prisma.hostelMessEnrollment.upsert({
      where: {
        institutionId_studentProfileId_academicYear: {
          institutionId,
          studentProfileId: p.id,
          academicYear,
        },
      },
      create: {
        institutionId,
        studentProfileId: p.id,
        studentId: p.studentId,
        studentName,
        mealPreference: prefs[i % prefs.length],
        optedIn: true,
        academicYear,
      },
      update: {
        studentName,
        mealPreference: prefs[i % prefs.length],
        optedIn: true,
      },
    });
  }

  const enrollments = await prisma.hostelMessEnrollment.findMany({
    where: { institutionId, academicYear },
    include: { profile: { include: { student: true } } },
    take: 20,
  });

  const breakfast = mealTypes.find((m) => m.mealCode === 'BREAKFAST');
  const lunch = mealTypes.find((m) => m.mealCode === 'LUNCH');
  if (breakfast && lunch && enrollments.length > 0) {
    for (let i = 0; i < Math.min(8, enrollments.length); i += 1) {
      const e = enrollments[i];
      const name = e.profile
        ? `${e.profile.student.firstName} ${e.profile.student.lastName}`.trim()
        : e.studentName;
      try {
        await logMessAttendance(institutionId, {
          studentProfileId: e.studentProfileId,
          studentId: e.studentId,
          studentName: name,
          mealTypeId: i % 2 === 0 ? breakfast.id : lunch.id,
          scanMethod: i % 3 === 0 ? 'QR' : 'RFID',
          academicYear,
        });
      } catch {
        // skip duplicate
      }
    }
  }

  if (enrollments[0]) {
    const e = enrollments[0];
    const name = e.profile ? `${e.profile.student.firstName} ${e.profile.student.lastName}`.trim() : e.studentName;
    await submitMessFeedback(institutionId, {
      studentProfileId: e.studentProfileId,
      studentName: name,
      mealTypeId: lunch?.id ?? mealTypes[0].id,
      rating: 4,
      comments: 'Good food quality today',
    });
  }

  await prisma.hostelMessExpense.createMany({
    data: [
      { institutionId, expenseDate: todayDate(), category: 'Raw Materials', description: 'Vegetables & groceries', amount: 45200, academicYear },
      { institutionId, expenseDate: addDays(todayDate(), -1), category: 'Fuel', description: 'LPG cylinders', amount: 12800, academicYear },
    ],
  });

  if (enrollments[1]) {
    const e = enrollments[1];
    const name = e.profile ? `${e.profile.student.firstName} ${e.profile.student.lastName}`.trim() : e.studentName;
    await applyMessRebate(institutionId, e.studentProfileId, name, 5, academicYear);
  }

  await syncMessSummary(institutionId, academicYear);
  await logActivity(institutionId, 'SEED_MESS', 'Mess management demo seeded');
  return getMessManagement(institutionId, academicYear);
}
