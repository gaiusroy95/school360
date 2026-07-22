import { prisma } from './prisma.js';
import { formatClassSection } from './students.js';
import { nextAcademicRecordId } from './academicManagement.js';

type SetupSections = Record<string, Record<string, unknown>>;

function readSetupSections(tile: unknown): SetupSections {
  if (!tile || typeof tile !== 'object') return {};
  const t = tile as { sections?: SetupSections };
  return t.sections || {};
}

function readField(sections: SetupSections, sectionId: string, key: string, fallback = '') {
  const val = sections[sectionId]?.[key];
  return val != null ? String(val) : fallback;
}

export async function loadInstitutionFramework(institutionId: string) {
  const setup = await prisma.institutionSetup.findUnique({ where: { institutionId } });
  const academic = readSetupSections(setup?.academicSetup);
  const session = readSetupSections(setup?.sessionTermSetup);
  const grading = readSetupSections(setup?.gradeMarksSetup);

  return {
    boardName: readField(academic, 'educationBoard', 'boardName', 'CBSE'),
    boardCode: readField(academic, 'educationBoard', 'boardCode'),
    standardAlignment: readField(academic, 'academicStructure', 'levels', 'National'),
    termSystem: readField(session, 'termsSemesters', 'termSystem', 'Terms'),
    terms: readField(session, 'termsSemesters', 'terms', 'Term 1, Term 2'),
    gradingSystem: readField(grading, 'gradingSystem', 'systemType', 'Percentage'),
    maxMarks: Number(readField(grading, 'marksConfiguration', 'maxMarks', '100')) || 100,
    passMarks: Number(readField(grading, 'passFail', 'passMarks', '33')) || 33,
    weightageEnabled: readField(grading, 'marksConfiguration', 'weightageEnabled') === 'Yes',
    levels: readField(academic, 'academicStructure', 'levels'),
    classFrom: readField(academic, 'academicStructure', 'classFrom'),
    classTo: readField(academic, 'academicStructure', 'classTo'),
    streams: readField(academic, 'streamGroup', 'streams'),
  };
}

export function serializeCurriculum(row: {
  id: string;
  recordId: string;
  academicYear: string;
  boardName: string;
  boardCode: string;
  standardAlignment: string;
  termSystem: string;
  terms: string;
  gradingSystem: string;
  maxMarks: number;
  passMarks: number;
  weightageEnabled: boolean;
  assessmentWeightage: unknown;
  complianceNotes: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    recordId: row.recordId,
    academicYear: row.academicYear,
    boardName: row.boardName,
    boardCode: row.boardCode,
    standardAlignment: row.standardAlignment,
    termSystem: row.termSystem,
    terms: row.terms.split(',').map((t) => t.trim()).filter(Boolean),
    gradingSystem: row.gradingSystem,
    maxMarks: row.maxMarks,
    passMarks: row.passMarks,
    weightageEnabled: row.weightageEnabled,
    assessmentWeightage: row.assessmentWeightage || {},
    complianceNotes: row.complianceNotes,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function getOrCreateCurriculum(institutionId: string, academicYear: string) {
  let row = await prisma.academicCurriculum.findFirst({
    where: { institutionId, academicYear },
  });

  if (!row) {
    const framework = await loadInstitutionFramework(institutionId);
    const recordId = await nextAcademicRecordId(institutionId, 'classSection').then(() => `CUR-${academicYear.replace(/\s/g, '')}`);
    row = await prisma.academicCurriculum.create({
      data: {
        institutionId,
        recordId: `CUR-${Date.now().toString().slice(-6)}`,
        academicYear,
        boardName: framework.boardName,
        boardCode: framework.boardCode,
        standardAlignment: framework.standardAlignment,
        termSystem: framework.termSystem,
        terms: framework.terms,
        gradingSystem: framework.gradingSystem,
        maxMarks: framework.maxMarks,
        passMarks: framework.passMarks,
        weightageEnabled: framework.weightageEnabled,
      },
    });
  }

  const framework = await loadInstitutionFramework(institutionId);
  return {
    curriculum: serializeCurriculum(row),
    institutionFramework: framework,
  };
}

export function serializeSyllabusChapter(row: {
  id: string;
  recordId: string;
  academicYear: string;
  term: string;
  className: string;
  sectionName: string;
  subjectName: string;
  chapterTitle: string;
  unitNumber: number;
  boardTopicCode: string;
  plannedStartDate: Date | null;
  plannedEndDate: Date | null;
  revisionDeadline?: Date | null;
  completionPercent: number;
  createdAt: Date;
  updatedAt: Date;
}) {
  const now = Date.now();
  const plannedEnd = row.plannedEndDate?.getTime();
  let scheduleStatus: 'on_track' | 'behind' | 'ahead' | 'no_plan' = 'no_plan';
  let daysBehind = 0;

  if (plannedEnd) {
    if (row.completionPercent >= 100) {
      scheduleStatus = now <= plannedEnd ? 'ahead' : 'on_track';
    } else if (now > plannedEnd) {
      scheduleStatus = 'behind';
      daysBehind = Math.ceil((now - plannedEnd) / 86400000);
    } else {
      const total = (row.plannedEndDate!.getTime() - (row.plannedStartDate?.getTime() || now)) || 1;
      const elapsed = now - (row.plannedStartDate?.getTime() || now);
      const expected = Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
      if (row.completionPercent < expected - 10) {
        scheduleStatus = 'behind';
        daysBehind = Math.round(((expected - row.completionPercent) / 100) * (total / 86400000));
      } else {
        scheduleStatus = 'on_track';
      }
    }
  }

  return {
    id: row.id,
    recordId: row.recordId,
    academicYear: row.academicYear,
    term: row.term,
    className: row.className,
    sectionName: row.sectionName,
    classGroup: row.sectionName ? formatClassSection(row.className, row.sectionName) : row.className,
    subjectName: row.subjectName,
    chapterTitle: row.chapterTitle,
    unitNumber: row.unitNumber,
    boardTopicCode: row.boardTopicCode,
    plannedStartDate: row.plannedStartDate?.toISOString() ?? null,
    plannedEndDate: row.plannedEndDate?.toISOString() ?? null,
    revisionDeadline: row.revisionDeadline?.toISOString() ?? null,
    completionPercent: row.completionPercent,
    scheduleStatus,
    daysBehind,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export type BottleneckAlert = {
  severity: 'high' | 'medium' | 'low';
  message: string;
  className: string;
  sectionName: string;
  subjectName: string;
  completionPercent: number;
  daysBehind: number;
};

export async function getCurriculumAnalytics(
  institutionId: string,
  opts: { academicYear: string; term?: string; className?: string; sectionName?: string },
) {
  const chapters = await prisma.academicSyllabusChapter.findMany({
    where: {
      institutionId,
      academicYear: opts.academicYear,
      ...(opts.term ? { term: opts.term } : {}),
      ...(opts.className ? { className: opts.className } : {}),
      ...(opts.sectionName ? { sectionName: opts.sectionName } : {}),
    },
    orderBy: [{ className: 'asc' }, { subjectName: 'asc' }, { unitNumber: 'asc' }],
  });

  const serialized = chapters.map(serializeSyllabusChapter);
  const bottlenecks: BottleneckAlert[] = [];

  const bySubjectSection = new Map<string, typeof serialized>();
  for (const ch of serialized) {
    const key = `${ch.className}|${ch.sectionName}|${ch.subjectName}`;
    const list = bySubjectSection.get(key) || [];
    list.push(ch);
    bySubjectSection.set(key, list);
  }

  const subjectProgress: {
    className: string;
    sectionName: string;
    subjectName: string;
    classGroup: string;
    plannedPercent: number;
    actualPercent: number;
    gap: number;
    chapterCount: number;
  }[] = [];

  for (const [key, list] of bySubjectSection) {
    const [className, sectionName, subjectName] = key.split('|');
    const actual = list.length ? Math.round(list.reduce((s, c) => s + c.completionPercent, 0) / list.length) : 0;
    const withPlan = list.filter((c) => c.plannedEndDate);
    const behind = list.filter((c) => c.scheduleStatus === 'behind');
    const maxBehind = behind.reduce((m, c) => Math.max(m, c.daysBehind), 0);

    if (behind.length > 0) {
      const gap = Math.max(0, 100 - actual);
      bottlenecks.push({
        severity: maxBehind > 14 ? 'high' : maxBehind > 7 ? 'medium' : 'low',
        message: `${className}${sectionName ? ` ${sectionName}` : ''} ${subjectName} is ${gap}% behind schedule${maxBehind ? ` (${maxBehind}d overdue)` : ''}`,
        className,
        sectionName,
        subjectName,
        completionPercent: actual,
        daysBehind: maxBehind,
      });
    }

    const now = Date.now();
    let plannedSum = 0;
    for (const ch of withPlan) {
      const start = ch.plannedStartDate ? new Date(ch.plannedStartDate).getTime() : now;
      const end = ch.plannedEndDate ? new Date(ch.plannedEndDate).getTime() : now;
      const total = end - start || 1;
      const elapsed = Math.min(total, Math.max(0, now - start));
      plannedSum += Math.round((elapsed / total) * 100);
    }
    const plannedPercent = withPlan.length ? Math.round(plannedSum / withPlan.length) : 0;

    subjectProgress.push({
      className,
      sectionName,
      subjectName,
      classGroup: sectionName ? formatClassSection(className, sectionName) : className,
      plannedPercent,
      actualPercent: actual,
      gap: Math.max(0, plannedPercent - actual),
      chapterCount: list.length,
    });
  }

  subjectProgress.sort((a, b) => b.gap - a.gap);
  bottlenecks.sort((a, b) => b.daysBehind - a.daysBehind);

  const analyticsRows = await prisma.studentAnalyticsRecord.findMany({
    where: {
      institutionId,
      academicYear: opts.academicYear,
      ...(opts.className ? { className: opts.className } : {}),
      ...(opts.sectionName ? { sectionName: opts.sectionName } : {}),
    },
    select: { className: true, scores: true },
  });

  const perfByClass = new Map<string, number[]>();
  for (const r of analyticsRows) {
    const scores = (r.scores || {}) as { academicPerformance?: number };
    const list = perfByClass.get(r.className) || [];
    list.push(scores.academicPerformance ?? 0);
    perfByClass.set(r.className, list);
  }

  const performanceByClass = [...perfByClass.entries()].map(([name, scores]) => ({
    className: name,
    avgScore: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
  }));

  return {
    chapters: serialized,
    subjectProgress,
    bottlenecks,
    performanceByClass,
    summary: {
      totalChapters: serialized.length,
      onTrack: serialized.filter((c) => c.scheduleStatus === 'on_track' || c.scheduleStatus === 'ahead').length,
      behind: serialized.filter((c) => c.scheduleStatus === 'behind').length,
      noPlan: serialized.filter((c) => c.scheduleStatus === 'no_plan').length,
      avgCompletion: serialized.length
        ? Math.round(serialized.reduce((s, c) => s + c.completionPercent, 0) / serialized.length)
        : 0,
    },
  };
}

export async function getTeacherWorkloadSummary(institutionId: string, academicYear: string) {
  const allocations = await prisma.academicTeacherAllocation.findMany({
    where: { institutionId, academicYear },
  });

  const byTeacher = new Map<string, { periods: number; subjects: Set<string>; classes: Set<string>; level: string }>();
  for (const a of allocations) {
    const cur = byTeacher.get(a.teacherName) || { periods: 0, subjects: new Set(), classes: new Set(), level: a.workloadLevel };
    cur.periods += a.periodsPerWeek;
    cur.subjects.add(a.subjectName);
    cur.classes.add(`${a.className}-${a.sectionName}`);
    byTeacher.set(a.teacherName, cur);
  }

  return [...byTeacher.entries()].map(([name, v]) => ({
    teacherName: name,
    periodsPerWeek: v.periods,
    subjectCount: v.subjects.size,
    classCount: v.classes.size,
    workloadLevel: v.level,
    isOverloaded: v.periods > 24,
  }));
}

export type TimetableConflict = {
  type: 'teacher_double_booked' | 'class_double_booked';
  message: string;
  dayOfWeek: number;
  period: number;
  details: string;
};

export function detectTimetableConflicts(
  slots: {
    dayOfWeek: number;
    period: number;
    className: string;
    sectionName: string;
    subjectName: string;
    teacherName: string;
  }[],
): TimetableConflict[] {
  const conflicts: TimetableConflict[] = [];
  const teacherSlots = new Map<string, typeof slots>();
  const classSlots = new Map<string, typeof slots>();

  for (const s of slots) {
    const tk = `${s.dayOfWeek}|${s.period}|${s.teacherName}`;
    const ck = `${s.dayOfWeek}|${s.period}|${s.className}|${s.sectionName}`;
    if (s.teacherName) {
      const list = teacherSlots.get(tk) || [];
      if (list.length > 0) {
        conflicts.push({
          type: 'teacher_double_booked',
          message: `${s.teacherName} double-booked on day ${s.dayOfWeek} period ${s.period}`,
          dayOfWeek: s.dayOfWeek,
          period: s.period,
          details: `${list[0].className}-${list[0].sectionName} ${list[0].subjectName} vs ${s.className}-${s.sectionName} ${s.subjectName}`,
        });
      }
      list.push(s);
      teacherSlots.set(tk, list);
    }
    const clist = classSlots.get(ck) || [];
    if (clist.length > 0) {
      conflicts.push({
        type: 'class_double_booked',
        message: `${s.className}-${s.sectionName} has overlapping periods on day ${s.dayOfWeek} P${s.period}`,
        dayOfWeek: s.dayOfWeek,
        period: s.period,
        details: `${clist[0].subjectName} vs ${s.subjectName}`,
      });
    }
    clist.push(s);
    classSlots.set(ck, clist);
  }

  return conflicts;
}

export async function bulkAssignElectives(
  institutionId: string,
  data: {
    academicYear: string;
    subjectId: string;
    className: string;
    sectionName: string;
    studentIds: string[];
  },
) {
  let created = 0;
  let skipped = 0;
  for (const studentId of data.studentIds) {
    const exists = await prisma.studentSubjectElective.findFirst({
      where: {
        institutionId,
        academicYear: data.academicYear,
        studentId,
        subjectId: data.subjectId,
      },
    });
    if (exists) {
      skipped += 1;
      continue;
    }
    const recordId = `ELE-${studentId.slice(-4)}-${data.subjectId.slice(-4)}-${Date.now().toString().slice(-4)}`;
    await prisma.studentSubjectElective.create({
      data: {
        institutionId,
        recordId,
        academicYear: data.academicYear,
        studentId,
        subjectId: data.subjectId,
        className: data.className,
        sectionName: data.sectionName,
      },
    });
    created += 1;
  }
  return { created, skipped };
}
