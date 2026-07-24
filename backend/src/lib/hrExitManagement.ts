import { prisma } from './prisma.js';
import { seedHrAttendanceLeaveDemo } from './hrAttendanceLeave.js';

export const EXIT_WORKFLOW = [
  'Employee Initiates Resignation',
  'Resignation Submitted',
  'Reporting Manager Review',
  'Department Head Review',
  'HR Review',
  'Principal / Director Approval',
  'Notice Period Begins',
  'Handover Planning',
  'Knowledge Transfer',
  'Asset Recovery',
  'Leave & Attendance Verification',
  'Payroll & Full & Final Calculation',
  'Exit Interview',
  'Management Clearance',
  'Relieving & Experience Letter',
  'ERP Access Deactivation',
  'Employee Archive',
] as const;

export const MODULE_STRUCTURE = [
  'Resignation Dashboard',
  'Submit Resignation',
  'Resignation Approvals',
  'Notice Period Management',
  'Handover Management',
  'Knowledge Transfer',
  'Clearance Management',
  'Asset Recovery',
  'Payroll & Full & Final',
  'Leave Encashment',
  'Exit Interview',
  'Relieving Documents',
  'Experience Certificate',
  'Exit Analytics',
  'Alumni Records',
  'Settings',
];

export const APPROVAL_WORKFLOW = [
  'Employee',
  'Reporting Manager',
  'Department Head',
  'HR Manager',
  'Principal / Director',
  'Final Approval',
];

export const CLEARANCE_WORKFLOW = [
  'Reporting Manager',
  'IT',
  'Library',
  'Laboratory',
  'Transport',
  'Hostel',
  'Accounts',
  'Administration',
  'HR',
  'Principal',
];

export const RESIGNATION_TYPES = [
  'Voluntary', 'Retirement', 'Contract Completion', 'Personal',
  'Higher Education', 'Medical', 'Relocation', 'Other',
];

export const RETENTION_TYPES = [
  'Stay Interview', 'Counter Offer', 'Internal Transfer',
  'Promotion Opportunity', 'Flexible Work Arrangement',
];

export const ACADEMIC_HANDOVER = [
  'Subject Notes', 'Lesson Plans', 'Question Banks', 'Student Records',
  'Assessment Rubrics', 'Practical Files', 'Digital Content',
];

export const ADMIN_HANDOVER = [
  'Pending Files', 'Vendor Records', 'Financial Documents',
  'Inventory', 'Department Reports',
];

export const KT_TYPES = [
  'Training Sessions', 'SOP Handover', 'Recorded Videos',
  'Shared Documents', 'Password Transfer (Secure Vault)', 'Pending Activities',
];

export const ASSET_TYPES = [
  'Laptop', 'Desktop', 'Tablet', 'Mobile Device', 'ID Card', 'Smart Card',
  'Keys', 'Projector', 'Books', 'Library Material', 'Laboratory Equipment',
  'SIM Card', 'Uniform', 'Access Cards',
];

export const EXIT_DOCUMENTS = [
  'Resignation Acceptance Letter', 'Relieving Letter', 'Experience Certificate',
  'Service Certificate', 'No Due Certificate', 'F&F Statement', 'Gratuity Letter',
];

export const EXIT_INTERVIEW_QUESTIONS = [
  'Reason for leaving', 'Work Environment', 'Leadership Feedback',
  'Compensation Feedback', 'Career Growth', 'Training Effectiveness',
  'Infrastructure', 'Student Experience', 'Suggestions', 'Rehire Interest',
];

const WORKFLOW_KEYS = EXIT_WORKFLOW.map((s) =>
  s.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/_+$/, ''),
);

const APPROVAL_KEYS = [
  'REPORTING_MANAGER', 'DEPARTMENT_HEAD', 'HR_MANAGER', 'PRINCIPAL_DIRECTOR', 'FINAL_APPROVAL',
];

function parseJson<T>(raw: unknown, fallback: T): T {
  if (raw === null || raw === undefined) return fallback;
  return raw as T;
}

function formatDate(d: Date | null | undefined): string {
  if (!d) return '';
  return d.toISOString().slice(0, 10);
}

function daysBetween(from: Date, to: Date): number {
  return Math.ceil((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000));
}

async function ensureSettings(institutionId: string) {
  let row = await prisma.hrExitSettings.findUnique({ where: { institutionId } });
  if (!row) {
    row = await prisma.hrExitSettings.create({
      data: {
        institutionId,
        exitWorkflow: [...EXIT_WORKFLOW],
        moduleStructure: MODULE_STRUCTURE,
        approvalWorkflow: APPROVAL_WORKFLOW,
        clearanceWorkflow: CLEARANCE_WORKFLOW,
        resignationReasons: RESIGNATION_TYPES,
        roleMatrix: [
          { role: 'Employee', responsibilities: 'Submit resignation, complete tasks, download documents' },
          { role: 'Reporting Manager', responsibilities: 'Review, approve, assign handover, certify completion' },
          { role: 'Department Head', responsibilities: 'Department approval and workforce planning' },
          { role: 'HR Executive', responsibilities: 'Process resignation, coordinate exit activities' },
          { role: 'HR Manager', responsibilities: 'Final HR approval and compliance' },
          { role: 'Accounts', responsibilities: 'Full & Final settlement, recoveries, payments' },
          { role: 'IT Administrator', responsibilities: 'Access revocation, device recovery' },
          { role: 'Administration', responsibilities: 'Facility and asset clearance' },
          { role: 'Principal/Director', responsibilities: 'Final institutional approval' },
          { role: 'Super Admin', responsibilities: 'Configure workflows, policies, templates, notifications' },
        ],
        noticePeriodPolicies: [
          { designation: 'Teaching Staff', days: 30 },
          { designation: 'Administrative Staff', days: 30 },
          { designation: 'Senior Management', days: 90 },
        ],
        handoverTemplates: { academic: ACADEMIC_HANDOVER, administrative: ADMIN_HANDOVER },
        assetCategories: ASSET_TYPES,
        interviewTemplate: EXIT_INTERVIEW_QUESTIONS,
        documentTemplates: EXIT_DOCUMENTS,
        fnfRules: {
          leaveEncashment: true, gratuity: true, noticePayRecovery: true,
          assetDamageRecovery: true, loanRecovery: true,
        },
        notificationRules: {
          channels: ['ERP Notification', 'Mobile Push', 'Email', 'SMS'],
          events: [
            'Resignation submitted', 'Approval pending', 'Notice reminders',
            'Handover due', 'Clearance pending', 'F&F approved',
            'Documents generated', 'Exit completed',
          ],
        },
      },
    });
  }
  return row;
}

async function auditLog(
  institutionId: string, resignationId: string, action: string,
  performedBy = 'HR Executive', prev = '', curr = '',
) {
  await prisma.hrExitAuditLog.create({
    data: {
      institutionId, resignationId, action, performedBy,
      previousValue: prev, currentValue: curr, ipAddress: '10.0.0.1', device: 'Web',
    },
  });
}

async function nextCaseNumber(institutionId: string): Promise<string> {
  const count = await prisma.hrExitResignation.count({ where: { institutionId } });
  return `EXIT-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
}

async function initApprovalChain(institutionId: string, resignationId: string) {
  const roles = [
    { role: 'Reporting Manager', name: 'Mr. Rajesh Kumar' },
    { role: 'Department Head', name: 'Dr. Anita Verma' },
    { role: 'HR Manager', name: 'Ms. Priya Nair' },
    { role: 'Principal / Director', name: 'Dr. S.K. Mehta' },
    { role: 'Final Approval', name: 'Board Secretary' },
  ];
  for (const r of roles) {
    await prisma.hrExitApproval.create({
      data: { institutionId, resignationId, approverRole: r.role, approverName: r.name },
    });
  }
}

async function initClearances(institutionId: string, resignationId: string) {
  for (const dept of CLEARANCE_WORKFLOW) {
    await prisma.hrExitClearance.create({
      data: { institutionId, resignationId, department: dept },
    });
  }
}

async function initHandoverTasks(institutionId: string, resignationId: string, category: string) {
  const tasks = category === 'Teaching' ? ACADEMIC_HANDOVER : ADMIN_HANDOVER;
  const cat = category === 'Teaching' ? 'Academic Staff' : 'Administrative Staff';
  const dueDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  for (const task of tasks) {
    await prisma.hrExitHandover.create({
      data: {
        institutionId, resignationId, category: cat, taskType: task,
        description: `Complete handover of ${task}`, successor: 'TBD', dueDate,
      },
    });
  }
}

async function initKnowledgeTransfer(institutionId: string, resignationId: string) {
  const dueDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
  for (const type of KT_TYPES.slice(0, 4)) {
    await prisma.hrExitKnowledgeTransfer.create({
      data: {
        institutionId, resignationId, transferType: type,
        description: `${type} for successor`, dueDate,
      },
    });
  }
}

async function initAssetRecovery(institutionId: string, resignationId: string) {
  const defaults = ['Laptop', 'ID Card', 'Access Cards', 'Mobile Device'];
  for (const assetType of defaults) {
    await prisma.hrExitAssetRecovery.create({
      data: {
        institutionId, resignationId, assetType,
        assetId: `${assetType.slice(0, 3).toUpperCase()}-${Math.floor(Math.random() * 9000 + 1000)}`,
      },
    });
  }
}

function calcFnf(salary: number, leaveEncashment: number, recoveries: number) {
  const earnings = [
    { label: 'Salary up to Last Working Day', amount: salary },
    { label: 'Leave Encashment', amount: leaveEncashment },
    { label: 'Bonus (if eligible)', amount: Math.round(salary * 0.05) },
  ];
  const deductions = [
    { label: 'Notice Pay Recovery', amount: 0 },
    { label: 'Asset Damage', amount: recoveries },
    { label: 'Loans & Advances', amount: 0 },
  ];
  const totalEarnings = earnings.reduce((s, e) => s + e.amount, 0);
  const totalDeductions = deductions.reduce((s, d) => s + d.amount, 0);
  return { earnings, deductions, netAmount: totalEarnings - totalDeductions };
}

export async function getExitDashboard(institutionId: string) {
  await ensureSettings(institutionId);

  const [resignations, settings] = await Promise.all([
    prisma.hrExitResignation.findMany({
      where: { institutionId },
      include: {
        approvals: { orderBy: { createdAt: 'asc' } },
        retentions: true,
        handovers: true,
        knowledgeTransfers: true,
        clearances: true,
        assetRecoveries: true,
        fnfSettlement: true,
        leaveSettlement: true,
        exitInterview: true,
        documents: true,
        alumniRecord: true,
        employee: { select: { fullName: true, employeeCode: true, department: true } },
        auditLogs: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.hrExitSettings.findUnique({ where: { institutionId } }),
  ]);

  const pending = resignations.filter((r) => ['SUBMITTED', 'UNDER_REVIEW'].includes(r.status)).length;
  const approved = resignations.filter((r) => r.status === 'APPROVED').length;
  const inNotice = resignations.filter((r) => r.workflowStage === 'NOTICE_PERIOD_BEGINS').length;
  const completed = resignations.filter((r) => r.workflowStage === 'EMPLOYEE_ARCHIVE').length;
  const pendingClearance = resignations.reduce(
    (s, r) => s + r.clearances.filter((c) => c.status === 'PENDING').length, 0,
  );
  const pendingFnf = resignations.filter(
    (r) => r.fnfSettlement && r.fnfSettlement.settlementStatus === 'PENDING',
  ).length;

  return {
    workflow: EXIT_WORKFLOW.map((label, i) => ({ step: i + 1, label, key: WORKFLOW_KEYS[i] })),
    approvalWorkflow: APPROVAL_WORKFLOW.map((label, i) => ({ step: i + 1, label })),
    clearanceWorkflow: CLEARANCE_WORKFLOW.map((label, i) => ({ step: i + 1, label })),
    moduleStructure: MODULE_STRUCTURE,
    resignationTypes: RESIGNATION_TYPES,
    kpis: {
      totalCases: resignations.length,
      pendingApprovals: pending,
      approvedResignations: approved,
      inNoticePeriod: inNotice,
      completedExits: completed,
      pendingClearances: pendingClearance,
      pendingFnf,
      attritionRate: resignations.length > 0
        ? Math.round((completed / Math.max(resignations.length, 1)) * 100) : 0,
    },
    resignations: resignations.map((r) => ({
      id: r.id, caseNumber: r.caseNumber, employeeName: r.employeeName,
      employeeCode: r.employeeCode, department: r.department, designation: r.designation,
      branch: r.branch, reportingManager: r.reportingManager,
      dateOfResignation: formatDate(r.dateOfResignation),
      requestedLastWorkingDay: formatDate(r.requestedLastWorkingDay),
      noticePeriodDays: r.noticePeriodDays,
      noticeStartDate: formatDate(r.noticeStartDate),
      noticeEndDate: formatDate(r.noticeEndDate),
      noticeDaysRemaining: r.noticeEndDate
        ? Math.max(0, daysBetween(new Date(), r.noticeEndDate)) : null,
      resignationType: r.resignationType, detailedReason: r.detailedReason,
      status: r.status, workflowStage: r.workflowStage, approvalStage: r.approvalStage,
      erpDeactivated: r.erpDeactivated,
      handoverDone: r.handovers.filter((h) => h.status === 'COMPLETED').length,
      handoverTotal: r.handovers.length,
      clearanceDone: r.clearances.filter((c) => c.status === 'APPROVED').length,
      clearanceTotal: r.clearances.length,
      fnfStatus: r.fnfSettlement?.settlementStatus ?? 'N/A',
      netFnf: r.fnfSettlement?.netAmount ?? 0,
    })),
    approvals: resignations.flatMap((r) => r.approvals.map((a) => ({
      id: a.id, caseNumber: r.caseNumber, employeeName: r.employeeName,
      approverRole: a.approverRole, approverName: a.approverName,
      action: a.action, remarks: a.remarks, actionDate: formatDate(a.actionDate),
    }))),
    retentions: resignations.flatMap((r) => r.retentions.map((t) => ({
      id: t.id, caseNumber: r.caseNumber, employeeName: r.employeeName,
      retentionType: t.retentionType, status: t.status, notes: t.notes,
    }))),
    handovers: resignations.flatMap((r) => r.handovers.map((h) => ({
      id: h.id, caseNumber: r.caseNumber, employeeName: r.employeeName,
      category: h.category, taskType: h.taskType, description: h.description,
      successor: h.successor, dueDate: formatDate(h.dueDate), status: h.status,
    }))),
    knowledgeTransfers: resignations.flatMap((r) => r.knowledgeTransfers.map((k) => ({
      id: k.id, caseNumber: r.caseNumber, employeeName: r.employeeName,
      transferType: k.transferType, description: k.description,
      status: k.status, dueDate: formatDate(k.dueDate),
    }))),
    clearances: resignations.flatMap((r) => r.clearances.map((c) => ({
      id: c.id, caseNumber: r.caseNumber, employeeName: r.employeeName,
      department: c.department, status: c.status, recoveryAmount: c.recoveryAmount,
      pendingItems: c.pendingItems, remarks: c.remarks,
      clearedBy: c.clearedBy, clearedAt: formatDate(c.clearedAt),
    }))),
    assetRecoveries: resignations.flatMap((r) => r.assetRecoveries.map((a) => ({
      id: a.id, caseNumber: r.caseNumber, employeeName: r.employeeName,
      assetType: a.assetType, assetId: a.assetId, condition: a.condition,
      returnDate: formatDate(a.returnDate), damageCost: a.damageCost,
      recoveryAmount: a.recoveryAmount, status: a.status,
    }))),
    fnfSettlements: resignations.filter((r) => r.fnfSettlement).map((r) => ({
      id: r.fnfSettlement!.id, caseNumber: r.caseNumber, employeeName: r.employeeName,
      earnings: parseJson(r.fnfSettlement!.earnings, []),
      deductions: parseJson(r.fnfSettlement!.deductions, []),
      leaveEncashment: r.fnfSettlement!.leaveEncashment,
      netAmount: r.fnfSettlement!.netAmount,
      paymentDate: formatDate(r.fnfSettlement!.paymentDate),
      paymentMode: r.fnfSettlement!.paymentMode,
      settlementStatus: r.fnfSettlement!.settlementStatus,
    })),
    leaveSettlements: resignations.filter((r) => r.leaveSettlement).map((r) => ({
      id: r.leaveSettlement!.id, caseNumber: r.caseNumber, employeeName: r.employeeName,
      earnedLeave: r.leaveSettlement!.earnedLeave, casualLeave: r.leaveSettlement!.casualLeave,
      sickLeave: r.leaveSettlement!.sickLeave, compOff: r.leaveSettlement!.compOff,
      encashmentAmount: r.leaveSettlement!.encashmentAmount,
      negativeLeaveRecovery: r.leaveSettlement!.negativeLeaveRecovery,
    })),
    exitInterviews: resignations.filter((r) => r.exitInterview).map((r) => ({
      id: r.exitInterview!.id, caseNumber: r.caseNumber, employeeName: r.employeeName,
      scheduledDate: r.exitInterview!.scheduledDate?.toISOString() ?? '',
      status: r.exitInterview!.status, rehireInterest: r.exitInterview!.rehireInterest,
      responses: parseJson(r.exitInterview!.responses, []),
      hrNotes: r.exitInterview!.hrNotes,
    })),
    documents: resignations.flatMap((r) => r.documents.map((d) => ({
      id: d.id, caseNumber: r.caseNumber, employeeName: r.employeeName,
      documentType: d.documentType, fileName: d.fileName,
      qrVerified: d.qrVerified, digitalSigned: d.digitalSigned,
      sentAt: formatDate(d.sentAt), status: d.status,
    }))),
    alumniRecords: resignations.filter((r) => r.alumniRecord).map((r) => ({
      id: r.alumniRecord!.id, caseNumber: r.caseNumber, employeeName: r.employeeName,
      rehireEligibility: r.alumniRecord!.rehireEligibility, notes: r.alumniRecord!.notes,
    })),
    auditLogs: resignations.flatMap((r) => r.auditLogs.map((a) => ({
      id: a.id, caseNumber: r.caseNumber, action: a.action,
      performedBy: a.performedBy, createdAt: a.createdAt.toISOString(),
    }))).slice(0, 30),
    analytics: {
      departmentAttrition: Object.entries(
        resignations.reduce<Record<string, number>>((acc, r) => {
          acc[r.department] = (acc[r.department] ?? 0) + 1;
          return acc;
        }, {}),
      ).map(([department, count]) => ({ department, count })),
      resignationTypes: Object.entries(
        resignations.reduce<Record<string, number>>((acc, r) => {
          acc[r.resignationType] = (acc[r.resignationType] ?? 0) + 1;
          return acc;
        }, {}),
      ).map(([type, count]) => ({ type, count })),
      avgNoticePeriod: resignations.length > 0
        ? Math.round(resignations.reduce((s, r) => s + r.noticePeriodDays, 0) / resignations.length)
        : 30,
    },
    settings: {
      roleMatrix: parseJson(settings?.roleMatrix, []),
      resignationReasons: parseJson(settings?.resignationReasons, RESIGNATION_TYPES),
      noticePeriodPolicies: parseJson(settings?.noticePeriodPolicies, []),
      fnfRules: parseJson(settings?.fnfRules, {}),
      notificationRules: parseJson(settings?.notificationRules, {}),
    },
    automationRules: [
      'Notify reporting manager on resignation submission',
      'Escalate pending approvals after 48 hours',
      'Send notice period reminders at 30, 15, 7 days',
      'Trigger handover checklist on approval',
      'Auto-calculate F&F on clearance completion',
      'Generate relieving documents with digital signature',
      'Deactivate ERP access on last working day',
      'Archive employee record with audit trail',
      'Sync status to Staff Mobile App',
      'Trigger recruitment vacancy on exit completion',
    ],
  };
}

export async function createResignationCase(institutionId: string, body: Record<string, unknown>) {
  const caseNumber = await nextCaseNumber(institutionId);
  const noticeDays = Number(body.noticePeriodDays ?? 30);
  const lwd = body.requestedLastWorkingDay
    ? new Date(String(body.requestedLastWorkingDay)) : null;

  const row = await prisma.hrExitResignation.create({
    data: {
      institutionId,
      caseNumber,
      employeeId: body.employeeId ? String(body.employeeId) : null,
      employeeCode: String(body.employeeCode ?? ''),
      employeeName: String(body.employeeName),
      department: String(body.department ?? ''),
      designation: String(body.designation ?? ''),
      branch: String(body.branch ?? 'Main Campus'),
      reportingManager: String(body.reportingManager ?? ''),
      dateOfResignation: body.dateOfResignation ? new Date(String(body.dateOfResignation)) : new Date(),
      requestedLastWorkingDay: lwd,
      noticePeriodDays: noticeDays,
      resignationType: String(body.resignationType ?? 'Voluntary'),
      detailedReason: String(body.detailedReason ?? ''),
      preferredContactAfterExit: String(body.preferredContactAfterExit ?? ''),
      status: 'DRAFT',
      workflowStage: 'EMPLOYEE_INITIATES_RESIGNATION',
    },
  });

  await initApprovalChain(institutionId, row.id);
  await auditLog(institutionId, row.id, `Resignation case created: ${caseNumber}`);
  return row;
}

export async function submitResignation(institutionId: string, resignationId: string) {
  const row = await prisma.hrExitResignation.findFirst({ where: { id: resignationId, institutionId } });
  if (!row) throw new Error('Case not found');

  await prisma.hrExitResignation.update({
    where: { id: resignationId },
    data: {
      status: 'SUBMITTED',
      workflowStage: 'RESIGNATION_SUBMITTED',
      approvalStage: 'REPORTING_MANAGER',
    },
  });
  await auditLog(institutionId, resignationId, 'Resignation submitted');
}

export async function processApproval(
  institutionId: string, approvalId: string,
  action: 'approve' | 'reject' | 'clarify',
  remarks = '',
) {
  const approval = await prisma.hrExitApproval.findFirst({
    where: { id: approvalId, institutionId },
    include: { resignation: true },
  });
  if (!approval) throw new Error('Approval not found');

  const actionMap = { approve: 'APPROVED', reject: 'REJECTED', clarify: 'RETURNED' };
  await prisma.hrExitApproval.update({
    where: { id: approvalId },
    data: { action: actionMap[action], remarks, actionDate: new Date() },
  });

  const resignationId = approval.resignationId;
  if (action === 'reject') {
    await prisma.hrExitResignation.update({
      where: { id: resignationId },
      data: { status: 'REJECTED' },
    });
    await auditLog(institutionId, resignationId, `Rejected by ${approval.approverRole}`);
    return;
  }

  if (action === 'approve') {
    const idx = APPROVAL_KEYS.indexOf(approval.resignation.approvalStage);
    const nextKey = APPROVAL_KEYS[idx + 1];
    if (nextKey) {
      await prisma.hrExitResignation.update({
        where: { id: resignationId },
        data: { status: 'UNDER_REVIEW', approvalStage: nextKey },
      });
    } else {
      const noticeStart = new Date();
      const noticeEnd = approval.resignation.requestedLastWorkingDay
        ?? new Date(Date.now() + approval.resignation.noticePeriodDays * 24 * 60 * 60 * 1000);
      await prisma.hrExitResignation.update({
        where: { id: resignationId },
        data: {
          status: 'APPROVED',
          workflowStage: 'NOTICE_PERIOD_BEGINS',
          approvalStage: 'FINAL_APPROVAL',
          noticeStartDate: noticeStart,
          noticeEndDate: noticeEnd,
        },
      });
      await initClearances(institutionId, resignationId);
      await initHandoverTasks(institutionId, resignationId, approval.resignation.department);
      await initKnowledgeTransfer(institutionId, resignationId);
      await initAssetRecovery(institutionId, resignationId);
    }
    await auditLog(institutionId, resignationId, `Approved by ${approval.approverRole}`);
  }
}

export async function advanceExitWorkflow(institutionId: string, resignationId: string) {
  const row = await prisma.hrExitResignation.findFirst({ where: { id: resignationId, institutionId } });
  if (!row) throw new Error('Case not found');

  const idx = WORKFLOW_KEYS.indexOf(row.workflowStage);
  const nextKey = WORKFLOW_KEYS[Math.min(idx + 1, WORKFLOW_KEYS.length - 1)];

  const updates: Record<string, unknown> = { workflowStage: nextKey };

  if (nextKey === 'PAYROLL_FULL_FINAL_CALCULATION') {
    const salary = 45000;
    const leaveEnc = 12500;
    const recoveries = 2000;
    const fnf = calcFnf(salary, leaveEnc, recoveries);
    await prisma.hrExitFnfSettlement.upsert({
      where: { resignationId },
      create: {
        institutionId, resignationId,
        earnings: fnf.earnings, deductions: fnf.deductions,
        leaveEncashment: leaveEnc, netAmount: fnf.netAmount,
        settlementStatus: 'CALCULATED',
      },
      update: {
        earnings: fnf.earnings, deductions: fnf.deductions,
        netAmount: fnf.netAmount, settlementStatus: 'CALCULATED',
      },
    });
    await prisma.hrExitLeaveSettlement.upsert({
      where: { resignationId },
      create: {
        institutionId, resignationId,
        earnedLeave: 18, casualLeave: 5, sickLeave: 3, compOff: 2,
        encashmentAmount: leaveEnc,
      },
      update: { encashmentAmount: leaveEnc },
    });
  }

  if (nextKey === 'EXIT_INTERVIEW') {
    await prisma.hrExitInterview.upsert({
      where: { resignationId },
      create: {
        institutionId, resignationId,
        scheduledDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        responses: EXIT_INTERVIEW_QUESTIONS.map((q) => ({ question: q, rating: 0, comments: '' })),
        status: 'SCHEDULED',
      },
      update: {},
    });
  }

  if (nextKey === 'RELIEVING_EXPERIENCE_LETTER') {
    for (const docType of EXIT_DOCUMENTS.slice(0, 5)) {
      const exists = await prisma.hrExitDocument.findFirst({ where: { resignationId, documentType: docType } });
      if (!exists) {
        await prisma.hrExitDocument.create({
          data: {
            institutionId, resignationId, documentType: docType,
            fileName: `${docType.replace(/\s/g, '_')}_${row.caseNumber}.pdf`,
            digitalSigned: true, qrVerified: true, sentAt: new Date(), status: 'GENERATED',
          },
        });
      }
    }
  }

  if (nextKey === 'ERP_ACCESS_DEACTIVATION') {
    updates.erpDeactivated = true;
  }

  if (nextKey === 'EMPLOYEE_ARCHIVE') {
    updates.archivedAt = new Date();
    await prisma.hrExitAlumniRecord.upsert({
      where: { resignationId },
      create: {
        institutionId, resignationId, employeeId: row.employeeId,
        rehireEligibility: 'Eligible for Rehire',
        employmentHistory: [{ from: '2020-06-01', to: formatDate(row.requestedLastWorkingDay), role: row.designation }],
        exitDocuments: EXIT_DOCUMENTS,
      },
      update: {},
    });
    if (row.employeeId) {
      await prisma.payrollEmployee.update({
        where: { id: row.employeeId },
        data: { status: 'INACTIVE' },
      });
    }
  }

  await prisma.hrExitResignation.update({ where: { id: resignationId }, data: updates });
  await auditLog(institutionId, resignationId, `Workflow advanced to ${nextKey}`);
}

export async function approveClearance(institutionId: string, clearanceId: string, remarks = '') {
  const c = await prisma.hrExitClearance.findFirst({ where: { id: clearanceId, institutionId } });
  if (!c) throw new Error('Clearance not found');

  await prisma.hrExitClearance.update({
    where: { id: clearanceId },
    data: { status: 'APPROVED', remarks, clearedBy: 'Department Head', clearedAt: new Date() },
  });
  await auditLog(institutionId, c.resignationId, `Clearance approved: ${c.department}`);
}

export async function completeHandover(institutionId: string, handoverId: string) {
  const h = await prisma.hrExitHandover.findFirst({ where: { id: handoverId, institutionId } });
  if (!h) throw new Error('Handover not found');

  await prisma.hrExitHandover.update({
    where: { id: handoverId },
    data: { status: 'COMPLETED' },
  });
  await auditLog(institutionId, h.resignationId, `Handover completed: ${h.taskType}`);
}

export async function recoverAsset(institutionId: string, assetId: string) {
  const a = await prisma.hrExitAssetRecovery.findFirst({ where: { id: assetId, institutionId } });
  if (!a) throw new Error('Asset not found');

  await prisma.hrExitAssetRecovery.update({
    where: { id: assetId },
    data: { status: 'RECOVERED', returnDate: new Date() },
  });
  await auditLog(institutionId, a.resignationId, `Asset recovered: ${a.assetType}`);
}

export async function approveFnf(institutionId: string, resignationId: string) {
  await prisma.hrExitFnfSettlement.updateMany({
    where: { resignationId, institutionId },
    data: {
      settlementStatus: 'APPROVED',
      paymentDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      paymentMode: 'Bank Transfer',
    },
  });
  await auditLog(institutionId, resignationId, 'F&F settlement approved');
}

export async function initiateRetention(
  institutionId: string, resignationId: string, retentionType: string,
) {
  await prisma.hrExitRetention.create({
    data: { institutionId, resignationId, retentionType, status: 'OPEN' },
  });
  await prisma.hrExitResignation.update({
    where: { id: resignationId },
    data: { retentionStatus: retentionType },
  });
  await auditLog(institutionId, resignationId, `Retention initiated: ${retentionType}`);
}

export async function seedExitDemo(institutionId: string) {
  await seedHrAttendanceLeaveDemo(institutionId);
  await ensureSettings(institutionId);

  const existing = await prisma.hrExitResignation.count({ where: { institutionId } });
  if (existing > 0) return getExitDashboard(institutionId);

  const employee = await prisma.payrollEmployee.findFirst({
    where: { institutionId, status: 'ACTIVE' },
    orderBy: { createdAt: 'asc' },
  });

  const case1 = await createResignationCase(institutionId, {
    employeeId: employee?.id,
    employeeCode: employee?.employeeCode ?? 'EMP-001',
    employeeName: employee?.fullName ?? 'Amit Patel',
    department: employee?.department ?? 'Teaching',
    designation: 'PGT Physics',
    branch: 'Main Campus',
    reportingManager: 'Mr. Rajesh Kumar',
    dateOfResignation: new Date().toISOString().slice(0, 10),
    requestedLastWorkingDay: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    noticePeriodDays: 30,
    resignationType: 'Higher Education',
    detailedReason: 'Pursuing PhD in Physics from IIT Delhi',
    preferredContactAfterExit: 'amit.patel@email.com',
  });

  await submitResignation(institutionId, case1.id);

  const approvals = await prisma.hrExitApproval.findMany({
    where: { resignationId: case1.id },
    orderBy: { createdAt: 'asc' },
  });
  for (const a of approvals.slice(0, 3)) {
    await processApproval(institutionId, a.id, 'approve', 'Approved — proceed with exit process');
  }

  await advanceExitWorkflow(institutionId, case1.id);
  await advanceExitWorkflow(institutionId, case1.id);

  const case2 = await createResignationCase(institutionId, {
    employeeCode: 'EMP-042',
    employeeName: 'Sunita Reddy',
    department: 'Administration',
    designation: 'Office Assistant',
    reportingManager: 'Ms. Kavita Singh',
    resignationType: 'Voluntary',
    detailedReason: 'Relocating to another city',
    noticePeriodDays: 30,
  });
  await submitResignation(institutionId, case2.id);

  return getExitDashboard(institutionId);
}
