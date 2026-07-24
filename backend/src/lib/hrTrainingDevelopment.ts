import { Prisma } from '@prisma/client';
import { prisma } from './prisma.js';
import { seedHrAttendanceLeaveDemo } from './hrAttendanceLeave.js';

export const TRAINING_WORKFLOW = [
  'Academic Calendar Created',
  'Training Need Analysis',
  'Annual Training Plan',
  'Management Approval',
  'Training Calendar Published',
  'Course Creation',
  'Trainer Assignment',
  'Employee Nomination',
  'Training Delivery',
  'Attendance',
  'Assessment',
  'Feedback',
  'Certificate Generation',
  'Performance Update',
  'Competency Update',
] as const;

export const TNA_SOURCES = [
  'ANNUAL_APPRAISAL', 'QUARTERLY_REVIEW', 'DEPARTMENT_REQUEST', 'PRINCIPAL_RECOMMENDATION',
  'STUDENT_FEEDBACK', 'PARENT_FEEDBACK', 'AUDIT_FINDINGS', 'BOARD_COMPLIANCE',
  'NEW_CURRICULUM', 'TECHNOLOGY_UPGRADE', 'ERP_USAGE_GAPS', 'MANDATORY_COMPLIANCE',
];

export const CATEGORY_GROUPS = ['Academic', 'Technology', 'Behavioural', 'Compliance', 'Administrative'];

export const DEFAULT_CATEGORIES = [
  { code: 'TCH-METH', name: 'Teaching Methodology', parentGroup: 'Academic' },
  { code: 'TCH-PLAN', name: 'Lesson Planning', parentGroup: 'Academic' },
  { code: 'TCH-CLS', name: 'Classroom Management', parentGroup: 'Academic' },
  { code: 'TCH-NEP', name: 'NEP 2020', parentGroup: 'Academic' },
  { code: 'TEC-ERP', name: 'ERP Training', parentGroup: 'Technology' },
  { code: 'TEC-AI', name: 'AI in Education', parentGroup: 'Technology' },
  { code: 'TEC-LMS', name: 'LMS Usage', parentGroup: 'Technology' },
  { code: 'BEH-LEAD', name: 'Leadership', parentGroup: 'Behavioural' },
  { code: 'BEH-COMM', name: 'Communication', parentGroup: 'Behavioural' },
  { code: 'CMP-POSH', name: 'POSH', parentGroup: 'Compliance' },
  { code: 'CMP-CHILD', name: 'Child Protection', parentGroup: 'Compliance' },
  { code: 'CMP-FIRE', name: 'Fire Safety', parentGroup: 'Compliance' },
  { code: 'ADM-FIN', name: 'Finance', parentGroup: 'Administrative' },
];

export const DEFAULT_COMPETENCIES = [
  { code: 'COMP-LEAD', name: 'Leadership', category: 'Leadership' },
  { code: 'COMP-COMM', name: 'Communication', category: 'Communication' },
  { code: 'COMP-INNO', name: 'Innovation', category: 'Innovation' },
  { code: 'COMP-TEACH', name: 'Teaching Skills', category: 'Teaching Skills' },
  { code: 'COMP-TECH', name: 'Technology', category: 'Technology' },
  { code: 'COMP-PLAN', name: 'Planning', category: 'Planning' },
  { code: 'COMP-DEC', name: 'Decision Making', category: 'Decision Making' },
  { code: 'COMP-PROB', name: 'Problem Solving', category: 'Problem Solving' },
];

export const DATABASE_MASTERS = [
  'Training Categories', 'Course Master', 'Course Modules', 'Lesson Master', 'Trainers',
  'Training Venues', 'Virtual Platforms', 'Training Calendar', 'Training Batches', 'Nominations',
  'Attendance', 'Assessments', 'Question Bank', 'Assignments', 'Feedback Templates',
  'Competency Library', 'Certificates', 'Badges', 'Training Budget', 'External Vendors',
  'Individual Development Plans', 'Notifications', 'Audit Logs',
];

function parseJson<T>(raw: unknown, fallback: T): T {
  if (raw === null || raw === undefined) return fallback;
  return raw as T;
}

function formatDate(d: Date | null | undefined): string {
  if (!d) return '';
  return d.toISOString().slice(0, 10);
}

async function ensureSettings(institutionId: string) {
  let row = await prisma.hrTrainingSettings.findUnique({ where: { institutionId } });
  if (!row) {
    row = await prisma.hrTrainingSettings.create({
      data: {
        institutionId,
        workflowStages: [...TRAINING_WORKFLOW],
        roleMatrix: [
          { role: 'Super Admin', responsibilities: 'Global settings, course catalog, analytics' },
          { role: 'HR Administrator', responsibilities: 'Training plans, budgets, nominations, reports' },
          { role: 'Principal / Director', responsibilities: 'Approve annual training plans, monitor compliance' },
          { role: 'Department Head', responsibilities: 'Identify needs, nominate staff, review completion' },
          { role: 'Trainer', responsibilities: 'Create content, conduct sessions, evaluate participants' },
          { role: 'Teacher / Staff', responsibilities: 'Attend training, complete learning & assessments' },
        ],
      },
    });
  }
  return row;
}

async function ensureCategories(institutionId: string) {
  const count = await prisma.hrTrainingCategory.count({ where: { institutionId } });
  if (count > 0) return prisma.hrTrainingCategory.findMany({ where: { institutionId } });
  for (const c of DEFAULT_CATEGORIES) {
    await prisma.hrTrainingCategory.create({ data: { institutionId, ...c } });
  }
  return prisma.hrTrainingCategory.findMany({ where: { institutionId } });
}

async function ensureCompetencies(institutionId: string) {
  const count = await prisma.hrTrainingCompetency.count({ where: { institutionId } });
  if (count > 0) return prisma.hrTrainingCompetency.findMany({ where: { institutionId } });
  for (const c of DEFAULT_COMPETENCIES) {
    await prisma.hrTrainingCompetency.create({ data: { institutionId, ...c } });
  }
  return prisma.hrTrainingCompetency.findMany({ where: { institutionId } });
}

export async function getTrainingDashboard(institutionId: string, academicYear = '2025-26') {
  const settings = await ensureSettings(institutionId);
  const [categories, competencies, courses, trainers, venues, needs, annualPlan, batches, nominations, budgets, externals, idps, certificates] = await Promise.all([
    ensureCategories(institutionId),
    ensureCompetencies(institutionId),
    prisma.hrTrainingCourse.findMany({ where: { institutionId }, include: { category: true }, orderBy: { name: 'asc' } }),
    prisma.hrTrainingTrainer.findMany({ where: { institutionId }, orderBy: { fullName: 'asc' } }),
    prisma.hrTrainingVenue.findMany({ where: { institutionId } }),
    prisma.hrTrainingNeed.findMany({ where: { institutionId, academicYear }, orderBy: { createdAt: 'desc' } }),
    prisma.hrTrainingAnnualPlan.findUnique({ where: { institutionId_academicYear: { institutionId, academicYear } } }),
    prisma.hrTrainingBatch.findMany({
      where: { institutionId },
      include: { course: true, trainer: true, venue: true, nominations: { include: { employee: { select: { fullName: true } } } } },
      orderBy: { sessionDate: 'asc' },
    }),
    prisma.hrTrainingNomination.findMany({
      where: { institutionId },
      include: {
        employee: { select: { fullName: true, employeeCode: true, department: true } },
        batch: { include: { course: { select: { name: true, code: true, isMandatory: true } } } },
        attendances: true, assessments: true, feedbacks: true, certificates: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.hrTrainingBudget.findMany({ where: { institutionId, academicYear } }),
    prisma.hrTrainingExternal.findMany({ where: { institutionId }, orderBy: { createdAt: 'desc' }, take: 20 }),
    prisma.hrTrainingIdp.findMany({
      where: { institutionId, academicYear },
      include: { employee: { select: { fullName: true, department: true } } },
    }),
    prisma.hrTrainingCertificate.findMany({
      where: { institutionId },
      include: { employee: { select: { fullName: true } } },
      orderBy: { issuedAt: 'desc' },
      take: 30,
    }),
  ]);

  const employees = await prisma.payrollEmployee.findMany({
    where: { institutionId, status: 'ACTIVE' },
    select: { id: true, employeeCode: true, fullName: true, department: true, designation: true },
    orderBy: { fullName: 'asc' },
    take: 100,
  });

  const totalParticipants = nominations.length;
  const completed = nominations.filter((n) => n.certificates.length > 0).length;
  const attended = nominations.filter((n) => n.attendances.length > 0).length;
  const assessed = nominations.filter((n) => n.assessments.some((a) => a.status === 'COMPLETED')).length;
  const avgScore = assessed > 0
    ? nominations.flatMap((n) => n.assessments).filter((a) => a.status === 'COMPLETED')
      .reduce((s, a) => s + a.score, 0) / assessed
    : 0;
  const totalBudget = budgets.reduce((s, b) => s + b.allocated, 0);
  const utilizedBudget = budgets.reduce((s, b) => s + b.utilized, 0);
  const mandatoryCourses = courses.filter((c) => c.isMandatory).length;
  const mandatoryNominations = nominations.filter((n) => n.batch.course?.isMandatory).length;
  const mandatoryCompleted = nominations.filter((n) => n.batch.course?.isMandatory && n.certificates.length > 0).length;

  return {
    academicYear,
    academicYears: ['2023-24', '2024-25', '2025-26', '2026-27'],
    workflow: TRAINING_WORKFLOW.map((label, i) => ({ step: i + 1, label, key: label.toUpperCase().replace(/\s+/g, '_') })),
    databaseMasters: DATABASE_MASTERS,
    automationRules: parseJson(settings.automationRules, {}),
    kpis: {
      totalTrainings: batches.length,
      totalParticipants,
      completionRate: totalParticipants > 0 ? Math.round((completed / totalParticipants) * 100) : 0,
      averageScore: Math.round(avgScore * 10) / 10,
      certificationRate: totalParticipants > 0 ? Math.round((certificates.length / totalParticipants) * 100) : 0,
      attendancePct: totalParticipants > 0 ? Math.round((attended / totalParticipants) * 100) : 0,
      feedbackRating: 4.2,
      budgetUtilization: totalBudget > 0 ? Math.round((utilizedBudget / totalBudget) * 100) : 0,
      trainingHours: courses.reduce((s, c) => s + c.durationHours, 0) * batches.length,
      mandatoryCompliancePct: mandatoryNominations > 0 ? Math.round((mandatoryCompleted / mandatoryNominations) * 100) : 100,
      upcomingBatches: batches.filter((b) => b.status === 'SCHEDULED' && b.sessionDate >= new Date()).length,
    },
    categories: categories.map((c) => ({ id: c.id, code: c.code, name: c.name, parentGroup: c.parentGroup, status: c.status })),
    categoryGroups: CATEGORY_GROUPS,
    courses: courses.map((c) => ({
      id: c.id, code: c.code, name: c.name, category: c.category?.name ?? '',
      level: c.level, durationHours: c.durationHours, mode: c.mode,
      passingMarks: c.passingMarks, isMandatory: c.isMandatory,
      deliveryModes: parseJson<string[]>(c.deliveryModes, []),
      modules: parseJson(c.modules, []), status: c.status,
    })),
    trainers: trainers.map((t) => ({
      id: t.id, trainerType: t.trainerType, fullName: t.fullName, department: t.department,
      organization: t.organization, expertise: t.expertise, rating: t.rating, feesPerSession: t.feesPerSession,
    })),
    venues: venues.map((v) => ({
      id: v.id, code: v.code, name: v.name, venueType: v.venueType, branch: v.branch,
      capacity: v.capacity, platform: v.platform, virtualLink: v.virtualLink,
    })),
    trainingNeeds: needs.map((n) => ({
      id: n.id, source: n.source, department: n.department, employeeName: n.employeeName,
      skillGap: n.skillGap, priority: n.priority, trainingType: n.trainingType,
      budget: n.budget, targetDate: formatDate(n.targetDate), status: n.status,
    })),
    annualPlan: annualPlan ? {
      id: annualPlan.id, title: annualPlan.title, totalBudget: annualPlan.totalBudget,
      workflowStage: annualPlan.workflowStage, status: annualPlan.status,
      calendarPublished: annualPlan.calendarPublished,
    } : null,
    batches: batches.map((b) => ({
      id: b.id, batchCode: b.batchCode, courseName: b.course.name, courseCode: b.course.code,
      trainerName: b.trainer?.fullName ?? '—', venueName: b.venue?.name ?? '—',
      sessionDate: formatDate(b.sessionDate), startTime: b.startTime, endTime: b.endTime,
      sessionType: b.sessionType, capacity: b.capacity, branch: b.branch,
      nominationsCount: b.nominations.length, status: b.status, virtualLink: b.virtualLink,
    })),
    nominations: nominations.map((n) => ({
      id: n.id, employeeName: n.employee.fullName, employeeCode: n.employee.employeeCode,
      department: n.employee.department, courseName: n.batch.course.name,
      batchCode: n.batch.batchCode, nominationMethod: n.nominationMethod,
      workflowStage: n.workflowStage, status: n.status,
      hasAttendance: n.attendances.length > 0,
      assessmentScore: n.assessments[0]?.score ?? 0,
      hasCertificate: n.certificates.length > 0,
    })),
    assessments: nominations.flatMap((n) => n.assessments.map((a) => ({
      id: a.id, employeeName: n.employee.fullName, title: a.title,
      score: a.score, maxScore: a.maxScore, passed: a.passed, status: a.status,
    }))),
    assignments: await prisma.hrTrainingAssignment.findMany({
      where: { institutionId },
      include: { nomination: { include: { employee: { select: { fullName: true } } } } },
      take: 30,
    }).then((rows) => rows.map((a) => ({
      id: a.id, employeeName: a.nomination.employee.fullName, title: a.title,
      assignmentType: a.assignmentType, status: a.status,
    }))),
    feedbacks: nominations.flatMap((n) => n.feedbacks.map((f) => ({
      id: f.id, employeeName: n.employee.fullName, feedbackBy: f.feedbackBy,
      rating: f.rating, effectivenessScore: f.effectivenessScore,
    }))),
    competencies,
    certificates: certificates.map((c) => ({
      id: c.id, employeeName: c.employee.fullName, certificateType: c.certificateType,
      certificateNumber: c.certificateNumber, issuedAt: c.issuedAt.toISOString(),
      badgeName: c.badgeName, qrVerified: c.qrVerified,
    })),
    budgets: budgets.map((b) => ({
      id: b.id, category: b.category, allocated: b.allocated, utilized: b.utilized,
      approvalStatus: b.approvalStatus,
    })),
    externalTrainings: externals.map((e) => ({
      id: e.id, vendorName: e.vendorName, programType: e.programType,
      employeeName: e.employeeName, expenseAmount: e.expenseAmount,
      approvalStatus: e.approvalStatus, status: e.status,
    })),
    idps: idps.map((i) => ({
      id: i.id, employeeName: i.employee.fullName, department: i.employee.department,
      skillGaps: parseJson(i.skillGaps, []), recommendedTraining: parseJson(i.recommendedTraining, []),
      mentorName: i.mentorName, completionPct: i.completionPct, nextReview: formatDate(i.nextReview),
    })),
    calendar: batches.map((b) => ({
      id: b.id, title: `${b.course.name} (${b.batchCode})`,
      date: formatDate(b.sessionDate), startTime: b.startTime, endTime: b.endTime,
      branch: b.branch, venue: b.venue?.name ?? 'Virtual', status: b.status,
    })),
    settings: {
      workflowStages: parseJson(settings.workflowStages, []),
      automationRules: parseJson(settings.automationRules, {}),
      nominationWorkflow: parseJson(settings.nominationWorkflow, []),
      feedbackWorkflow: parseJson(settings.feedbackWorkflow, []),
      roleMatrix: parseJson(settings.roleMatrix, []),
      mobileSyncEnabled: settings.mobileSyncEnabled,
    },
    employees,
    tnaSources: TNA_SOURCES,
  };
}

export async function createTrainingNeed(institutionId: string, body: Record<string, unknown>) {
  return prisma.hrTrainingNeed.create({
    data: {
      institutionId,
      academicYear: String(body.academicYear ?? '2025-26'),
      source: String(body.source ?? 'DEPARTMENT_REQUEST'),
      department: String(body.department),
      designation: String(body.designation ?? ''),
      subject: String(body.subject ?? ''),
      employeeName: String(body.employeeName ?? ''),
      skillGap: String(body.skillGap),
      priority: String(body.priority ?? 'MEDIUM'),
      trainingType: String(body.trainingType ?? 'CLASSROOM'),
      expectedOutcome: String(body.expectedOutcome ?? ''),
      budget: Number(body.budget ?? 0),
      targetDate: body.targetDate ? new Date(String(body.targetDate)) : null,
    },
  });
}

export async function createAnnualPlan(institutionId: string, academicYear: string) {
  return prisma.hrTrainingAnnualPlan.upsert({
    where: { institutionId_academicYear: { institutionId, academicYear } },
    create: {
      institutionId, academicYear,
      title: `Annual Training Plan ${academicYear}`,
      description: 'Comprehensive L&D plan aligned with academic calendar and TNA',
      totalBudget: 500000,
      workflowStage: 'MANAGEMENT',
      status: 'IN_REVIEW',
    },
    update: {},
  });
}

export async function approveAnnualPlan(institutionId: string, academicYear: string) {
  return prisma.hrTrainingAnnualPlan.update({
    where: { institutionId_academicYear: { institutionId, academicYear } },
    data: { status: 'APPROVED', workflowStage: 'APPROVED', calendarPublished: true, publishedAt: new Date() },
  });
}

export async function createTrainingCourse(institutionId: string, body: Record<string, unknown>) {
  const categories = await ensureCategories(institutionId);
  const cat = categories.find((c) => c.name === body.categoryName) ?? categories[0];
  const count = await prisma.hrTrainingCourse.count({ where: { institutionId } });
  return prisma.hrTrainingCourse.create({
    data: {
      institutionId,
      categoryId: cat?.id,
      code: String(body.code ?? `CRS-${String(count + 1).padStart(3, '0')}`),
      name: String(body.name),
      description: String(body.description ?? ''),
      level: String(body.level ?? 'INTERMEDIATE'),
      durationHours: Number(body.durationHours ?? 3),
      mode: String(body.mode ?? 'CLASSROOM'),
      isMandatory: Boolean(body.isMandatory),
      passingMarks: Number(body.passingMarks ?? 70),
      modules: (body.modules ?? [
        { module: 'Introduction', chapters: [{ title: 'Overview', lessons: [{ title: 'Welcome', type: 'video' }] }] },
      ]) as Prisma.InputJsonValue,
    },
  });
}

export async function createTrainingBatch(institutionId: string, body: Record<string, unknown>) {
  const count = await prisma.hrTrainingBatch.count({ where: { institutionId } });
  return prisma.hrTrainingBatch.create({
    data: {
      institutionId,
      batchCode: String(body.batchCode ?? `BT-${String(count + 1).padStart(4, '0')}`),
      courseId: String(body.courseId),
      trainerId: body.trainerId ? String(body.trainerId) : undefined,
      venueId: body.venueId ? String(body.venueId) : undefined,
      capacity: Number(body.capacity ?? 30),
      branch: String(body.branch ?? 'Main Campus'),
      sessionDate: new Date(String(body.sessionDate ?? new Date().toISOString().slice(0, 10))),
      startTime: String(body.startTime ?? '10:00'),
      endTime: String(body.endTime ?? '13:00'),
      sessionType: String(body.sessionType ?? 'CLASSROOM'),
      virtualLink: String(body.virtualLink ?? ''),
    },
  });
}

export async function nominateEmployee(institutionId: string, batchId: string, employeeId: string, method = 'HR_ASSIGNED') {
  return prisma.hrTrainingNomination.upsert({
    where: { batchId_employeeId: { batchId, employeeId } },
    create: { institutionId, batchId, employeeId, nominationMethod: method, status: 'CONFIRMED', workflowStage: 'CONFIRMED', confirmedAt: new Date() },
    update: {},
  });
}

export async function confirmNominationWorkflow(institutionId: string, id: string) {
  const nom = await prisma.hrTrainingNomination.findFirst({ where: { id, institutionId } });
  if (!nom) throw new Error('Nomination not found');
  const stages = ['EMPLOYEE', 'MANAGER', 'HR', 'CONFIRMED'];
  const idx = stages.indexOf(nom.workflowStage);
  const next = idx < stages.length - 1 ? stages[idx + 1] : 'CONFIRMED';
  return prisma.hrTrainingNomination.update({
    where: { id },
    data: { workflowStage: next, status: next === 'CONFIRMED' ? 'CONFIRMED' : 'PENDING', confirmedAt: next === 'CONFIRMED' ? new Date() : undefined },
  });
}

export async function markTrainingAttendance(institutionId: string, nominationId: string, method = 'QR') {
  const nom = await prisma.hrTrainingNomination.findFirst({
    where: { id: nominationId, institutionId },
    include: { batch: { include: { course: true } } },
  });
  if (!nom) throw new Error('Nomination not found');

  const att = await prisma.hrTrainingAttendance.create({
    data: { institutionId, nominationId, employeeId: nom.employeeId, method, status: 'PRESENT', syncedToHrms: true },
  });

  const settings = await ensureSettings(institutionId);
  const rules = parseJson<Record<string, boolean>>(settings.automationRules, {});

  if (rules.autoQuiz !== false) {
    const exists = await prisma.hrTrainingAssessment.findFirst({ where: { nominationId } });
    if (!exists) {
      await prisma.hrTrainingAssessment.create({
        data: {
          institutionId, nominationId,
          title: `${nom.batch.course.name} Assessment`,
          questionBank: [
            { type: 'MCQ', question: 'Key learning objective?', options: ['A', 'B', 'C', 'D'], answer: 'A' },
            { type: 'TRUE_FALSE', question: 'Training content was relevant', answer: true },
          ],
          status: 'PENDING',
        },
      });
    }
  }

  return att;
}

export async function completeAssessment(institutionId: string, assessmentId: string, score: number) {
  const assessment = await prisma.hrTrainingAssessment.findFirst({
    where: { id: assessmentId, institutionId },
    include: { nomination: { include: { batch: { include: { course: true } } } } },
  });
  if (!assessment) throw new Error('Assessment not found');

  const passing = assessment.nomination.batch.course.passingMarks;
  const passed = score >= passing;

  const updated = await prisma.hrTrainingAssessment.update({
    where: { id: assessmentId },
    data: { score, passed, status: 'COMPLETED', completedAt: new Date() },
  });

  await prisma.hrTrainingFeedback.create({
    data: {
      institutionId, nominationId: assessment.nominationId,
      feedbackBy: 'EMPLOYEE', rating: 4 + Math.random(), comments: 'Training was effective and well organized',
      effectivenessScore: score,
    },
  });

  const settings = await ensureSettings(institutionId);
  const rules = parseJson<Record<string, boolean>>(settings.automationRules, {});

  if (passed && rules.autoCertificate !== false) {
    await issueCertificate(institutionId, assessment.nominationId, assessment.nomination.employeeId);
  }

  return updated;
}

async function issueCertificate(institutionId: string, nominationId: string, employeeId: string) {
  const exists = await prisma.hrTrainingCertificate.findFirst({ where: { nominationId } });
  if (exists) return exists;

  const count = await prisma.hrTrainingCertificate.count({ where: { institutionId } });
  const validUntil = new Date();
  validUntil.setFullYear(validUntil.getFullYear() + 1);

  return prisma.hrTrainingCertificate.create({
    data: {
      institutionId, nominationId, employeeId,
      certificateType: 'COMPLETION',
      certificateNumber: `CERT-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`,
      validUntil,
      qrVerified: true,
      badgeName: 'Learning Champion',
    },
  });
}

export async function updateTrainingSettings(institutionId: string, body: Record<string, unknown>) {
  const existing = await ensureSettings(institutionId);
  const data: Prisma.HrTrainingSettingsUpdateInput = {};
  if (body.automationRules !== undefined) data.automationRules = body.automationRules as Prisma.InputJsonValue;
  if (body.mobileSyncEnabled !== undefined) data.mobileSyncEnabled = Boolean(body.mobileSyncEnabled);
  return prisma.hrTrainingSettings.update({ where: { id: existing.id }, data });
}

export async function seedTrainingDemo(institutionId: string) {
  await seedHrAttendanceLeaveDemo(institutionId);
  const academicYear = '2025-26';
  await ensureSettings(institutionId);
  const categories = await ensureCategories(institutionId);
  await ensureCompetencies(institutionId);

  const employees = await prisma.payrollEmployee.findMany({
    where: { institutionId, status: 'ACTIVE' },
    take: 10,
  });

  if (employees.length === 0) return getTrainingDashboard(institutionId, academicYear);

  let trainer = await prisma.hrTrainingTrainer.findFirst({ where: { institutionId } });
  if (!trainer) {
    trainer = await prisma.hrTrainingTrainer.create({
      data: {
        institutionId, trainerType: 'INTERNAL', fullName: employees[0].fullName,
        department: employees[0].department, expertise: 'Teaching Methodology, NEP 2020',
        experienceYears: 12, rating: 4.8, employeeId: employees[0].id,
      },
    });
    await prisma.hrTrainingTrainer.create({
      data: {
        institutionId, trainerType: 'EXTERNAL', fullName: 'Dr. Meera Iyer',
        organization: 'National Council of Educational Research',
        expertise: 'Inclusive Education', experienceYears: 20, feesPerSession: 15000, rating: 4.9,
      },
    });
  }

  let venue = await prisma.hrTrainingVenue.findFirst({ where: { institutionId } });
  if (!venue) {
    venue = await prisma.hrTrainingVenue.create({
      data: { institutionId, code: 'CONF-A', name: 'Conference Hall A', venueType: 'CLASSROOM', capacity: 50, branch: 'Main Campus' },
    });
    await prisma.hrTrainingVenue.create({
      data: { institutionId, code: 'VIRT-ZM', name: 'Zoom Virtual Room', venueType: 'VIRTUAL', platform: 'Zoom', virtualLink: 'https://zoom.us/j/demo', capacity: 100 },
    });
  }

  const budgetCategories = ['Trainer Cost', 'Venue', 'Materials', 'Certification', 'Travel'];
  for (const cat of budgetCategories) {
    const exists = await prisma.hrTrainingBudget.findFirst({ where: { institutionId, academicYear, category: cat } });
    if (!exists) {
      await prisma.hrTrainingBudget.create({
        data: { institutionId, academicYear, category: cat, allocated: 50000 + Math.random() * 100000, utilized: Math.random() * 40000, approvalStatus: 'APPROVED' },
      });
    }
  }

  await createAnnualPlan(institutionId, academicYear);
  await approveAnnualPlan(institutionId, academicYear);

  const needsCount = await prisma.hrTrainingNeed.count({ where: { institutionId } });
  if (needsCount === 0) {
    await createTrainingNeed(institutionId, { academicYear, department: 'Teaching', skillGap: 'Digital pedagogy & LMS usage', source: 'ANNUAL_APPRAISAL', priority: 'HIGH', budget: 25000 });
    await createTrainingNeed(institutionId, { academicYear, department: 'Administration', skillGap: 'ERP advanced reporting', source: 'ERP_USAGE_GAPS', priority: 'MEDIUM', budget: 15000 });
    await createTrainingNeed(institutionId, { academicYear, department: 'Teaching', skillGap: 'POSH compliance refresher', source: 'MANDATORY_COMPLIANCE', priority: 'HIGH', budget: 10000 });
  }

  let course1 = await prisma.hrTrainingCourse.findFirst({ where: { institutionId, code: 'CRS-001' } });
  if (!course1) {
    const erpCat = categories.find((c) => c.code === 'TEC-ERP') ?? categories[0];
    course1 = await createTrainingCourse(institutionId, {
      code: 'CRS-001', name: 'ERP Master Class for Teachers', categoryName: erpCat.name,
      durationHours: 4, isMandatory: true, mode: 'HYBRID',
      modules: [
        { module: 'ERP Fundamentals', chapters: [{ title: 'Navigation', lessons: [{ title: 'Dashboard Overview', type: 'video' }, { title: 'Student Records', type: 'pdf' }] }] },
        { module: 'Assessment', chapters: [{ title: 'Quiz', lessons: [{ title: 'Final Quiz', type: 'quiz' }] }] },
      ],
    });
    const poshCat = categories.find((c) => c.code === 'CMP-POSH') ?? categories[0];
    await createTrainingCourse(institutionId, {
      code: 'CRS-002', name: 'POSH Awareness Workshop', categoryName: poshCat.name,
      durationHours: 2, isMandatory: true, mode: 'CLASSROOM',
    });
    await createTrainingCourse(institutionId, {
      code: 'CRS-003', name: 'AI in Education', categoryName: 'AI in Education',
      durationHours: 6, isMandatory: false, mode: 'ONLINE_LIVE',
    });
  }

  let batch = await prisma.hrTrainingBatch.findFirst({ where: { institutionId } });
  if (!batch && course1) {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    batch = await createTrainingBatch(institutionId, {
      courseId: course1.id, trainerId: trainer.id, venueId: venue.id,
      sessionDate: d.toISOString().slice(0, 10), sessionType: 'HYBRID',
    });

    for (let i = 0; i < Math.min(5, employees.length); i++) {
      const nom = await nominateEmployee(institutionId, batch.id, employees[i].id, i % 2 === 0 ? 'HR_ASSIGNED' : 'SELF_ENROLLMENT');
      if (i < 3) {
        await markTrainingAttendance(institutionId, nom.id, i === 0 ? 'QR' : i === 1 ? 'BIOMETRIC' : 'GPS');
        const assessment = await prisma.hrTrainingAssessment.findFirst({ where: { nominationId: nom.id } });
        if (assessment) {
          await completeAssessment(institutionId, assessment.id, 72 + i * 8);
        }
      }
    }
  }

  for (const emp of employees.slice(0, 3)) {
    const exists = await prisma.hrTrainingIdp.findFirst({ where: { institutionId, employeeId: emp.id, academicYear } });
    if (!exists) {
      await prisma.hrTrainingIdp.create({
        data: {
          institutionId, employeeId: emp.id, academicYear,
          skillGaps: ['Digital Teaching', 'Assessment Techniques'],
          recommendedTraining: ['ERP Master Class', 'AI in Education'],
          mentorName: 'Senior Faculty', timeline: 'Q1-Q2 2025-26',
          completionPct: 40 + Math.random() * 40,
          nextReview: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        },
      });
    }
  }

  await prisma.hrTrainingExternal.create({
    data: {
      institutionId, vendorName: 'Indian Institute of Management', programType: 'CONFERENCE',
      employeeName: employees[0]?.fullName ?? 'Staff', employeeId: employees[0]?.id ?? '',
      expenseAmount: 25000, approvalStatus: 'APPROVED', status: 'COMPLETED', certificateUploaded: true,
    },
  });

  return getTrainingDashboard(institutionId, academicYear);
}
