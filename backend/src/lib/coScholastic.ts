import type {
  AcademicCoScholasticActivity,
  AcademicCoScholasticPerformance,
  AcademicCoScholasticFeedback,
  CoScholasticActivityStatus,
  CoScholasticPerformanceBand,
} from '@prisma/client';
import { prisma } from './prisma.js';
import { formatClassSection } from './students.js';
import { nextAcademicRecordId } from './academicManagement.js';

export const CO_SCHOLASTIC_CATEGORIES = [
  {
    id: 'PHYSICAL_HEALTH',
    label: 'Physical & Health Education',
    subCategories: [
      {
        id: 'TEAM_INDIVIDUAL_SPORTS',
        label: 'Team & Individual Sports',
        activities: ['Basketball', 'Football', 'Track and Field', 'Chess', 'Cricket', 'Volleyball', 'Badminton'],
      },
      {
        id: 'WELLNESS',
        label: 'Wellness',
        activities: ['Yoga', 'Meditation', 'Basic First-Aid Training', 'Health & Nutrition'],
      },
      {
        id: 'DISCIPLINE_DRILLS',
        label: 'Discipline & Drills',
        activities: ['National Cadet Corps (NCC)', 'Scouts and Guides', 'Martial Arts', 'Drill Practice'],
      },
    ],
  },
  {
    id: 'WORK_EDUCATION',
    label: 'Work Education & Life Skills',
    subCategories: [
      {
        id: 'PRACTICAL_SKILLS',
        label: 'Practical Skills',
        activities: ['Computer Hardware Repair', 'Cooking', 'Basic Financial Literacy', 'Tailoring', 'Gardening'],
      },
      {
        id: 'SOFT_SKILLS',
        label: 'Soft Skills Training',
        activities: ['Conflict Resolution', 'Critical Thinking', 'Public Speaking', 'Time Management'],
      },
      {
        id: 'ENVIRONMENTAL_AWARENESS',
        label: 'Environmental Awareness',
        activities: ['Tree Planting Drive', 'Waste Management Project', 'Eco-Club', 'Water Conservation'],
      },
    ],
  },
  {
    id: 'VISUAL_PERFORMING_ARTS',
    label: 'Visual & Performing Arts',
    subCategories: [
      {
        id: 'VISUAL_ARTS',
        label: 'Visual Arts',
        activities: ['Painting', 'Pottery', 'Photography', 'Digital Design', 'Sculpture'],
      },
      {
        id: 'PERFORMING_ARTS',
        label: 'Performing Arts',
        activities: ['Theatre', 'Classical Dance', 'Contemporary Dance', 'Choir', 'Instrumental Music'],
      },
    ],
  },
  {
    id: 'LEADERSHIP_COMMUNITY',
    label: 'Leadership & Community Service',
    subCategories: [
      {
        id: 'GOVERNANCE',
        label: 'Governance',
        activities: ['Student Council', 'Prefect System', 'Model United Nations (MUN)', 'School Parliament'],
      },
      {
        id: 'CLUBS_SOCIETIES',
        label: 'Clubs & Societies',
        activities: ['Debate Club', 'Coding Club', 'Robotics', 'Literary Society', 'Science Club'],
      },
      {
        id: 'SOCIAL_WORK',
        label: 'Social Work',
        activities: ['National Service Scheme (NSS)', 'Blood Donation Camp', 'Teaching Underprivileged Children', 'Community Clean-up'],
      },
    ],
  },
] as const;

export const ACTIVITY_STATUS_UI: Record<CoScholasticActivityStatus, string> = {
  PLANNED: 'Planned',
  SCHEDULED: 'Scheduled',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

export const PERFORMANCE_BAND_UI: Record<CoScholasticPerformanceBand, string> = {
  EXCELLENT: 'Excellent',
  GOOD: 'Good',
  AVERAGE: 'Average',
  NEEDS_IMPROVEMENT: 'Needs Improvement',
};

const BAND_COLORS: Record<CoScholasticPerformanceBand, string> = {
  EXCELLENT: '#16a34a',
  GOOD: '#2563eb',
  AVERAGE: '#d97706',
  NEEDS_IMPROVEMENT: '#dc2626',
};

export function scoreToBand(score: number, maxScore = 100): CoScholasticPerformanceBand {
  const pct = maxScore > 0 ? (score / maxScore) * 100 : 0;
  if (pct >= 85) return 'EXCELLENT';
  if (pct >= 70) return 'GOOD';
  if (pct >= 55) return 'AVERAGE';
  return 'NEEDS_IMPROVEMENT';
}

export function scoreToGrade(score: number, maxScore = 100): string {
  const pct = maxScore > 0 ? (score / maxScore) * 100 : 0;
  if (pct >= 90) return 'A+';
  if (pct >= 80) return 'A';
  if (pct >= 70) return 'B+';
  if (pct >= 60) return 'B';
  if (pct >= 50) return 'C';
  if (pct >= 40) return 'D';
  return 'E';
}

function categoryLabel(id: string): string {
  return CO_SCHOLASTIC_CATEGORIES.find((c) => c.id === id)?.label || id;
}

function subCategoryLabel(categoryId: string, subId: string): string {
  const cat = CO_SCHOLASTIC_CATEGORIES.find((c) => c.id === categoryId);
  return cat?.subCategories.find((s) => s.id === subId)?.label || subId;
}

export function serializeCoScholasticActivity(
  row: AcademicCoScholasticActivity & {
    performances?: AcademicCoScholasticPerformance[];
    feedbacks?: AcademicCoScholasticFeedback[];
    _count?: { performances: number; feedbacks: number };
  },
) {
  const performances = row.performances || [];
  const feedbacks = row.feedbacks || [];
  const perfCount = row._count?.performances ?? performances.length;
  const feedbackCount = row._count?.feedbacks ?? feedbacks.length;
  const avgScore = performances.length
    ? Math.round((performances.reduce((a, p) => a + p.performanceScore, 0) / performances.length) * 100) / 100
    : 0;
  const avgRating = feedbacks.length
    ? Math.round((feedbacks.reduce((a, f) => a + f.rating, 0) / feedbacks.length) * 10) / 10
    : 0;

  return {
    id: row.id,
    recordId: row.recordId,
    academicYear: row.academicYear,
    term: row.term,
    title: row.title,
    category: row.category,
    categoryLabel: categoryLabel(row.category),
    subCategory: row.subCategory,
    subCategoryLabel: subCategoryLabel(row.category, row.subCategory),
    activityType: row.activityType,
    className: row.className,
    sectionName: row.sectionName,
    classGroup: row.className ? formatClassSection(row.className, row.sectionName) : 'All Classes',
    teacherName: row.teacherName,
    coTeacherName: row.coTeacherName,
    activityDate: row.activityDate.toISOString(),
    startDate: row.startDate?.toISOString() ?? null,
    endDate: row.endDate?.toISOString() ?? null,
    venue: row.venue,
    description: row.description,
    measurementCriteria: row.measurementCriteria,
    maxScore: row.maxScore,
    status: row.status,
    statusLabel: ACTIVITY_STATUS_UI[row.status],
    publishedAt: row.publishedAt?.toISOString() ?? null,
    isPublished: !!row.publishedAt,
    performanceCount: perfCount,
    feedbackCount,
    avgPerformanceScore: avgScore,
    avgParentRating: avgRating,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function serializeCoScholasticPerformance(row: AcademicCoScholasticPerformance) {
  return {
    id: row.id,
    recordId: row.recordId,
    activityId: row.activityId,
    studentId: row.studentId,
    studentName: row.studentName,
    className: row.className,
    sectionName: row.sectionName,
    classGroup: formatClassSection(row.className, row.sectionName),
    performanceScore: row.performanceScore,
    performanceGrade: row.performanceGrade,
    performanceBand: row.performanceBand,
    performanceBandLabel: PERFORMANCE_BAND_UI[row.performanceBand],
    performanceBandColor: BAND_COLORS[row.performanceBand],
    remarks: row.remarks,
    recordedBy: row.recordedBy,
    recordedAt: row.recordedAt?.toISOString() ?? null,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    isPublished: !!row.publishedAt,
  };
}

export function serializeCoScholasticFeedback(row: AcademicCoScholasticFeedback) {
  return {
    id: row.id,
    recordId: row.recordId,
    activityId: row.activityId,
    studentId: row.studentId,
    parentName: row.parentName,
    parentRelationship: row.parentRelationship,
    rating: row.rating,
    message: row.message,
    submittedAt: row.submittedAt.toISOString(),
  };
}

export async function getCoScholasticDashboard(
  institutionId: string,
  opts: { academicYear?: string; category?: string; status?: string },
) {
  const activities = await prisma.academicCoScholasticActivity.findMany({
    where: {
      institutionId,
      ...(opts.academicYear ? { academicYear: opts.academicYear } : {}),
      ...(opts.category ? { category: opts.category } : {}),
      ...(opts.status ? { status: opts.status as CoScholasticActivityStatus } : {}),
    },
    include: {
      _count: { select: { performances: true, feedbacks: true } },
      performances: { take: 0 },
    },
    orderBy: { activityDate: 'asc' },
  });

  const serialized = activities.map(serializeCoScholasticActivity);
  const byCategory = CO_SCHOLASTIC_CATEGORIES.map((cat) => ({
    ...cat,
    count: serialized.filter((a) => a.category === cat.id).length,
    activities: serialized.filter((a) => a.category === cat.id),
  }));

  const totalPerformances = await prisma.academicCoScholasticPerformance.count({
    where: { institutionId, ...(opts.academicYear ? { activity: { academicYear: opts.academicYear } } : {}) },
  });

  return {
    academicYear: opts.academicYear || '2025-26',
    categories: CO_SCHOLASTIC_CATEGORIES,
    byCategory,
    activities: serialized,
    kpis: {
      totalActivities: serialized.length,
      planned: serialized.filter((a) => a.status === 'PLANNED').length,
      inProgress: serialized.filter((a) => a.status === 'IN_PROGRESS').length,
      completed: serialized.filter((a) => a.status === 'COMPLETED').length,
      published: serialized.filter((a) => a.isPublished).length,
      performancesRecorded: totalPerformances,
    },
  };
}

export async function getCoScholasticDetail(institutionId: string, activityId: string) {
  const row = await prisma.academicCoScholasticActivity.findFirst({
    where: { id: activityId, institutionId },
    include: {
      performances: { orderBy: { studentName: 'asc' } },
      feedbacks: { orderBy: { submittedAt: 'desc' } },
    },
  });
  if (!row) throw new Error('Activity not found');
  return {
    activity: serializeCoScholasticActivity(row),
    performances: row.performances.map(serializeCoScholasticPerformance),
    feedbacks: row.feedbacks.map(serializeCoScholasticFeedback),
  };
}

type ActivityInput = {
  academicYear?: string;
  term?: string;
  title: string;
  category: string;
  subCategory?: string;
  activityType?: string;
  className?: string;
  sectionName?: string;
  teacherName?: string;
  coTeacherName?: string;
  activityDate: string;
  startDate?: string;
  endDate?: string;
  venue?: string;
  description?: string;
  measurementCriteria?: string;
  maxScore?: number;
  status?: CoScholasticActivityStatus;
};

export async function createCoScholasticActivity(institutionId: string, data: ActivityInput) {
  const row = await prisma.academicCoScholasticActivity.create({
    data: {
      institutionId,
      recordId: await nextAcademicRecordId(institutionId, 'coScholastic'),
      academicYear: data.academicYear || '2025-26',
      term: data.term || 'Term 1',
      title: data.title,
      category: data.category,
      subCategory: data.subCategory || '',
      activityType: data.activityType || '',
      className: data.className || '',
      sectionName: data.sectionName || '',
      teacherName: data.teacherName || '',
      coTeacherName: data.coTeacherName || '',
      activityDate: new Date(data.activityDate),
      startDate: data.startDate ? new Date(data.startDate) : null,
      endDate: data.endDate ? new Date(data.endDate) : null,
      venue: data.venue || '',
      description: data.description || '',
      measurementCriteria: data.measurementCriteria || '',
      maxScore: data.maxScore ?? 100,
      status: data.status || 'PLANNED',
    },
    include: { _count: { select: { performances: true, feedbacks: true } } },
  });
  return serializeCoScholasticActivity(row);
}

export async function updateCoScholasticActivity(
  institutionId: string,
  id: string,
  data: Partial<ActivityInput>,
) {
  const existing = await prisma.academicCoScholasticActivity.findFirst({ where: { id, institutionId } });
  if (!existing) throw new Error('Activity not found');

  const row = await prisma.academicCoScholasticActivity.update({
    where: { id },
    data: {
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.term !== undefined ? { term: data.term } : {}),
      ...(data.category !== undefined ? { category: data.category } : {}),
      ...(data.subCategory !== undefined ? { subCategory: data.subCategory } : {}),
      ...(data.activityType !== undefined ? { activityType: data.activityType } : {}),
      ...(data.className !== undefined ? { className: data.className } : {}),
      ...(data.sectionName !== undefined ? { sectionName: data.sectionName } : {}),
      ...(data.teacherName !== undefined ? { teacherName: data.teacherName } : {}),
      ...(data.coTeacherName !== undefined ? { coTeacherName: data.coTeacherName } : {}),
      ...(data.activityDate !== undefined ? { activityDate: new Date(data.activityDate) } : {}),
      ...(data.startDate !== undefined ? { startDate: data.startDate ? new Date(data.startDate) : null } : {}),
      ...(data.endDate !== undefined ? { endDate: data.endDate ? new Date(data.endDate) : null } : {}),
      ...(data.venue !== undefined ? { venue: data.venue } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.measurementCriteria !== undefined ? { measurementCriteria: data.measurementCriteria } : {}),
      ...(data.maxScore !== undefined ? { maxScore: data.maxScore } : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
    },
    include: { _count: { select: { performances: true, feedbacks: true } } },
  });
  return serializeCoScholasticActivity(row);
}

export async function recordCoScholasticPerformances(
  institutionId: string,
  activityId: string,
  data: {
    recordedBy: string;
    performances: {
      studentId: string;
      studentName?: string;
      className?: string;
      sectionName?: string;
      performanceScore: number;
      remarks?: string;
    }[];
  },
) {
  const activity = await prisma.academicCoScholasticActivity.findFirst({
    where: { id: activityId, institutionId },
  });
  if (!activity) throw new Error('Activity not found');

  const now = new Date();
  let upserted = 0;

  for (const p of data.performances) {
    const band = scoreToBand(p.performanceScore, activity.maxScore);
    const grade = scoreToGrade(p.performanceScore, activity.maxScore);

    const existing = await prisma.academicCoScholasticPerformance.findFirst({
      where: { institutionId, activityId, studentId: p.studentId },
    });

    if (existing) {
      await prisma.academicCoScholasticPerformance.update({
        where: { id: existing.id },
        data: {
          performanceScore: p.performanceScore,
          performanceGrade: grade,
          performanceBand: band,
          remarks: p.remarks || '',
          recordedBy: data.recordedBy,
          recordedAt: now,
          ...(p.studentName ? { studentName: p.studentName } : {}),
          ...(p.className ? { className: p.className } : {}),
          ...(p.sectionName ? { sectionName: p.sectionName } : {}),
        },
      });
    } else {
      await prisma.academicCoScholasticPerformance.create({
        data: {
          institutionId,
          recordId: await nextAcademicRecordId(institutionId, 'coScholasticPerf'),
          activityId,
          studentId: p.studentId,
          studentName: p.studentName || '',
          className: p.className || activity.className,
          sectionName: p.sectionName || activity.sectionName,
          performanceScore: p.performanceScore,
          performanceGrade: grade,
          performanceBand: band,
          remarks: p.remarks || '',
          recordedBy: data.recordedBy,
          recordedAt: now,
        },
      });
    }
    upserted += 1;
  }

  if (activity.status === 'PLANNED' || activity.status === 'SCHEDULED') {
    await prisma.academicCoScholasticActivity.update({
      where: { id: activityId },
      data: { status: 'IN_PROGRESS' },
    });
  }

  return { upserted };
}

export async function publishCoScholasticActivities(
  institutionId: string,
  opts: { academicYear: string; activityIds?: string[] },
) {
  const now = new Date();
  const result = await prisma.academicCoScholasticActivity.updateMany({
    where: {
      institutionId,
      academicYear: opts.academicYear,
      ...(opts.activityIds?.length ? { id: { in: opts.activityIds } } : {}),
      publishedAt: null,
    },
    data: { publishedAt: now },
  });

  await prisma.academicCoScholasticPerformance.updateMany({
    where: {
      institutionId,
      publishedAt: null,
      activity: {
        academicYear: opts.academicYear,
        ...(opts.activityIds?.length ? { id: { in: opts.activityIds } } : {}),
      },
    },
    data: { publishedAt: now },
  });

  return { published: result.count, publishedAt: now.toISOString() };
}

export async function submitParentCoScholasticFeedback(
  institutionId: string,
  activityId: string,
  data: {
    studentId: string;
    parentName?: string;
    parentRelationship?: string;
    rating: number;
    message?: string;
  },
) {
  const activity = await prisma.academicCoScholasticActivity.findFirst({
    where: { id: activityId, institutionId, publishedAt: { not: null } },
  });
  if (!activity) throw new Error('Activity not found or not published');

  const row = await prisma.academicCoScholasticFeedback.create({
    data: {
      institutionId,
      recordId: await nextAcademicRecordId(institutionId, 'coScholasticFeedback'),
      activityId,
      studentId: data.studentId,
      parentName: data.parentName || '',
      parentRelationship: data.parentRelationship || 'GUARDIAN',
      rating: data.rating,
      message: data.message || '',
    },
  });
  return serializeCoScholasticFeedback(row);
}

export async function getMobileCoScholasticForTeacher(
  institutionId: string,
  teacherName: string,
  academicYear?: string,
) {
  const rows = await prisma.academicCoScholasticActivity.findMany({
    where: {
      institutionId,
      publishedAt: { not: null },
      teacherName: { contains: teacherName, mode: 'insensitive' },
      ...(academicYear ? { academicYear } : {}),
    },
    include: { _count: { select: { performances: true, feedbacks: true } } },
    orderBy: { activityDate: 'desc' },
  });
  return rows.map(serializeCoScholasticActivity);
}

export async function getMobileCoScholasticForStudent(
  institutionId: string,
  studentId: string,
  academicYear?: string,
) {
  const student = await prisma.student.findFirst({ where: { id: studentId, institutionId } });
  if (!student) throw new Error('Student not found');

  const activities = await prisma.academicCoScholasticActivity.findMany({
    where: {
      institutionId,
      publishedAt: { not: null },
      ...(academicYear ? { academicYear } : {}),
      OR: [
        { className: '' },
        { className: student.className, sectionName: student.sectionName },
        { className: student.className, sectionName: '' },
      ],
    },
    orderBy: { activityDate: 'desc' },
  });

  const performances = await prisma.academicCoScholasticPerformance.findMany({
    where: {
      institutionId,
      studentId,
      publishedAt: { not: null },
      activityId: { in: activities.map((a) => a.id) },
    },
  });

  const perfMap = new Map(performances.map((p) => [p.activityId, p]));

  return activities.map((a) => ({
    ...serializeCoScholasticActivity(a),
    myPerformance: perfMap.has(a.id) ? serializeCoScholasticPerformance(perfMap.get(a.id)!) : null,
  }));
}

export async function getMobileCoScholasticForParent(
  institutionId: string,
  studentId: string,
  academicYear?: string,
) {
  const studentView = await getMobileCoScholasticForStudent(institutionId, studentId, academicYear);

  const feedbacks = await prisma.academicCoScholasticFeedback.findMany({
    where: { institutionId, studentId },
    orderBy: { submittedAt: 'desc' },
  });

  const feedbackMap = new Map<string, ReturnType<typeof serializeCoScholasticFeedback>[]>();
  for (const f of feedbacks) {
    const list = feedbackMap.get(f.activityId) || [];
    list.push(serializeCoScholasticFeedback(f));
    feedbackMap.set(f.activityId, list);
  }

  return studentView.map((a) => ({
    ...a,
    myFeedback: feedbackMap.get(a.id) || [],
    canSubmitFeedback: a.isPublished,
  }));
}
