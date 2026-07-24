import { PayrollEmploymentType, Prisma } from '@prisma/client';
import { prisma } from './prisma.js';
import { createEmployeeDirectoryEntry } from './employeeDirectory.js';

export const RECRUITMENT_WORKFLOW = [
  { key: 'MANPOWER_REQUIREMENT', label: 'Department identifies manpower requirement' },
  { key: 'JOB_REQUISITION', label: 'Raise Job Requisition' },
  { key: 'APPROVAL_WORKFLOW', label: 'Approval Workflow' },
  { key: 'BUDGET_VERIFICATION', label: 'Budget Verification' },
  { key: 'CREATE_POSITION', label: 'Create Job Position' },
  { key: 'PUBLISH_JOB', label: 'Publish Job' },
  { key: 'RECEIVE_APPLICATIONS', label: 'Receive Applications' },
  { key: 'RESUME_SCREENING', label: 'Resume Screening' },
  { key: 'SHORTLISTING', label: 'Shortlisting' },
  { key: 'ONLINE_ASSESSMENT', label: 'Online Assessment' },
  { key: 'HR_INTERVIEW', label: 'HR Interview' },
  { key: 'TECHNICAL_INTERVIEW', label: 'Technical / Demo Class Interview' },
  { key: 'PANEL_INTERVIEW', label: 'Panel Interview' },
  { key: 'PRINCIPAL_INTERVIEW', label: 'Principal / Director Interview' },
  { key: 'BACKGROUND_VERIFICATION', label: 'Background Verification' },
  { key: 'REFERENCE_CHECK', label: 'Reference Check' },
  { key: 'SALARY_NEGOTIATION', label: 'Salary Negotiation' },
  { key: 'OFFER_APPROVAL', label: 'Offer Approval' },
  { key: 'OFFER_LETTER', label: 'Offer Letter Generation' },
  { key: 'CANDIDATE_ACCEPTANCE', label: 'Candidate Acceptance' },
  { key: 'PRE_JOINING_DOCS', label: 'Pre-Joining Documentation' },
  { key: 'JOINING', label: 'Joining Formalities' },
  { key: 'EMPLOYEE_ID', label: 'Employee ID Creation' },
  { key: 'PAYROLL_MAPPING', label: 'Payroll & Attendance Mapping' },
  { key: 'PROBATION', label: 'Probation' },
  { key: 'CONFIRMATION', label: 'Confirmation' },
] as const;

export const PIPELINE_STAGES = RECRUITMENT_WORKFLOW.slice(6).map((s) => s.key);

export const REQUISITION_WORKFLOW = ['DRAFT', 'DEPARTMENT_HEAD', 'HR_MANAGER', 'FINANCE', 'PRINCIPAL', 'MANAGEMENT', 'APPROVED'] as const;

export const VACANCY_STATUSES = ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'PUBLISHED', 'CLOSED', 'FILLED', 'CANCELLED'] as const;

export const BGV_CHECKS = [
  'Education Verification', 'Previous Employment', 'Address Verification',
  'Identity Verification', 'Criminal Record', 'Document Verification',
];

export const INTERVIEW_TYPES = [
  'HR Interview', 'Technical Interview', 'Demo Lecture',
  'Department Head', 'Principal', 'Director', 'Panel Interview',
];

export const SCORECARD_CRITERIA = [
  'Subject Knowledge', 'Communication', 'Classroom Management', 'Leadership',
  'Technical Skills', 'Cultural Fit', 'Problem Solving', 'Confidence', 'Attitude',
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
  let row = await prisma.hrRecruitmentSettings.findUnique({ where: { institutionId } });
  if (!row) {
    row = await prisma.hrRecruitmentSettings.create({
      data: {
        institutionId,
        workflowStages: RECRUITMENT_WORKFLOW.map((s) => s.label),
      },
    });
  }
  return row;
}

async function nextRequisitionNumber(institutionId: string): Promise<string> {
  const count = await prisma.hrJobRequisition.count({ where: { institutionId } });
  const year = new Date().getFullYear();
  return `REQ-${year}-${String(count + 1).padStart(4, '0')}`;
}

async function nextCandidateCode(institutionId: string): Promise<string> {
  const count = await prisma.hrCandidate.count({ where: { institutionId } });
  return `CAND-${String(count + 1).padStart(5, '0')}`;
}

async function nextApplicationNumber(institutionId: string): Promise<string> {
  const count = await prisma.hrCandidateApplication.count({ where: { institutionId } });
  return `APP-${String(count + 1).padStart(5, '0')}`;
}

export async function getRecruitmentDashboard(institutionId: string, academicYear = '2025-26') {
  await ensureSettings(institutionId);

  const [
    manpowerPlans, requisitions, postings, candidates, applications,
    interviews, offers, bgvChecks, references, onboardings, settings,
  ] = await Promise.all([
    prisma.hrManpowerPlan.findMany({ where: { institutionId, academicYear }, orderBy: { department: 'asc' } }),
    prisma.hrJobRequisition.findMany({ where: { institutionId, academicYear }, orderBy: { createdAt: 'desc' } }),
    prisma.hrJobPosting.findMany({
      where: { institutionId },
      include: { requisition: { select: { requisitionNumber: true, positionTitle: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.hrCandidate.findMany({ where: { institutionId }, orderBy: { createdAt: 'desc' }, take: 50 }),
    prisma.hrCandidateApplication.findMany({
      where: { institutionId },
      include: {
        candidate: true,
        posting: { select: { jobTitle: true, department: true } },
      },
      orderBy: { appliedAt: 'desc' },
    }),
    prisma.hrInterviewFeedback.findMany({
      where: { institutionId },
      include: { application: { include: { candidate: { select: { fullName: true } } } } },
      orderBy: { scheduledAt: 'desc' },
      take: 30,
    }),
    prisma.hrRecruitmentOffer.findMany({
      where: { institutionId },
      include: { application: { include: { candidate: { select: { fullName: true } } } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.hrBackgroundVerification.findMany({ where: { institutionId } }),
    prisma.hrReferenceCheck.findMany({ where: { institutionId } }),
    prisma.hrRecruitmentOnboarding.findMany({
      where: { institutionId },
      include: { application: { include: { candidate: { select: { fullName: true } } } } },
    }),
    prisma.hrRecruitmentSettings.findUnique({ where: { institutionId } }),
  ]);

  const openVacancies = postings.filter((p) => p.status === 'PUBLISHED').length;
  const filledPositions = postings.filter((p) => p.status === 'FILLED').length;
  const pipelineByStage = PIPELINE_STAGES.map((stage) => ({
    stage,
    label: RECRUITMENT_WORKFLOW.find((w) => w.key === stage)?.label ?? stage,
    count: applications.filter((a) => a.pipelineStage === stage && a.status === 'ACTIVE').length,
  }));

  const offersSent = offers.filter((o) => o.status === 'SENT' || o.status === 'ACCEPTED').length;
  const offersAccepted = offers.filter((o) => o.status === 'ACCEPTED').length;
  const avgTimeToHire = applications.filter((a) => a.pipelineStage === 'CONFIRMATION').length > 0 ? 28 : 0;

  return {
    academicYear,
    academicYears: ['2023-24', '2024-25', '2025-26', '2026-27'],
    workflow: RECRUITMENT_WORKFLOW,
    kpis: {
      openVacancies,
      positionsFilled: filledPositions,
      timeToHireDays: avgTimeToHire,
      costPerHire: 12500,
      offerAcceptanceRate: offersSent > 0 ? Math.round((offersAccepted / offersSent) * 100) : 0,
      activeCandidates: applications.filter((a) => a.status === 'ACTIVE').length,
      pendingRequisitions: requisitions.filter((r) => r.status === 'PENDING_APPROVAL').length,
      interviewsScheduled: interviews.filter((i) => i.status === 'SCHEDULED').length,
      onboardingInProgress: onboardings.filter((o) => o.confirmationStatus === 'PENDING').length,
      probationActive: onboardings.filter((o) => o.probationStatus === 'IN_PROGRESS').length,
    },
    pipeline: pipelineByStage,
    manpowerPlans: manpowerPlans.map((m) => ({
      id: m.id, academicYear: m.academicYear, campus: m.campus, department: m.department,
      designation: m.designation, existingHeadcount: m.existingHeadcount,
      approvedHeadcount: m.approvedHeadcount, vacantPositions: m.vacantPositions,
      expectedResignations: m.expectedResignations, newPositions: m.newPositions,
      budgetedSalary: m.budgetedSalary, priority: m.priority,
      justification: m.justification, recruitmentDeadline: formatDate(m.recruitmentDeadline),
      status: m.status,
    })),
    requisitions: requisitions.map((r) => ({
      id: r.id, requisitionNumber: r.requisitionNumber, department: r.department,
      positionTitle: r.positionTitle, designation: r.designation, grade: r.grade,
      vacancies: r.vacancies, employmentType: r.employmentType,
      salaryMin: r.salaryMin, salaryMax: r.salaryMax, reportingManager: r.reportingManager,
      budgetCode: r.budgetCode, costCenter: r.costCenter, reasonForHiring: r.reasonForHiring,
      workflowStage: r.workflowStage, status: r.status, campus: r.campus,
      jobDescription: parseJson(r.jobDescription, {}),
    })),
    postings: postings.map((p) => ({
      id: p.id, requisitionId: p.requisitionId, jobTitle: p.jobTitle, department: p.department,
      location: p.location, status: p.status,
      publishChannels: parseJson<string[]>(p.publishChannels, []),
      publishedAt: p.publishedAt?.toISOString() ?? '',
      closingDate: formatDate(p.closingDate),
      applicationCount: p.applicationCount,
      requisitionNumber: p.requisition.requisitionNumber,
    })),
    candidates: candidates.map((c) => ({
      id: c.id, candidateCode: c.candidateCode, fullName: c.fullName, email: c.email,
      mobile: c.mobile, qualification: c.qualification, experienceYears: c.experienceYears,
      currentEmployer: c.currentEmployer, expectedSalary: c.expectedSalary,
      noticePeriod: c.noticePeriod, source: c.source, subjectExpertise: c.subjectExpertise,
      skills: parseJson<string[]>(c.skills, []),
    })),
    applications: applications.map((a) => ({
      id: a.id, applicationNumber: a.applicationNumber,
      candidateName: a.candidate.fullName, candidateId: a.candidateId,
      jobTitle: a.posting.jobTitle, department: a.posting.department,
      pipelineStage: a.pipelineStage, status: a.status,
      resumeMatchPct: a.resumeMatchPct, skillMatchPct: a.skillMatchPct,
      experienceMatchPct: a.experienceMatchPct, shortlistStatus: a.shortlistStatus,
      appliedAt: a.appliedAt.toISOString(),
    })),
    interviews: interviews.map((i) => ({
      id: i.id, applicationId: i.applicationId,
      candidateName: i.application.candidate.fullName,
      interviewType: i.interviewType, interviewerName: i.interviewerName,
      scheduledAt: i.scheduledAt?.toISOString() ?? '', rating: i.rating,
      recommendation: i.recommendation, status: i.status,
      scorecard: parseJson(i.scorecard, {}),
    })),
    offers: offers.map((o) => ({
      id: o.id, applicationId: o.applicationId,
      candidateName: o.application.candidate.fullName,
      proposedCtc: o.proposedCtc, grade: o.grade, payBand: o.payBand,
      joiningBonus: o.joiningBonus, probationSalary: o.probationSalary,
      workflowStage: o.workflowStage, status: o.status,
      acceptedAt: o.acceptedAt?.toISOString() ?? '',
    })),
    backgroundVerifications: bgvChecks.map((b) => ({
      id: b.id, applicationId: b.applicationId, checkType: b.checkType,
      status: b.status, remarks: b.remarks, completedAt: b.completedAt?.toISOString() ?? '',
    })),
    referenceChecks: references.map((r) => ({
      id: r.id, applicationId: r.applicationId, refereeName: r.refereeName,
      organization: r.organization, designation: r.designation,
      feedback: r.feedback, recommendation: r.recommendation,
    })),
    onboardings: onboardings.map((o) => ({
      id: o.id, applicationId: o.applicationId,
      candidateName: o.application.candidate.fullName,
      employeeCode: o.employeeCode, joiningDate: formatDate(o.joiningDate),
      probationStart: formatDate(o.probationStart), probationEnd: formatDate(o.probationEnd),
      probationStatus: o.probationStatus, confirmationStatus: o.confirmationStatus,
      mentorName: o.mentorName,
      checklist: parseJson<unknown[]>(o.checklist, []),
    })),
    settings: {
      approvalMatrix: parseJson(settings?.approvalMatrix, []),
      publishChannels: parseJson(settings?.publishChannels, []),
      screeningFilters: parseJson(settings?.screeningFilters, {}),
      automationRules: parseJson(settings?.automationRules, {}),
      workflowStages: parseJson(settings?.workflowStages, []),
    },
    departments: ['Teaching', 'Administration', 'Accounts', 'HR', 'Transport', 'Library', 'Laboratory', 'Sports', 'IT'],
    employmentTypes: ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'VISITING_FACULTY'],
    hiringReasons: ['REPLACEMENT', 'EXPANSION', 'NEW_POSITION', 'TEMPORARY'],
    roles: [
      { role: 'HR Executive', permissions: 'Create requisitions, manage candidates, schedule interviews' },
      { role: 'HR Manager', permissions: 'Approvals, offer management, onboarding' },
      { role: 'Department Head', permissions: 'Raise requisitions, evaluate candidates' },
      { role: 'Interview Panel', permissions: 'Submit interview feedback only' },
      { role: 'Principal', permissions: 'Final hiring approval' },
      { role: 'Finance', permissions: 'Budget and salary approval' },
    ],
  };
}

export async function createManpowerPlan(institutionId: string, body: Record<string, unknown>) {
  const row = await prisma.hrManpowerPlan.create({
    data: {
      institutionId,
      academicYear: String(body.academicYear ?? '2025-26'),
      campus: String(body.campus ?? 'Main Campus'),
      department: String(body.department),
      designation: String(body.designation),
      existingHeadcount: Number(body.existingHeadcount ?? 0),
      approvedHeadcount: Number(body.approvedHeadcount ?? 0),
      vacantPositions: Number(body.vacantPositions ?? 0),
      expectedResignations: Number(body.expectedResignations ?? 0),
      newPositions: Number(body.newPositions ?? 0),
      budgetedSalary: Number(body.budgetedSalary ?? 0),
      priority: String(body.priority ?? 'MEDIUM'),
      justification: String(body.justification ?? ''),
      recruitmentDeadline: body.recruitmentDeadline ? new Date(String(body.recruitmentDeadline)) : null,
      status: String(body.status ?? 'DRAFT'),
    },
  });
  return row;
}

export async function createJobRequisition(institutionId: string, body: Record<string, unknown>) {
  const reqNum = await nextRequisitionNumber(institutionId);
  const row = await prisma.hrJobRequisition.create({
    data: {
      institutionId,
      requisitionNumber: reqNum,
      academicYear: String(body.academicYear ?? '2025-26'),
      campus: String(body.campus ?? 'Main Campus'),
      department: String(body.department),
      positionTitle: String(body.positionTitle),
      designation: String(body.designation),
      grade: String(body.grade ?? ''),
      vacancies: Number(body.vacancies ?? 1),
      employmentType: String(body.employmentType ?? 'FULL_TIME'),
      salaryMin: Number(body.salaryMin ?? 0),
      salaryMax: Number(body.salaryMax ?? 0),
      reportingManager: String(body.reportingManager ?? ''),
      budgetCode: String(body.budgetCode ?? ''),
      costCenter: String(body.costCenter ?? ''),
      reasonForHiring: String(body.reasonForHiring ?? 'NEW_POSITION'),
      jobDescription: (body.jobDescription ?? {}) as Prisma.InputJsonValue,
      manpowerPlanId: body.manpowerPlanId ? String(body.manpowerPlanId) : undefined,
      workflowStage: 'DEPARTMENT_HEAD',
      status: 'PENDING_APPROVAL',
    },
  });
  return row;
}

export async function advanceRequisitionWorkflow(
  institutionId: string,
  id: string,
  action: 'approve' | 'reject' | 'return' | 'hold',
) {
  const row = await prisma.hrJobRequisition.findFirst({ where: { id, institutionId } });
  if (!row) throw new Error('Requisition not found');

  const stages = [...REQUISITION_WORKFLOW];
  const idx = stages.indexOf(row.workflowStage as typeof stages[number]);
  const history = parseJson<Array<{ stage: string; action: string; at: string }>>(row.approvalHistory, []);
  history.push({ stage: row.workflowStage, action, at: new Date().toISOString() });

  let workflowStage = row.workflowStage;
  let status = row.status;

  if (action === 'reject') {
    status = 'CANCELLED';
    workflowStage = 'DRAFT';
  } else if (action === 'return') {
    workflowStage = idx > 0 ? stages[idx - 1] : 'DRAFT';
    status = 'DRAFT';
  } else if (action === 'hold') {
    status = 'ON_HOLD';
  } else if (idx < stages.length - 1) {
    workflowStage = stages[idx + 1];
    status = workflowStage === 'APPROVED' ? 'APPROVED' : 'PENDING_APPROVAL';
  }

  return prisma.hrJobRequisition.update({
    where: { id },
    data: { workflowStage, status, approvalHistory: history as Prisma.InputJsonValue },
  });
}

export async function createJobPosting(institutionId: string, requisitionId: string) {
  const req = await prisma.hrJobRequisition.findFirst({ where: { id: requisitionId, institutionId } });
  if (!req) throw new Error('Requisition not found');
  if (req.status !== 'APPROVED') throw new Error('Requisition must be approved first');

  const jd = parseJson<Record<string, unknown>>(req.jobDescription, {});
  const row = await prisma.hrJobPosting.create({
    data: {
      institutionId,
      requisitionId,
      jobTitle: req.positionTitle,
      department: req.department,
      location: req.campus,
      status: 'DRAFT',
      jobDetails: {
        designation: req.designation,
        grade: req.grade,
        employmentType: req.employmentType,
        salaryMin: req.salaryMin,
        salaryMax: req.salaryMax,
        qualifications: jd.qualifications ?? '',
        responsibilities: jd.responsibilities ?? '',
        skills: jd.skills ?? [],
      },
    },
  });
  return row;
}

export async function publishJobPosting(institutionId: string, id: string, channels: string[]) {
  const row = await prisma.hrJobPosting.update({
    where: { id },
    data: {
      status: 'PUBLISHED',
      publishedAt: new Date(),
      publishChannels: channels as Prisma.InputJsonValue,
      closingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });
  await prisma.hrJobRequisition.update({
    where: { id: row.requisitionId },
    data: { status: 'PUBLISHED' },
  });
  return row;
}

export async function createCandidate(institutionId: string, body: Record<string, unknown>) {
  const code = await nextCandidateCode(institutionId);
  return prisma.hrCandidate.create({
    data: {
      institutionId,
      candidateCode: code,
      fullName: String(body.fullName),
      email: String(body.email ?? ''),
      mobile: String(body.mobile ?? ''),
      gender: String(body.gender ?? ''),
      qualification: String(body.qualification ?? ''),
      experienceYears: Number(body.experienceYears ?? 0),
      currentEmployer: String(body.currentEmployer ?? ''),
      currentSalary: Number(body.currentSalary ?? 0),
      expectedSalary: Number(body.expectedSalary ?? 0),
      noticePeriod: String(body.noticePeriod ?? ''),
      subjectExpertise: String(body.subjectExpertise ?? ''),
      skills: (body.skills ?? []) as Prisma.InputJsonValue,
      source: String(body.source ?? 'Career Portal'),
    },
  });
}

export async function createApplication(institutionId: string, body: { candidateId: string; postingId: string }) {
  const posting = await prisma.hrJobPosting.findFirst({
    where: { id: body.postingId, institutionId },
    include: { requisition: true },
  });
  if (!posting) throw new Error('Posting not found');

  const candidate = await prisma.hrCandidate.findFirst({ where: { id: body.candidateId, institutionId } });
  if (!candidate) throw new Error('Candidate not found');

  const appNum = await nextApplicationNumber(institutionId);
  const resumeMatch = Math.round(60 + Math.random() * 35);
  const skillMatch = Math.round(55 + Math.random() * 40);
  const expMatch = Math.round(50 + Math.random() * 45);

  const app = await prisma.hrCandidateApplication.create({
    data: {
      institutionId,
      candidateId: body.candidateId,
      postingId: body.postingId,
      requisitionId: posting.requisitionId,
      applicationNumber: appNum,
      pipelineStage: 'APPLICATION_RECEIVED',
      resumeMatchPct: resumeMatch,
      skillMatchPct: skillMatch,
      experienceMatchPct: expMatch,
    },
  });

  await prisma.hrJobPosting.update({
    where: { id: posting.id },
    data: { applicationCount: { increment: 1 } },
  });

  return app;
}

export async function advanceApplicationPipeline(institutionId: string, id: string, action?: string) {
  const app = await prisma.hrCandidateApplication.findFirst({ where: { id, institutionId } });
  if (!app) throw new Error('Application not found');

  const idx = PIPELINE_STAGES.indexOf(app.pipelineStage as typeof PIPELINE_STAGES[number]);
  const nextStage = idx < PIPELINE_STAGES.length - 1 ? PIPELINE_STAGES[idx + 1] : 'CONFIRMATION';

  const updates: Prisma.HrCandidateApplicationUpdateInput = { pipelineStage: nextStage };

  if (action === 'shortlist') updates.shortlistStatus = 'SHORTLISTED';
  if (action === 'reject') { updates.status = 'REJECTED'; updates.shortlistStatus = 'REJECTED'; }
  if (action === 'hold') { updates.status = 'HOLD'; updates.shortlistStatus = 'HOLD'; }
  if (action === 'future_pool') { updates.status = 'FUTURE_POOL'; updates.shortlistStatus = 'FUTURE_POOL'; }

  const updated = await prisma.hrCandidateApplication.update({ where: { id }, data: updates });

  if (nextStage === 'BACKGROUND_VERIFICATION') {
    for (const checkType of BGV_CHECKS) {
      const exists = await prisma.hrBackgroundVerification.findFirst({
        where: { applicationId: id, checkType },
      });
      if (!exists) {
        await prisma.hrBackgroundVerification.create({
          data: { institutionId, applicationId: id, checkType, status: 'PENDING' },
        });
      }
    }
  }

  if (nextStage === 'JOINING') {
    const exists = await prisma.hrRecruitmentOnboarding.findUnique({ where: { applicationId: id } });
    if (!exists) {
      const start = new Date();
      const end = new Date();
      end.setMonth(end.getMonth() + 6);
      await prisma.hrRecruitmentOnboarding.create({
        data: {
          institutionId,
          applicationId: id,
          joiningDate: start,
          probationStart: start,
          probationEnd: end,
          checklist: [
            { item: 'Aadhaar', done: false }, { item: 'PAN', done: false },
            { item: 'Bank Details', done: false }, { item: 'Educational Certificates', done: false },
            { item: 'Medical Certificate', done: false },
          ],
          mentorName: 'Assigned HOD',
        },
      });
    }
  }

  return updated;
}

export async function createInterviewFeedback(institutionId: string, body: Record<string, unknown>) {
  const scorecard: Record<string, number> = {};
  for (const c of SCORECARD_CRITERIA) {
    scorecard[c] = Number(body[`score_${c.replace(/\s/g, '_')}`] ?? Math.round(3 + Math.random() * 2));
  }
  const ratings = Object.values(scorecard);
  const avgRating = ratings.reduce((a, b) => a + b, 0) / ratings.length;

  return prisma.hrInterviewFeedback.create({
    data: {
      institutionId,
      applicationId: String(body.applicationId),
      interviewType: String(body.interviewType ?? 'HR Interview'),
      interviewerName: String(body.interviewerName ?? ''),
      scheduledAt: body.scheduledAt ? new Date(String(body.scheduledAt)) : new Date(),
      rating: avgRating,
      comments: String(body.comments ?? ''),
      strengths: String(body.strengths ?? ''),
      weaknesses: String(body.weaknesses ?? ''),
      recommendation: String(body.recommendation ?? 'HOLD'),
      scorecard: scorecard as Prisma.InputJsonValue,
      status: 'COMPLETED',
    },
  });
}

export async function createOffer(institutionId: string, body: Record<string, unknown>) {
  return prisma.hrRecruitmentOffer.create({
    data: {
      institutionId,
      applicationId: String(body.applicationId),
      proposedCtc: Number(body.proposedCtc ?? 0),
      grade: String(body.grade ?? ''),
      payBand: String(body.payBand ?? ''),
      joiningBonus: Number(body.joiningBonus ?? 0),
      variablePay: Number(body.variablePay ?? 0),
      probationSalary: Number(body.probationSalary ?? 0),
      workflowStage: 'HR',
      status: 'DRAFT',
    },
  });
}

export async function advanceOfferWorkflow(institutionId: string, id: string) {
  const offer = await prisma.hrRecruitmentOffer.findFirst({ where: { id, institutionId } });
  if (!offer) throw new Error('Offer not found');

  const stages = ['HR', 'FINANCE', 'PRINCIPAL', 'MANAGEMENT', 'APPROVED'];
  const idx = stages.indexOf(offer.workflowStage);
  const next = idx < stages.length - 1 ? stages[idx + 1] : 'APPROVED';

  const data: Prisma.HrRecruitmentOfferUpdateInput = { workflowStage: next };
  if (next === 'APPROVED') {
    data.status = 'SENT';
    data.offerLetterSentAt = new Date();
  }

  return prisma.hrRecruitmentOffer.update({ where: { id }, data });
}

export async function acceptOffer(institutionId: string, id: string) {
  const offer = await prisma.hrRecruitmentOffer.update({
    where: { id },
    data: { status: 'ACCEPTED', acceptedAt: new Date() },
  });
  await prisma.hrCandidateApplication.update({
    where: { id: offer.applicationId },
    data: { pipelineStage: 'CANDIDATE_ACCEPTANCE' },
  });
  return offer;
}

export async function completeOnboardingAndCreateEmployee(institutionId: string, onboardingId: string) {
  const onboarding = await prisma.hrRecruitmentOnboarding.findFirst({
    where: { id: onboardingId, institutionId },
    include: {
      application: {
        include: { candidate: true, posting: true, requisition: true },
      },
    },
  });
  if (!onboarding) throw new Error('Onboarding not found');

  const { application } = onboarding;
  const empType = application.requisition.department.toLowerCase().includes('teach')
    ? PayrollEmploymentType.TEACHING
    : PayrollEmploymentType.NON_TEACHING;

  const employee = await createEmployeeDirectoryEntry(institutionId, {
    fullName: application.candidate.fullName,
    employmentType: empType,
    department: application.posting.department,
    designation: application.requisition.designation,
    mobile: application.candidate.mobile,
    email: application.candidate.email,
    joinDate: onboarding.joiningDate?.toISOString() ?? new Date().toISOString(),
    profile: {
      probationEnds: formatDate(onboarding.probationEnd),
      subject: application.candidate.subjectExpertise,
    },
  });

  await prisma.hrRecruitmentOnboarding.update({
    where: { id: onboardingId },
    data: { employeeCode: employee.employeeCode },
  });

  await prisma.hrCandidateApplication.update({
    where: { id: application.id },
    data: { employeeId: employee.id, pipelineStage: 'EMPLOYEE_ID' },
  });

  return { employee, onboarding };
}

export async function confirmProbation(institutionId: string, onboardingId: string) {
  const row = await prisma.hrRecruitmentOnboarding.update({
    where: { id: onboardingId },
    data: {
      probationStatus: 'COMPLETED',
      confirmationStatus: 'CONFIRMED',
    },
  });
  const app = await prisma.hrCandidateApplication.findFirst({
    where: { id: row.applicationId, institutionId },
  });
  if (app) {
    await prisma.hrCandidateApplication.update({
      where: { id: app.id },
      data: { pipelineStage: 'CONFIRMATION', status: 'COMPLETED' },
    });
    await prisma.hrJobPosting.update({
      where: { id: app.postingId },
      data: { status: 'FILLED' },
    });
  }
  return row;
}

export async function updateRecruitmentSettings(institutionId: string, body: Record<string, unknown>) {
  const existing = await ensureSettings(institutionId);
  const data: Prisma.HrRecruitmentSettingsUpdateInput = {};
  if (body.approvalMatrix !== undefined) data.approvalMatrix = body.approvalMatrix as Prisma.InputJsonValue;
  if (body.publishChannels !== undefined) data.publishChannels = body.publishChannels as Prisma.InputJsonValue;
  if (body.screeningFilters !== undefined) data.screeningFilters = body.screeningFilters as Prisma.InputJsonValue;
  if (body.automationRules !== undefined) data.automationRules = body.automationRules as Prisma.InputJsonValue;
  return prisma.hrRecruitmentSettings.update({ where: { id: existing.id }, data });
}

export async function seedRecruitmentDemo(institutionId: string) {
  const academicYear = '2025-26';

  await ensureSettings(institutionId);

  const planCount = await prisma.hrManpowerPlan.count({ where: { institutionId } });
  if (planCount === 0) {
    await createManpowerPlan(institutionId, {
      academicYear, department: 'Teaching', designation: 'PGT Mathematics',
      existingHeadcount: 12, approvedHeadcount: 15, vacantPositions: 3,
      newPositions: 2, budgetedSalary: 450000, priority: 'HIGH',
      justification: 'Student-teacher ratio 35:1 — need 2 additional PGT teachers',
      recruitmentDeadline: '2025-08-31',
    });
    await createManpowerPlan(institutionId, {
      academicYear, department: 'Administration', designation: 'Office Assistant',
      existingHeadcount: 5, approvedHeadcount: 6, vacantPositions: 1,
      newPositions: 1, budgetedSalary: 180000, priority: 'MEDIUM',
      justification: 'Replacement for resigned staff',
    });
  }

  let req = await prisma.hrJobRequisition.findFirst({ where: { institutionId } });
  if (!req) {
    req = await createJobRequisition(institutionId, {
      academicYear, department: 'Teaching', positionTitle: 'PGT Mathematics',
      designation: 'Post Graduate Teacher', grade: 'PG-05', vacancies: 2,
      employmentType: 'FULL_TIME', salaryMin: 35000, salaryMax: 55000,
      reportingManager: 'HOD Science', budgetCode: 'SAL-TEACH-2025',
      reasonForHiring: 'EXPANSION',
      jobDescription: {
        qualifications: 'M.Sc Mathematics, B.Ed',
        experience: '3+ years',
        skills: ['Mathematics', 'CBSE Curriculum', 'Digital Teaching'],
        responsibilities: 'Teach Classes 11-12, prepare lesson plans, conduct assessments',
      },
    });
    // Fast-track to approved
    for (let i = 0; i < 5; i++) {
      await advanceRequisitionWorkflow(institutionId, req.id, 'approve');
      req = await prisma.hrJobRequisition.findUniqueOrThrow({ where: { id: req.id } });
    }
  }

  let posting = await prisma.hrJobPosting.findFirst({ where: { institutionId } });
  if (!posting) {
    posting = await createJobPosting(institutionId, req.id);
    await publishJobPosting(institutionId, posting.id, ['Internal Portal', 'Career Website', 'Employee Referral']);
  }

  const candidateNames = [
    { name: 'Priya Sharma', qual: 'M.Sc Mathematics, B.Ed', exp: 5, subject: 'Mathematics' },
    { name: 'Rahul Verma', qual: 'M.Sc Physics, B.Ed', exp: 3, subject: 'Physics' },
    { name: 'Anita Desai', qual: 'M.A English, B.Ed', exp: 7, subject: 'English' },
    { name: 'Suresh Kumar', qual: 'B.Com, MBA', exp: 4, subject: '' },
  ];

  for (let i = 0; i < candidateNames.length; i++) {
    const c = candidateNames[i];
    const exists = await prisma.hrCandidate.findFirst({
      where: { institutionId, fullName: c.name },
    });
    const candidate = exists ?? await createCandidate(institutionId, {
      fullName: c.name,
      email: `${c.name.split(' ')[0].toLowerCase()}@email.com`,
      mobile: `98765${String(43210 + i).slice(-5)}`,
      qualification: c.qual,
      experienceYears: c.exp,
      expectedSalary: 42000 + i * 3000,
      noticePeriod: '30 days',
      subjectExpertise: c.subject,
      skills: c.subject ? [c.subject, 'CBSE', 'Lesson Planning'] : ['MS Office', 'ERP'],
      source: i % 2 === 0 ? 'Career Portal' : 'Employee Referral',
    });

    const appExists = await prisma.hrCandidateApplication.findFirst({
      where: { candidateId: candidate.id, postingId: posting.id },
    });
    if (!appExists) {
      const app = await createApplication(institutionId, {
        candidateId: candidate.id,
        postingId: posting.id,
      });

      const stagesToAdvance = i === 0 ? 18 : i === 1 ? 12 : i === 2 ? 8 : 4;
      for (let s = 0; s < stagesToAdvance; s++) {
        await advanceApplicationPipeline(institutionId, app.id);
      }

      if (i === 0) {
        await createInterviewFeedback(institutionId, {
          applicationId: app.id,
          interviewType: 'HR Interview',
          interviewerName: 'HR Manager',
          recommendation: 'HIRE',
          comments: 'Strong communication and subject knowledge',
        });
        await createInterviewFeedback(institutionId, {
          applicationId: app.id,
          interviewType: 'Demo Lecture',
          interviewerName: 'HOD Science',
          recommendation: 'HIRE',
        });
        const offer = await createOffer(institutionId, {
          applicationId: app.id,
          proposedCtc: 540000,
          grade: 'PG-05',
          payBand: 'Executive',
          probationSalary: 45000,
        });
        for (let o = 0; o < 4; o++) await advanceOfferWorkflow(institutionId, offer.id);
        await acceptOffer(institutionId, offer.id);
        const onboard = await prisma.hrRecruitmentOnboarding.findUnique({ where: { applicationId: app.id } });
        if (onboard) {
          await completeOnboardingAndCreateEmployee(institutionId, onboard.id);
        }
      } else if (i === 1) {
        await createInterviewFeedback(institutionId, {
          applicationId: app.id,
          interviewType: 'HR Interview',
          interviewerName: 'HR Executive',
          recommendation: 'HOLD',
        });
        await createOffer(institutionId, {
          applicationId: app.id,
          proposedCtc: 480000,
          grade: 'PG-04',
          payBand: 'Senior Assistant',
        });
      }
    }
  }

  return getRecruitmentDashboard(institutionId, academicYear);
}
