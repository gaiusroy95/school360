import { Prisma } from '@prisma/client';
import { prisma } from './prisma.js';
import { createEmployeeDirectoryEntry } from './employeeDirectory.js';
import { seedHrAttendanceLeaveDemo } from './hrAttendanceLeave.js';

export const ONBOARDING_WORKFLOW = [
  'Candidate Selected', 'Offer Accepted', 'Pre-Onboarding Portal Activated',
  'Candidate Uploads Documents', 'HR Document Verification', 'Background Verification',
  'Medical Fitness Verification (Optional)', 'Management Approval', 'Employee Code Generation',
  'Joining Day Checklist', 'Document Acknowledgements', 'Department & Reporting Mapping',
  'Payroll Setup', 'Attendance & Biometric Enrolment', 'Asset Allocation',
  'ERP & Email Account Creation', 'Orientation & Induction', 'Probation Start', 'Confirmation',
] as const;

export const VERIFICATION_WORKFLOW = [
  'Candidate Upload', 'HR Verification', 'Document Review',
  'Request Correction (if required)', 'Re-upload', 'Final Verification', 'Approved',
] as const;

export const MODULE_STRUCTURE = [
  'Candidate Documents', 'Offer Documents', 'Pre-Onboarding', 'Document Verification',
  'Joining Checklist', 'Employee Master Creation', 'Employment Documents', 'Statutory Documents',
  'Asset Allocation', 'System Access', 'Orientation Management', 'Induction Program',
  'Probation Tracking', 'Confirmation Workflow', 'Document Repository', 'Expiry Management',
  'Reports', 'Settings',
];

export const DOCUMENT_CATEGORIES = [
  'Personal', 'Educational', 'Employment', 'Tax', 'Payroll', 'Performance',
  'Training', 'Medical', 'Legal', 'Assets', 'Contracts', 'Letters', 'Certificates',
];

export const MANDATORY_DOCUMENTS = [
  { category: 'Identity', documentType: 'Aadhaar Card' },
  { category: 'Identity', documentType: 'PAN Card' },
  { category: 'Identity', documentType: 'Employee Photo' },
  { category: 'Banking', documentType: 'Cancelled Cheque' },
  { category: 'Banking', documentType: 'Bank Passbook' },
  { category: 'Statutory', documentType: 'UAN' },
  { category: 'Statutory', documentType: 'PF Number' },
];

export const BGV_CHECKS = [
  'Identity Verification', 'Education Verification', 'Employment Verification',
  'Address Verification', 'Criminal Record', 'Reference Verification',
];

export const JOINING_CHECKLIST = {
  HR: ['Employee ID Generated', 'Offer Accepted', 'Documents Verified', 'Payroll Created', 'Leave Policy Assigned'],
  IT: ['Email Created', 'ERP Login Created', 'Staff App Activated', 'Wi-Fi Access', 'Biometric Enrollment'],
  Administration: ['ID Card', 'Uniform', 'Locker', 'Parking', 'Desk Allocation'],
  Department: ['Reporting Manager Assigned', 'Timetable Assigned', 'Subject Allocation', 'Class Allocation', 'Mentor Assigned'],
};

export const INDUCTION_SESSIONS = [
  'Welcome Session', 'School Vision & Mission', 'HR Policies', 'ERP Training',
  'Child Safety', 'POSH', 'Fire Safety', 'Academic Policies', 'Assessment Methods',
  'Attendance Policy', 'Payroll Process',
];

export const EMPLOYMENT_LETTERS = [
  'Appointment Letter', 'Joining Letter', 'Employment Contract', 'Probation Letter',
  'NDA', 'Confidentiality Agreement', 'Code of Conduct Acceptance',
  'Child Protection Policy Acknowledgement', 'IT Usage Policy', 'POSH Declaration',
];

const WORKFLOW_KEYS = ONBOARDING_WORKFLOW.map((s) => s.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/_+$/, ''));

function parseJson<T>(raw: unknown, fallback: T): T {
  if (raw === null || raw === undefined) return fallback;
  return raw as T;
}

function formatDate(d: Date | null | undefined): string {
  if (!d) return '';
  return d.toISOString().slice(0, 10);
}

async function ensureSettings(institutionId: string) {
  let row = await prisma.hrEdomsSettings.findUnique({ where: { institutionId } });
  if (!row) {
    row = await prisma.hrEdomsSettings.create({
      data: {
        institutionId,
        onboardingWorkflow: [...ONBOARDING_WORKFLOW],
        verificationWorkflow: [...VERIFICATION_WORKFLOW],
        moduleStructure: MODULE_STRUCTURE,
        documentTypes: MANDATORY_DOCUMENTS,
        roleMatrix: [
          { role: 'Super Admin', responsibilities: 'Configure document types, workflows, retention, integrations' },
          { role: 'HR Executive', responsibilities: 'Verify documents, manage onboarding, create employee records' },
          { role: 'HR Manager', responsibilities: 'Approve onboarding, oversee compliance' },
          { role: 'Principal/Director', responsibilities: 'Final employment approval' },
          { role: 'Department Head', responsibilities: 'Assign reporting structure, classes, mentors' },
          { role: 'IT Administrator', responsibilities: 'ERP accounts, email, access permissions' },
          { role: 'Administration', responsibilities: 'ID cards, facilities, asset allocation' },
          { role: 'Finance', responsibilities: 'Payroll verification, bank details, statutory setup' },
          { role: 'Employee', responsibilities: 'Upload documents, acknowledge policies, download employment documents' },
        ],
        automationRules: {
          uploadLinkAfterOffer: true, notifyHrOnSubmit: true, requestCorrections: true,
          generateAppointmentLetter: true, createEmployeeOnJoining: true,
          triggerItChecklist: true, assignInduction: true, probationReminders: true, expiryAlerts: true,
        },
      },
    });
  }
  return row;
}

async function auditLog(institutionId: string, onboardingId: string, action: string, performedBy = 'HR Executive', prev = '', curr = '') {
  await prisma.hrEdomsAuditLog.create({
    data: { institutionId, onboardingId, action, performedBy, previousValue: prev, currentValue: curr, ipAddress: '10.0.0.1', device: 'Web' },
  });
}

async function nextCaseNumber(institutionId: string): Promise<string> {
  const count = await prisma.hrEdomsOnboarding.count({ where: { institutionId } });
  return `ONB-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
}

export async function getEdomsDashboard(institutionId: string) {
  await ensureSettings(institutionId);

  const [onboardings, settings, expiringDocs] = await Promise.all([
    prisma.hrEdomsOnboarding.findMany({
      where: { institutionId },
      include: {
        documents: true,
        qualifications: true,
        employmentHistory: true,
        verifications: true,
        checklists: true,
        assets: true,
        systemAccesses: true,
        inductions: true,
        probation: true,
        employmentLetters: true,
        employee: { select: { fullName: true, employeeCode: true } },
        auditLogs: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.hrEdomsSettings.findUnique({ where: { institutionId } }),
    prisma.hrEdomsDocument.findMany({
      where: {
        institutionId,
        expiryDate: { lte: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), gte: new Date() },
        status: 'VERIFIED',
      },
      include: { onboarding: { select: { candidateName: true, caseNumber: true } } },
      take: 20,
    }),
  ]);

  const active = onboardings.filter((o) => o.status === 'IN_PROGRESS').length;
  const confirmed = onboardings.filter((o) => o.status === 'CONFIRMED').length;
  const pendingVerification = onboardings.reduce((s, o) => s + o.documents.filter((d) => d.status === 'SUBMITTED' || d.status === 'UNDER_REVIEW').length, 0);
  const verifiedDocs = onboardings.reduce((s, o) => s + o.documents.filter((d) => d.status === 'VERIFIED').length, 0);
  const totalDocs = onboardings.reduce((s, o) => s + o.documents.length, 0);

  return {
    workflow: ONBOARDING_WORKFLOW.map((label, i) => ({ step: i + 1, label, key: WORKFLOW_KEYS[i] })),
    verificationWorkflow: VERIFICATION_WORKFLOW.map((label, i) => ({ step: i + 1, label })),
    moduleStructure: MODULE_STRUCTURE,
    documentCategories: DOCUMENT_CATEGORIES,
    kpis: {
      activeOnboarding: active,
      confirmedEmployees: confirmed,
      pendingVerification,
      verifiedDocuments: verifiedDocs,
      totalDocuments: totalDocs,
      expiringSoon: expiringDocs.length,
      checklistCompletion: onboardings.length > 0
        ? Math.round(onboardings.reduce((s, o) => {
          const total = o.checklists.length;
          const done = o.checklists.filter((c) => c.completed).length;
          return s + (total > 0 ? (done / total) * 100 : 0);
        }, 0) / onboardings.length)
        : 0,
    },
    onboardings: onboardings.map((o) => ({
      id: o.id, caseNumber: o.caseNumber, candidateName: o.candidateName,
      candidateEmail: o.candidateEmail, department: o.department, designation: o.designation,
      workflowStage: o.workflowStage, verificationStage: o.verificationStage,
      status: o.status, employeeCode: o.employeeCode || o.employee?.employeeCode || '',
      joiningDate: formatDate(o.joiningDate), preOnboardingActive: o.preOnboardingActive,
      documentsCount: o.documents.length,
      verifiedCount: o.documents.filter((d) => d.status === 'VERIFIED').length,
      checklistDone: o.checklists.filter((c) => c.completed).length,
      checklistTotal: o.checklists.length,
    })),
    documents: onboardings.flatMap((o) => o.documents.map((d) => ({
      id: d.id, onboardingId: o.id, caseNumber: o.caseNumber, candidateName: o.candidateName,
      category: d.category, documentType: d.documentType, documentNumber: d.documentNumber,
      fileName: d.fileName, status: d.status, verifiedBy: d.verifiedBy,
      expiryDate: formatDate(d.expiryDate), version: d.version,
    }))),
    qualifications: onboardings.flatMap((o) => o.qualifications.map((q) => ({
      id: q.id, candidateName: o.candidateName, qualification: q.qualification,
      boardUniversity: q.boardUniversity, yearOfPassing: q.yearOfPassing,
      percentage: q.percentage, verificationStatus: q.verificationStatus,
    }))),
    employmentHistory: onboardings.flatMap((o) => o.employmentHistory.map((e) => ({
      id: e.id, candidateName: o.candidateName, organization: e.organization,
      designation: e.designation, periodFrom: e.periodFrom, periodTo: e.periodTo,
    }))),
    verifications: onboardings.flatMap((o) => o.verifications.map((v) => ({
      id: v.id, candidateName: o.candidateName, checkType: v.checkType, status: v.status,
    }))),
    checklists: onboardings.flatMap((o) => o.checklists.map((c) => ({
      id: c.id, candidateName: o.candidateName, department: c.department,
      item: c.item, completed: c.completed, completedBy: c.completedBy,
    }))),
    assets: onboardings.flatMap((o) => o.assets.map((a) => ({
      id: a.id, candidateName: o.candidateName, assetType: a.assetType,
      assetId: a.assetId, serialNumber: a.serialNumber, status: a.status,
    }))),
    systemAccesses: onboardings.flatMap((o) => o.systemAccesses.map((s) => ({
      id: s.id, candidateName: o.candidateName, systemName: s.systemName,
      role: s.role, emailAddress: s.emailAddress, status: s.status,
    }))),
    inductions: onboardings.flatMap((o) => o.inductions.map((i) => ({
      id: i.id, candidateName: o.candidateName, sessionName: i.sessionName,
      attended: i.attended, sessionDate: formatDate(i.sessionDate),
    }))),
    probations: onboardings.filter((o) => o.probation).map((o) => ({
      id: o.probation!.id, candidateName: o.candidateName,
      startDate: formatDate(o.probation!.startDate), endDate: formatDate(o.probation!.endDate),
      mentorName: o.probation!.mentorName, status: o.probation!.status,
    })),
    employmentLetters: onboardings.flatMap((o) => o.employmentLetters.map((l) => ({
      id: l.id, candidateName: o.candidateName, letterType: l.letterType,
      acknowledged: l.acknowledged, qrVerified: l.qrVerified,
    }))),
    expiringDocuments: expiringDocs.map((d) => ({
      id: d.id, candidateName: d.onboarding.candidateName, caseNumber: d.onboarding.caseNumber,
      documentType: d.documentType, expiryDate: formatDate(d.expiryDate),
      daysRemaining: d.expiryDate ? Math.ceil((d.expiryDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000)) : 0,
    })),
    auditLogs: onboardings.flatMap((o) => o.auditLogs.map((a) => ({
      id: a.id, caseNumber: o.caseNumber, action: a.action, performedBy: a.performedBy,
      createdAt: a.createdAt.toISOString(),
    }))).slice(0, 30),
    settings: {
      documentTypes: parseJson(settings?.documentTypes, []),
      automationRules: parseJson(settings?.automationRules, {}),
      roleMatrix: parseJson(settings?.roleMatrix, []),
      expiryAlertDays: parseJson(settings?.expiryAlertDays, [90, 60, 30, 7, 0]),
      retentionPolicy: settings?.retentionPolicy ?? '7 years',
    },
    automationRules: [
      'Send secure document upload link after offer acceptance',
      'Notify HR when documents are submitted',
      'Request corrections for incomplete documents',
      'Generate appointment letters after approval',
      'Create employee master on joining date',
      'Trigger IT and Administration checklists',
      'Assign mandatory induction courses',
      'Send probation review reminders',
      'Notify about expiring documents',
      'Archive employee records on exit',
    ],
  };
}

export async function createOnboardingCase(institutionId: string, body: Record<string, unknown>) {
  const caseNumber = await nextCaseNumber(institutionId);
  const row = await prisma.hrEdomsOnboarding.create({
    data: {
      institutionId,
      caseNumber,
      candidateName: String(body.candidateName),
      candidateEmail: String(body.candidateEmail ?? ''),
      candidateMobile: String(body.candidateMobile ?? ''),
      department: String(body.department ?? 'Teaching'),
      designation: String(body.designation ?? 'Staff'),
      joiningDate: body.joiningDate ? new Date(String(body.joiningDate)) : null,
      workflowStage: 'OFFER_ACCEPTED',
      personalInfo: (body.personalInfo ?? {}) as Prisma.InputJsonValue,
    },
  });
  await auditLog(institutionId, row.id, 'Onboarding case created', 'HR Executive', '', caseNumber);
  return row;
}

export async function activatePreOnboardingPortal(institutionId: string, id: string) {
  const row = await prisma.hrEdomsOnboarding.update({
    where: { id },
    data: {
      preOnboardingActive: true,
      portalActivatedAt: new Date(),
      workflowStage: 'PRE_ONBOARDING_PORTAL_ACTIVATED',
    },
  });
  for (const doc of MANDATORY_DOCUMENTS) {
    await prisma.hrEdomsDocument.create({
      data: {
        institutionId, onboardingId: id,
        category: doc.category, documentType: doc.documentType,
        status: 'PENDING',
      },
    });
  }
  await auditLog(institutionId, id, 'Pre-onboarding portal activated');
  return row;
}

export async function submitDocument(institutionId: string, documentId: string, body: Record<string, unknown>) {
  const doc = await prisma.hrEdomsDocument.update({
    where: { id: documentId },
    data: {
      fileName: String(body.fileName ?? 'uploaded.pdf'),
      documentNumber: String(body.documentNumber ?? ''),
      status: 'SUBMITTED',
      issueDate: body.issueDate ? new Date(String(body.issueDate)) : undefined,
      expiryDate: body.expiryDate ? new Date(String(body.expiryDate)) : undefined,
    },
  });
  await prisma.hrEdomsOnboarding.update({
    where: { id: doc.onboardingId },
    data: { workflowStage: 'CANDIDATE_UPLOADS_DOCUMENTS', verificationStage: 'HR_VERIFICATION' },
  });
  await auditLog(institutionId, doc.onboardingId, `Document submitted: ${doc.documentType}`, 'Candidate');
  return doc;
}

export async function verifyDocument(institutionId: string, documentId: string, action: 'verify' | 'reject' | 'correction', verifiedBy = 'HR Executive') {
  const statusMap = { verify: 'VERIFIED', reject: 'REJECTED', correction: 'CORRECTION_REQUIRED' };
  const doc = await prisma.hrEdomsDocument.update({
    where: { id: documentId },
    data: {
      status: statusMap[action],
      verifiedBy: action === 'verify' ? verifiedBy : '',
      verifiedAt: action === 'verify' ? new Date() : null,
    },
  });
  await auditLog(institutionId, doc.onboardingId, `Document ${action}: ${doc.documentType}`, verifiedBy);
  return doc;
}

export async function advanceOnboardingWorkflow(institutionId: string, id: string) {
  const row = await prisma.hrEdomsOnboarding.findFirst({ where: { id, institutionId } });
  if (!row) throw new Error('Onboarding case not found');

  const idx = WORKFLOW_KEYS.indexOf(row.workflowStage as typeof WORKFLOW_KEYS[number]);
  const nextKey = idx < WORKFLOW_KEYS.length - 1 ? WORKFLOW_KEYS[idx + 1] : 'CONFIRMATION';

  const updated = await prisma.hrEdomsOnboarding.update({
    where: { id },
    data: {
      workflowStage: nextKey,
      verificationStage: nextKey.includes('VERIFICATION') ? 'FINAL_VERIFICATION' : row.verificationStage,
      status: nextKey === 'CONFIRMATION' ? 'CONFIRMED' : row.status,
      confirmedAt: nextKey === 'CONFIRMATION' ? new Date() : undefined,
    },
  });

  if (nextKey === 'BACKGROUND_VERIFICATION') {
    for (const checkType of BGV_CHECKS) {
      const exists = await prisma.hrEdomsVerification.findFirst({ where: { onboardingId: id, checkType } });
      if (!exists) {
        await prisma.hrEdomsVerification.create({ data: { institutionId, onboardingId: id, checkType, status: 'INITIATED' } });
      }
    }
  }

  if (nextKey === 'JOINING_DAY_CHECKLIST') {
    for (const [dept, items] of Object.entries(JOINING_CHECKLIST)) {
      for (const item of items) {
        const exists = await prisma.hrEdomsChecklist.findFirst({ where: { onboardingId: id, department: dept, item } });
        if (!exists) {
          await prisma.hrEdomsChecklist.create({ data: { institutionId, onboardingId: id, department: dept, item } });
        }
      }
    }
  }

  if (nextKey === 'ORIENTATION_INDUCTION') {
    for (const sessionName of INDUCTION_SESSIONS) {
      const exists = await prisma.hrEdomsInduction.findFirst({ where: { onboardingId: id, sessionName } });
      if (!exists) {
        await prisma.hrEdomsInduction.create({ data: { institutionId, onboardingId: id, sessionName } });
      }
    }
  }

  if (nextKey === 'PROBATION_START') {
    const exists = await prisma.hrEdomsProbation.findUnique({ where: { onboardingId: id } });
    if (!exists) {
      const start = row.joiningDate ?? new Date();
      const end = new Date(start);
      end.setMonth(end.getMonth() + 6);
      await prisma.hrEdomsProbation.create({
        data: {
          institutionId, onboardingId: id, startDate: start, endDate: end,
          mentorName: row.reportingManager || 'Assigned HOD',
          goals: [{ title: 'Complete probation objectives', target: '100%' }],
        },
      });
    }
  }

  await auditLog(institutionId, id, `Workflow advanced to ${nextKey}`);
  return updated;
}

export async function generateEmploymentLetters(institutionId: string, onboardingId: string) {
  const onboarding = await prisma.hrEdomsOnboarding.findFirst({ where: { id: onboardingId, institutionId } });
  if (!onboarding) throw new Error('Case not found');

  for (const letterType of EMPLOYMENT_LETTERS.slice(0, 5)) {
    const exists = await prisma.hrEdomsEmploymentLetter.findFirst({ where: { onboardingId, letterType } });
    if (!exists) {
      await prisma.hrEdomsEmploymentLetter.create({
        data: {
          institutionId, onboardingId,
          letterType,
          fileName: `${letterType.replace(/\s/g, '_')}_${onboarding.caseNumber}.pdf`,
          sentAt: new Date(),
        },
      });
    }
  }
  await auditLog(institutionId, onboardingId, 'Employment letters generated');
}

export async function createEmployeeFromOnboarding(institutionId: string, onboardingId: string) {
  const onboarding = await prisma.hrEdomsOnboarding.findFirst({
    where: { id: onboardingId, institutionId },
    include: { documents: true },
  });
  if (!onboarding) throw new Error('Case not found');
  if (onboarding.employeeId) return { employeeCode: onboarding.employeeCode, existing: true };

  const employee = await createEmployeeDirectoryEntry(institutionId, {
    fullName: onboarding.candidateName,
    department: onboarding.department,
    designation: onboarding.designation,
    mobile: onboarding.candidateMobile,
    email: onboarding.candidateEmail,
    joinDate: onboarding.joiningDate?.toISOString() ?? new Date().toISOString(),
    profile: parseJson(onboarding.personalInfo, {}),
  });

  await prisma.hrEdomsOnboarding.update({
    where: { id: onboardingId },
    data: { employeeId: employee.id, employeeCode: employee.employeeCode, workflowStage: 'EMPLOYEE_CODE_GENERATION' },
  });

  await prisma.hrEdomsSystemAccess.create({
    data: {
      institutionId, onboardingId,
      systemName: '360SchoolERP', role: onboarding.designation,
      emailAddress: onboarding.candidateEmail,
      erpLogin: employee.employeeCode,
      mobileAppAccess: true,
      status: 'PROVISIONED',
      provisionedAt: new Date(),
    },
  });

  await prisma.hrEdomsAsset.create({
    data: {
      institutionId, onboardingId,
      assetType: 'ID Card', assetId: `ID-${employee.employeeCode}`,
      issueDate: new Date(), agreementSigned: true,
    },
  });

  await generateEmploymentLetters(institutionId, onboardingId);
  await auditLog(institutionId, onboardingId, `Employee created: ${employee.employeeCode}`);
  return { employeeCode: employee.employeeCode, employeeId: employee.id };
}

export async function completeChecklistItem(institutionId: string, checklistId: string, completedBy: string) {
  return prisma.hrEdomsChecklist.update({
    where: { id: checklistId },
    data: { completed: true, completedBy, completedAt: new Date() },
  });
}

export async function confirmProbation(institutionId: string, onboardingId: string) {
  await prisma.hrEdomsProbation.updateMany({
    where: { onboardingId },
    data: { status: 'COMPLETED', action: 'CONFIRM' },
  });
  await prisma.hrEdomsOnboarding.update({
    where: { id: onboardingId },
    data: { workflowStage: 'CONFIRMATION', status: 'CONFIRMED', confirmedAt: new Date() },
  });
  await auditLog(institutionId, onboardingId, 'Probation confirmed — employee confirmed');
}

export async function seedEdomsDemo(institutionId: string) {
  await seedHrAttendanceLeaveDemo(institutionId);
  await ensureSettings(institutionId);

  const existing = await prisma.hrEdomsOnboarding.count({ where: { institutionId } });
  if (existing > 0) return getEdomsDashboard(institutionId);

  const case1 = await createOnboardingCase(institutionId, {
    candidateName: 'Priya Sharma',
    candidateEmail: 'priya.sharma@email.com',
    candidateMobile: '9876543210',
    department: 'Teaching',
    designation: 'PGT Mathematics',
    joiningDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    personalInfo: { fatherName: 'R.K. Sharma', dob: '1990-05-15', bloodGroup: 'B+', category: 'General' },
  });

  await activatePreOnboardingPortal(institutionId, case1.id);

  const docs = await prisma.hrEdomsDocument.findMany({ where: { onboardingId: case1.id } });
  for (let i = 0; i < Math.min(5, docs.length); i++) {
    await submitDocument(institutionId, docs[i].id, {
      fileName: `${docs[i].documentType.replace(/\s/g, '_')}.pdf`,
      documentNumber: `DOC${1000 + i}`,
    });
    if (i < 4) await verifyDocument(institutionId, docs[i].id, 'verify');
  }

  await prisma.hrEdomsQualification.create({
    data: {
      institutionId, onboardingId: case1.id,
      qualification: 'M.Sc Mathematics', boardUniversity: 'Delhi University',
      institutionName: 'DU', yearOfPassing: 2015, percentage: '78%', majorSubject: 'Mathematics',
      verificationStatus: 'VERIFIED',
    },
  });
  await prisma.hrEdomsQualification.create({
    data: {
      institutionId, onboardingId: case1.id,
      qualification: 'B.Ed', boardUniversity: 'IGNOU', yearOfPassing: 2016,
      percentage: '82%', verificationStatus: 'VERIFIED',
    },
  });

  await prisma.hrEdomsEmploymentHistory.create({
    data: {
      institutionId, onboardingId: case1.id,
      organization: 'Delhi Public School', designation: 'TGT Mathematics',
      periodFrom: '2018', periodTo: '2024', lastSalary: 45000,
    },
  });

  const stagesToAdvance = 12;
  for (let i = 0; i < stagesToAdvance; i++) {
    await advanceOnboardingWorkflow(institutionId, case1.id);
  }

  await createEmployeeFromOnboarding(institutionId, case1.id);

  const case2 = await createOnboardingCase(institutionId, {
    candidateName: 'Rahul Verma',
    candidateEmail: 'rahul.verma@email.com',
    candidateMobile: '9876543211',
    department: 'Administration',
    designation: 'Office Assistant',
    joiningDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  });
  await activatePreOnboardingPortal(institutionId, case2.id);
  for (let i = 0; i < 3; i++) await advanceOnboardingWorkflow(institutionId, case2.id);

  const expDoc = await prisma.hrEdomsDocument.findFirst({ where: { onboardingId: case1.id, documentType: 'PAN Card' } });
  if (expDoc) {
    await prisma.hrEdomsDocument.update({
      where: { id: expDoc.id },
      data: { expiryDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), status: 'VERIFIED', verifiedBy: 'HR Executive', verifiedAt: new Date() },
    });
  }

  return getEdomsDashboard(institutionId);
}
