import { StudentReportStatus, StudentReportType, StudentStatus } from '@prisma/client';
import { prisma } from './prisma.js';
import { formatClassSection, getStudentAnalytics } from './students.js';

export const REPORT_TYPE_UI: Record<StudentReportType, string> = {
  ACTIVE_INACTIVE: 'Active / Inactive Students',
  CLASS_TOPPERS: 'Class-wise Results & Toppers',
  ABSENT_CLASS: 'Absent Data (Class-wise)',
  ID_CARD: 'ID Card Download Report',
  RFID_BIOMETRIC: 'RFID / Biometrics Report',
  CUSTOM: 'Custom Report',
};

export const REPORT_STATUS_UI: Record<StudentReportStatus, string> = {
  DRAFT: 'Draft',
  PENDING: 'Pending',
  OPEN: 'Open',
  ACTIVE: 'Active',
  COMPLETED: 'Completed',
  APPROVED: 'Approved',
  PAID: 'Paid',
  DUE: 'Due',
};

export function parseReportType(input?: string): StudentReportType | undefined {
  if (!input) return undefined;
  const upper = input.toUpperCase().replace(/\s+/g, '_') as StudentReportType;
  if (Object.values(StudentReportType).includes(upper)) return upper;
  return undefined;
}

export function parseReportStatus(input?: string): StudentReportStatus | undefined {
  if (!input) return undefined;
  const upper = input.toUpperCase().replace(/\s+/g, '_') as StudentReportStatus;
  if (Object.values(StudentReportStatus).includes(upper)) return upper;
  return undefined;
}

export async function generateReportRecordId(institutionId: string): Promise<string> {
  const count = await prisma.studentReport.count({ where: { institutionId } });
  for (let i = 0; i < 50; i++) {
    const candidate = `STU-${String(3000 + count + i + 1)}`;
    const taken = await prisma.studentReport.findFirst({
      where: { institutionId, recordId: candidate },
    });
    if (!taken) return candidate;
  }
  return `STU-${Date.now().toString().slice(-6)}`;
}

export function serializeReport(row: {
  id: string;
  recordId: string;
  reportType: StudentReportType;
  name: string;
  period: string;
  className: string;
  sectionName: string;
  academicYear: string;
  status: StudentReportStatus;
  config: unknown;
  data: unknown;
  generatedAt: Date;
  updatedAt: Date;
  createdAt: Date;
}) {
  return {
    id: row.id,
    recordId: row.recordId,
    reportType: row.reportType,
    reportTypeLabel: REPORT_TYPE_UI[row.reportType],
    name: row.name,
    period: row.period || row.academicYear,
    className: row.className,
    sectionName: row.sectionName,
    classGroup:
      row.className && row.sectionName
        ? formatClassSection(row.className, row.sectionName)
        : row.className || 'All Classes',
    academicYear: row.academicYear,
    status: row.status,
    statusLabel: REPORT_STATUS_UI[row.status],
    config: row.config,
    data: row.data,
    generatedAt: row.generatedAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
  };
}

export async function getReportsDashboard(institutionId: string) {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [total, activeOpen, pending, thisMonth] = await Promise.all([
    prisma.studentReport.count({ where: { institutionId } }),
    prisma.studentReport.count({
      where: {
        institutionId,
        status: { in: [StudentReportStatus.ACTIVE, StudentReportStatus.OPEN, StudentReportStatus.COMPLETED] },
      },
    }),
    prisma.studentReport.count({ where: { institutionId, status: StudentReportStatus.PENDING } }),
    prisma.studentReport.count({
      where: { institutionId, generatedAt: { gte: startOfMonth } },
    }),
  ]);

  return { total, activeOpen, pending, thisMonth };
}

type GenerateOpts = {
  institutionId: string;
  reportType: StudentReportType;
  academicYear: string;
  className?: string;
  sectionName?: string;
  customName?: string;
};

export async function buildReportData(opts: GenerateOpts) {
  const where = {
    institutionId: opts.institutionId,
    academicYear: opts.academicYear,
    ...(opts.className ? { className: opts.className } : {}),
    ...(opts.sectionName ? { sectionName: opts.sectionName } : {}),
  };

  const students = await prisma.student.findMany({
    where,
    orderBy: [{ className: 'asc' }, { sectionName: 'asc' }, { rollNumber: 'asc' }],
    take: 5000,
  });

  const analytics = await getStudentAnalytics(opts.institutionId, opts.academicYear);

  switch (opts.reportType) {
    case StudentReportType.ACTIVE_INACTIVE: {
      const byStatus = {
        active: students.filter((s) => s.status === StudentStatus.ACTIVE),
        inactive: students.filter((s) => s.status === StudentStatus.INACTIVE),
        passout: students.filter((s) => s.status === StudentStatus.PASSOUT),
        transferred: students.filter((s) => s.status === StudentStatus.TRANSFERRED),
      };
      return {
        summary: {
          active: byStatus.active.length,
          inactive: byStatus.inactive.length,
          passout: byStatus.passout.length,
          transferred: byStatus.transferred.length,
          total: students.length,
        },
        rows: students.map((s) => ({
          name: [s.firstName, s.lastName].filter(Boolean).join(' '),
          admissionNumber: s.admissionNumber,
          classGroup: formatClassSection(s.className, s.sectionName),
          status: s.status,
          mobile: s.mobile,
        })),
      };
    }
    case StudentReportType.CLASS_TOPPERS: {
      const toppers = students
        .filter((s) => s.entranceScore != null)
        .sort((a, b) => (b.entranceScore || 0) - (a.entranceScore || 0))
        .slice(0, 20)
        .map((s, i) => ({
          rank: i + 1,
          name: [s.firstName, s.lastName].filter(Boolean).join(' '),
          classGroup: formatClassSection(s.className, s.sectionName),
          score: s.entranceScore,
          percentage: s.entranceScore != null ? `${s.entranceScore.toFixed(1)}%` : '—',
        }));
      const classResults = analytics.classStats.map((c) => ({
        className: c.name,
        students: c.value,
        percent: c.percent,
      }));
      return { summary: { topperCount: toppers.length }, classResults, toppers, rows: students.map((s) => ({
          name: [s.firstName, s.lastName].filter(Boolean).join(' '),
          admissionNumber: s.admissionNumber,
          classGroup: formatClassSection(s.className, s.sectionName),
          rollNumber: s.rollNumber,
          entranceScore: s.entranceScore ?? '',
        })) };
    }
    case StudentReportType.ABSENT_CLASS: {
      const absentStudents = students.filter((s) => {
        const custom = (s.customFields || {}) as Record<string, unknown>;
        const profile = (custom.profile || {}) as Record<string, unknown>;
        return profile.attendanceToday === 'Absent';
      });
      const byClass = new Map<string, typeof absentStudents>();
      for (const s of absentStudents) {
        const key = s.className || 'Unspecified';
        if (!byClass.has(key)) byClass.set(key, []);
        byClass.get(key)!.push(s);
      }
      const classBreakdown = [...byClass.entries()].map(([cls, list]) => ({
        className: cls,
        absentCount: list.length,
        students: list.map((s) => ({
          name: [s.firstName, s.lastName].filter(Boolean).join(' '),
          section: s.sectionName,
          rollNumber: s.rollNumber,
        })),
      }));
      if (classBreakdown.length === 0 && analytics.attendance.absent > 0) {
        classBreakdown.push({
          className: opts.className || 'All Classes',
          absentCount: analytics.attendance.absent,
          students: [],
        });
      }
      return {
        summary: { totalAbsent: absentStudents.length || analytics.attendance.absent },
        classBreakdown,
        rows: absentStudents.map((s) => ({
          name: [s.firstName, s.lastName].filter(Boolean).join(' '),
          classGroup: formatClassSection(s.className, s.sectionName),
          rollNumber: s.rollNumber,
        })),
      };
    }
    case StudentReportType.ID_CARD: {
      const withPhoto = students.filter((s) => s.photoUrl);
      const withoutPhoto = students.filter((s) => !s.photoUrl);
      const byClass = new Map<string, { withPhoto: number; withoutPhoto: number }>();
      for (const s of students) {
        const key = s.className || 'Unspecified';
        const cur = byClass.get(key) || { withPhoto: 0, withoutPhoto: 0 };
        if (s.photoUrl) cur.withPhoto += 1;
        else cur.withoutPhoto += 1;
        byClass.set(key, cur);
      }
      return {
        summary: {
          ready: withPhoto.length,
          pending: withoutPhoto.length,
          total: students.length,
        },
        classBreakdown: [...byClass.entries()].map(([cls, v]) => ({
          className: cls,
          ...v,
        })),
        rows: students.map((s) => ({
          name: [s.firstName, s.lastName].filter(Boolean).join(' '),
          classGroup: formatClassSection(s.className, s.sectionName),
          admissionNumber: s.admissionNumber,
          idCardReady: !!s.photoUrl,
        })),
      };
    }
    case StudentReportType.RFID_BIOMETRIC: {
      const withRfid = students.filter((s) => s.rfidTag?.trim());
      const withoutRfid = students.filter((s) => !s.rfidTag?.trim());
      const byClass = new Map<string, { assigned: number; missing: number }>();
      for (const s of students) {
        const key = s.className || 'Unspecified';
        const cur = byClass.get(key) || { assigned: 0, missing: 0 };
        if (s.rfidTag?.trim()) cur.assigned += 1;
        else cur.missing += 1;
        byClass.set(key, cur);
      }
      return {
        summary: {
          rfidAssigned: withRfid.length,
          rfidMissing: withoutRfid.length,
          total: students.length,
        },
        classBreakdown: [...byClass.entries()].map(([cls, v]) => ({
          className: cls,
          ...v,
        })),
        rows: students.map((s) => ({
          name: [s.firstName, s.lastName].filter(Boolean).join(' '),
          classGroup: formatClassSection(s.className, s.sectionName),
          rfidTag: s.rfidTag || '—',
          biometricStatus: s.rfidTag?.trim() ? 'Configured' : 'Pending',
        })),
      };
    }
    default:
      return {
        summary: analytics.summary,
        classStats: analytics.classStats,
        rows: students.map((s) => ({
          name: [s.firstName, s.lastName].filter(Boolean).join(' '),
          admissionNumber: s.admissionNumber,
          classGroup: formatClassSection(s.className, s.sectionName),
          rollNumber: s.rollNumber,
          status: s.status,
          entranceScore: s.entranceScore ?? '',
          mobile: s.mobile,
        })),
        note: opts.customName || 'Custom configured report',
      };
  }
}

export async function generateStudentReport(opts: GenerateOpts) {
  const data = await buildReportData(opts);
  const recordId = await generateReportRecordId(opts.institutionId);
  const scope = opts.className
    ? formatClassSection(opts.className, opts.sectionName || '')
    : 'All Classes';

  const name =
    opts.customName ||
    `${REPORT_TYPE_UI[opts.reportType]}${opts.className ? ` — ${scope}` : ''}`;

  const period = `${opts.academicYear}${opts.className ? ` · ${scope}` : ''}`;

  const status =
    opts.reportType === StudentReportType.ABSENT_CLASS
      ? StudentReportStatus.PENDING
      : opts.reportType === StudentReportType.ID_CARD
        ? StudentReportStatus.OPEN
        : StudentReportStatus.COMPLETED;

  const row = await prisma.studentReport.create({
    data: {
      institutionId: opts.institutionId,
      recordId,
      reportType: opts.reportType,
      name,
      period,
      className: opts.className || '',
      sectionName: opts.sectionName || '',
      academicYear: opts.academicYear,
      status,
      config: {
        reportType: opts.reportType,
        className: opts.className || '',
        sectionName: opts.sectionName || '',
      },
      data: data as object,
      generatedAt: new Date(),
    },
  });

  return row;
}

export async function seedDefaultReports(institutionId: string, academicYear: string) {
  const existing = await prisma.studentReport.count({ where: { institutionId } });
  if (existing > 0) return 0;

  const types = Object.values(StudentReportType);
  let created = 0;
  for (let i = 0; i < types.length; i++) {
    await generateStudentReport({
      institutionId,
      reportType: types[i],
      academicYear,
    });
    created += 1;
  }
  return created;
}
