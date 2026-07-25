import { MobileAppRole, Prisma } from '@prisma/client';
import { prisma } from './prisma.js';
import { deliverPushToTokens } from './pushDelivery.js';
import { sendPushCampaign, seedPushManagement } from './communicationPushManagement.js';

const ACADEMIC_YEARS = ['2023-24', '2024-25', '2025-26', '2026-27'];
const ADMIN_ROLES = new Set(['Super Admin', 'Principal', 'Management', 'Admin', 'Communication Manager']);

const AUDIENCE_LABELS: Record<string, string> = {
  ALL: 'All App Users',
  PARENT: 'All Parents',
  STUDENT: 'All Students',
  STAFF: 'Staff (Teachers & Admin)',
  CLASS: 'Class / Section',
};

export type CircularPayload = {
  title: string;
  body?: string;
  pdfUrl?: string;
  pdfFileName?: string;
  pdfSize?: number;
  requireAcknowledgment?: boolean;
  requireESignature?: boolean;
  audienceType?: 'ALL' | 'PARENT' | 'STUDENT' | 'STAFF' | 'CLASS';
  classFilter?: string;
  academicYear?: string;
  userRole?: string;
  publishedBy?: string;
};

function canManage(userRole: string) {
  return ADMIN_ROLES.has(userRole);
}

function ackRate(acknowledged: number, target: number) {
  return target > 0 ? Math.round((acknowledged / target) * 1000) / 10 : 0;
}

function audienceRoles(audienceType: string): MobileAppRole[] | null {
  switch (audienceType) {
    case 'PARENT': return ['PARENT'];
    case 'STUDENT': return ['STUDENT'];
    case 'STAFF': return ['TEACHER', 'PRINCIPAL', 'TRANSPORT'];
    default: return null;
  }
}

async function logActivity(
  institutionId: string,
  action: string,
  details: string,
  snapshot: Record<string, unknown> = {},
  performedBy = 'Circular Manager',
) {
  await prisma.commActivityLog.create({
    data: { institutionId, action, details, filterSnapshot: snapshot as Prisma.InputJsonValue, performedBy },
  });
}

export async function fetchAudienceAccounts(
  institutionId: string,
  audienceType: string,
  classFilter = '',
) {
  const roles = audienceRoles(audienceType);
  const accounts = await prisma.mobileAccount.findMany({
    where: {
      institutionId,
      isActive: true,
      ...(roles ? { role: { in: roles } } : {}),
    },
    include: { devices: true },
  });

  if (audienceType === 'CLASS' && classFilter.trim()) {
    const needle = classFilter.trim().toLowerCase();
    return accounts.filter((a) => {
      const studentIds = Array.isArray(a.studentIds) ? (a.studentIds as string[]) : [];
      return (
        a.admissionNumber.toLowerCase().includes(needle)
        || studentIds.some((id) => id.toLowerCase().includes(needle))
        || a.displayName.toLowerCase().includes(needle)
      );
    });
  }

  return accounts;
}

function serializeCircularListItem(c: {
  id: string;
  title: string;
  body: string;
  status: string;
  pdfUrl: string;
  pdfFileName: string;
  requireAcknowledgment: boolean;
  requireESignature: boolean;
  audienceType: string;
  audienceLabel: string;
  targetCount: number;
  viewedCount: number;
  acknowledgedCount: number;
  pushSent: boolean;
  publishedBy: string;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: c.id,
    title: c.title,
    bodyPreview: c.body.slice(0, 120),
    status: c.status,
    pdfUrl: c.pdfUrl,
    pdfFileName: c.pdfFileName,
    requireAcknowledgment: c.requireAcknowledgment,
    requireESignature: c.requireESignature,
    audienceType: c.audienceType,
    audienceLabel: c.audienceLabel,
    targetCount: c.targetCount,
    viewedCount: c.viewedCount,
    acknowledgedCount: c.acknowledgedCount,
    acknowledgmentRate: ackRate(c.acknowledgedCount, c.targetCount),
    pushSent: c.pushSent,
    publishedBy: c.publishedBy,
    publishedDate: c.publishedAt?.toISOString() ?? null,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

export async function getCircularsManagement(
  institutionId: string,
  opts: { academicYear?: string; userRole?: string } = {},
) {
  const academicYear = opts.academicYear ?? '2025-26';
  const userRole = opts.userRole ?? 'Principal';

  const circulars = await prisma.commCircular.findMany({
    where: { institutionId, academicYear },
    orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
  });

  const published = circulars.filter((c) => c.status === 'PUBLISHED');
  const totalAck = published.reduce((s, c) => s + c.acknowledgedCount, 0);
  const totalTarget = published.reduce((s, c) => s + c.targetCount, 0);

  return {
    academicYear,
    academicYears: ACADEMIC_YEARS,
    userRole,
    permissions: {
      canManage: canManage(userRole),
      canPublish: canManage(userRole),
    },
    kpis: {
      total: circulars.length,
      published: published.length,
      drafts: circulars.filter((c) => c.status === 'DRAFT').length,
      avgAckRate: ackRate(totalAck, totalTarget),
      pendingAckTotal: totalTarget - totalAck,
      requireAckCount: published.filter((c) => c.requireAcknowledgment).length,
    },
    circulars: circulars.map(serializeCircularListItem),
    audienceOptions: Object.entries(AUDIENCE_LABELS).map(([value, label]) => ({ value, label })),
    workflowSteps: [
      'Draft Circular',
      'Attach PDF',
      'Require Acknowledgment (Toggle)',
      'Publish to Portals & Apps',
      'Send Push Notification',
      'Stakeholder Opens App',
      'Clicks "I Acknowledge"',
      'ERP Logs Timestamp and IP',
    ],
    complianceNotes: [
      'Critical compliance notices should enable "Require Acknowledgment" to force read receipt.',
      'E-signature captures the typed name of the stakeholder at acknowledgment time.',
      'Published circulars sync to the Noticeboard section of Student/Parent/Staff mobile apps.',
      'When acknowledgment is required, the mobile app blocks other features until acknowledged.',
    ],
  };
}

export async function getCircularDetail(institutionId: string, circularId: string) {
  const circular = await prisma.commCircular.findFirst({
    where: { id: circularId, institutionId },
    include: {
      acknowledgments: { orderBy: [{ status: 'asc' }, { accountName: 'asc' }] },
    },
  });
  if (!circular) throw new Error('Circular not found.');

  const acknowledged = circular.acknowledgments.filter((a) => a.status === 'ACKNOWLEDGED');
  const pending = circular.acknowledgments.filter((a) => a.status !== 'ACKNOWLEDGED');
  const viewed = circular.acknowledgments.filter((a) => a.status === 'VIEWED' || a.status === 'ACKNOWLEDGED');

  return {
    circular: serializeCircularListItem(circular),
    detail: {
      body: circular.body,
      pdfSize: circular.pdfSize,
      classFilter: circular.classFilter,
      pushCampaignId: circular.pushCampaignId,
    },
    summary: {
      targetCount: circular.targetCount,
      viewedCount: viewed.length,
      acknowledgedCount: acknowledged.length,
      pendingCount: pending.length,
      acknowledgmentRate: ackRate(acknowledged.length, circular.targetCount),
    },
    acknowledged: acknowledged.map((a) => ({
      id: a.id,
      accountId: a.accountId,
      accountName: a.accountName,
      accountRole: a.accountRole,
      status: a.status,
      viewedAt: a.viewedAt?.toISOString() ?? null,
      acknowledgedAt: a.acknowledgedAt?.toISOString() ?? null,
      ipAddress: a.ipAddress,
      eSignature: a.eSignature,
      reminderCount: a.reminderCount,
    })),
    pending: pending.map((a) => ({
      id: a.id,
      accountId: a.accountId,
      accountName: a.accountName,
      accountRole: a.accountRole,
      status: a.status,
      viewedAt: a.viewedAt?.toISOString() ?? null,
      reminderCount: a.reminderCount,
      lastReminderAt: a.lastReminderAt?.toISOString() ?? null,
    })),
  };
}

export async function createCircularDraft(institutionId: string, payload: CircularPayload) {
  if (!canManage(payload.userRole ?? '')) throw new Error('Permission denied.');
  if (!payload.title?.trim()) throw new Error('Notice title is required.');

  const audienceType = payload.audienceType ?? 'ALL';
  const circular = await prisma.commCircular.create({
    data: {
      institutionId,
      title: payload.title.trim(),
      body: payload.body?.trim() ?? '',
      pdfUrl: payload.pdfUrl ?? '',
      pdfFileName: payload.pdfFileName ?? '',
      pdfSize: payload.pdfSize ?? 0,
      requireAcknowledgment: payload.requireAcknowledgment ?? false,
      requireESignature: payload.requireESignature ?? false,
      audienceType,
      audienceLabel: AUDIENCE_LABELS[audienceType] ?? audienceType,
      classFilter: payload.classFilter ?? '',
      status: 'DRAFT',
      academicYear: payload.academicYear ?? '2025-26',
    },
  });

  await logActivity(institutionId, 'CIRCULAR_DRAFT', `Draft created: ${circular.title}`, { circularId: circular.id });
  return { message: 'Circular draft saved.', circularId: circular.id };
}

export async function updateCircularDraft(
  institutionId: string,
  circularId: string,
  payload: CircularPayload,
) {
  if (!canManage(payload.userRole ?? '')) throw new Error('Permission denied.');

  const existing = await prisma.commCircular.findFirst({
    where: { id: circularId, institutionId },
  });
  if (!existing) throw new Error('Circular not found.');
  if (existing.status !== 'DRAFT') throw new Error('Only draft circulars can be edited.');

  const audienceType = payload.audienceType ?? existing.audienceType;
  await prisma.commCircular.update({
    where: { id: circularId },
    data: {
      title: payload.title?.trim() ?? existing.title,
      body: payload.body ?? existing.body,
      pdfUrl: payload.pdfUrl ?? existing.pdfUrl,
      pdfFileName: payload.pdfFileName ?? existing.pdfFileName,
      pdfSize: payload.pdfSize ?? existing.pdfSize,
      requireAcknowledgment: payload.requireAcknowledgment ?? existing.requireAcknowledgment,
      requireESignature: payload.requireESignature ?? existing.requireESignature,
      audienceType,
      audienceLabel: AUDIENCE_LABELS[audienceType] ?? audienceType,
      classFilter: payload.classFilter ?? existing.classFilter,
    },
  });

  return { message: 'Draft updated.' };
}

export async function publishCircular(
  institutionId: string,
  circularId: string,
  opts: { userRole?: string; publishedBy?: string; sendPush?: boolean } = {},
) {
  if (!canManage(opts.userRole ?? '')) throw new Error('Permission denied.');

  const circular = await prisma.commCircular.findFirst({
    where: { id: circularId, institutionId },
  });
  if (!circular) throw new Error('Circular not found.');
  if (circular.status === 'PUBLISHED') throw new Error('Circular is already published.');
  if (!circular.title.trim()) throw new Error('Title is required before publishing.');
  if (!circular.pdfUrl.trim()) throw new Error('PDF attachment is required before publishing.');

  const accounts = await fetchAudienceAccounts(institutionId, circular.audienceType, circular.classFilter);
  if (accounts.length === 0) {
    throw new Error('No target accounts found for the selected audience.');
  }

  const now = new Date();
  await prisma.commCircular.update({
    where: { id: circularId },
    data: {
      status: 'PUBLISHED',
      publishedAt: now,
      publishedBy: opts.publishedBy ?? opts.userRole ?? 'Super Admin',
      targetCount: accounts.length,
    },
  });

  for (const account of accounts) {
    await prisma.commCircularAcknowledgment.upsert({
      where: { circularId_accountId: { circularId, accountId: account.id } },
      create: {
        institutionId,
        circularId,
        accountId: account.id,
        accountName: account.displayName,
        accountRole: account.role,
        status: 'PENDING',
      },
      update: {
        accountName: account.displayName,
        accountRole: account.role,
      },
    });
  }

  let pushCampaignId = '';
  if (opts.sendPush !== false) {
    try {
      const pushResult = await sendPushCampaign(institutionId, {
        title: `New Notice: ${circular.title}`,
        body: circular.requireAcknowledgment
          ? `${circular.body.slice(0, 100) || circular.title} — Acknowledgment required.`
          : (circular.body.slice(0, 140) || circular.title),
        audienceType: circular.audienceType as 'ALL' | 'PARENT' | 'STUDENT' | 'STAFF' | 'CLASS',
        classFilter: circular.classFilter,
        deepLink: `/noticeboard/${circularId}`,
        category: 'circular',
        payload: { circularId, requireAck: String(circular.requireAcknowledgment) },
        sentBy: opts.publishedBy ?? opts.userRole ?? 'Circular Manager',
        userRole: opts.userRole ?? 'Super Admin',
        academicYear: circular.academicYear,
      });
      pushCampaignId = pushResult.campaignId;
    } catch {
      // Push is best-effort; circular still publishes
    }
  }

  await prisma.commCircular.update({
    where: { id: circularId },
    data: { pushSent: Boolean(pushCampaignId), pushCampaignId },
  });

  await prisma.commDeliveryLog.create({
    data: {
      institutionId,
      channel: 'CIRCULAR',
      campaignTitle: circular.title,
      messagePreview: circular.body.slice(0, 120),
      recipientCount: accounts.length,
      maskedRecipient: circular.audienceLabel,
      audienceScope: circular.audienceType,
      classScope: circular.classFilter,
      status: 'DELIVERED',
      cost: 0,
      sourceModule: 'Circulars / Notices',
      academicYear: circular.academicYear,
    },
  });

  await logActivity(
    institutionId,
    'CIRCULAR_PUBLISH',
    `Published: ${circular.title} to ${accounts.length} accounts`,
    { circularId, targetCount: accounts.length, requireAck: circular.requireAcknowledgment },
    opts.publishedBy ?? opts.userRole ?? 'Super Admin',
  );

  return {
    message: `Circular published to ${accounts.length} stakeholder(s).${pushCampaignId ? ' Push notification sent.' : ''}`,
    circularId,
    targetCount: accounts.length,
    pushSent: Boolean(pushCampaignId),
  };
}

export async function resendCircularReminders(
  institutionId: string,
  circularId: string,
  opts: { userRole?: string } = {},
) {
  if (!canManage(opts.userRole ?? '')) throw new Error('Permission denied.');

  const circular = await prisma.commCircular.findFirst({
    where: { id: circularId, institutionId, status: 'PUBLISHED' },
  });
  if (!circular) throw new Error('Published circular not found.');

  const pending = await prisma.commCircularAcknowledgment.findMany({
    where: { circularId, status: { not: 'ACKNOWLEDGED' } },
  });
  if (pending.length === 0) {
    return { message: 'All stakeholders have already acknowledged.', reminded: 0 };
  }

  let reminded = 0;
  for (const ack of pending) {
    const account = await prisma.mobileAccount.findFirst({
      where: { id: ack.accountId, institutionId, isActive: true },
      include: { devices: true },
    });
    if (!account || account.devices.length === 0) continue;

    const tokens = account.devices.map((d) => d.fcmToken);
    await deliverPushToTokens(tokens, {
      title: `Reminder: ${circular.title}`,
      body: circular.requireAcknowledgment
        ? 'Please open the app and acknowledge this mandatory notice.'
        : 'You have a pending notice on the noticeboard.',
      data: {
        category: 'circular_reminder',
        circularId,
        deepLink: `/noticeboard/${circularId}`,
      },
    });

    await prisma.commCircularAcknowledgment.update({
      where: { id: ack.id },
      data: { reminderCount: { increment: 1 }, lastReminderAt: new Date() },
    });
    reminded += 1;
  }

  await logActivity(
    institutionId,
    'CIRCULAR_REMINDER',
    `Reminders sent to ${reminded} pending user(s) for: ${circular.title}`,
    { circularId, reminded },
    opts.userRole ?? 'Super Admin',
  );

  return { message: `Reminder push sent to ${reminded} pending user(s).`, reminded };
}

// ─── Mobile Noticeboard API ───────────────────────────────────────────────────

function accountMatchesAudience(
  account: { role: MobileAppRole },
  audienceType: string,
) {
  const roles = audienceRoles(audienceType);
  if (!roles) return true;
  return roles.includes(account.role);
}

export async function getMobileNoticeboard(
  institutionId: string,
  accountId: string,
  accountRole: MobileAppRole,
) {
  const circulars = await prisma.commCircular.findMany({
    where: { institutionId, status: 'PUBLISHED' },
    orderBy: { publishedAt: 'desc' },
    include: {
      acknowledgments: { where: { accountId } },
    },
  });

  const items = circulars
    .filter((c) => accountMatchesAudience({ role: accountRole }, c.audienceType))
    .map((c) => {
      const ack = c.acknowledgments[0];
      const isUnread = !ack || ack.status === 'PENDING';
      const isAcknowledged = ack?.status === 'ACKNOWLEDGED';
      return {
        id: c.id,
        title: c.title,
        bodyPreview: c.body.slice(0, 160),
        pdfUrl: c.pdfUrl,
        pdfFileName: c.pdfFileName,
        requireAcknowledgment: c.requireAcknowledgment,
        requireESignature: c.requireESignature,
        publishedAt: c.publishedAt?.toISOString() ?? c.createdAt.toISOString(),
        status: ack?.status ?? 'PENDING',
        isUnread,
        isAcknowledged,
        viewedAt: ack?.viewedAt?.toISOString() ?? null,
        acknowledgedAt: ack?.acknowledgedAt?.toISOString() ?? null,
      };
    });

  const unreadCount = items.filter((i) => i.isUnread).length;
  const pendingRequired = items.filter(
    (i) => i.requireAcknowledgment && !i.isAcknowledged,
  );

  return {
    unreadCount,
    badgeCount: unreadCount,
    items,
    pendingRequiredCount: pendingRequired.length,
    blockingNotice: pendingRequired[0] ?? null,
  };
}

export async function getMobileNoticeboardBlockStatus(institutionId: string, accountId: string, accountRole: MobileAppRole) {
  const board = await getMobileNoticeboard(institutionId, accountId, accountRole);
  const blocking = board.items.find((i) => i.requireAcknowledgment && !i.isAcknowledged);
  return {
    blocked: Boolean(blocking),
    blockingCircularId: blocking?.id ?? null,
    blockingTitle: blocking?.title ?? null,
    pendingRequiredCount: board.pendingRequiredCount,
    unreadCount: board.unreadCount,
  };
}

export async function viewMobileCircular(
  institutionId: string,
  accountId: string,
  accountRole: MobileAppRole,
  circularId: string,
  meta: { ipAddress?: string; userAgent?: string } = {},
) {
  const circular = await prisma.commCircular.findFirst({
    where: { id: circularId, institutionId, status: 'PUBLISHED' },
  });
  if (!circular) throw new Error('Notice not found.');
  if (!accountMatchesAudience({ role: accountRole }, circular.audienceType)) {
    throw new Error('This notice is not available for your account.');
  }

  const account = await prisma.mobileAccount.findFirst({ where: { id: accountId, institutionId } });
  if (!account) throw new Error('Account not found.');

  const existing = await prisma.commCircularAcknowledgment.findUnique({
    where: { circularId_accountId: { circularId, accountId } },
  });

  const now = new Date();
  const wasPending = !existing || existing.status === 'PENDING';

  const ack = await prisma.commCircularAcknowledgment.upsert({
    where: { circularId_accountId: { circularId, accountId } },
    create: {
      institutionId,
      circularId,
      accountId,
      accountName: account.displayName,
      accountRole: account.role,
      status: 'VIEWED',
      viewedAt: now,
      ipAddress: meta.ipAddress ?? '',
      userAgent: meta.userAgent ?? '',
    },
    update: {
      status: existing?.status === 'ACKNOWLEDGED' ? 'ACKNOWLEDGED' : 'VIEWED',
      viewedAt: existing?.viewedAt ?? now,
      ipAddress: meta.ipAddress ?? '',
      userAgent: meta.userAgent ?? '',
    },
  });

  if (wasPending) {
    await prisma.commCircular.update({
      where: { id: circularId },
      data: { viewedCount: { increment: 1 } },
    });
  }

  return {
    id: circular.id,
    title: circular.title,
    body: circular.body,
    pdfUrl: circular.pdfUrl,
    pdfFileName: circular.pdfFileName,
    pdfSize: circular.pdfSize,
    requireAcknowledgment: circular.requireAcknowledgment,
    requireESignature: circular.requireESignature,
    publishedAt: circular.publishedAt?.toISOString() ?? null,
    status: ack.status,
    viewedAt: ack.viewedAt?.toISOString() ?? now.toISOString(),
  };
}

export async function acknowledgeMobileCircular(
  institutionId: string,
  accountId: string,
  accountRole: MobileAppRole,
  circularId: string,
  opts: { eSignature?: string; ipAddress?: string; userAgent?: string } = {},
) {
  const circular = await prisma.commCircular.findFirst({
    where: { id: circularId, institutionId, status: 'PUBLISHED' },
  });
  if (!circular) throw new Error('Notice not found.');
  if (!accountMatchesAudience({ role: accountRole }, circular.audienceType)) {
    throw new Error('This notice is not available for your account.');
  }

  if (circular.requireESignature && !opts.eSignature?.trim()) {
    throw new Error('E-signature (typed full name) is required to acknowledge this notice.');
  }

  const account = await prisma.mobileAccount.findFirst({ where: { id: accountId, institutionId } });
  if (!account) throw new Error('Account not found.');

  const existing = await prisma.commCircularAcknowledgment.findUnique({
    where: { circularId_accountId: { circularId, accountId } },
  });

  const now = new Date();
  const wasAcknowledged = existing?.status === 'ACKNOWLEDGED';

  await prisma.commCircularAcknowledgment.upsert({
    where: { circularId_accountId: { circularId, accountId } },
    create: {
      institutionId,
      circularId,
      accountId,
      accountName: account.displayName,
      accountRole: account.role,
      status: 'ACKNOWLEDGED',
      viewedAt: now,
      acknowledgedAt: now,
      ipAddress: opts.ipAddress ?? '',
      userAgent: opts.userAgent ?? '',
      eSignature: opts.eSignature?.trim() ?? '',
    },
    update: {
      status: 'ACKNOWLEDGED',
      viewedAt: existing?.viewedAt ?? now,
      acknowledgedAt: now,
      ipAddress: opts.ipAddress ?? '',
      userAgent: opts.userAgent ?? '',
      eSignature: opts.eSignature?.trim() ?? existing?.eSignature ?? '',
    },
  });

  if (!wasAcknowledged) {
    await prisma.commCircular.update({
      where: { id: circularId },
      data: { acknowledgedCount: { increment: 1 } },
    });
    if (!existing?.viewedAt) {
      await prisma.commCircular.update({
        where: { id: circularId },
        data: { viewedCount: { increment: 1 } },
      });
    }
  }

  await logActivity(
    institutionId,
    'CIRCULAR_ACK',
    `${account.displayName} acknowledged: ${circular.title}`,
    { circularId, accountId, ip: opts.ipAddress },
    account.displayName,
  );

  return {
    message: 'Notice acknowledged successfully.',
    circularId,
    acknowledgedAt: now.toISOString(),
    eSignature: opts.eSignature?.trim() ?? '',
  };
}

export async function seedCircularsManagement(institutionId: string) {
  const academicYear = '2025-26';

  const existing = await prisma.commCircular.count({ where: { institutionId } });
  if (existing > 0) {
    return getCircularsManagement(institutionId, { academicYear, userRole: 'Super Admin' });
  }

  const accountCount = await prisma.mobileAccount.count({ where: { institutionId, isActive: true } });
  if (accountCount === 0) {
    await seedPushManagement(institutionId);
  }

  const draft = await prisma.commCircular.create({
    data: {
      institutionId,
      title: 'Annual Day Celebration — Draft',
      body: 'Draft notice for annual day event. Pending principal approval before publishing.',
      status: 'DRAFT',
      pdfUrl: 'https://school.example.com/docs/annual-day-draft.pdf',
      pdfFileName: 'annual-day-draft.pdf',
      pdfSize: 245000,
      audienceType: 'ALL',
      audienceLabel: AUDIENCE_LABELS.ALL,
      academicYear,
    },
  });

  const compliance = await prisma.commCircular.create({
    data: {
      institutionId,
      title: 'Mandatory Child Safety & POCSO Compliance Notice',
      body: 'All parents and staff must read and acknowledge the updated child safety policy and POCSO compliance guidelines effective immediately. Failure to acknowledge will restrict app access.',
      status: 'DRAFT',
      pdfUrl: 'https://school.example.com/docs/pocso-compliance-2025.pdf',
      pdfFileName: 'pocso-compliance-2025.pdf',
      pdfSize: 512000,
      requireAcknowledgment: true,
      requireESignature: true,
      audienceType: 'PARENT',
      audienceLabel: AUDIENCE_LABELS.PARENT,
      academicYear,
    },
  });

  const holiday = await prisma.commCircular.create({
    data: {
      institutionId,
      title: 'Summer Vacation Schedule 2025',
      body: 'School will remain closed from 1st May to 15th June 2025. Classes resume on 16th June. Transport services will follow the holiday calendar.',
      status: 'DRAFT',
      pdfUrl: 'https://school.example.com/docs/summer-vacation-2025.pdf',
      pdfFileName: 'summer-vacation-2025.pdf',
      pdfSize: 128000,
      requireAcknowledgment: false,
      audienceType: 'ALL',
      audienceLabel: AUDIENCE_LABELS.ALL,
      academicYear,
    },
  });

  await publishCircular(institutionId, compliance.id, {
    userRole: 'Super Admin',
    publishedBy: 'Principal',
    sendPush: true,
  });

  await publishCircular(institutionId, holiday.id, {
    userRole: 'Super Admin',
    publishedBy: 'Communication Manager',
    sendPush: true,
  });

  const accounts = await fetchAudienceAccounts(institutionId, 'PARENT');
  const complianceAcks = await prisma.commCircularAcknowledgment.findMany({
    where: { circularId: compliance.id },
    take: 2,
  });
  for (const ack of complianceAcks) {
    await acknowledgeMobileCircular(
      institutionId,
      ack.accountId,
      'PARENT',
      compliance.id,
      { eSignature: ack.accountName, ipAddress: '192.168.1.101', userAgent: 'SchoolERP-ParentApp/2.4.1' },
    );
  }

  if (accounts[2]) {
    await viewMobileCircular(institutionId, accounts[2].id, 'PARENT', compliance.id, {
      ipAddress: '10.0.0.55',
      userAgent: 'SchoolERP-ParentApp/2.4.1',
    });
  }

  void draft;
  return getCircularsManagement(institutionId, { academicYear, userRole: 'Super Admin' });
}
