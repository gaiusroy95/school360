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
      reportingManager: o.reportingManager,
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
      id: q.id, onboardingId: o.id, candidateName: o.candidateName, qualification: q.qualification,
      boardUniversity: q.boardUniversity, yearOfPassing: q.yearOfPassing,
      percentage: q.percentage, majorSubject: q.majorSubject, verificationStatus: q.verificationStatus,
    }))),
    employmentHistory: onboardings.flatMap((o) => o.employmentHistory.map((e) => ({
      id: e.id, onboardingId: o.id, candidateName: o.candidateName, organization: e.organization,
      designation: e.designation, department: e.department, periodFrom: e.periodFrom, periodTo: e.periodTo,
      lastSalary: e.lastSalary,
    }))),
    verifications: onboardings.flatMap((o) => o.verifications.map((v) => ({
      id: v.id, onboardingId: o.id, candidateName: o.candidateName, checkType: v.checkType,
      status: v.status, remarks: v.remarks,
    }))),
    checklists: onboardings.flatMap((o) => o.checklists.map((c) => ({
      id: c.id, candidateName: o.candidateName, department: c.department,
      item: c.item, completed: c.completed, completedBy: c.completedBy,
    }))),
    assets: onboardings.flatMap((o) => o.assets.map((a) => ({
      id: a.id, onboardingId: o.id, candidateName: o.candidateName, assetType: a.assetType,
      assetId: a.assetId, serialNumber: a.serialNumber, status: a.status, agreementSigned: a.agreementSigned,
    }))),
    systemAccesses: onboardings.flatMap((o) => o.systemAccesses.map((s) => ({
      id: s.id, onboardingId: o.id, candidateName: o.candidateName, systemName: s.systemName,
      role: s.role, emailAddress: s.emailAddress, erpLogin: s.erpLogin, status: s.status,
    }))),
    inductions: onboardings.flatMap((o) => o.inductions.map((i) => ({
      id: i.id, onboardingId: o.id, candidateName: o.candidateName, sessionName: i.sessionName,
      attended: i.attended, sessionDate: formatDate(i.sessionDate),
    }))),
    probations: onboardings.filter((o) => o.probation).map((o) => ({
      id: o.probation!.id, onboardingId: o.id, candidateName: o.candidateName,
      startDate: formatDate(o.probation!.startDate), endDate: formatDate(o.probation!.endDate),
      mentorName: o.probation!.mentorName, status: o.probation!.status, action: o.probation!.action,
    })),
    employmentLetters: onboardings.flatMap((o) => o.employmentLetters.map((l) => ({
      id: l.id, onboardingId: o.id, candidateName: o.candidateName, letterType: l.letterType,
      fileName: l.fileName, acknowledged: l.acknowledged, qrVerified: l.qrVerified,
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

export async function updateOnboardingCase(institutionId: string, id: string, body: Record<string, unknown>) {
  const row = await prisma.hrEdomsOnboarding.findFirst({ where: { id, institutionId } });
  if (!row) throw new Error('Onboarding case not found');
  const updated = await prisma.hrEdomsOnboarding.update({
    where: { id },
    data: {
      candidateName: body.candidateName !== undefined ? String(body.candidateName) : undefined,
      candidateEmail: body.candidateEmail !== undefined ? String(body.candidateEmail) : undefined,
      candidateMobile: body.candidateMobile !== undefined ? String(body.candidateMobile) : undefined,
      department: body.department !== undefined ? String(body.department) : undefined,
      designation: body.designation !== undefined ? String(body.designation) : undefined,
      reportingManager: body.reportingManager !== undefined ? String(body.reportingManager) : undefined,
      joiningDate: body.joiningDate !== undefined ? (body.joiningDate ? new Date(String(body.joiningDate)) : null) : undefined,
      personalInfo: body.personalInfo !== undefined ? (body.personalInfo as Prisma.InputJsonValue) : undefined,
    },
  });
  await auditLog(institutionId, id, 'Onboarding case updated', 'HR Executive');
  return updated;
}

export async function createEdomsDocument(institutionId: string, onboardingId: string, body: Record<string, unknown>) {
  const doc = await prisma.hrEdomsDocument.create({
    data: {
      institutionId, onboardingId,
      category: String(body.category ?? 'Personal'),
      documentType: String(body.documentType),
      documentNumber: String(body.documentNumber ?? ''),
      status: 'PENDING',
    },
  });
  await auditLog(institutionId, onboardingId, `Document requirement added: ${doc.documentType}`);
  return doc;
}

export async function updateVerification(institutionId: string, id: string, action: 'complete' | 'fail', remarks = '') {
  const status = action === 'complete' ? 'COMPLETED' : 'FAILED';
  const row = await prisma.hrEdomsVerification.update({
    where: { id },
    data: { status, remarks, completedAt: action === 'complete' ? new Date() : null },
  });
  await auditLog(institutionId, row.onboardingId, `BGV ${row.checkType}: ${status}`, 'HR Executive');
  return row;
}

export async function createQualification(institutionId: string, onboardingId: string, body: Record<string, unknown>) {
  const row = await prisma.hrEdomsQualification.create({
    data: {
      institutionId, onboardingId,
      qualification: String(body.qualification),
      boardUniversity: String(body.boardUniversity ?? ''),
      institutionName: String(body.institutionName ?? ''),
      yearOfPassing: Number(body.yearOfPassing ?? 0),
      percentage: String(body.percentage ?? ''),
      majorSubject: String(body.majorSubject ?? ''),
      verificationStatus: 'PENDING',
    },
  });
  await auditLog(institutionId, onboardingId, `Qualification added: ${row.qualification}`);
  return row;
}

export async function verifyQualification(institutionId: string, id: string, status: 'VERIFIED' | 'REJECTED') {
  const row = await prisma.hrEdomsQualification.update({
    where: { id },
    data: { verificationStatus: status },
  });
  await auditLog(institutionId, row.onboardingId, `Qualification ${status.toLowerCase()}: ${row.qualification}`, 'HR Executive');
  return row;
}

export async function createEmploymentHistoryRecord(institutionId: string, onboardingId: string, body: Record<string, unknown>) {
  const row = await prisma.hrEdomsEmploymentHistory.create({
    data: {
      institutionId, onboardingId,
      organization: String(body.organization),
      designation: String(body.designation ?? ''),
      department: String(body.department ?? ''),
      periodFrom: String(body.periodFrom ?? ''),
      periodTo: String(body.periodTo ?? ''),
      lastSalary: Number(body.lastSalary ?? 0),
      reportingManager: String(body.reportingManager ?? ''),
    },
  });
  await auditLog(institutionId, onboardingId, `Employment history added: ${row.organization}`);
  return row;
}

export async function addChecklistItem(institutionId: string, onboardingId: string, body: Record<string, unknown>) {
  const row = await prisma.hrEdomsChecklist.create({
    data: {
      institutionId, onboardingId,
      department: String(body.department ?? 'HR'),
      item: String(body.item),
    },
  });
  await auditLog(institutionId, onboardingId, `Checklist item added: ${row.item} (${row.department})`);
  return row;
}

export async function createAsset(institutionId: string, onboardingId: string, body: Record<string, unknown>) {
  const row = await prisma.hrEdomsAsset.create({
    data: {
      institutionId, onboardingId,
      assetType: String(body.assetType),
      assetId: String(body.assetId ?? ''),
      serialNumber: String(body.serialNumber ?? ''),
      issueDate: body.issueDate ? new Date(String(body.issueDate)) : new Date(),
      agreementSigned: Boolean(body.agreementSigned),
      status: 'ISSUED',
    },
  });
  await auditLog(institutionId, onboardingId, `Asset allocated: ${row.assetType} (${row.assetId})`);
  return row;
}

export async function updateAssetStatus(institutionId: string, id: string, status: 'ISSUED' | 'RETURNED' | 'LOST') {
  const row = await prisma.hrEdomsAsset.update({
    where: { id },
    data: {
      status,
      returnDate: status === 'RETURNED' ? new Date() : undefined,
    },
  });
  await auditLog(institutionId, row.onboardingId, `Asset ${row.assetType} marked ${status}`);
  return row;
}

export async function createSystemAccess(institutionId: string, onboardingId: string, body: Record<string, unknown>) {
  const row = await prisma.hrEdomsSystemAccess.create({
    data: {
      institutionId, onboardingId,
      systemName: String(body.systemName),
      role: String(body.role ?? ''),
      emailAddress: String(body.emailAddress ?? ''),
      erpLogin: String(body.erpLogin ?? ''),
      mobileAppAccess: Boolean(body.mobileAppAccess),
      status: 'PENDING',
    },
  });
  await auditLog(institutionId, onboardingId, `System access requested: ${row.systemName}`);
  return row;
}

export async function activateSystemAccess(institutionId: string, id: string) {
  const row = await prisma.hrEdomsSystemAccess.update({
    where: { id },
    data: { status: 'PROVISIONED', provisionedAt: new Date() },
  });
  await auditLog(institutionId, row.onboardingId, `System access provisioned: ${row.systemName}`, 'IT Administrator');
  return row;
}

export async function updateInduction(institutionId: string, id: string, body: Record<string, unknown>) {
  const row = await prisma.hrEdomsInduction.update({
    where: { id },
    data: {
      attended: body.attended !== undefined ? Boolean(body.attended) : undefined,
      sessionDate: body.sessionDate !== undefined ? (body.sessionDate ? new Date(String(body.sessionDate)) : null) : undefined,
      completedAt: body.attended ? new Date() : undefined,
    },
  });
  await auditLog(institutionId, row.onboardingId, `Induction ${row.sessionName}: ${row.attended ? 'attended' : 'scheduled'}`);
  return row;
}

export async function updateProbation(institutionId: string, onboardingId: string, body: Record<string, unknown>) {
  const probation = await prisma.hrEdomsProbation.findUnique({ where: { onboardingId } });
  if (!probation) throw new Error('Probation record not found');

  const action = String(body.action ?? 'review');
  const data: Prisma.HrEdomsProbationUpdateInput = {};

  if (body.mentorName !== undefined) data.mentorName = String(body.mentorName);
  if (body.endDate !== undefined) data.endDate = new Date(String(body.endDate));

  if (action === 'extend') {
    const months = Number(body.extendMonths ?? 3);
    const newEnd = new Date(probation.endDate);
    newEnd.setMonth(newEnd.getMonth() + months);
    data.endDate = newEnd;
    data.action = 'EXTENDED';
    data.status = 'IN_PROGRESS';
  } else if (action === 'complete') {
    data.status = 'COMPLETED';
    data.action = 'CONFIRM';
  } else if (body.feedback) {
    const reviews = parseJson<Array<Record<string, unknown>>>(probation.monthlyReviews, []);
    reviews.push({ date: new Date().toISOString().slice(0, 10), feedback: String(body.feedback), rating: Number(body.rating ?? 4) });
    data.monthlyReviews = reviews as Prisma.InputJsonValue;
  }

  const updated = await prisma.hrEdomsProbation.update({ where: { onboardingId }, data });
  await auditLog(institutionId, onboardingId, `Probation ${action}: ${updated.status}`);
  return updated;
}

export async function acknowledgeEmploymentLetter(institutionId: string, id: string) {
  const row = await prisma.hrEdomsEmploymentLetter.update({
    where: { id },
    data: { acknowledged: true, acknowledgedAt: new Date() },
  });
  await auditLog(institutionId, row.onboardingId, `Employment letter acknowledged: ${row.letterType}`, 'Employee');
  return row;
}

export async function renewDocumentExpiry(institutionId: string, id: string, body: Record<string, unknown>) {
  const existing = await prisma.hrEdomsDocument.findUnique({ where: { id } });
  if (!existing) throw new Error('Document not found');

  const doc = await prisma.hrEdomsDocument.create({
    data: {
      institutionId,
      onboardingId: existing.onboardingId,
      category: existing.category,
      documentType: existing.documentType,
      documentNumber: String(body.documentNumber ?? existing.documentNumber),
      fileName: String(body.fileName ?? `renewed_${existing.fileName || existing.documentType.replace(/\s/g, '_')}.pdf`),
      issueDate: body.issueDate ? new Date(String(body.issueDate)) : new Date(),
      expiryDate: body.expiryDate ? new Date(String(body.expiryDate)) : undefined,
      status: 'SUBMITTED',
      version: existing.version + 1,
      previousVersionId: existing.id,
    },
  });
  await auditLog(institutionId, existing.onboardingId, `Document renewed: ${doc.documentType} (v${doc.version})`);
  return doc;
}

export async function sendExpiryAlert(institutionId: string, documentId: string) {
  const doc = await prisma.hrEdomsDocument.findUnique({
    where: { id: documentId },
    include: { onboarding: { select: { candidateName: true, caseNumber: true } } },
  });
  if (!doc) throw new Error('Document not found');
  await auditLog(
    institutionId, doc.onboardingId,
    `Expiry alert sent: ${doc.documentType} for ${doc.onboarding.candidateName} (expires ${formatDate(doc.expiryDate)})`,
    'System',
  );
  return { sent: true, documentType: doc.documentType, candidateName: doc.onboarding.candidateName };
}

export async function updateEdomsSettings(institutionId: string, body: Record<string, unknown>) {
  await ensureSettings(institutionId);
  const data: Prisma.HrEdomsSettingsUpdateInput = {};
  if (body.retentionPolicy !== undefined) data.retentionPolicy = String(body.retentionPolicy);
  if (body.expiryAlertDays !== undefined) data.expiryAlertDays = body.expiryAlertDays as Prisma.InputJsonValue;
  if (body.automationRules !== undefined) data.automationRules = body.automationRules as Prisma.InputJsonValue;
  if (body.documentTypes !== undefined) data.documentTypes = body.documentTypes as Prisma.InputJsonValue;
  return prisma.hrEdomsSettings.update({ where: { institutionId }, data });
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
