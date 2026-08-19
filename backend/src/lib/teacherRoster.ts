import type {
  AcademicTeacherRosterTask,
  TeacherRosterPriority,
  TeacherRosterTaskStatus,
  TeacherRosterTaskType,
} from '@prisma/client';
import { prisma } from './prisma.js';
import { formatClassSection, getInstitutionFilterMeta } from './students.js';
import { nextAcademicRecordId } from './academicManagement.js';
import { reconcileSubjectTeacherAllocations } from './teacherSubjectAllocationSync.js';

export const ROSTER_TASK_TYPES: { id: TeacherRosterTaskType; label: string; description: string }[] = [
  { id: 'CLASS_SUBJECT', label: 'Class & Subject', description: 'Teaching allocation for class and subject' },
  { id: 'TASK', label: 'Task', description: 'General academic or administrative task' },
  { id: 'ACTIVITY', label: 'Activity', description: 'Co-scholastic or enrichment activity planning' },
  { id: 'EVENT', label: 'Event', description: 'School event planning and coordination' },
  { id: 'PARENT_ENGAGEMENT', label: 'Parent Engagement', description: 'Parent meeting, PTM, engagement with feedback recording' },
  { id: 'OTHER', label: 'Other', description: 'Any other assigned activity' },
];

export const TASK_STATUS_UI: Record<TeacherRosterTaskStatus, string> = {
  PENDING: 'Pending',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

export const PRIORITY_UI: Record<TeacherRosterPriority, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
};

const TYPE_COLORS: Record<TeacherRosterTaskType, string> = {
  CLASS_SUBJECT: '#2563eb',
  TASK: '#7c3aed',
  ACTIVITY: '#16a34a',
  EVENT: '#d97706',
  PARENT_ENGAGEMENT: '#db2777',
  OTHER: '#64748b',
};

export function serializeRosterTask(row: AcademicTeacherRosterTask) {
  const typeMeta = ROSTER_TASK_TYPES.find((t) => t.id === row.taskType);
  return {
    id: row.id,
    recordId: row.recordId,
    academicYear: row.academicYear,
    term: row.term,
    teacherName: row.teacherName,
    department: row.department,
    taskType: row.taskType,
    taskTypeLabel: typeMeta?.label || row.taskType,
    taskTypeColor: TYPE_COLORS[row.taskType],
    title: row.title,
    description: row.description,
    className: row.className,
    sectionName: row.sectionName,
    classGroup: row.className ? formatClassSection(row.className, row.sectionName) : '—',
    subjectName: row.subjectName,
    linkedEntityId: row.linkedEntityId,
    startDate: row.startDate?.toISOString() ?? null,
    dueDate: row.dueDate?.toISOString() ?? null,
    endDate: row.endDate?.toISOString() ?? null,
    priority: row.priority,
    priorityLabel: PRIORITY_UI[row.priority],
    status: row.status,
    statusLabel: TASK_STATUS_UI[row.status],
    feedbackRequired: row.feedbackRequired,
    feedbackRecorded: row.feedbackRecorded,
    feedbackNotes: row.feedbackNotes,
    parentFeedbackRating: row.parentFeedbackRating,
    assignedBy: row.assignedBy,
    completedAt: row.completedAt?.toISOString() ?? null,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    isPublished: !!row.publishedAt,
    isOverdue: row.dueDate ? new Date() > row.dueDate && row.status !== 'COMPLETED' && row.status !== 'CANCELLED' : false,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

type RosterInput = {
  academicYear?: string;
  term?: string;
  teacherName: string;
  department?: string;
  taskType: TeacherRosterTaskType;
  title: string;
  description?: string;
  className?: string;
  sectionName?: string;
  subjectName?: string;
  linkedEntityId?: string;
  startDate?: string;
  dueDate?: string;
  endDate?: string;
  priority?: TeacherRosterPriority;
  status?: TeacherRosterTaskStatus;
  feedbackRequired?: boolean;
  assignedBy?: string;
};

export async function getTeacherRosterDashboard(
  institutionId: string,
  opts: { academicYear?: string; teacherName?: string; taskType?: string; status?: string },
) {
  const academicYear = opts.academicYear || '2025-26';
  const tasks = await prisma.academicTeacherRosterTask.findMany({
    where: {
      institutionId,
      academicYear,
      ...(opts.teacherName ? { teacherName: { contains: opts.teacherName, mode: 'insensitive' } } : {}),
      ...(opts.taskType ? { taskType: opts.taskType as TeacherRosterTaskType } : {}),
      ...(opts.status ? { status: opts.status as TeacherRosterTaskStatus } : {}),
    },
    orderBy: [{ dueDate: 'asc' }, { priority: 'desc' }, { teacherName: 'asc' }],
  });

  const serialized = tasks.map(serializeRosterTask);
  const allocations = await prisma.academicTeacherAllocation.findMany({
    where: {
      institutionId,
      academicYear,
      ...(opts.teacherName ? { teacherName: { contains: opts.teacherName, mode: 'insensitive' } } : {}),
    },
    orderBy: { teacherName: 'asc' },
  });

  const teacherMap = new Map<string, {
    teacherName: string;
    department: string;
    tasks: ReturnType<typeof serializeRosterTask>[];
    classSubjects: typeof allocations;
    totalTasks: number;
    pending: number;
    inProgress: number;
    completed: number;
    overdue: number;
  }>();

  for (const a of allocations) {
    if (!teacherMap.has(a.teacherName)) {
      teacherMap.set(a.teacherName, {
        teacherName: a.teacherName,
        department: a.department,
        tasks: [],
        classSubjects: [],
        totalTasks: 0,
        pending: 0,
        inProgress: 0,
        completed: 0,
        overdue: 0,
      });
    }
    teacherMap.get(a.teacherName)!.classSubjects.push(a);
  }

  for (const t of serialized) {
    if (!teacherMap.has(t.teacherName)) {
      teacherMap.set(t.teacherName, {
        teacherName: t.teacherName,
        department: '',
        tasks: [],
        classSubjects: [],
        totalTasks: 0,
        pending: 0,
        inProgress: 0,
        completed: 0,
        overdue: 0,
      });
    }
    const entry = teacherMap.get(t.teacherName)!;
    entry.tasks.push(t);
    entry.totalTasks += 1;
    if (t.status === 'PENDING') entry.pending += 1;
    if (t.status === 'IN_PROGRESS') entry.inProgress += 1;
    if (t.status === 'COMPLETED') entry.completed += 1;
    if (t.isOverdue) entry.overdue += 1;
  }

  const byType = ROSTER_TASK_TYPES.map((type) => ({
    ...type,
    count: serialized.filter((t) => t.taskType === type.id).length,
  }));

  return {
    academicYear,
    taskTypes: ROSTER_TASK_TYPES,
    tasks: serialized,
    allocations,
    teacherRosters: [...teacherMap.values()].sort((a, b) => a.teacherName.localeCompare(b.teacherName)),
    byType,
    kpis: {
      totalTeachers: teacherMap.size,
      totalTasks: serialized.length,
      classSubjectAllocations: allocations.length,
      pending: serialized.filter((t) => t.status === 'PENDING').length,
      inProgress: serialized.filter((t) => t.status === 'IN_PROGRESS').length,
      completed: serialized.filter((t) => t.status === 'COMPLETED').length,
      overdue: serialized.filter((t) => t.isOverdue).length,
      published: serialized.filter((t) => t.isPublished).length,
      parentEngagements: serialized.filter((t) => t.taskType === 'PARENT_ENGAGEMENT').length,
    },
  };
}

export async function createRosterTask(institutionId: string, data: RosterInput) {
  const row = await prisma.academicTeacherRosterTask.create({
    data: {
      institutionId,
      recordId: await nextAcademicRecordId(institutionId, 'teacherRoster'),
      academicYear: data.academicYear || '2025-26',
      term: data.term || 'Term 1',
      teacherName: data.teacherName,
      department: data.department || 'General',
      taskType: data.taskType,
      title: data.title,
      description: data.description || '',
      className: data.className || '',
      sectionName: data.sectionName || '',
      subjectName: data.subjectName || '',
      linkedEntityId: data.linkedEntityId || '',
      startDate: data.startDate ? new Date(data.startDate) : null,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      endDate: data.endDate ? new Date(data.endDate) : null,
      priority: data.priority || 'MEDIUM',
      status: data.status || 'PENDING',
      feedbackRequired: data.feedbackRequired ?? data.taskType === 'PARENT_ENGAGEMENT',
      assignedBy: data.assignedBy || '',
    },
  });
  return serializeRosterTask(row);
}

export async function updateRosterTask(
  institutionId: string,
  id: string,
  data: Partial<RosterInput> & {
    feedbackNotes?: string;
    parentFeedbackRating?: number;
    feedbackRecorded?: boolean;
  },
) {
  const existing = await prisma.academicTeacherRosterTask.findFirst({ where: { id, institutionId } });
  if (!existing) throw new Error('Roster task not found');

  const status = data.status ?? existing.status;
  const row = await prisma.academicTeacherRosterTask.update({
    where: { id },
    data: {
      ...(data.teacherName !== undefined ? { teacherName: data.teacherName } : {}),
      ...(data.department !== undefined ? { department: data.department } : {}),
      ...(data.taskType !== undefined ? { taskType: data.taskType } : {}),
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.className !== undefined ? { className: data.className } : {}),
      ...(data.sectionName !== undefined ? { sectionName: data.sectionName } : {}),
      ...(data.subjectName !== undefined ? { subjectName: data.subjectName } : {}),
      ...(data.startDate !== undefined ? { startDate: data.startDate ? new Date(data.startDate) : null } : {}),
      ...(data.dueDate !== undefined ? { dueDate: data.dueDate ? new Date(data.dueDate) : null } : {}),
      ...(data.endDate !== undefined ? { endDate: data.endDate ? new Date(data.endDate) : null } : {}),
      ...(data.priority !== undefined ? { priority: data.priority } : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
      ...(data.feedbackRequired !== undefined ? { feedbackRequired: data.feedbackRequired } : {}),
      ...(data.feedbackNotes !== undefined ? { feedbackNotes: data.feedbackNotes } : {}),
      ...(data.parentFeedbackRating !== undefined ? { parentFeedbackRating: data.parentFeedbackRating } : {}),
      ...(data.feedbackRecorded !== undefined ? { feedbackRecorded: data.feedbackRecorded } : {}),
      completedAt: status === 'COMPLETED' ? new Date() : existing.completedAt,
    },
  });
  return serializeRosterTask(row);
}

export async function syncAllocationsToRoster(institutionId: string, academicYear: string) {
  // Keep Subject Management ↔ Teacher Allocation in sync (teacher, subject, class/section, periods)
  const reconcile = await reconcileSubjectTeacherAllocations(institutionId, academicYear);

  const allocations = await prisma.academicTeacherAllocation.findMany({
    where: { institutionId, academicYear },
  });

  let created = 0;
  for (const a of allocations) {
    const title = `Teach ${a.subjectName} — ${formatClassSection(a.className, a.sectionName)}`;
    const exists = await prisma.academicTeacherRosterTask.findFirst({
      where: {
        institutionId,
        academicYear,
        teacherName: a.teacherName,
        taskType: 'CLASS_SUBJECT',
        className: a.className,
        sectionName: a.sectionName,
        subjectName: a.subjectName,
      },
    });
    if (exists) continue;

    await prisma.academicTeacherRosterTask.create({
      data: {
        institutionId,
        recordId: await nextAcademicRecordId(institutionId, 'teacherRoster'),
        academicYear,
        teacherName: a.teacherName,
        department: a.department,
        taskType: 'CLASS_SUBJECT',
        title,
        description: `${a.periodsPerWeek} periods/week · Workload: ${a.workloadLevel}`,
        className: a.className,
        sectionName: a.sectionName,
        subjectName: a.subjectName,
        linkedEntityId: a.id,
        priority: a.workloadLevel === 'FULL' ? 'HIGH' : 'MEDIUM',
        status: 'IN_PROGRESS',
        assignedBy: 'System Sync',
      },
    });
    created += 1;
  }

  return {
    created,
    total: allocations.length,
    reconcile,
  };
}

export async function publishTeacherRosterTasks(
  institutionId: string,
  opts: { academicYear: string; taskIds?: string[] },
) {
  const now = new Date();
  const result = await prisma.academicTeacherRosterTask.updateMany({
    where: {
      institutionId,
      academicYear: opts.academicYear,
      publishedAt: null,
      status: { not: 'CANCELLED' },
      ...(opts.taskIds?.length ? { id: { in: opts.taskIds } } : {}),
    },
    data: { publishedAt: now },
  });
  return { published: result.count, publishedAt: now.toISOString() };
}

export async function getMobileTeacherTasks(
  institutionId: string,
  teacherName: string,
  opts?: { academicYear?: string; status?: string },
) {
  const rows = await prisma.academicTeacherRosterTask.findMany({
    where: {
      institutionId,
      teacherName: { equals: teacherName, mode: 'insensitive' },
      publishedAt: { not: null },
      ...(opts?.academicYear ? { academicYear: opts.academicYear } : {}),
      ...(opts?.status ? { status: opts.status as TeacherRosterTaskStatus } : {}),
    },
    orderBy: [{ dueDate: 'asc' }, { priority: 'desc' }],
  });

  const serialized = rows.map(serializeRosterTask);
  const grouped = ROSTER_TASK_TYPES.map((type) => ({
    taskType: type.id,
    label: type.label,
    tasks: serialized.filter((t) => t.taskType === type.id),
  })).filter((g) => g.tasks.length > 0);

  return {
    teacherName,
    totalTasks: serialized.length,
    pending: serialized.filter((t) => t.status === 'PENDING').length,
    inProgress: serialized.filter((t) => t.status === 'IN_PROGRESS').length,
    completed: serialized.filter((t) => t.status === 'COMPLETED').length,
    overdue: serialized.filter((t) => t.isOverdue).length,
    tasks: serialized,
    grouped,
  };
}

export async function updateMobileTeacherTask(
  institutionId: string,
  taskId: string,
  teacherName: string,
  data: {
    status?: TeacherRosterTaskStatus;
    feedbackNotes?: string;
    parentFeedbackRating?: number;
    feedbackRecorded?: boolean;
  },
) {
  const existing = await prisma.academicTeacherRosterTask.findFirst({
    where: { id: taskId, institutionId, teacherName: { equals: teacherName, mode: 'insensitive' }, publishedAt: { not: null } },
  });
  if (!existing) throw new Error('Task not found');

  return updateRosterTask(institutionId, taskId, data);
}

export type TeacherAllocationMetaTeacher = {
  teacherName: string;
  department: string;
  classSubjects: Array<{
    className: string;
    sectionName: string;
    subjectName: string;
    periodsPerWeek: number;
  }>;
};

export async function getTeacherAllocationMeta(institutionId: string, academicYear: string) {
  const filters = await getInstitutionFilterMeta(institutionId);

  const [subjectsRows, allocations, subjectAllocs, profiles, classSections] = await Promise.all([
    prisma.academicSubject.findMany({
      where: { institutionId, isActive: true },
      select: { subjectName: true },
      orderBy: { subjectName: 'asc' },
    }),
    prisma.academicTeacherAllocation.findMany({ where: { institutionId, academicYear } }),
    prisma.academicSubjectAllocation.findMany({
      where: { institutionId, academicYear },
      include: { subject: { select: { subjectName: true } } },
    }),
    prisma.teacherAttendanceProfile.findMany({
      where: { institutionId, academicYear, isActive: true },
      select: { teacherName: true, department: true },
    }),
    prisma.academicClassSection.findMany({
      where: { institutionId, academicYear },
      select: { classTeacher: true, className: true, sectionName: true },
    }),
  ]);

  const teacherMap = new Map<string, TeacherAllocationMetaTeacher>();

  const ensureTeacher = (name: string, department = 'General') => {
    const n = name.trim();
    if (!n) return;
    if (!teacherMap.has(n)) {
      teacherMap.set(n, { teacherName: n, department: department || 'General', classSubjects: [] });
    } else if (department && teacherMap.get(n)!.department === 'General' && department !== 'General') {
      teacherMap.get(n)!.department = department;
    }
  };

  const addClassSubject = (
    teacherName: string,
    cs: { className: string; sectionName: string; subjectName: string; periodsPerWeek?: number },
  ) => {
    const n = teacherName.trim();
    if (!n || !cs.className || !cs.subjectName) return;
    ensureTeacher(n);
    const entry = teacherMap.get(n)!;
    const exists = entry.classSubjects.some(
      (x) =>
        x.className === cs.className &&
        x.sectionName === (cs.sectionName || '') &&
        x.subjectName === cs.subjectName,
    );
    if (!exists) {
      entry.classSubjects.push({
        className: cs.className,
        sectionName: cs.sectionName || '',
        subjectName: cs.subjectName,
        periodsPerWeek: cs.periodsPerWeek ?? 18,
      });
    }
  };

  for (const p of profiles) ensureTeacher(p.teacherName, p.department || 'General');
  for (const a of allocations) {
    ensureTeacher(a.teacherName, a.department || 'General');
    addClassSubject(a.teacherName, {
      className: a.className,
      sectionName: a.sectionName,
      subjectName: a.subjectName,
      periodsPerWeek: a.periodsPerWeek,
    });
  }
  for (const sa of subjectAllocs) {
    if (sa.teacherName) {
      ensureTeacher(sa.teacherName, 'General');
      addClassSubject(sa.teacherName, {
        className: sa.className,
        sectionName: sa.sectionName,
        subjectName: sa.subject.subjectName,
      });
    }
  }
  for (const cs of classSections) {
    if (cs.classTeacher) ensureTeacher(cs.classTeacher, 'Class Teacher');
  }

  const subjects = [...new Set(subjectsRows.map((s) => s.subjectName))].sort();
  const departments = [...new Set([...teacherMap.values()].map((t) => t.department).filter(Boolean))].sort();
  const periodsPerWeek = [
    ...new Set([
      ...allocations.map((a) => a.periodsPerWeek).filter((p) => p > 0),
      12, 15, 18, 20, 24, 30,
    ]),
  ].sort((a, b) => a - b);

  const classSet = new Set((filters.classes || []).map((c) => c.trim()).filter(Boolean));
  const sectionMap = new Map<string, Set<string>>();
  for (const [cls, sections] of Object.entries(filters.sectionsByClass || {})) {
    const key = cls.trim();
    if (!key) continue;
    classSet.add(key);
    sectionMap.set(key, new Set((sections || []).map((s) => s.trim()).filter(Boolean)));
  }
  for (const cs of classSections) {
    const className = (cs.className || '').trim();
    const sectionName = (cs.sectionName || '').trim();
    if (!className) continue;
    classSet.add(className);
    if (!sectionMap.has(className)) sectionMap.set(className, new Set());
    if (sectionName) sectionMap.get(className)!.add(sectionName);
  }
  const collator = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true });

  return {
    academicYear,
    classes: [...classSet].sort(collator),
    sectionsByClass: Object.fromEntries(
      [...sectionMap.entries()].map(([cls, sections]) => [cls, [...sections].sort(collator)]),
    ),
    subjects,
    departments: departments.length ? departments : ['General'],
    periodsPerWeek,
    teachers: [...teacherMap.values()].sort((a, b) => a.teacherName.localeCompare(b.teacherName)),
  };
}
