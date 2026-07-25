import { Prisma } from '@prisma/client';
import { prisma } from './prisma.js';
import { seedRoomsAllotment } from './hostelRoomsAllotment.js';
import { seedMessManagement } from './hostelMessManagement.js';
import { seedLeaveManagement } from './hostelLeaveManagement.js';
import { seedGatePassManagement } from './hostelGatePass.js';
import { seedInventoryManagement } from './hostelInventory.js';

const ACADEMIC_YEARS = ['2023-24', '2024-25', '2025-26', '2026-27'];

export const HOSTEL_REPORT_CATALOG = {
  statutory: {
    label: 'Statutory & Compliance',
    compliance: ['UGC', 'CBSE', 'State Education Dept'],
    reports: [
      {
        id: 'occupancy_vacancy_matrix',
        name: 'Occupancy & Vacancy Matrix',
        description: 'Block/floor/room-wise bed occupancy for audit & capacity planning',
      },
      {
        id: 'hostel_fee_defaulters',
        name: 'Hostel Fee Defaulters',
        description: 'Outstanding hostel fee dues with aging for recovery action',
      },
      {
        id: 'mess_consumption_budget',
        name: 'Monthly Mess Consumption vs. Budget',
        description: 'Mess expenses, inventory consumption & budget variance analysis',
      },
      {
        id: 'student_movement_register',
        name: 'Student Movement Register',
        description: 'Leaves & gate passes — exit/entry register for security audit',
      },
      {
        id: 'asset_reconciliation',
        name: 'Asset Reconciliation Report',
        description: 'Physical asset mapping vs. bed allotments — missing/damaged/unmapped',
      },
    ],
  },
};

export type HostelReportFilters = {
  dateFrom?: string;
  dateTo?: string;
  hostelId?: string;
  academicYear?: string;
  monthLabel?: string;
};

function todayDate() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function formatDate(d: Date) {
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatInr(n: number) {
  return `₹ ${Math.round(n).toLocaleString('en-IN')}`;
}

function monthLabel(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function relativeTime(d: Date) {
  const mins = Math.floor((Date.now() - d.getTime()) / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function parseDateRange(filters: HostelReportFilters) {
  const dateTo = filters.dateTo ? new Date(filters.dateTo) : todayDate();
  const dateFrom = filters.dateFrom
    ? new Date(filters.dateFrom)
    : new Date(dateTo.getFullYear(), dateTo.getMonth(), 1);
  dateTo.setHours(23, 59, 59, 999);
  return { dateFrom, dateTo };
}

function hostelScope(filters: HostelReportFilters): Prisma.HostelMasterWhereInput {
  if (filters.hostelId) return { id: filters.hostelId };
  return {};
}

async function ensureSettings(institutionId: string) {
  let settings = await prisma.hostelReportsSettings.findUnique({ where: { institutionId } });
  if (!settings) {
    settings = await prisma.hostelReportsSettings.create({
      data: {
        institutionId,
        reportCatalog: HOSTEL_REPORT_CATALOG.statutory.reports,
        roleMatrix: [
          { role: 'Super Admin', permissions: 'All reports, all hostels, scheduler, BI export' },
          { role: 'Principal', permissions: 'Executive summaries, compliance registers, audit exports' },
          { role: 'Warden', permissions: 'Hostel-scoped operational reports, movement register' },
          { role: 'Accounts', permissions: 'Fee defaulters, mess budget variance, collection reports' },
          { role: 'Auditor', permissions: 'Read-only access to all statutory registers' },
        ],
      },
    });
  }
  return settings;
}

async function logActivity(institutionId: string, action: string, details: string) {
  await prisma.hostelActivityLog.create({
    data: { institutionId, action, details, performedBy: 'Reports System' },
  });
}

async function auditRun(
  institutionId: string,
  template: string,
  name: string,
  filters: HostelReportFilters,
  rowCount: number,
  exportFormat = '',
  performedBy = 'Warden',
  skip = false,
) {
  if (skip) return;
  await prisma.hostelReportRun.create({
    data: {
      institutionId,
      reportTemplate: template,
      reportName: name,
      filters: filters as object,
      rowCount,
      exportFormat,
      hostelId: filters.hostelId ?? '',
      performedBy,
    },
  });
}

export async function generateHostelReport(
  institutionId: string,
  templateId: string,
  filters: HostelReportFilters = {},
  options: { skipAudit?: boolean } = {},
) {
  const academicYear = filters.academicYear ?? '2025-26';
  const settings = await ensureSettings(institutionId);
  const { dateFrom, dateTo } = parseDateRange(filters);
  const month = filters.monthLabel ?? monthLabel(dateFrom);

  const meta = HOSTEL_REPORT_CATALOG.statutory.reports.find((r) => r.id === templateId);
  if (!meta) throw new Error('Unknown report template');

  let columns: string[] = [];
  let rows: Record<string, string | number>[] = [];
  let summary: Record<string, string | number> = {};

  switch (templateId) {
    case 'occupancy_vacancy_matrix': {
      columns = ['Hostel', 'Block', 'Floor', 'Room', 'Type', 'Beds', 'Occupied', 'Available', 'Maintenance', 'Occupancy %'];
      const hostels = await prisma.hostelMaster.findMany({
        where: { institutionId, academicYear, status: 'ACTIVE', ...hostelScope(filters) },
        include: {
          blocks: {
            include: {
              floors: {
                include: {
                  rooms: { include: { beds: true } },
                },
              },
            },
          },
        },
        orderBy: { hostelName: 'asc' },
      });

      let totalBeds = 0;
      let totalOccupied = 0;
      let totalAvailable = 0;
      let totalMaintenance = 0;

      for (const hostel of hostels) {
        for (const block of hostel.blocks) {
          for (const floor of block.floors) {
            for (const room of floor.rooms) {
              const occupied = room.beds.filter((b) => b.bedStatus === 'OCCUPIED').length;
              const available = room.beds.filter((b) => b.bedStatus === 'AVAILABLE').length;
              const maintenance = room.beds.filter((b) => b.bedStatus === 'MAINTENANCE').length;
              const beds = room.beds.length;
              totalBeds += beds;
              totalOccupied += occupied;
              totalAvailable += available;
              totalMaintenance += maintenance;
              rows.push({
                Hostel: hostel.hostelName,
                Block: block.blockName,
                Floor: floor.floorName,
                Room: room.roomNumber,
                Type: room.roomType,
                Beds: beds,
                Occupied: occupied,
                Available: available,
                Maintenance: maintenance,
                'Occupancy %': beds ? `${Math.round((occupied / beds) * 100)}%` : '0%',
              });
            }
          }
        }
      }

      summary = {
        totalRooms: rows.length,
        totalBeds,
        occupied: totalOccupied,
        available: totalAvailable,
        maintenance: totalMaintenance,
        occupancyPct: totalBeds ? `${Math.round((totalOccupied / totalBeds) * 100)}%` : '0%',
      };
      break;
    }

    case 'hostel_fee_defaulters': {
      columns = ['Student', 'Hostel', 'Amount Due', 'Due Date', 'Days Overdue', 'Status', 'Academic Year'];
      const payments = await prisma.hostelPendingPayment.findMany({
        where: {
          institutionId,
          academicYear,
          status: 'PENDING',
          ...(filters.hostelId ? { hostelId: filters.hostelId } : {}),
        },
        include: { hostel: true },
        orderBy: { dueDate: 'asc' },
        take: 500,
      });

      const today = todayDate();
      let totalDue = 0;
      rows = payments.map((p) => {
        const daysOverdue = Math.max(0, Math.floor((today.getTime() - p.dueDate.getTime()) / 86400000));
        totalDue += p.amount;
        return {
          Student: p.studentName,
          Hostel: p.hostel.hostelName,
          'Amount Due': formatInr(p.amount),
          'Due Date': formatDate(p.dueDate),
          'Days Overdue': daysOverdue,
          Status: p.status,
          'Academic Year': p.academicYear,
        };
      });

      summary = {
        defaulterCount: rows.length,
        totalOutstanding: formatInr(totalDue),
        criticalOverdue: rows.filter((r) => Number(r['Days Overdue']) > 30).length,
      };
      break;
    }

    case 'mess_consumption_budget': {
      columns = ['Month', 'Category', 'Description', 'Consumption', 'Expense', 'Budget', 'Variance', 'Variance %'];
      const monthStart = new Date(dateFrom.getFullYear(), dateFrom.getMonth(), 1);
      const monthEnd = new Date(dateFrom.getFullYear(), dateFrom.getMonth() + 1, 0);
      monthEnd.setHours(23, 59, 59, 999);

      const [expenses, inventoryLogs, messSummary] = await Promise.all([
        prisma.hostelMessExpense.findMany({
          where: { institutionId, academicYear, expenseDate: { gte: monthStart, lte: monthEnd } },
          orderBy: { expenseDate: 'asc' },
        }),
        prisma.hostelMessInventoryLog.findMany({
          where: { institutionId, menuDate: { gte: monthStart, lte: monthEnd } },
        }),
        prisma.hostelMessSummary.findFirst({ where: { institutionId, academicYear }, orderBy: { refreshedAt: 'desc' } }),
      ]);

      const budget = settings.monthlyMessBudget;
      const totalExpense = expenses.reduce((s, e) => s + e.amount, 0);
      const totalConsumptionKg = inventoryLogs.reduce((s, l) => s + l.quantity, 0);
      const variance = totalExpense - budget;
      const variancePct = budget > 0 ? `${Math.round((variance / budget) * 100)}%` : '0%';

      const byCategory = new Map<string, number>();
      for (const e of expenses) {
        byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + e.amount);
      }

      if (byCategory.size === 0) {
        rows.push({
          Month: month,
          Category: 'Raw Materials',
          Description: 'Mess procurement & groceries',
          Consumption: `${totalConsumptionKg.toFixed(1)} kg`,
          Expense: formatInr(totalExpense || (messSummary?.totalExpense ?? 0)),
          Budget: formatInr(budget),
          Variance: formatInr(variance),
          'Variance %': variancePct,
        });
      } else {
        for (const [cat, amt] of byCategory) {
          const catVariance = amt - budget / byCategory.size;
          rows.push({
            Month: month,
            Category: cat,
            Description: `${cat} — ${month}`,
            Consumption: `${(totalConsumptionKg / byCategory.size).toFixed(1)} kg`,
            Expense: formatInr(amt),
            Budget: formatInr(budget / byCategory.size),
            Variance: formatInr(catVariance),
            'Variance %': budget ? `${Math.round((catVariance / (budget / byCategory.size)) * 100)}%` : '0%',
          });
        }
      }

      summary = {
        month,
        totalConsumptionKg: `${totalConsumptionKg.toFixed(1)} kg`,
        totalExpense: formatInr(totalExpense || (messSummary?.totalExpense ?? 0)),
        monthlyBudget: formatInr(budget),
        variance: formatInr(variance),
        variancePct,
        studentsOpted: messSummary?.studentsOpted ?? 0,
      };
      break;
    }

    case 'student_movement_register': {
      columns = ['Date', 'Student', 'Hostel', 'Movement Type', 'Purpose', 'Exit Time', 'Entry Time', 'Status', 'Approved By'];
      const hostelFilter = filters.hostelId ? { hostelId: filters.hostelId } : {};

      const [leaves, gatePasses] = await Promise.all([
        prisma.hostelLeaveApplication.findMany({
          where: {
            institutionId,
            academicYear,
            ...hostelFilter,
            outDateTime: { lte: dateTo },
            expectedInDateTime: { gte: dateFrom },
          },
          include: { hostel: true },
          orderBy: { outDateTime: 'desc' },
          take: 300,
        }),
        prisma.hostelGatePass.findMany({
          where: {
            institutionId,
            academicYear,
            ...hostelFilter,
            requestedAt: { gte: dateFrom, lte: dateTo },
          },
          include: { hostel: true },
          orderBy: { requestedAt: 'desc' },
          take: 300,
        }),
      ]);

      const leaveRows = leaves.map((l) => ({
        Date: formatDate(l.outDateTime),
        Student: l.studentName,
        Hostel: l.hostel?.hostelName ?? '—',
        'Movement Type': 'LEAVE',
        Purpose: l.reason || l.leaveType.replace(/_/g, ' '),
        'Exit Time': l.exitLoggedAt ? formatDate(l.exitLoggedAt) : '—',
        'Entry Time': (l.returnLoggedAt ?? l.actualReturnAt) ? formatDate((l.returnLoggedAt ?? l.actualReturnAt)!) : '—',
        Status: l.status,
        'Approved By': l.wardenApprovedBy || l.parentApprovedBy || '—',
        _sort: l.outDateTime.getTime(),
      }));

      const passRows = gatePasses.map((g) => ({
        Date: formatDate(g.requestedAt),
        Student: g.studentName,
        Hostel: g.hostel?.hostelName ?? '—',
        'Movement Type': 'GATE PASS',
        Purpose: g.purpose || g.destination,
        'Exit Time': g.exitScannedAt ? formatDate(g.exitScannedAt) : '—',
        'Entry Time': g.returnScannedAt ? formatDate(g.returnScannedAt) : '—',
        Status: g.status,
        'Approved By': g.wardenIssuedBy || '—',
        _sort: g.requestedAt.getTime(),
      }));

      rows = [...leaveRows, ...passRows]
        .sort((a, b) => (b._sort as number) - (a._sort as number))
        .map(({ _sort, ...rest }) => rest);

      summary = {
        totalMovements: rows.length,
        leaveCount: leaveRows.length,
        gatePassCount: passRows.length,
        period: `${formatDate(dateFrom)} – ${formatDate(dateTo)}`,
      };
      break;
    }

    case 'asset_reconciliation': {
      columns = ['Asset Tag', 'Asset Name', 'Type', 'Condition', 'Mapped Bed', 'Room', 'Student', 'Status', 'Reconciliation'];
      const assets = await prisma.hostelInventoryAsset.findMany({
        where: {
          institutionId,
          academicYear,
          ...(filters.hostelId ? { hostelId: filters.hostelId } : {}),
        },
        include: {
          bedMappings: {
            where: { status: 'ACTIVE' },
            take: 1,
          },
        },
        orderBy: { assetTag: 'asc' },
        take: 500,
      });

      let mapped = 0;
      let unmapped = 0;
      let damaged = 0;

      rows = assets.map((a) => {
        const mapping = a.bedMappings[0];
        const reconciliation = !mapping
          ? 'UNMAPPED'
          : a.condition === 'DAMAGED' || a.condition === 'MISSING'
            ? 'DISCREPANCY'
            : 'RECONCILED';

        if (reconciliation === 'UNMAPPED') unmapped += 1;
        else if (reconciliation === 'DISCREPANCY') damaged += 1;
        else mapped += 1;

        return {
          'Asset Tag': a.assetTag,
          'Asset Name': a.assetName,
          Type: a.assetType.replace(/_/g, ' '),
          Condition: a.condition,
          'Mapped Bed': mapping?.bedLabel ?? '—',
          Room: mapping?.roomLabel ?? '—',
          Student: mapping?.studentName ?? '—',
          Status: a.status,
          Reconciliation: reconciliation,
        };
      });

      summary = {
        totalAssets: rows.length,
        reconciled: mapped,
        unmapped,
        discrepancies: damaged,
        reconciliationPct: rows.length ? `${Math.round((mapped / rows.length) * 100)}%` : '0%',
      };
      break;
    }

    default:
      throw new Error('Report not implemented');
  }

  await auditRun(institutionId, templateId, meta.name, filters, rows.length, '', 'Warden', options.skipAudit);
  if (!options.skipAudit) {
    await logActivity(institutionId, 'GENERATE_REPORT', `Generated ${meta.name} (${rows.length} rows)`);
  }

  return {
    reportTemplate: templateId,
    reportName: meta.name,
    description: meta.description,
    columns,
    rows,
    summary,
    rowCount: rows.length,
    generatedAt: new Date().toISOString(),
    filters: { ...filters, academicYear, monthLabel: month },
  };
}

export async function exportHostelReport(
  institutionId: string,
  templateId: string,
  format: 'PDF' | 'Excel' | 'CSV',
  filters: HostelReportFilters = {},
) {
  const preview = await generateHostelReport(institutionId, templateId, filters);
  const fileName = `hostel_${templateId}_${Date.now()}.${format.toLowerCase()}`;
  await logActivity(institutionId, 'EXPORT_REPORT', `Exported ${preview.reportName} as ${format}`);
  return {
    success: true,
    format,
    fileName,
    message: `${preview.reportName} exported as ${format}`,
    preview,
  };
}

export async function getHostelReportsAnalytics(
  institutionId: string,
  academicYear = '2025-26',
  hostelId?: string,
) {
  const settings = await ensureSettings(institutionId);

  const [hostels, schedules, recentRuns, beds, pendingPayments, messSummary, leaves, gatePasses, assets] = await Promise.all([
    prisma.hostelMaster.findMany({ where: { institutionId, academicYear, status: 'ACTIVE' }, orderBy: { hostelName: 'asc' } }),
    prisma.hostelReportSchedule.findMany({ where: { institutionId }, orderBy: { createdAt: 'desc' } }),
    prisma.hostelReportRun.findMany({ where: { institutionId }, orderBy: { createdAt: 'desc' }, take: 25 }),
    prisma.hostelBed.findMany({ where: { institutionId } }),
    prisma.hostelPendingPayment.findMany({ where: { institutionId, academicYear, status: 'PENDING' } }),
    prisma.hostelMessSummary.findFirst({ where: { institutionId, academicYear }, orderBy: { refreshedAt: 'desc' } }),
    prisma.hostelLeaveApplication.count({ where: { institutionId, academicYear } }),
    prisma.hostelGatePass.count({ where: { institutionId, academicYear } }),
    prisma.hostelInventoryAsset.findMany({ where: { institutionId, academicYear }, include: { bedMappings: { where: { status: 'ACTIVE' } } } }),
  ]);

  const totalBeds = beds.length;
  const occupied = beds.filter((b) => b.bedStatus === 'OCCUPIED').length;
  const totalDue = pendingPayments.reduce((s, p) => s + p.amount, 0);
  const mappedAssets = assets.filter((a) => a.bedMappings.length > 0).length;
  const month = monthLabel();

  const defaultFilters: HostelReportFilters = {
    academicYear,
    hostelId: hostelId ?? hostels[0]?.id,
    dateFrom: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10),
    dateTo: todayDate().toISOString().slice(0, 10),
    monthLabel: month,
  };

  const reportPreviews = HOSTEL_REPORT_CATALOG.statutory.reports.map((r) => {
    let summary: Record<string, string | number> = {};
    if (r.id === 'occupancy_vacancy_matrix') {
      summary = { totalBeds, occupied, occupancyPct: totalBeds ? `${Math.round((occupied / totalBeds) * 100)}%` : '0%' };
    } else if (r.id === 'hostel_fee_defaulters') {
      summary = { defaulterCount: pendingPayments.length, totalOutstanding: formatInr(totalDue) };
    } else if (r.id === 'mess_consumption_budget') {
      const expense = messSummary?.totalExpense ?? 0;
      const variance = expense - settings.monthlyMessBudget;
      summary = { monthlyBudget: formatInr(settings.monthlyMessBudget), totalExpense: formatInr(expense), variance: formatInr(variance) };
    } else if (r.id === 'student_movement_register') {
      summary = { totalMovements: leaves + gatePasses, leaveCount: leaves, gatePassCount: gatePasses };
    } else if (r.id === 'asset_reconciliation') {
      summary = { totalAssets: assets.length, reconciled: mappedAssets, reconciliationPct: assets.length ? `${Math.round((mappedAssets / assets.length) * 100)}%` : '0%' };
    }
    return { id: r.id, name: r.name, description: r.description, summary };
  });

  await logActivity(institutionId, 'VIEW_REPORTS', 'Reports & Analytics accessed');

  return {
    academicYear,
    academicYears: ACADEMIC_YEARS,
    hostels: hostels.map((h) => ({ id: h.id, code: h.hostelCode, name: h.hostelName })),
    selectedHostelId: hostelId ?? hostels[0]?.id ?? '',
    reportTree: HOSTEL_REPORT_CATALOG,
    exportFormats: ['PDF', 'Excel', 'CSV'],
    defaultFilters,
    settings: {
      monthlyMessBudget: settings.monthlyMessBudget,
      complianceBodies: settings.complianceBodies as string[],
    },
    kpis: {
      occupancyPct: totalBeds ? `${Math.round((occupied / totalBeds) * 100)}%` : '0%',
      totalBeds,
      occupiedBeds: occupied,
      vacantBeds: beds.filter((b) => b.bedStatus === 'AVAILABLE').length,
      feeDefaulters: pendingPayments.length,
      totalOutstanding: formatInr(totalDue),
      messExpense: formatInr(messSummary?.totalExpense ?? 0),
      messBudget: formatInr(settings.monthlyMessBudget),
      movementRecords: leaves + gatePasses,
      assetReconciliationPct: assets.length ? `${Math.round((mappedAssets / assets.length) * 100)}%` : '0%',
      reportsGenerated: recentRuns.length,
      activeSchedules: schedules.filter((s) => s.status === 'ACTIVE').length,
    },
    reportPreviews,
    messBudgetChart: [
      { name: 'Budget', value: settings.monthlyMessBudget, color: '#3b82f6' },
      { name: 'Actual', value: messSummary?.totalExpense ?? 0, color: '#f59e0b' },
    ],
    occupancyChart: [
      { name: 'Occupied', value: occupied, color: '#22c55e' },
      { name: 'Vacant', value: beds.filter((b) => b.bedStatus === 'AVAILABLE').length, color: '#94a3b8' },
      { name: 'Maintenance', value: beds.filter((b) => b.bedStatus === 'MAINTENANCE').length, color: '#f97316' },
    ],
    schedules: schedules.map((s) => ({
      id: s.id,
      reportTemplate: s.reportTemplate,
      reportName: s.reportName,
      frequency: s.frequency,
      channel: s.channel,
      recipients: s.recipients,
      status: s.status,
      lastRunAt: s.lastRunAt?.toISOString() ?? null,
      nextRunAt: s.nextRunAt?.toISOString() ?? null,
      createdBy: s.createdBy,
    })),
    recentRuns: recentRuns.map((r) => ({
      id: r.id,
      reportName: r.reportName,
      reportTemplate: r.reportTemplate,
      rowCount: r.rowCount,
      exportFormat: r.exportFormat || 'Preview',
      performedBy: r.performedBy,
      relativeTime: relativeTime(r.createdAt),
      status: r.status,
    })),
    roleMatrix: settings.roleMatrix as { role: string; permissions: string }[],
    automationRules: [
      'Monthly Occupancy Matrix auto-emailed to Principal on 1st of each month',
      'Fee Defaulters List dispatched to Accounts every Monday',
      'Mess Budget Variance alert when consumption exceeds 95% of budget',
      'Movement Register available for statutory security audit',
      'Asset Reconciliation flagged for unmapped or damaged items',
    ],
    complianceBodies: settings.complianceBodies as string[],
    erpIntegration: 'Central ERP Notification Engine — scheduled report dispatch via email',
  };
}

export async function scheduleHostelReport(
  institutionId: string,
  body: {
    reportTemplate: string;
    reportName: string;
    frequency?: string;
    channel?: string;
    recipients: string;
    hostelId?: string;
    filters?: HostelReportFilters;
    createdBy?: string;
  },
) {
  const nextMonth = new Date();
  nextMonth.setMonth(nextMonth.getMonth() + 1, 1);
  nextMonth.setHours(8, 0, 0, 0);

  const schedule = await prisma.hostelReportSchedule.create({
    data: {
      institutionId,
      reportTemplate: body.reportTemplate,
      reportName: body.reportName,
      frequency: body.frequency ?? 'MONTHLY',
      channel: body.channel ?? 'EMAIL',
      recipients: body.recipients,
      cronExpr: body.frequency === 'WEEKLY' ? '0 8 * * 1' : '0 8 1 * *',
      hostelId: body.hostelId ?? '',
      filters: (body.filters ?? {}) as object,
      nextRunAt: nextMonth,
      createdBy: body.createdBy ?? 'Warden',
    },
  });

  await logActivity(institutionId, 'SCHEDULE_REPORT', `Scheduled "${body.reportName}" → ${body.recipients}`);
  return {
    success: true,
    message: `Report "${body.reportName}" scheduled (${schedule.frequency})`,
    schedule,
    data: await getHostelReportsAnalytics(institutionId),
  };
}

export async function deleteHostelReportSchedule(institutionId: string, scheduleId: string) {
  await prisma.hostelReportSchedule.deleteMany({ where: { institutionId, id: scheduleId } });
  return { success: true, data: await getHostelReportsAnalytics(institutionId) };
}

export async function seedHostelReportsAnalytics(institutionId: string) {
  await seedRoomsAllotment(institutionId);
  await seedMessManagement(institutionId);
  await seedLeaveManagement(institutionId);
  await seedGatePassManagement(institutionId);
  await seedInventoryManagement(institutionId);
  await ensureSettings(institutionId);

  const academicYear = '2025-26';
  const hostels = await prisma.hostelMaster.findMany({ where: { institutionId, academicYear }, take: 3 });

  const existingPending = await prisma.hostelPendingPayment.count({ where: { institutionId, status: 'PENDING' } });
  if (existingPending < 5) {
    const defs: [string, number][] = [
      ['Rahul Sharma', 18500],
      ['Priya Patel', 22000],
      ['Amit Kumar', 15000],
      ['Sneha Reddy', 12000],
      ['Vikram Singh', 28000],
    ];
    for (let i = 0; i < defs.length && i < hostels.length; i += 1) {
      const name = defs[i][0];
      const amount = defs[i][1];
      await prisma.hostelPendingPayment.create({
        data: {
          institutionId,
          hostelId: hostels[i % hostels.length].id,
          studentName: name,
          amount,
          dueDate: new Date(Date.now() - (i + 1) * 7 * 86400000),
          status: 'PENDING',
          academicYear,
        },
      });
    }
  }

  const existingSchedules = await prisma.hostelReportSchedule.count({ where: { institutionId } });
  if (existingSchedules === 0) {
    await prisma.hostelReportSchedule.createMany({
      data: [
        {
          institutionId,
          reportTemplate: 'occupancy_vacancy_matrix',
          reportName: 'Monthly Occupancy Matrix',
          frequency: 'MONTHLY',
          recipients: 'principal@school.edu',
          nextRunAt: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1, 8, 0, 0),
        },
        {
          institutionId,
          reportTemplate: 'hostel_fee_defaulters',
          reportName: 'Weekly Fee Defaulters',
          frequency: 'WEEKLY',
          cronExpr: '0 8 * * 1',
          recipients: 'accounts@school.edu',
          nextRunAt: new Date(Date.now() + 7 * 86400000),
        },
      ],
    });
  }

  await logActivity(institutionId, 'SEED_REPORTS', 'Hostel reports & analytics demo seeded');
  return getHostelReportsAnalytics(institutionId, academicYear);
}
