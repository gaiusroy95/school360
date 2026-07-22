import { ExamSyllabusCategory, Prisma } from '@prisma/client';
import { prisma } from './prisma.js';
import { getInstitutionFilterMeta } from './students.js';

export type SyllabusTopic = {
  unitNumber: number;
  chapterTitle: string;
  topics: string[];
};

const CATEGORY_LABELS: Record<ExamSyllabusCategory, string> = {
  CLASS_TEST_SERIES: 'Class Test Series',
  UNIT_TEST: 'Unit Test',
  MID_TERM: 'Mid Term',
  ANNUAL_EXAM: 'Annual Exam',
};

const CATEGORY_ORDER: ExamSyllabusCategory[] = [
  ExamSyllabusCategory.CLASS_TEST_SERIES,
  ExamSyllabusCategory.UNIT_TEST,
  ExamSyllabusCategory.MID_TERM,
  ExamSyllabusCategory.ANNUAL_EXAM,
];

const CATEGORY_DEFAULTS: Record<ExamSyllabusCategory, { maxMarks: number; weightage: number; duration: number; plannedMonth: string }> = {
  CLASS_TEST_SERIES: { maxMarks: 25, weightage: 10, duration: 45, plannedMonth: 'Ongoing' },
  UNIT_TEST: { maxMarks: 50, weightage: 15, duration: 90, plannedMonth: 'May' },
  MID_TERM: { maxMarks: 80, weightage: 25, duration: 180, plannedMonth: 'September' },
  ANNUAL_EXAM: { maxMarks: 100, weightage: 50, duration: 180, plannedMonth: 'March' },
};

function parseTopics(raw: unknown): SyllabusTopic[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const row = item as Record<string, unknown>;
      return {
        unitNumber: Number(row.unitNumber) || 0,
        chapterTitle: String(row.chapterTitle || ''),
        topics: Array.isArray(row.topics) ? row.topics.map((t) => String(t)) : [],
      };
    })
    .filter((t): t is SyllabusTopic => Boolean(t?.chapterTitle));
}

function serializeSyllabus(row: {
  id: string;
  recordId: string;
  academicYear: string;
  category: ExamSyllabusCategory;
  className: string;
  sectionName: string;
  subjectName: string;
  title: string;
  unitsCovered: string;
  topics: unknown;
  maxMarks: number;
  weightagePercent: number;
  durationMinutes: number;
  plannedMonth: string;
  status: string;
  notes: string;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}) {
  const topics = parseTopics(row.topics);
  return {
    id: row.id,
    recordId: row.recordId,
    academicYear: row.academicYear,
    category: row.category,
    categoryLabel: CATEGORY_LABELS[row.category],
    className: row.className,
    sectionName: row.sectionName,
    classGroup: row.sectionName ? `${row.className} — ${row.sectionName}` : row.className,
    subjectName: row.subjectName,
    title: row.title,
    unitsCovered: row.unitsCovered,
    topics,
    topicCount: topics.reduce((sum, t) => sum + t.topics.length, 0),
    maxMarks: row.maxMarks,
    weightagePercent: row.weightagePercent,
    durationMinutes: row.durationMinutes,
    plannedMonth: row.plannedMonth,
    status: row.status,
    notes: row.notes,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function nextRecordId(institutionId: string) {
  const count = await prisma.examSubjectSyllabus.count({ where: { institutionId } });
  return `ESY-${String(1000 + count + 1)}`;
}

function parseCategory(raw?: string): ExamSyllabusCategory | undefined {
  if (!raw || raw === 'all') return undefined;
  if (Object.values(ExamSyllabusCategory).includes(raw as ExamSyllabusCategory)) {
    return raw as ExamSyllabusCategory;
  }
  return undefined;
}

function buildTopicsFromChapters(
  chapters: { unitNumber: number; chapterTitle: string }[],
  takeCount: number,
): SyllabusTopic[] {
  const selected = chapters.slice(0, takeCount);
  return selected.map((ch) => ({
    unitNumber: ch.unitNumber,
    chapterTitle: ch.chapterTitle,
    topics: [
      `${ch.chapterTitle} — Key concepts`,
      `${ch.chapterTitle} — Application & problem solving`,
    ],
  }));
}

function unitsLabel(chapters: { unitNumber: number }[], takeCount: number) {
  const units = [...new Set(chapters.slice(0, takeCount).map((c) => c.unitNumber))].sort((a, b) => a - b);
  if (!units.length) return '';
  if (units.length === 1) return `Unit ${units[0]}`;
  return `Units ${units[0]}–${units[units.length - 1]}`;
}

export async function getExamSyllabusMeta(institutionId: string) {
  const filters = await getInstitutionFilterMeta(institutionId);
  const subjects = await prisma.academicSubject.findMany({
    where: { institutionId, isActive: true },
    orderBy: [{ subjectName: 'asc' }],
    select: { subjectName: true },
  });
  return {
    defaultAcademicYear: filters.defaultAcademicYear,
    academicYears: filters.academicYears,
    classes: filters.classes,
    sectionsByClass: filters.sectionsByClass,
    subjects: [...new Set(subjects.map((s) => s.subjectName))].sort(),
    categories: CATEGORY_ORDER.map((id) => ({ id, label: CATEGORY_LABELS[id] })),
  };
}

export async function getExamSyllabusOverview(
  institutionId: string,
  opts: { academicYear?: string; className?: string; sectionName?: string; subjectName?: string; category?: string },
) {
  const academicYear = opts.academicYear || '2025-26';
  const category = parseCategory(opts.category);

  const where: Prisma.ExamSubjectSyllabusWhereInput = {
    institutionId,
    academicYear,
    ...(opts.className ? { className: opts.className } : {}),
    ...(opts.sectionName ? { sectionName: opts.sectionName } : {}),
    ...(opts.subjectName ? { subjectName: opts.subjectName } : {}),
    ...(category ? { category } : {}),
  };

  const rows = await prisma.examSubjectSyllabus.findMany({
    where,
    orderBy: [{ className: 'asc' }, { subjectName: 'asc' }, { sortOrder: 'asc' }],
  });

  const records = rows.map(serializeSyllabus);

  const byCategory = Object.fromEntries(
    CATEGORY_ORDER.map((cat) => [cat, records.filter((r) => r.category === cat).length]),
  ) as Record<ExamSyllabusCategory, number>;

  const classMap = new Map<string, Map<string, ReturnType<typeof serializeSyllabus>[]>>();
  for (const rec of records) {
    const classKey = rec.className;
    const subjectKey = `${rec.subjectName}::${rec.sectionName}`;
    if (!classMap.has(classKey)) classMap.set(classKey, new Map());
    const subjectMap = classMap.get(classKey)!;
    if (!subjectMap.has(subjectKey)) subjectMap.set(subjectKey, []);
    subjectMap.get(subjectKey)!.push(rec);
  }

  const classes = [...classMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([className, subjectMap]) => ({
      className,
      subjects: [...subjectMap.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, syllabi]) => {
          const [subjectName, sectionName] = key.split('::');
          const byCat = Object.fromEntries(
            CATEGORY_ORDER.map((cat) => {
              const match = syllabi.find((s) => s.category === cat) || null;
              return [cat, match];
            }),
          ) as Record<ExamSyllabusCategory, ReturnType<typeof serializeSyllabus> | null>;
          return {
            subjectName,
            sectionName,
            classGroup: sectionName ? `${className} — ${sectionName}` : className,
            syllabi: byCat,
            totalTopics: syllabi.reduce((sum, s) => sum + s.topicCount, 0),
          };
        }),
    }));

  const uniqueSubjects = new Set(records.map((r) => `${r.className}::${r.subjectName}`)).size;

  return {
    academicYear,
    summary: {
      totalRecords: records.length,
      classCount: classMap.size,
      subjectCount: uniqueSubjects,
      byCategory: Object.fromEntries(
        CATEGORY_ORDER.map((cat) => [cat, { count: byCategory[cat], label: CATEGORY_LABELS[cat] }]),
      ),
    },
    classes,
    records,
  };
}

export async function createExamSubjectSyllabus(
  institutionId: string,
  data: {
    academicYear: string;
    category: ExamSyllabusCategory;
    className: string;
    sectionName?: string;
    subjectName: string;
    title: string;
    unitsCovered?: string;
    topics?: SyllabusTopic[];
    maxMarks?: number;
    weightagePercent?: number;
    durationMinutes?: number;
    plannedMonth?: string;
    status?: string;
    notes?: string;
  },
) {
  const recordId = await nextRecordId(institutionId);
  const defaults = CATEGORY_DEFAULTS[data.category];
  const row = await prisma.examSubjectSyllabus.create({
    data: {
      institutionId,
      recordId,
      academicYear: data.academicYear,
      category: data.category,
      className: data.className,
      sectionName: data.sectionName || '',
      subjectName: data.subjectName,
      title: data.title,
      unitsCovered: data.unitsCovered || '',
      topics: (data.topics || []) as Prisma.InputJsonValue,
      maxMarks: data.maxMarks ?? defaults.maxMarks,
      weightagePercent: data.weightagePercent ?? defaults.weightage,
      durationMinutes: data.durationMinutes ?? defaults.duration,
      plannedMonth: data.plannedMonth || defaults.plannedMonth,
      status: data.status || 'Published',
      notes: data.notes || '',
      sortOrder: CATEGORY_ORDER.indexOf(data.category) + 1,
    },
  });
  return serializeSyllabus(row);
}

export async function updateExamSubjectSyllabus(
  institutionId: string,
  id: string,
  data: Partial<{
    title: string;
    unitsCovered: string;
    topics: SyllabusTopic[];
    maxMarks: number;
    weightagePercent: number;
    durationMinutes: number;
    plannedMonth: string;
    status: string;
    notes: string;
  }>,
) {
  const existing = await prisma.examSubjectSyllabus.findFirst({ where: { institutionId, id } });
  if (!existing) throw new Error('Syllabus record not found');

  const row = await prisma.examSubjectSyllabus.update({
    where: { id: existing.id },
    data: {
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.unitsCovered !== undefined ? { unitsCovered: data.unitsCovered } : {}),
      ...(data.topics !== undefined ? { topics: data.topics as Prisma.InputJsonValue } : {}),
      ...(data.maxMarks !== undefined ? { maxMarks: data.maxMarks } : {}),
      ...(data.weightagePercent !== undefined ? { weightagePercent: data.weightagePercent } : {}),
      ...(data.durationMinutes !== undefined ? { durationMinutes: data.durationMinutes } : {}),
      ...(data.plannedMonth !== undefined ? { plannedMonth: data.plannedMonth } : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
      ...(data.notes !== undefined ? { notes: data.notes } : {}),
    },
  });
  return serializeSyllabus(row);
}

export async function seedExamSyllabusDemo(institutionId: string, academicYear = '2025-26') {
  const existing = await prisma.examSubjectSyllabus.count({ where: { institutionId, academicYear } });
  if (existing > 0) {
    return { seeded: false, records: existing };
  }

  const allocations = await prisma.academicSubjectAllocation.findMany({
    where: { institutionId, academicYear },
    include: { subject: true },
    orderBy: [{ className: 'asc' }, { sectionName: 'asc' }],
  });

  const chapters = await prisma.academicSyllabusChapter.findMany({
    where: { institutionId, academicYear },
    orderBy: [{ className: 'asc' }, { subjectName: 'asc' }, { unitNumber: 'asc' }],
  });

  const chapterKey = (className: string, sectionName: string, subjectName: string) =>
    `${className}::${sectionName}::${subjectName}`;

  const chaptersByKey = new Map<string, typeof chapters>();
  for (const ch of chapters) {
    const key = chapterKey(ch.className, ch.sectionName, ch.subjectName);
    const list = chaptersByKey.get(key) || [];
    list.push(ch);
    chaptersByKey.set(key, list);
  }

  const pairs = allocations.length
    ? allocations.map((a) => ({
        className: a.className,
        sectionName: a.sectionName,
        subjectName: a.subject.subjectName,
      }))
    : [
        { className: 'Class 8', sectionName: 'A', subjectName: 'Mathematics' },
        { className: 'Class 8', sectionName: 'A', subjectName: 'Science' },
        { className: 'Class 8', sectionName: 'A', subjectName: 'English' },
        { className: 'Class 9', sectionName: 'A', subjectName: 'Mathematics' },
        { className: 'Class 9', sectionName: 'A', subjectName: 'Science' },
        { className: 'Class 10', sectionName: 'A', subjectName: 'Mathematics' },
        { className: 'Class 10', sectionName: 'A', subjectName: 'Science' },
        { className: 'Class 10', sectionName: 'A', subjectName: 'English' },
      ];

  const categorySlices: Record<ExamSyllabusCategory, number> = {
    CLASS_TEST_SERIES: 1,
    UNIT_TEST: 2,
    MID_TERM: 3,
    ANNUAL_EXAM: 99,
  };

  let recordNum = 1001;
  let created = 0;

  for (const pair of pairs) {
    const key = chapterKey(pair.className, pair.sectionName, pair.subjectName);
    const subjectChapters = chaptersByKey.get(key) || chapters
      .filter((c) => c.className === pair.className && c.subjectName === pair.subjectName)
      .sort((a, b) => a.unitNumber - b.unitNumber);

    for (const category of CATEGORY_ORDER) {
      const take = Math.min(categorySlices[category], subjectChapters.length || 3);
      const chapterSlice = subjectChapters.length
        ? subjectChapters
        : [
            { unitNumber: 1, chapterTitle: `${pair.subjectName} — Fundamentals` },
            { unitNumber: 2, chapterTitle: `${pair.subjectName} — Core Concepts` },
            { unitNumber: 3, chapterTitle: `${pair.subjectName} — Advanced Topics` },
          ];

      const topics = buildTopicsFromChapters(chapterSlice, take);
      const defaults = CATEGORY_DEFAULTS[category];
      const units = unitsLabel(chapterSlice, take) || `Units 1–${take}`;

      await prisma.examSubjectSyllabus.create({
        data: {
          institutionId,
          recordId: `ESY-${recordNum++}`,
          academicYear,
          category,
          className: pair.className,
          sectionName: pair.sectionName,
          subjectName: pair.subjectName,
          title: `${pair.className} ${pair.subjectName} — ${CATEGORY_LABELS[category]}`,
          unitsCovered: units,
          topics: topics as Prisma.InputJsonValue,
          maxMarks: defaults.maxMarks,
          weightagePercent: defaults.weightage,
          durationMinutes: defaults.duration,
          plannedMonth: defaults.plannedMonth,
          status: 'Published',
          notes: category === ExamSyllabusCategory.CLASS_TEST_SERIES
            ? 'Synced from lesson planning class test series'
            : 'Mapped from curriculum syllabus chapters',
          sortOrder: CATEGORY_ORDER.indexOf(category) + 1,
        },
      });
      created++;
    }
  }

  return { seeded: true, records: created };
}
