import { AccountStatus, ApplicationStatus, MeritBadge } from '@prisma/client';
import { prisma } from './prisma.js';
import { getInstitutionPassMarks } from './admissionTestSettings.js';

function academicSessionFromDate(value?: Date | string | null): string {
  if (!value) return 'Unassigned';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return 'Unassigned';
  const y = d.getFullYear();
  const m = d.getMonth();
  if (m >= 3) return `${y}-${String(y + 1).slice(-2)}`;
  return `${y - 1}-${String(y).slice(-2)}`;
}

export type ManualSubjectMark = {
  name: string;
  maxMarks: number;
  obtainedMarks: number;
};

const DEFAULT_SUBJECTS = [
  'English',
  'Mathematics',
  'Science',
  'Social Studies',
  'Hindi',
  'General Knowledge',
];

export function resolveMeritBadge(percent: number, passMarks: number): MeritBadge {
  if (percent >= 85) return MeritBadge.GOLD;
  if (percent >= 70) return MeritBadge.SILVER;
  if (percent >= passMarks) return MeritBadge.BRONZE;
  return MeritBadge.NONE;
}

export function calculateManualEntranceResult(
  subjects: ManualSubjectMark[],
  passMarksPercent: number,
) {
  const active = subjects.filter((s) => s.name.trim() && s.maxMarks > 0);
  if (active.length === 0) {
    throw new Error('Select at least one subject with max marks.');
  }

  for (const subject of active) {
    if (subject.obtainedMarks < 0) {
      throw new Error(`Marks for ${subject.name} cannot be negative.`);
    }
    if (subject.obtainedMarks > subject.maxMarks) {
      throw new Error(`Marks for ${subject.name} cannot exceed ${subject.maxMarks}.`);
    }
  }

  const totalMaxMarks = active.reduce((sum, s) => sum + s.maxMarks, 0);
  const totalObtained = active.reduce((sum, s) => sum + s.obtainedMarks, 0);
  const percentScore = totalMaxMarks > 0 ? Number(((totalObtained / totalMaxMarks) * 100).toFixed(2)) : 0;
  const meritBadge = resolveMeritBadge(percentScore, passMarksPercent);
  const passed = percentScore >= passMarksPercent;

  return {
    subjects: active,
    totalMaxMarks,
    totalObtained,
    percentScore,
    meritBadge,
    passed,
  };
}

export async function fetchManualEntryMeta(institutionId: string) {
  const [setup, applications, teachers, defaultPassMarks] = await Promise.all([
    prisma.institutionSetup.findUnique({ where: { institutionId } }),
    prisma.application.findMany({
      where: { institutionId, status: { not: ApplicationStatus.REJECTED } },
      select: {
        id: true,
        applicationId: true,
        studentName: true,
        classApplied: true,
        entranceTestScore: true,
        manualEntranceTest: { select: { id: true } },
      },
      orderBy: { studentName: 'asc' },
    }),
    prisma.user.findMany({
      where: {
        accountStatus: AccountStatus.ACTIVE,
        userType: { in: ['STAFF', 'ADMIN'] },
      },
      select: { displayName: true, email: true },
      orderBy: { displayName: 'asc' },
    }),
    getInstitutionPassMarks(institutionId),
  ]);

  const subjectsTile = (setup?.subjectsSetup || {}) as {
    records?: Array<Record<string, string>>;
    recordColumns?: Array<{ key: string; label: string }>;
  };
  const nameKey =
    subjectsTile.recordColumns?.find((c) => /subject|name/i.test(c.key) || /subject|name/i.test(c.label))?.key ||
    'subjectName';
  const subjectNames = [
    ...new Set(
      [
        ...DEFAULT_SUBJECTS,
        ...(subjectsTile.records || [])
          .map((r) => (r[nameKey] || r.subjectName || r.name || r.Subject || '').trim())
          .filter(Boolean),
      ],
    ),
  ].slice(0, 30);

  const classesTile = (setup?.classesSections || {}) as {
    records?: Array<Record<string, string>>;
    recordColumns?: Array<{ key: string; label: string }>;
  };
  const classKey =
    classesTile.recordColumns?.find((c) => /class/i.test(c.key) || /class/i.test(c.label))?.key || 'className';
  const classes = [
    ...new Set(
      [
        ...(classesTile.records || [])
          .map((r) => (r[classKey] || r.className || r.class || '').trim())
          .filter(Boolean),
        ...applications.map((a) => a.classApplied).filter(Boolean),
      ],
    ),
  ].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  const teacherNames = [
    ...new Set(teachers.flatMap((t) => [t.displayName, t.email].filter(Boolean))),
  ].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

  return {
    defaultPassMarksPercent: defaultPassMarks,
    defaultMaxMarksPerSubject: 50,
    maxSubjects: 6,
    subjects: subjectNames,
    classes,
    teachers: teacherNames,
    students: applications.map((a) => ({
      applicationDbId: a.id,
      applicationId: a.applicationId,
      studentName: a.studentName,
      classApplied: a.classApplied,
      hasManualEntry: !!a.manualEntranceTest,
      entranceTestScore: a.entranceTestScore,
    })),
  };
}

export async function submitManualEntranceTestEntry(
  institutionId: string,
  payload: {
    applicationDbId: string;
    teacherName: string;
    classApplied: string;
    subjects: ManualSubjectMark[];
    recordedBy: string;
  },
) {
  const app = await prisma.application.findFirst({
    where: { id: payload.applicationDbId, institutionId },
  });
  if (!app) throw new Error('Application not found');
  if (app.status === ApplicationStatus.REJECTED) {
    throw new Error('Cannot record entrance test for a rejected application');
  }

  const passMarks = await getInstitutionPassMarks(institutionId);
  const result = calculateManualEntranceResult(payload.subjects, passMarks);
  const academicSession = academicSessionFromDate(new Date());
  const classApplied = payload.classApplied.trim() || app.classApplied;

  const entry = await prisma.$transaction(async (tx) => {
    const saved = await tx.manualEntranceTestEntry.upsert({
      where: { applicationId: app.id },
      create: {
        institutionId,
        applicationId: app.id,
        teacherName: payload.teacherName.trim(),
        classApplied,
        subjects: result.subjects,
        totalMaxMarks: result.totalMaxMarks,
        totalObtained: result.totalObtained,
        percentScore: result.percentScore,
        meritBadge: result.meritBadge,
        academicSession,
        recordedBy: payload.recordedBy,
      },
      update: {
        teacherName: payload.teacherName.trim(),
        classApplied,
        subjects: result.subjects,
        totalMaxMarks: result.totalMaxMarks,
        totalObtained: result.totalObtained,
        percentScore: result.percentScore,
        meritBadge: result.meritBadge,
        academicSession,
        recordedBy: payload.recordedBy,
      },
    });

    await tx.application.update({
      where: { id: app.id },
      data: {
        classApplied,
        entranceTestScore: result.percentScore,
        entranceTestMax: 100,
        status:
          app.status === ApplicationStatus.PENDING_VERIFICATION
            ? ApplicationStatus.VERIFIED
            : app.status,
      },
    });

    return saved;
  });

  return {
    entry,
    percentScore: result.percentScore,
    meritBadge: result.meritBadge,
    passed: result.passed,
    totalMaxMarks: result.totalMaxMarks,
    totalObtained: result.totalObtained,
    subjects: result.subjects,
  };
}
