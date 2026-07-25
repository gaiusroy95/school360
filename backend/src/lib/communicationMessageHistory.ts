import { Prisma } from '@prisma/client';
import { prisma } from './prisma.js';

const ACADEMIC_YEARS = ['2023-24', '2024-25', '2025-26', '2026-27'];
const RETENTION_YEARS = 5;

const FULL_ACCESS_ROLES = new Set(['Super Admin', 'IT Administrator', 'IT Admin', 'Admin', 'Principal', 'Communication Manager']);
const EXPORT_ROLES = new Set(['Super Admin', 'IT Administrator', 'IT Admin', 'Admin']);
const HELPDESK_ROLES = new Set(['Reception', 'Helpdesk', 'Receptionist']);
const FINANCIAL_ROLES = new Set(['Super Admin', 'Principal', 'Management', 'Finance Head', 'Accountant', 'Admin', 'IT Administrator', 'IT Admin']);

const SUCCESS_STATUSES = new Set(['SENT', 'DELIVERED', 'READ', 'STUB_SENT', 'OPENED', 'CLICKED']);
const CHANNELS = ['SMS', 'EMAIL', 'WHATSAPP', 'PUSH'] as const;

export type MessageHistoryFilters = {
  academicYear?: string;
  userRole?: string;
  channel?: string;
  status?: string;
  direction?: string;
  contact?: string;
  studentId?: string;
  admissionNumber?: string;
  studentName?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
};

function retentionDate(from: Date) {
  const d = new Date(from);
  d.setFullYear(d.getFullYear() + RETENTION_YEARS);
  return d;
}

function canFullSearch(userRole: string) {
  return FULL_ACCESS_ROLES.has(userRole);
}

function canExport(userRole: string) {
  return EXPORT_ROLES.has(userRole);
}

function canViewCosts(userRole: string) {
  return FINANCIAL_ROLES.has(userRole);
}

function isHelpdesk(userRole: string) {
  return HELPDESK_ROLES.has(userRole);
}

function maskPhone(phone: string) {
  if (!phone || phone.length < 6) return '******';
  return `${phone.slice(0, 2)}****${phone.slice(-4)}`;
}

function maskEmail(email: string) {
  const [user, domain] = email.split('@');
  if (!domain) return '***@***';
  return `${(user[0] ?? '*')}***@${domain}`;
}

function maskContact(contact: string, contactType: string) {
  if (contactType === 'EMAIL' || contact.includes('@')) return maskEmail(contact);
  return maskPhone(contact);
}

function snippet(text: string, max = 80) {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max)}…`;
}

function statusBucket(status: string) {
  if (SUCCESS_STATUSES.has(status)) return 'SUCCESS';
  if (status === 'QUEUED' || status === 'PENDING') return 'PENDING';
  return 'FAILED';
}

function buildWhere(institutionId: string, filters: MessageHistoryFilters): Prisma.CommMessageAuditLogWhereInput {
  const academicYear = filters.academicYear ?? '2025-26';
  const userRole = filters.userRole ?? 'Super Admin';
  const where: Prisma.CommMessageAuditLogWhereInput = { institutionId, academicYear };

  if (filters.channel && filters.channel !== 'ALL') where.channel = filters.channel;
  if (filters.status && filters.status !== 'ALL') where.status = filters.status;
  if (filters.direction && filters.direction !== 'ALL') where.direction = filters.direction;

  if (filters.dateFrom || filters.dateTo) {
    where.sentAt = {};
    if (filters.dateFrom) where.sentAt.gte = new Date(filters.dateFrom);
    if (filters.dateTo) {
      const end = new Date(filters.dateTo);
      end.setHours(23, 59, 59, 999);
      where.sentAt.lte = end;
    }
  }

  if (filters.contact?.trim()) {
    const q = filters.contact.trim();
    where.OR = [
      { contactIdentifier: { contains: q, mode: 'insensitive' } },
      { recipientName: { contains: q, mode: 'insensitive' } },
    ];
  }

  if (isHelpdesk(userRole) && !canFullSearch(userRole)) {
    const studentFilter: Prisma.CommMessageAuditLogWhereInput[] = [];
    if (filters.studentId?.trim()) studentFilter.push({ studentId: filters.studentId.trim() });
    if (filters.admissionNumber?.trim()) {
      studentFilter.push({ admissionNumber: { contains: filters.admissionNumber.trim(), mode: 'insensitive' } });
    }
    if (filters.studentName?.trim()) {
      studentFilter.push({ studentName: { contains: filters.studentName.trim(), mode: 'insensitive' } });
    }
    if (filters.contact?.trim()) {
      studentFilter.push({
        OR: [
          { contactIdentifier: { contains: filters.contact.trim(), mode: 'insensitive' } },
          { recipientName: { contains: filters.contact.trim(), mode: 'insensitive' } },
        ],
      });
    }
    if (!studentFilter.length) {
      where.id = '__HELPDESK_REQUIRES_STUDENT_FILTER__';
    } else {
      where.AND = [{ OR: studentFilter }];
    }
  } else {
    if (filters.studentId?.trim()) where.studentId = filters.studentId.trim();
    if (filters.admissionNumber?.trim()) {
      where.admissionNumber = { contains: filters.admissionNumber.trim(), mode: 'insensitive' };
    }
    if (filters.studentName?.trim()) {
      where.studentName = { contains: filters.studentName.trim(), mode: 'insensitive' };
    }
  }

  return where;
}

function serializeRow(
  row: {
    id: string;
    logRef: string;
    direction: string;
    channel: string;
    sender: string;
    recipientName: string;
    contactType: string;
    contactIdentifier: string;
    messageSnippet: string;
    status: string;
    cost: number;
    studentName: string;
    admissionNumber: string;
    className: string;
    sourceModule: string;
    sentAt: Date;
    retainedUntil: Date;
    errorDetail: string;
  },
  opts: { maskPii: boolean; showCost: boolean },
) {
  return {
    id: row.id,
    logRef: row.logRef,
    timestamp: row.sentAt.toISOString(),
    direction: row.direction,
    channel: row.channel,
    sender: row.sender,
    recipientName: row.recipientName,
    contactIdentifier: opts.maskPii ? maskContact(row.contactIdentifier, row.contactType) : row.contactIdentifier,
    contactType: row.contactType,
    messageSnippet: row.messageSnippet,
    status: row.status,
    statusBucket: statusBucket(row.status),
    cost: opts.showCost ? row.cost : null,
    costLabel: opts.showCost ? `₹${row.cost.toFixed(2)}` : '—',
    studentName: row.studentName,
    admissionNumber: row.admissionNumber,
    className: row.className,
    sourceModule: row.sourceModule,
    retainedUntil: row.retainedUntil.toISOString(),
    hasError: Boolean(row.errorDetail),
  };
}

export async function appendCommMessageAuditLog(
  institutionId: string,
  data: {
    logRef?: string;
    direction?: string;
    channel: string;
    sender?: string;
    senderId?: string;
    recipientName?: string;
    contactType?: string;
    contactIdentifier: string;
    messageSnippet: string;
    status: string;
    cost?: number;
    studentId?: string;
    studentName?: string;
    admissionNumber?: string;
    className?: string;
    sourceModule?: string;
    sourceRecordId?: string;
    gatewayPayload?: Record<string, unknown>;
    gatewayResponse?: Record<string, unknown>;
    errorDetail?: string;
    academicYear?: string;
    sentAt?: Date;
  },
) {
  const sentAt = data.sentAt ?? new Date();
  return prisma.commMessageAuditLog.create({
    data: {
      institutionId,
      logRef: data.logRef ?? `AUD-${Date.now()}`,
      direction: data.direction ?? 'OUTBOUND',
      channel: data.channel,
      sender: data.sender ?? 'School ERP',
      senderId: data.senderId ?? '',
      recipientName: data.recipientName ?? '',
      contactType: data.contactType ?? (data.contactIdentifier.includes('@') ? 'EMAIL' : 'MOBILE'),
      contactIdentifier: data.contactIdentifier,
      messageSnippet: snippet(data.messageSnippet, 200),
      status: data.status,
      cost: data.cost ?? 0,
      studentId: data.studentId ?? '',
      studentName: data.studentName ?? '',
      admissionNumber: data.admissionNumber ?? '',
      className: data.className ?? '',
      sourceModule: data.sourceModule ?? 'Communication',
      sourceRecordId: data.sourceRecordId ?? '',
      gatewayPayload: (data.gatewayPayload ?? {}) as Prisma.InputJsonValue,
      gatewayResponse: (data.gatewayResponse ?? {}) as Prisma.InputJsonValue,
      errorDetail: data.errorDetail ?? '',
      academicYear: data.academicYear ?? '2025-26',
      sentAt,
      retainedUntil: retentionDate(sentAt),
    },
  });
}

export async function getMessageHistoryManagement(institutionId: string, filters: MessageHistoryFilters = {}) {
  const userRole = filters.userRole ?? 'Super Admin';
  const academicYear = filters.academicYear ?? '2025-26';
  const page = Math.max(1, filters.page ?? 1);
  const limit = Math.min(100, Math.max(10, filters.limit ?? 25));
  const skip = (page - 1) * limit;

  const maskPii = isHelpdesk(userRole) && !canFullSearch(userRole);
  const showCost = canViewCosts(userRole);
  const where = buildWhere(institutionId, { ...filters, academicYear, userRole });

  const [total, rows, statusGroups, channelGroups] = await Promise.all([
    prisma.commMessageAuditLog.count({ where }),
    prisma.commMessageAuditLog.findMany({
      where,
      orderBy: { sentAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.commMessageAuditLog.groupBy({
      by: ['status'],
      where: { institutionId, academicYear },
      _count: { _all: true },
    }),
    prisma.commMessageAuditLog.groupBy({
      by: ['channel'],
      where: { institutionId, academicYear },
      _count: { _all: true },
    }),
  ]);

  const statusMap = Object.fromEntries(statusGroups.map((s) => [s.status, s._count._all]));
  const channelMap = Object.fromEntries(channelGroups.map((c) => [c.channel, c._count._all]));
  const successCount = Object.entries(statusMap)
    .filter(([s]) => SUCCESS_STATUSES.has(s))
    .reduce((sum, [, n]) => sum + n, 0);
  const failedCount = (statusMap.FAILED ?? 0) + (statusMap.REJECTED ?? 0) + (statusMap.BOUNCED ?? 0);

  return {
    academicYear,
    academicYears: ACADEMIC_YEARS,
    userRole,
    permissions: {
      canFullSearch: canFullSearch(userRole),
      canExport: canExport(userRole),
      canViewPayload: canFullSearch(userRole) || isHelpdesk(userRole),
      canViewCosts: showCost,
      isImmutable: true,
      retentionYears: RETENTION_YEARS,
      helpdeskRequiresStudent: isHelpdesk(userRole) && !canFullSearch(userRole),
    },
    filters: {
      channel: filters.channel ?? 'ALL',
      status: filters.status ?? 'ALL',
      direction: filters.direction ?? 'ALL',
      contact: filters.contact ?? '',
      studentId: filters.studentId ?? '',
      admissionNumber: filters.admissionNumber ?? '',
      studentName: filters.studentName ?? '',
      dateFrom: filters.dateFrom ?? '',
      dateTo: filters.dateTo ?? '',
    },
    kpis: {
      totalLogs: Object.values(statusMap).reduce((s, n) => s + n, 0),
      pageTotal: total,
      successCount,
      failedCount,
      queuedCount: (statusMap.QUEUED ?? 0) + (statusMap.PENDING ?? 0),
      inboundCount: await prisma.commMessageAuditLog.count({
        where: { institutionId, academicYear, direction: 'INBOUND' },
      }),
      totalCost: showCost
        ? (await prisma.commMessageAuditLog.aggregate({
            where: { institutionId, academicYear },
            _sum: { cost: true },
          }))._sum.cost ?? 0
        : null,
    },
    channelBreakdown: CHANNELS.map((ch) => ({
      channel: ch,
      count: channelMap[ch] ?? 0,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
    logs: rows.map((r) => serializeRow(r, { maskPii, showCost })),
    channelOptions: ['ALL', ...CHANNELS],
    statusOptions: ['ALL', 'SENT', 'DELIVERED', 'READ', 'FAILED', 'QUEUED', 'BOUNCED'],
    directionOptions: ['ALL', 'OUTBOUND', 'INBOUND'],
    complianceNotes: [
      'All communication logs are immutable — no user (including Super Admin) can edit or delete entries.',
      `Logs are retained for a minimum of ${RETENTION_YEARS} years for compliance and dispute resolution.`,
      'Full gateway payload and raw error responses are available via "View Full Payload".',
      'Helpdesk users must search by student admission number or name to view parent communication history.',
    ],
  };
}

export async function getMessageAuditDetail(institutionId: string, logId: string, userRole = 'Super Admin') {
  const row = await prisma.commMessageAuditLog.findFirst({
    where: { id: logId, institutionId },
  });
  if (!row) throw new Error('Audit log entry not found.');

  if (isHelpdesk(userRole) && !canFullSearch(userRole)) {
    const hasStudentContext = Boolean(row.studentId || row.admissionNumber);
    if (!hasStudentContext) throw new Error('Permission denied for this log entry.');
  }

  const maskPii = isHelpdesk(userRole) && !canFullSearch(userRole);
  const showCost = canViewCosts(userRole);

  return {
    log: {
      ...serializeRow(row, { maskPii, showCost }),
      contactIdentifierFull: maskPii ? maskContact(row.contactIdentifier, row.contactType) : row.contactIdentifier,
      studentId: row.studentId,
      sourceRecordId: row.sourceRecordId,
      errorDetail: row.errorDetail,
      gatewayPayload: row.gatewayPayload,
      gatewayResponse: row.gatewayResponse,
      retainedUntil: row.retainedUntil.toISOString(),
      createdAt: row.createdAt.toISOString(),
      isImmutable: true,
    },
    compliance: {
      retentionYears: RETENTION_YEARS,
      message: 'This record is part of the immutable audit trail and cannot be modified.',
    },
  };
}

export async function exportMessageHistoryCsv(institutionId: string, filters: MessageHistoryFilters = {}) {
  const userRole = filters.userRole ?? 'Super Admin';
  if (!canExport(userRole)) throw new Error('Export permission denied.');

  const showCost = canViewCosts(userRole);
  const where = buildWhere(institutionId, filters);
  const rows = await prisma.commMessageAuditLog.findMany({
    where,
    orderBy: { sentAt: 'desc' },
    take: 5000,
  });

  const headers = [
    'Timestamp',
    'Log Ref',
    'Direction',
    'Channel',
    'Sender',
    'Recipient Name',
    'Contact',
    'Message Snippet',
    'Status',
    ...(showCost ? ['Cost (INR)'] : []),
    'Student',
    'Admission No',
    'Class',
    'Source Module',
    'Retained Until',
  ];

  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;

  const lines = [
    headers.join(','),
    ...rows.map((r) => {
      const cols = [
        r.sentAt.toISOString(),
        r.logRef,
        r.direction,
        r.channel,
        r.sender,
        r.recipientName,
        r.contactIdentifier,
        r.messageSnippet,
        r.status,
        ...(showCost ? [String(r.cost)] : []),
        r.studentName,
        r.admissionNumber,
        r.className,
        r.sourceModule,
        r.retainedUntil.toISOString(),
      ];
      return cols.map((c) => escape(String(c ?? ''))).join(',');
    }),
  ];

  return {
    message: `Exported ${rows.length} audit log record(s).`,
    rowCount: rows.length,
    filename: `message-audit-${filters.academicYear ?? '2025-26'}-${Date.now()}.csv`,
    csv: lines.join('\n'),
  };
}

async function syncFromChannelQueues(institutionId: string, academicYear: string) {
  const existing = await prisma.commMessageAuditLog.count({ where: { institutionId, academicYear } });
  if (existing > 0) return;

  const students = await prisma.student.findMany({
    where: { institutionId, academicYear, status: 'ACTIVE' },
    take: 20,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      admissionNumber: true,
      className: true,
      sectionName: true,
      fatherName: true,
      fatherMobile: true,
      motherMobile: true,
      email: true,
    },
  });

  const studentByMobile = new Map<string, (typeof students)[0]>();
  for (const s of students) {
    if (s.fatherMobile) studentByMobile.set(s.fatherMobile, s);
    if (s.motherMobile) studentByMobile.set(s.motherMobile, s);
  }

  const resolveStudent = (mobile: string, email?: string) => {
    const byMobile = studentByMobile.get(mobile);
    if (byMobile) return byMobile;
    if (email) {
      const match = students.find((s) => s.email === email);
      if (match) return match;
    }
    return students[0];
  };

  const smsItems = await prisma.commSmsQueueItem.findMany({
    where: { institutionId, academicYear },
    take: 30,
    include: { attempts: { orderBy: { attemptedAt: 'desc' }, take: 1 } },
    orderBy: { queuedAt: 'desc' },
  });

  for (const item of smsItems) {
    const student = resolveStudent(item.mobile);
    const attempt = item.attempts[0];
    const sentAt = item.sentAt ?? item.queuedAt;
    await appendCommMessageAuditLog(institutionId, {
      logRef: `SMS-${item.id.slice(-8).toUpperCase()}`,
      channel: 'SMS',
      sender: 'SMS Gateway',
      recipientName: student?.fatherName || 'Parent',
      contactIdentifier: item.mobile,
      messageSnippet: item.message,
      status: item.status === 'SENT' ? 'DELIVERED' : item.status,
      cost: item.creditsRequired * 0.15,
      studentId: student?.id ?? '',
      studentName: student ? `${student.firstName} ${student.lastName}`.trim() : '',
      admissionNumber: student?.admissionNumber ?? '',
      className: student ? `${student.className}-${student.sectionName}` : '',
      sourceModule: item.sourceModule,
      sourceRecordId: item.id,
      gatewayPayload: {
        to: item.mobile,
        message: item.message,
        encoding: item.encoding,
        segments: item.segmentCount,
        messageType: item.messageType,
        gatewayId: item.gatewayId,
      },
      gatewayResponse: attempt
        ? { httpStatus: attempt.httpStatus, status: attempt.status, body: attempt.response, failover: attempt.failover }
        : { status: item.status, error: item.lastError },
      errorDetail: item.lastError,
      academicYear,
      sentAt,
    });
  }

  const emailItems = await prisma.commEmailQueueItem.findMany({
    where: { institutionId, academicYear },
    take: 20,
    include: { attempts: { orderBy: { attemptedAt: 'desc' }, take: 1 } },
    orderBy: { queuedAt: 'desc' },
  });

  for (const item of emailItems) {
    const student = resolveStudent('', item.toEmail);
    const attempt = item.attempts[0];
    const sentAt = item.sentAt ?? item.queuedAt;
    await appendCommMessageAuditLog(institutionId, {
      logRef: `EML-${item.trackingId.slice(-8).toUpperCase()}`,
      channel: 'EMAIL',
      sender: 'noreply@schoolerp.in',
      recipientName: item.toName || student?.fatherName || 'Parent',
      contactType: 'EMAIL',
      contactIdentifier: item.toEmail,
      messageSnippet: item.subject,
      status: item.status === 'SENT' ? 'DELIVERED' : item.status,
      cost: 0.05,
      studentId: student?.id ?? '',
      studentName: student ? `${student.firstName} ${student.lastName}`.trim() : '',
      admissionNumber: student?.admissionNumber ?? '',
      className: student ? `${student.className}-${student.sectionName}` : '',
      sourceModule: item.sourceModule,
      sourceRecordId: item.id,
      gatewayPayload: {
        to: item.toEmail,
        subject: item.subject,
        bodyPlain: snippet(item.bodyPlain || item.bodyHtml.replace(/<[^>]+>/g, ' '), 500),
        campaignType: item.campaignType,
        trackingId: item.trackingId,
      },
      gatewayResponse: attempt
        ? { httpStatus: attempt.httpStatus, status: attempt.status, body: attempt.response }
        : { status: item.status, error: item.lastError },
      errorDetail: item.lastError,
      academicYear,
      sentAt,
    });
  }

  const waMessages = await prisma.commWaMessage.findMany({
    where: { institutionId, academicYear },
    take: 25,
    orderBy: { createdAt: 'desc' },
  });

  for (const msg of waMessages) {
    const student = resolveStudent(msg.mobile);
    await appendCommMessageAuditLog(institutionId, {
      logRef: `WA-${msg.id.slice(-8).toUpperCase()}`,
      direction: msg.direction,
      channel: 'WHATSAPP',
      sender: msg.direction === 'INBOUND' ? msg.mobile : (msg.sentBy || 'Helpdesk'),
      recipientName: student?.fatherName || 'Parent',
      contactIdentifier: msg.mobile,
      messageSnippet: msg.body || `[${msg.messageType}]`,
      status: msg.status,
      cost: msg.cost,
      studentId: student?.id ?? '',
      studentName: student ? `${student.firstName} ${student.lastName}`.trim() : '',
      admissionNumber: student?.admissionNumber ?? '',
      className: student ? `${student.className}-${student.sectionName}` : '',
      sourceModule: 'WhatsApp Management',
      sourceRecordId: msg.id,
      gatewayPayload: {
        mobile: msg.mobile,
        direction: msg.direction,
        messageType: msg.messageType,
        body: msg.body,
        templateCode: msg.templateCode,
        mediaUrl: msg.mediaUrl || undefined,
      },
      gatewayResponse: {
        vendorMessageId: msg.vendorMessageId,
        status: msg.status,
        deliveredAt: msg.deliveredAt?.toISOString(),
        readAt: msg.readAt?.toISOString(),
        failedReason: msg.failedReason || undefined,
      },
      errorDetail: msg.failedReason,
      academicYear,
      sentAt: msg.sentAt ?? msg.createdAt,
    });
  }

  const pushRecipients = await prisma.commPushRecipient.findMany({
    where: { institutionId },
    take: 15,
    include: { campaign: true },
    orderBy: { createdAt: 'desc' },
  });

  for (const rec of pushRecipients) {
    await appendCommMessageAuditLog(institutionId, {
      logRef: `PUSH-${rec.id.slice(-8).toUpperCase()}`,
      channel: 'PUSH',
      sender: rec.campaign.sentBy || 'System',
      recipientName: rec.accountName,
      contactType: 'DEVICE',
      contactIdentifier: rec.deviceTokenMasked || `fcm:${rec.platform}`,
      messageSnippet: rec.campaign.body || rec.campaign.title,
      status: rec.status,
      cost: 0,
      sourceModule: 'Push Notifications',
      sourceRecordId: rec.id,
      gatewayPayload: {
        title: rec.campaign.title,
        body: rec.campaign.body,
        deviceToken: rec.deviceTokenMasked,
        platform: rec.platform,
      },
      gatewayResponse: { status: rec.status, readAt: rec.readAt?.toISOString() },
      academicYear: rec.campaign.academicYear,
      sentAt: rec.sentAt ?? rec.createdAt,
    });
  }
}

const DEMO_LOGS = [
  {
    channel: 'SMS',
    direction: 'OUTBOUND',
    sender: 'Fee Module',
    recipientName: 'Mr. Rajesh Kumar',
    contactIdentifier: '9876543210',
    messageSnippet: 'Dear Parent, fee of Rs.12,500 for Term 2 is due on 30-Jul-2026. Pay: https://pay.schoolerp.in/f/abc123',
    status: 'DELIVERED',
    cost: 0.15,
    sourceModule: 'Fees & Finance',
    gatewayPayload: {
      api: 'POST /sms/send',
      to: '9876543210',
      templateId: 'FEE_REMINDER_SMS',
      variables: { amount: '12500', dueDate: '2026-07-30', link: 'https://pay.schoolerp.in/f/abc123' },
    },
    gatewayResponse: { messageId: 'MSG-882910', status: 'success', credits: 1 },
  },
  {
    channel: 'SMS',
    direction: 'OUTBOUND',
    sender: 'Fee Module',
    recipientName: 'Mrs. Priya Sharma',
    contactIdentifier: '9123456789',
    messageSnippet: 'Dear Parent, fee payment link for Arjun Sharma (Class 8-A): https://pay.schoolerp.in/f/xyz789',
    status: 'FAILED',
    cost: 0,
    sourceModule: 'Fees & Finance',
    errorDetail: 'Gateway timeout — DLT template mismatch (Error 402)',
    gatewayPayload: {
      api: 'POST /sms/send',
      to: '9123456789',
      templateId: 'FEE_LINK_SMS',
      variables: { link: 'https://pay.schoolerp.in/f/xyz789' },
    },
    gatewayResponse: { status: 'error', code: 402, message: 'DLT template ID not registered for this content' },
  },
  {
    channel: 'WHATSAPP',
    direction: 'INBOUND',
    sender: '9123456789',
    recipientName: 'Mrs. Priya Sharma',
    contactIdentifier: '9123456789',
    messageSnippet: 'I did not receive the fee payment link. Please resend.',
    status: 'DELIVERED',
    cost: 0,
    sourceModule: 'WhatsApp Management',
    gatewayPayload: { event: 'message_received', from: '9123456789', type: 'text' },
    gatewayResponse: { webhookId: 'WH-44102', processed: true },
  },
  {
    channel: 'EMAIL',
    direction: 'OUTBOUND',
    sender: 'accounts@schoolerp.in',
    recipientName: 'Mr. Amit Patel',
    contactType: 'EMAIL',
    contactIdentifier: 'amit.patel@gmail.com',
    messageSnippet: 'Fee Invoice #INV-2026-0842 — Term 2 dues for Class 10-B',
    status: 'DELIVERED',
    cost: 0.05,
    sourceModule: 'Fees & Finance',
    gatewayPayload: {
      to: 'amit.patel@gmail.com',
      subject: 'Fee Invoice #INV-2026-0842',
      smtpGateway: 'SENDGRID_PRIMARY',
    },
    gatewayResponse: { messageId: 'sg-99281', status: 'accepted' },
  },
  {
    channel: 'PUSH',
    direction: 'OUTBOUND',
    sender: 'Attendance Module',
    recipientName: 'Parent App — Kumar Family',
    contactType: 'DEVICE',
    contactIdentifier: 'fcm:token:a8f3…',
    messageSnippet: 'Rahul Kumar was marked absent today (25-Jul-2026). Tap to view details.',
    status: 'READ',
    cost: 0,
    sourceModule: 'Attendance',
    gatewayPayload: { title: 'Attendance Alert', category: 'attendance', deepLink: '/attendance/today' },
    gatewayResponse: { fcmMessageId: 'fcm-7721', status: 'delivered', readAt: '2026-07-25T09:15:00Z' },
  },
];

export async function seedMessageHistoryManagement(institutionId: string) {
  const academicYear = '2025-26';

  await syncFromChannelQueues(institutionId, academicYear);

  const students = await prisma.student.findMany({
    where: { institutionId, academicYear, status: 'ACTIVE' },
    take: 10,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      admissionNumber: true,
      className: true,
      sectionName: true,
      fatherName: true,
      fatherMobile: true,
      email: true,
    },
  });

  if (!students.length) return getMessageHistoryManagement(institutionId, { academicYear, userRole: 'Super Admin' });

  const existingDemo = await prisma.commMessageAuditLog.count({
    where: { institutionId, academicYear, logRef: { startsWith: 'DEMO-' } },
  });

  if (!existingDemo) {
    for (let i = 0; i < DEMO_LOGS.length; i++) {
      const demo = DEMO_LOGS[i];
      const student = students[i % students.length];
      const sentAt = new Date();
      sentAt.setDate(sentAt.getDate() - i);
      sentAt.setHours(8 + i, 30, 0, 0);

      await appendCommMessageAuditLog(institutionId, {
        logRef: `DEMO-${1000 + i}`,
        direction: demo.direction,
        channel: demo.channel,
        sender: demo.sender,
        recipientName: demo.recipientName || student.fatherName || 'Parent',
        contactType: demo.contactType ?? 'MOBILE',
        contactIdentifier: demo.contactIdentifier || student.fatherMobile,
        messageSnippet: demo.messageSnippet,
        status: demo.status,
        cost: demo.cost,
        studentId: student.id,
        studentName: `${student.firstName} ${student.lastName}`.trim(),
        admissionNumber: student.admissionNumber,
        className: `${student.className}-${student.sectionName}`,
        sourceModule: demo.sourceModule,
        gatewayPayload: demo.gatewayPayload as Record<string, unknown>,
        gatewayResponse: demo.gatewayResponse as Record<string, unknown>,
        errorDetail: demo.errorDetail ?? '',
        academicYear,
        sentAt,
      });
    }
  }

  return getMessageHistoryManagement(institutionId, { academicYear, userRole: 'Super Admin' });
}
