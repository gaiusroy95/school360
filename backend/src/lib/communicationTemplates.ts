import { Prisma } from '@prisma/client';
import { prisma } from './prisma.js';

const ACADEMIC_YEARS = ['2023-24', '2024-25', '2025-26', '2026-27'];
const CHANNELS = ['SMS', 'EMAIL', 'WHATSAPP'] as const;
const CATEGORIES = ['TRANSACTIONAL', 'PROMOTIONAL'] as const;
const GATEWAY_STATUSES = ['DRAFT', 'PENDING', 'APPROVED', 'REJECTED'] as const;

const ADMIN_ROLES = new Set(['Super Admin', 'Principal', 'Management', 'Admin', 'Communication Manager']);
const STAFF_ROLES = new Set(['Teacher', 'Class Teacher', 'Staff', 'Marketing Team', 'Admission Team']);

type Channel = (typeof CHANNELS)[number];
type Category = (typeof CATEGORIES)[number];
type GatewayStatus = (typeof GATEWAY_STATUSES)[number];

export type TemplateVariableInput = {
  variableKey: string;
  variableLabel: string;
  placeholder?: string;
  sampleValue?: string;
  isLocked?: boolean;
  sortOrder?: number;
};

export type TemplatePayload = {
  templateCode?: string;
  templateName: string;
  channel: Channel;
  category?: Category;
  subject?: string;
  body: string;
  headerText?: string;
  footerText?: string;
  language?: string;
  dltEntityId?: string;
  dltHeaderId?: string;
  variables?: TemplateVariableInput[];
  academicYear?: string;
  createdBy?: string;
  userRole?: string;
};

function canManageTemplates(userRole: string) {
  return ADMIN_ROLES.has(userRole);
}

function formatDateTime(d: Date) {
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function normalizeVarKey(key: string) {
  const cleaned = key.replace(/[{}#]/g, '').trim();
  return cleaned || 'var1';
}

function toPlaceholder(key: string) {
  const k = normalizeVarKey(key);
  return `{#${k}#}`;
}

function extractVariablesFromBody(body: string, headerText = '', footerText = '') {
  const text = `${headerText} ${body} ${footerText}`;
  const matches = text.match(/\{#([a-zA-Z0-9_]+)#\}/g) ?? [];
  return [...new Set(matches)].map((m, i) => {
    const key = normalizeVarKey(m);
    return {
      variableKey: key,
      variableLabel: key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      placeholder: m,
      sampleValue: '',
      isLocked: true,
      sortOrder: i,
    };
  });
}

function gatewayProviderForChannel(channel: Channel) {
  if (channel === 'SMS') return 'DLT';
  if (channel === 'WHATSAPP') return 'META';
  return 'SENDGRID';
}

function requiresGatewayApproval(channel: Channel) {
  return channel === 'SMS' || channel === 'WHATSAPP';
}

async function logActivity(
  institutionId: string,
  action: string,
  details: string,
  snapshot: Record<string, unknown> = {},
  performedBy = 'Communication Manager',
) {
  await prisma.commActivityLog.create({
    data: { institutionId, action, details, filterSnapshot: snapshot as Prisma.InputJsonValue, performedBy },
  });
}

function mapTemplate(row: {
  id: string;
  templateCode: string;
  templateName: string;
  channel: string;
  category: string;
  subject: string;
  body: string;
  headerText: string;
  footerText: string;
  gatewayStatus: string;
  gatewayProvider: string;
  gatewayTemplateId: string;
  dltEntityId: string;
  dltHeaderId: string;
  language: string;
  rejectionReason: string;
  isActive: boolean;
  isLocked: boolean;
  createdBy: string;
  academicYear: string;
  submittedAt: Date | null;
  gatewayApprovedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  variables?: {
    id: string;
    variableKey: string;
    variableLabel: string;
    placeholder: string;
    sampleValue: string;
    isLocked: boolean;
    sortOrder: number;
  }[];
}) {
  return {
    id: row.id,
    code: row.templateCode,
    name: row.templateName,
    channel: row.channel,
    category: row.category,
    subject: row.subject,
    body: row.body,
    headerText: row.headerText,
    footerText: row.footerText,
    gatewayStatus: row.gatewayStatus,
    gatewayProvider: row.gatewayProvider,
    gatewayTemplateId: row.gatewayTemplateId,
    dltEntityId: row.dltEntityId,
    dltHeaderId: row.dltHeaderId,
    language: row.language,
    rejectionReason: row.rejectionReason,
    isActive: row.isActive,
    isLocked: row.isLocked,
    createdBy: row.createdBy,
    academicYear: row.academicYear,
    submittedAt: row.submittedAt?.toISOString() ?? null,
    gatewayApprovedAt: row.gatewayApprovedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    variables: (row.variables ?? []).map((v) => ({
      id: v.id,
      key: v.variableKey,
      label: v.variableLabel,
      placeholder: v.placeholder || toPlaceholder(v.variableKey),
      sampleValue: v.sampleValue,
      isLocked: v.isLocked,
      sortOrder: v.sortOrder,
    })),
  };
}

async function upsertVariables(
  institutionId: string,
  templateId: string,
  variables: TemplateVariableInput[],
  replace = true,
) {
  if (replace) {
    await prisma.commTemplateVariable.deleteMany({ where: { templateId } });
  }
  if (variables.length === 0) return;
  await prisma.commTemplateVariable.createMany({
    data: variables.map((v, i) => ({
      institutionId,
      templateId,
      variableKey: normalizeVarKey(v.variableKey),
      variableLabel: v.variableLabel,
      placeholder: v.placeholder || toPlaceholder(v.variableKey),
      sampleValue: v.sampleValue ?? '',
      isLocked: v.isLocked ?? true,
      sortOrder: v.sortOrder ?? i,
    })),
  });
}

export async function getMessageTemplatesManagement(
  institutionId: string,
  opts: { academicYear?: string; userRole?: string; channel?: string; status?: string; category?: string } = {},
) {
  const academicYear = opts.academicYear ?? '2025-26';
  const userRole = opts.userRole ?? 'Principal';
  const canManage = canManageTemplates(userRole);

  const where: Prisma.CommMessageTemplateWhereInput = {
    institutionId,
    academicYear,
    ...(opts.channel ? { channel: opts.channel } : {}),
    ...(opts.status ? { gatewayStatus: opts.status } : {}),
    ...(opts.category ? { category: opts.category } : {}),
    ...(!canManage ? { gatewayStatus: 'APPROVED', isActive: true } : {}),
  };

  const [templates, stats] = await Promise.all([
    prisma.commMessageTemplate.findMany({
      where,
      include: { variables: { orderBy: { sortOrder: 'asc' } } },
      orderBy: [{ gatewayStatus: 'asc' }, { templateName: 'asc' }],
    }),
    prisma.commMessageTemplate.groupBy({
      by: ['gatewayStatus'],
      where: { institutionId, academicYear },
      _count: { _all: true },
    }),
  ]);

  const statusCounts = Object.fromEntries(stats.map((s) => [s.gatewayStatus, s._count._all]));

  return {
    academicYear,
    academicYears: ACADEMIC_YEARS,
    userRole,
    permissions: {
      canCreate: canManage,
      canEdit: canManage,
      canDelete: canManage,
      canSubmitToGateway: canManage,
      canSyncGateway: canManage && userRole === 'Super Admin',
      canActivate: canManage,
      canViewOnly: STAFF_ROLES.has(userRole) && !canManage,
      enforceRigidTemplates: true,
    },
    channels: CHANNELS.map((c) => ({ code: c, label: c === 'EMAIL' ? 'Email' : c === 'WHATSAPP' ? 'WhatsApp' : 'SMS' })),
    categories: CATEGORIES.map((c) => ({ code: c, label: c.charAt(0) + c.slice(1).toLowerCase() })),
    gatewayStatuses: GATEWAY_STATUSES.map((s) => ({ code: s, label: s.charAt(0) + s.slice(1).toLowerCase() })),
    statusCounts: {
      draft: statusCounts.DRAFT ?? 0,
      pending: statusCounts.PENDING ?? 0,
      approved: statusCounts.APPROVED ?? 0,
      rejected: statusCounts.REJECTED ?? 0,
      active: templates.filter((t) => t.isActive).length,
    },
    templates: templates.map(mapTemplate),
    workflowSteps: [
      'Draft Template',
      'Define Variables {#var#}',
      'Submit to Gateway',
      'Gateway Approval',
      'Mark Active',
      'Available in Compose',
    ],
    complianceNotes: [
      'SMS templates must be DLT-registered before dispatch.',
      'WhatsApp Business API requires Meta-approved templates only.',
      'Promotional messages are scrubbed against DND registries.',
    ],
  };
}

export async function getMessageTemplateById(institutionId: string, templateId: string, userRole = 'Principal') {
  const canManage = canManageTemplates(userRole);
  const row = await prisma.commMessageTemplate.findFirst({
    where: {
      id: templateId,
      institutionId,
      ...(!canManage ? { gatewayStatus: 'APPROVED', isActive: true } : {}),
    },
    include: { variables: { orderBy: { sortOrder: 'asc' } } },
  });
  if (!row) throw new Error('Template not found.');
  return mapTemplate(row);
}

export async function createMessageTemplate(institutionId: string, payload: TemplatePayload) {
  const userRole = payload.userRole ?? 'Principal';
  if (!canManageTemplates(userRole)) throw new Error('Only Super Admin / Admin can create templates.');

  const academicYear = payload.academicYear ?? '2025-26';
  const code = payload.templateCode?.trim() || `TPL-${Date.now().toString(36).toUpperCase()}`;
  const variables = payload.variables?.length
    ? payload.variables
    : extractVariablesFromBody(payload.body, payload.headerText, payload.footerText);

  const autoApprove = !requiresGatewayApproval(payload.channel);
  const gatewayStatus: GatewayStatus = autoApprove ? 'APPROVED' : 'DRAFT';

  const row = await prisma.commMessageTemplate.create({
    data: {
      institutionId,
      templateCode: code,
      templateName: payload.templateName,
      channel: payload.channel,
      category: payload.category ?? 'TRANSACTIONAL',
      subject: payload.subject ?? '',
      body: payload.body,
      headerText: payload.headerText ?? '',
      footerText: payload.footerText ?? '',
      language: payload.language ?? 'en',
      dltEntityId: payload.dltEntityId ?? '',
      dltHeaderId: payload.dltHeaderId ?? '',
      gatewayStatus,
      gatewayProvider: gatewayProviderForChannel(payload.channel),
      isActive: autoApprove,
      isLocked: requiresGatewayApproval(payload.channel),
      createdBy: payload.createdBy ?? userRole,
      academicYear,
      mergeTags: variables.map((v) => toPlaceholder(v.variableKey)) as Prisma.InputJsonValue,
      ...(autoApprove ? { gatewayApprovedAt: new Date() } : {}),
    },
    include: { variables: true },
  });

  await upsertVariables(institutionId, row.id, variables);
  await logActivity(institutionId, 'TEMPLATE_CREATED', `${code} — ${payload.templateName}`, { templateId: row.id }, payload.createdBy ?? userRole);

  const full = await prisma.commMessageTemplate.findUnique({
    where: { id: row.id },
    include: { variables: { orderBy: { sortOrder: 'asc' } } },
  });

  return {
    message: `Template ${code} created.`,
    template: mapTemplate(full!),
    data: await getMessageTemplatesManagement(institutionId, { academicYear, userRole }),
  };
}

export async function updateMessageTemplate(institutionId: string, templateId: string, payload: TemplatePayload) {
  const userRole = payload.userRole ?? 'Principal';
  if (!canManageTemplates(userRole)) throw new Error('Only Super Admin / Admin can edit templates.');

  const existing = await prisma.commMessageTemplate.findFirst({ where: { id: templateId, institutionId } });
  if (!existing) throw new Error('Template not found.');
  if (existing.isLocked && existing.gatewayStatus === 'APPROVED') {
    throw new Error('Approved templates are locked. Create a new version instead.');
  }
  if (existing.gatewayStatus === 'PENDING') {
    throw new Error('Cannot edit while gateway approval is pending.');
  }

  const variables = payload.variables?.length
    ? payload.variables
    : extractVariablesFromBody(payload.body, payload.headerText, payload.footerText);

  await prisma.commMessageTemplate.update({
    where: { id: templateId },
    data: {
      templateName: payload.templateName,
      channel: payload.channel,
      category: payload.category ?? existing.category,
      subject: payload.subject ?? '',
      body: payload.body,
      headerText: payload.headerText ?? '',
      footerText: payload.footerText ?? '',
      language: payload.language ?? existing.language,
      dltEntityId: payload.dltEntityId ?? existing.dltEntityId,
      dltHeaderId: payload.dltHeaderId ?? existing.dltHeaderId,
      gatewayProvider: gatewayProviderForChannel(payload.channel),
      mergeTags: variables.map((v) => toPlaceholder(v.variableKey)) as Prisma.InputJsonValue,
      gatewayStatus: existing.gatewayStatus === 'REJECTED' ? 'DRAFT' : existing.gatewayStatus,
      rejectionReason: existing.gatewayStatus === 'REJECTED' ? '' : existing.rejectionReason,
    },
  });

  await upsertVariables(institutionId, templateId, variables);
  await logActivity(institutionId, 'TEMPLATE_UPDATED', existing.templateCode, { templateId }, payload.createdBy ?? userRole);

  return {
    message: `Template ${existing.templateCode} updated.`,
    data: await getMessageTemplatesManagement(institutionId, { academicYear: existing.academicYear, userRole }),
  };
}

export async function submitTemplateToGateway(
  institutionId: string,
  templateId: string,
  submittedBy: string,
  userRole = 'Super Admin',
) {
  if (!canManageTemplates(userRole)) throw new Error('Insufficient permissions.');

  const tpl = await prisma.commMessageTemplate.findFirst({
    where: { id: templateId, institutionId },
    include: { variables: true },
  });
  if (!tpl) throw new Error('Template not found.');
  if (!requiresGatewayApproval(tpl.channel as Channel)) {
    throw new Error('Email templates do not require gateway submission.');
  }
  if (tpl.gatewayStatus === 'PENDING') throw new Error('Already submitted and awaiting approval.');
  if (tpl.gatewayStatus === 'APPROVED' && tpl.isActive) throw new Error('Template already approved and active.');

  const gatewayTemplateId = `${tpl.gatewayProvider}-${tpl.templateCode}-${Date.now().toString(36)}`;

  await prisma.commMessageTemplate.update({
    where: { id: templateId },
    data: {
      gatewayStatus: 'PENDING',
      gatewayTemplateId,
      submittedAt: new Date(),
      isActive: false,
      isLocked: true,
    },
  });

  await logActivity(
    institutionId,
    'TEMPLATE_SUBMITTED_GATEWAY',
    `${tpl.templateCode} → ${tpl.gatewayProvider} (${gatewayTemplateId})`,
    { templateId, gatewayTemplateId },
    submittedBy,
  );

  return {
    message: `Template submitted to ${tpl.gatewayProvider}. Awaiting gateway approval.`,
    gatewayTemplateId,
    data: await getMessageTemplatesManagement(institutionId, { academicYear: tpl.academicYear, userRole }),
  };
}

export async function activateMessageTemplate(
  institutionId: string,
  templateId: string,
  activatedBy: string,
  userRole = 'Super Admin',
) {
  if (!canManageTemplates(userRole)) throw new Error('Insufficient permissions.');

  const tpl = await prisma.commMessageTemplate.findFirst({ where: { id: templateId, institutionId } });
  if (!tpl) throw new Error('Template not found.');
  if (tpl.gatewayStatus !== 'APPROVED') throw new Error('Only gateway-approved templates can be activated.');

  await prisma.commMessageTemplate.update({
    where: { id: templateId },
    data: { isActive: true, isLocked: true },
  });

  await logActivity(institutionId, 'TEMPLATE_ACTIVATED', tpl.templateCode, { templateId }, activatedBy);

  return {
    message: `Template ${tpl.templateName} is now active and available in Compose.`,
    data: await getMessageTemplatesManagement(institutionId, { academicYear: tpl.academicYear, userRole }),
  };
}

export async function deactivateMessageTemplate(
  institutionId: string,
  templateId: string,
  deactivatedBy: string,
  userRole = 'Super Admin',
) {
  if (!canManageTemplates(userRole)) throw new Error('Insufficient permissions.');

  const tpl = await prisma.commMessageTemplate.findFirst({ where: { id: templateId, institutionId } });
  if (!tpl) throw new Error('Template not found.');

  await prisma.commMessageTemplate.update({
    where: { id: templateId },
    data: { isActive: false },
  });

  await logActivity(institutionId, 'TEMPLATE_DEACTIVATED', tpl.templateCode, { templateId }, deactivatedBy);

  return {
    message: `Template ${tpl.templateName} deactivated.`,
    data: await getMessageTemplatesManagement(institutionId, { academicYear: tpl.academicYear, userRole }),
  };
}

export async function deleteMessageTemplate(
  institutionId: string,
  templateId: string,
  userRole = 'Super Admin',
) {
  if (!canManageTemplates(userRole)) throw new Error('Insufficient permissions.');

  const tpl = await prisma.commMessageTemplate.findFirst({ where: { id: templateId, institutionId } });
  if (!tpl) throw new Error('Template not found.');
  if (tpl.isActive) throw new Error('Deactivate template before deleting.');

  await prisma.commMessageTemplate.delete({ where: { id: templateId } });
  await logActivity(institutionId, 'TEMPLATE_DELETED', tpl.templateCode, { templateId }, userRole);

  return {
    message: `Template ${tpl.templateCode} deleted.`,
    data: await getMessageTemplatesManagement(institutionId, { academicYear: tpl.academicYear, userRole }),
  };
}

/** Simulates external gateway webhook (DLT / Meta) updating approval status */
export async function handleTemplateGatewayWebhook(
  institutionId: string,
  payload: {
    gatewayTemplateId: string;
    status: 'APPROVED' | 'REJECTED';
    rejectionReason?: string;
  },
) {
  const tpl = await prisma.commMessageTemplate.findFirst({
    where: { institutionId, gatewayTemplateId: payload.gatewayTemplateId },
  });
  if (!tpl) throw new Error('Template not found for gateway ID.');

  await prisma.commMessageTemplate.update({
    where: { id: tpl.id },
    data: {
      gatewayStatus: payload.status,
      rejectionReason: payload.status === 'REJECTED' ? (payload.rejectionReason ?? 'Rejected by gateway') : '',
      gatewayApprovedAt: payload.status === 'APPROVED' ? new Date() : null,
      isActive: false,
      isLocked: true,
    },
  });

  await logActivity(
    institutionId,
    'TEMPLATE_WEBHOOK',
    `${tpl.templateCode} — ${payload.status}`,
    payload,
    'Gateway Webhook',
  );

  return {
    message: `Webhook processed: ${tpl.templateCode} → ${payload.status}`,
    templateCode: tpl.templateCode,
    status: payload.status,
  };
}

/** Super Admin: poll/sync pending templates from gateway (simulated) */
export async function syncTemplatesWithGateway(institutionId: string, userRole = 'Super Admin') {
  if (userRole !== 'Super Admin' && !ADMIN_ROLES.has(userRole)) {
    throw new Error('Only Super Admin can sync with external gateways.');
  }

  const pending = await prisma.commMessageTemplate.findMany({
    where: { institutionId, gatewayStatus: 'PENDING' },
  });

  let approved = 0;
  let rejected = 0;

  for (const tpl of pending) {
    const ageMins = tpl.submittedAt ? (Date.now() - tpl.submittedAt.getTime()) / 60000 : 0;
    if (ageMins < 0.5) continue;

    const approvedByGateway = tpl.templateCode.length % 2 === 0 || tpl.channel === 'WHATSAPP';
    if (approvedByGateway) {
      await prisma.commMessageTemplate.update({
        where: { id: tpl.id },
        data: { gatewayStatus: 'APPROVED', gatewayApprovedAt: new Date(), isLocked: true },
      });
      approved++;
    } else {
      await prisma.commMessageTemplate.update({
        where: { id: tpl.id },
        data: {
          gatewayStatus: 'REJECTED',
          rejectionReason: 'DLT content policy violation — variable placement not permitted.',
        },
      });
      rejected++;
    }
  }

  await logActivity(institutionId, 'TEMPLATE_GATEWAY_SYNC', `Synced ${pending.length}: ${approved} approved, ${rejected} rejected`, { approved, rejected }, userRole);

  return {
    message: `Gateway sync complete — ${approved} approved, ${rejected} rejected.`,
    approved,
    rejected,
    data: await getMessageTemplatesManagement(institutionId, { userRole }),
  };
}

export async function seedMessageTemplates(institutionId: string) {
  const academicYear = '2025-26';

  const seeds = [
    {
      code: 'DLT_FEE_REMINDER',
      name: 'Fee Payment Reminder',
      channel: 'SMS' as Channel,
      category: 'TRANSACTIONAL' as Category,
      body: 'Dear Parent, fee of {#fee_amount#} for {#student_name#} (Class {#class_name#}) is due by {#due_date#}. - {#school_name#}',
      headerText: '',
      footerText: '- {#school_name#}',
      vars: [
        { variableKey: 'student_name', variableLabel: 'Student Name', sampleValue: 'Rahul Sharma' },
        { variableKey: 'class_name', variableLabel: 'Class', sampleValue: '10-A' },
        { variableKey: 'fee_amount', variableLabel: 'Fee Amount', sampleValue: '₹15,000' },
        { variableKey: 'due_date', variableLabel: 'Due Date', sampleValue: '30 Apr 2025' },
        { variableKey: 'school_name', variableLabel: 'School Name', sampleValue: 'Demo School' },
      ],
      status: 'APPROVED' as GatewayStatus,
      active: true,
    },
    {
      code: 'DLT_ATTENDANCE_ALERT',
      name: 'Attendance Absent Alert',
      channel: 'SMS' as Channel,
      category: 'TRANSACTIONAL' as Category,
      body: 'Dear Parent, {#student_name#} was marked absent on {#date#}. Contact class teacher for details.',
      vars: [
        { variableKey: 'student_name', variableLabel: 'Student Name', sampleValue: 'Priya Singh' },
        { variableKey: 'date', variableLabel: 'Date', sampleValue: '24 Jul 2025' },
      ],
      status: 'APPROVED' as GatewayStatus,
      active: true,
    },
    {
      code: 'WA_PTM_INVITE',
      name: 'PTM WhatsApp Invitation',
      channel: 'WHATSAPP' as Channel,
      category: 'TRANSACTIONAL' as Category,
      body: 'Dear {#parent_name#}, you are invited to PTM for {#student_name#} on {#ptm_date#} at {#school_name#}.',
      vars: [
        { variableKey: 'parent_name', variableLabel: 'Parent Name', sampleValue: 'Mr. Kumar' },
        { variableKey: 'student_name', variableLabel: 'Student Name', sampleValue: 'Aarav Kumar' },
        { variableKey: 'ptm_date', variableLabel: 'PTM Date', sampleValue: '28 Jul 2025' },
        { variableKey: 'school_name', variableLabel: 'School Name', sampleValue: 'Demo School' },
      ],
      status: 'APPROVED' as GatewayStatus,
      active: true,
    },
    {
      code: 'WA_SUMMER_CAMP',
      name: 'Summer Camp Promo',
      channel: 'WHATSAPP' as Channel,
      category: 'PROMOTIONAL' as Category,
      body: 'Register {#student_name#} for Summer Camp 2025! Limited seats. Reply YES to enroll.',
      vars: [{ variableKey: 'student_name', variableLabel: 'Student Name', sampleValue: 'Student' }],
      status: 'PENDING' as GatewayStatus,
      active: false,
    },
    {
      code: 'EMAIL_PTM',
      name: 'PTM Email Invitation',
      channel: 'EMAIL' as Channel,
      category: 'TRANSACTIONAL' as Category,
      subject: 'Parent-Teacher Meeting — {#class_name#}',
      body: 'Dear {#parent_name#},\n\nYou are invited to the PTM for {#student_name#} (Class {#class_name#}).\n\nRegards,\n{#school_name#}',
      vars: [
        { variableKey: 'parent_name', variableLabel: 'Parent Name', sampleValue: 'Parent' },
        { variableKey: 'student_name', variableLabel: 'Student Name', sampleValue: 'Student' },
        { variableKey: 'class_name', variableLabel: 'Class', sampleValue: '10-A' },
        { variableKey: 'school_name', variableLabel: 'School Name', sampleValue: 'Demo School' },
      ],
      status: 'APPROVED' as GatewayStatus,
      active: true,
    },
    {
      code: 'DLT_EXAM_SCHEDULE',
      name: 'Exam Schedule Alert',
      channel: 'SMS' as Channel,
      category: 'TRANSACTIONAL' as Category,
      body: '{#school_name#}: Exam schedule for {#student_name#} (Class {#class_name#}) published. Check portal.',
      vars: [
        { variableKey: 'school_name', variableLabel: 'School Name', sampleValue: 'Demo School' },
        { variableKey: 'student_name', variableLabel: 'Student Name', sampleValue: 'Student' },
        { variableKey: 'class_name', variableLabel: 'Class', sampleValue: '10' },
      ],
      status: 'REJECTED' as GatewayStatus,
      active: false,
      rejectionReason: 'Header not registered on DLT platform.',
    },
  ];

  for (const s of seeds) {
    const tpl = await prisma.commMessageTemplate.upsert({
      where: { institutionId_templateCode_academicYear: { institutionId, templateCode: s.code, academicYear } },
      create: {
        institutionId,
        templateCode: s.code,
        templateName: s.name,
        channel: s.channel,
        category: s.category,
        subject: 'subject' in s ? (s as { subject?: string }).subject ?? '' : '',
        body: s.body,
        footerText: 'footerText' in s ? (s as { footerText?: string }).footerText ?? '' : '',
        gatewayStatus: s.status,
        gatewayProvider: gatewayProviderForChannel(s.channel),
        gatewayTemplateId: s.status !== 'DRAFT' ? `${gatewayProviderForChannel(s.channel)}-${s.code}` : '',
        isActive: s.active,
        isLocked: s.status === 'APPROVED',
        createdBy: 'Super Admin',
        academicYear,
        dltEntityId: s.channel === 'SMS' ? 'DLT-ENT-360SCHOOL' : '',
        dltHeaderId: s.channel === 'SMS' ? 'DLT-HDR-FEE' : '',
        mergeTags: s.vars.map((v) => toPlaceholder(v.variableKey)) as Prisma.InputJsonValue,
        submittedAt: s.status === 'PENDING' ? new Date(Date.now() - 3600000) : null,
        gatewayApprovedAt: s.status === 'APPROVED' ? new Date() : null,
        rejectionReason: 'rejectionReason' in s ? (s as { rejectionReason?: string }).rejectionReason ?? '' : '',
      },
      update: {
        templateName: s.name,
        gatewayStatus: s.status,
        isActive: s.active,
        rejectionReason: 'rejectionReason' in s ? (s as { rejectionReason?: string }).rejectionReason ?? '' : '',
      },
    });

    await upsertVariables(institutionId, tpl.id, s.vars);
  }

  return getMessageTemplatesManagement(institutionId, { academicYear, userRole: 'Super Admin' });
}

export function previewTemplateBody(
  body: string,
  variables: { placeholder: string; sampleValue: string }[],
  headerText = '',
  footerText = '',
) {
  let out = [headerText, body, footerText].filter(Boolean).join('\n');
  for (const v of variables) {
    if (v.placeholder && v.sampleValue) {
      out = out.split(v.placeholder).join(v.sampleValue);
    }
  }
  return out;
}

export { toPlaceholder, extractVariablesFromBody, formatDateTime };
