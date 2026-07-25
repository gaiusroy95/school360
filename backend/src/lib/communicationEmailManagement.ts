import { randomBytes } from 'crypto';
import { Prisma } from '@prisma/client';
import { prisma } from './prisma.js';

const ACADEMIC_YEARS = ['2023-24', '2024-25', '2025-26', '2026-27'];
const ADMIN_ROLES = new Set(['Super Admin', 'Principal', 'Management', 'Admin', 'Communication Manager']);

// 1x1 transparent GIF
const TRACKING_PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64',
);

export type EmailGatewayInput = {
  gatewayCode?: string;
  gatewayName: string;
  provider?: string;
  smtpHost?: string;
  smtpPort?: number;
  fromEmail: string;
  fromName?: string;
  apiKeyMasked?: string;
  priority?: number;
  status?: string;
  dailyLimit?: number;
  costPerEmail?: number;
  trackOpens?: boolean;
  trackClicks?: boolean;
  simulate503?: boolean;
  academicYear?: string;
  userRole?: string;
};

export type EnqueueEmailPayload = {
  toEmail: string;
  toName?: string;
  subject: string;
  bodyHtml: string;
  bodyPlain?: string;
  campaignType?: 'TRANSACTIONAL' | 'MARKETING';
  academicYear?: string;
  sourceModule?: string;
  processNow?: boolean;
};

function canManage(userRole: string) {
  return ADMIN_ROLES.has(userRole);
}

function trackingBaseUrl() {
  return process.env.API_BASE_URL?.trim() || process.env.PUBLIC_API_URL?.trim() || 'http://localhost:4000';
}

function generateTrackingId() {
  return randomBytes(16).toString('hex');
}

function maskEmail(email: string) {
  const [user, domain] = email.split('@');
  if (!domain) return '***@***';
  return `${user[0] ?? '*'}***@${domain}`;
}

export function injectEmailTracking(html: string, trackingId: string, trackOpens: boolean, trackClicks: boolean) {
  let out = html;
  const base = trackingBaseUrl();

  if (trackClicks) {
    out = out.replace(/href="(https?:\/\/[^"]+)"/gi, (_match, url: string) => {
      const tracked = `${base}/api/communication/email/track/click/${trackingId}?url=${encodeURIComponent(url)}`;
      return `href="${tracked}"`;
    });
  }

  if (trackOpens) {
    const pixel = `<img src="${base}/api/communication/email/track/open/${trackingId}" width="1" height="1" alt="" style="display:none" />`;
    if (out.includes('</body>')) {
      out = out.replace('</body>', `${pixel}</body>`);
    } else {
      out += pixel;
    }
  }

  return out;
}

async function logActivity(
  institutionId: string,
  action: string,
  details: string,
  snapshot: Record<string, unknown> = {},
  performedBy = 'Email Manager',
) {
  await prisma.commActivityLog.create({
    data: { institutionId, action, details, filterSnapshot: snapshot as Prisma.InputJsonValue, performedBy },
  });
}

async function getActiveGateways(institutionId: string, academicYear: string) {
  return prisma.commEmailSmtpGateway.findMany({
    where: { institutionId, academicYear, status: { in: ['ACTIVE', 'STANDBY'] } },
    orderBy: [{ priority: 'asc' }, { gatewayName: 'asc' }],
  });
}

type GatewayRow = Awaited<ReturnType<typeof getActiveGateways>>[number];

async function dispatchViaGateway(
  institutionId: string,
  gateway: GatewayRow,
  toEmail: string,
  subject: string,
  bodyHtml: string,
  bodyPlain: string,
) {
  if (gateway.simulate503) {
    return { httpStatus: 503, status: 'FAILED' as const, response: '503 Service Unavailable', sent: false, failover: true };
  }

  if (gateway.dailyLimit > 0 && gateway.sentToday >= gateway.dailyLimit) {
    return { httpStatus: 429, status: 'FAILED' as const, response: 'Daily send limit exceeded', sent: false, failover: true };
  }

  const apiKey = process.env.SENDGRID_API_KEY?.trim() || process.env.AWS_SES_KEY?.trim();
  if (!apiKey) {
    await prisma.messageDispatchLog.create({
      data: {
        institutionId,
        channel: 'EMAIL',
        recipient: toEmail,
        template: gateway.gatewayCode,
        status: 'STUB_SENT',
        response: subject.slice(0, 200),
      },
    }).catch(() => {});
    return { httpStatus: 200, status: 'SUCCESS' as const, response: `Stub dispatch via ${gateway.provider}`, sent: true, failover: false };
  }

  if (gateway.provider === 'SENDGRID') {
    const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: toEmail }] }],
        from: { email: gateway.fromEmail, name: gateway.fromName || undefined },
        subject,
        content: [
          ...(bodyPlain ? [{ type: 'text/plain', value: bodyPlain }] : []),
          { type: 'text/html', value: bodyHtml },
        ],
      }),
    });
    const text = await res.text();
    const failover = res.status === 503 || res.status === 502 || res.status === 504;
    return { httpStatus: res.status, status: res.ok ? ('SUCCESS' as const) : ('FAILED' as const), response: text.slice(0, 500), sent: res.ok, failover };
  }

  // SES / generic stub
  await prisma.messageDispatchLog.create({
    data: {
      institutionId,
      channel: 'EMAIL',
      recipient: toEmail,
      template: gateway.gatewayCode,
      status: 'SENT',
      response: subject.slice(0, 200),
    },
  }).catch(() => {});
  return { httpStatus: 200, status: 'SUCCESS' as const, response: `Dispatched via ${gateway.provider}`, sent: true, failover: false };
}

export async function processEmailQueueItem(institutionId: string, queueItemId: string) {
  const item = await prisma.commEmailQueueItem.findFirst({
    where: { id: queueItemId, institutionId },
    include: { gateway: true },
  });
  if (!item || item.status === 'SENT') return { status: item?.status ?? 'NOT_FOUND' };

  const gateways = await getActiveGateways(institutionId, item.academicYear);
  if (gateways.length === 0) {
    await prisma.commEmailQueueItem.update({
      where: { id: queueItemId },
      data: { status: 'FAILED', lastError: 'No active SMTP gateways configured.' },
    });
    return { status: 'FAILED', error: 'No gateways' };
  }

  const gatewayForTracking = gateways[0];
  const bodyHtml = injectEmailTracking(
    item.bodyHtml,
    item.trackingId,
    gatewayForTracking.trackOpens,
    gatewayForTracking.trackClicks,
  );

  await prisma.commEmailQueueItem.update({
    where: { id: queueItemId },
    data: { status: 'PROCESSING', bodyHtml },
  });

  let lastError = '';
  for (let i = 0; i < gateways.length; i++) {
    const gateway = gateways[i];
    const result = await dispatchViaGateway(
      institutionId,
      gateway,
      item.toEmail,
      item.subject,
      bodyHtml,
      item.bodyPlain,
    );

    await prisma.commEmailDispatchAttempt.create({
      data: {
        institutionId,
        queueItemId: item.id,
        gatewayId: gateway.id,
        gatewayCode: gateway.gatewayCode,
        httpStatus: result.httpStatus,
        status: result.status,
        response: result.response,
        failover: result.failover && i < gateways.length - 1,
      },
    });

    await prisma.commEmailQueueItem.update({
      where: { id: queueItemId },
      data: {
        attemptCount: { increment: 1 },
        gatewayId: gateway.id,
        lastError: result.sent ? '' : result.response,
      },
    });

    if (result.sent) {
      await prisma.commEmailQueueItem.update({
        where: { id: queueItemId },
        data: { status: 'SENT', sentAt: new Date(), gatewayId: gateway.id },
      });
      await prisma.commEmailSmtpGateway.update({
        where: { id: gateway.id },
        data: { sentToday: { increment: 1 }, lastHealthCheck: new Date() },
      });
      await prisma.commDeliveryLog.create({
        data: {
          institutionId,
          channel: 'EMAIL',
          campaignTitle: item.subject,
          messagePreview: item.bodyPlain || item.bodyHtml.slice(0, 120),
          recipientCount: 1,
          maskedRecipient: maskEmail(item.toEmail),
          status: 'DELIVERED',
          cost: gateway.costPerEmail,
          sourceModule: item.sourceModule,
          academicYear: item.academicYear,
        },
      });
      return { status: 'SENT', gateway: gateway.gatewayCode, trackingId: item.trackingId, failoverUsed: i > 0 };
    }

    lastError = result.response;
    if (result.failover && i < gateways.length - 1) {
      await logActivity(
        institutionId,
        'EMAIL_FAILOVER',
        `${gateway.gatewayCode} returned ${result.httpStatus} — shifting to ${gateways[i + 1].gatewayCode}`,
        { queueItemId, from: gateway.gatewayCode, to: gateways[i + 1].gatewayCode },
      );
      continue;
    }
    break;
  }

  await prisma.commEmailQueueItem.update({
    where: { id: queueItemId },
    data: { status: 'FAILED', lastError },
  });
  return { status: 'FAILED', error: lastError };
}

export async function enqueueEmail(institutionId: string, payload: EnqueueEmailPayload) {
  const academicYear = payload.academicYear ?? '2025-26';
  const trackingId = generateTrackingId();

  const item = await prisma.commEmailQueueItem.create({
    data: {
      institutionId,
      toEmail: payload.toEmail.trim(),
      toName: payload.toName ?? '',
      subject: payload.subject,
      bodyHtml: payload.bodyHtml,
      bodyPlain: payload.bodyPlain ?? payload.bodyHtml.replace(/<[^>]+>/g, ' ').trim(),
      campaignType: payload.campaignType ?? 'TRANSACTIONAL',
      trackingId,
      sourceModule: payload.sourceModule ?? 'Email Management',
      academicYear,
    },
  });

  if (payload.processNow !== false) {
    const result = await processEmailQueueItem(institutionId, item.id);
    return { message: result.status === 'SENT' ? 'Email sent successfully.' : `Dispatch ${result.status}.`, queueItemId: item.id, trackingId, ...result };
  }

  return { message: 'Email queued.', queueItemId: item.id, trackingId, status: 'QUEUED' };
}

export async function processEmailQueue(institutionId: string, academicYear = '2025-26') {
  const pending = await prisma.commEmailQueueItem.findMany({
    where: { institutionId, academicYear, status: 'QUEUED' },
    orderBy: { queuedAt: 'asc' },
    take: 50,
  });
  const results = [];
  for (const item of pending) {
    results.push(await processEmailQueueItem(institutionId, item.id));
  }
  return { processed: results.length, results };
}

export async function recordEmailOpen(trackingId: string, userAgent = '', ipAddress = '') {
  const item = await prisma.commEmailQueueItem.findUnique({ where: { trackingId } });
  if (!item) return null;

  await prisma.commEmailTrackingEvent.create({
    data: {
      institutionId: item.institutionId,
      queueItemId: item.id,
      eventType: 'OPEN',
      userAgent: userAgent.slice(0, 300),
      ipAddress: ipAddress.slice(0, 64),
    },
  });

  await prisma.commEmailQueueItem.update({
    where: { id: item.id },
    data: {
      openCount: { increment: 1 },
      openedAt: item.openedAt ?? new Date(),
    },
  });

  await prisma.commDeliveryLog.updateMany({
    where: { institutionId: item.institutionId, campaignTitle: item.subject, channel: 'EMAIL' },
    data: { openCount: { increment: 1 }, readAt: new Date(), status: 'READ' },
  });

  return item;
}

export async function recordEmailClick(trackingId: string, linkUrl: string, userAgent = '', ipAddress = '') {
  const item = await prisma.commEmailQueueItem.findUnique({ where: { trackingId } });
  if (!item) return null;

  await prisma.commEmailTrackingEvent.create({
    data: {
      institutionId: item.institutionId,
      queueItemId: item.id,
      eventType: 'CLICK',
      linkUrl: linkUrl.slice(0, 500),
      userAgent: userAgent.slice(0, 300),
      ipAddress: ipAddress.slice(0, 64),
    },
  });

  await prisma.commEmailQueueItem.update({
    where: { id: item.id },
    data: {
      clickCount: { increment: 1 },
      firstClickAt: item.firstClickAt ?? new Date(),
    },
  });

  await prisma.commDeliveryLog.updateMany({
    where: { institutionId: item.institutionId, campaignTitle: item.subject, channel: 'EMAIL' },
    data: { clickCount: { increment: 1 } },
  });

  return { item, redirectUrl: linkUrl };
}

export function getTrackingPixelBuffer() {
  return TRACKING_PIXEL;
}

export async function getEmailManagement(
  institutionId: string,
  opts: { academicYear?: string; userRole?: string } = {},
) {
  const academicYear = opts.academicYear ?? '2025-26';
  const userRole = opts.userRole ?? 'Principal';

  const [gateways, queueStats, recentQueue, recentEvents, campaignStats] = await Promise.all([
    prisma.commEmailSmtpGateway.findMany({
      where: { institutionId, academicYear },
      orderBy: [{ priority: 'asc' }, { gatewayName: 'asc' }],
    }),
    prisma.commEmailQueueItem.groupBy({
      by: ['status'],
      where: { institutionId, academicYear },
      _count: { _all: true },
    }),
    prisma.commEmailQueueItem.findMany({
      where: { institutionId, academicYear },
      orderBy: { queuedAt: 'desc' },
      take: 15,
      include: { gateway: { select: { gatewayCode: true, gatewayName: true } } },
    }),
    prisma.commEmailTrackingEvent.findMany({
      where: { institutionId },
      orderBy: { createdAt: 'desc' },
      take: 12,
      include: { queueItem: { select: { subject: true, toEmail: true } } },
    }),
    prisma.commEmailQueueItem.aggregate({
      where: { institutionId, academicYear, status: 'SENT' },
      _sum: { openCount: true, clickCount: true },
      _count: { _all: true },
    }),
  ]);

  const statusMap = Object.fromEntries(queueStats.map((s) => [s.status, s._count._all]));
  const sentCount = campaignStats._count._all || 0;
  const totalOpens = campaignStats._sum.openCount ?? 0;
  const totalClicks = campaignStats._sum.clickCount ?? 0;

  return {
    academicYear,
    academicYears: ACADEMIC_YEARS,
    userRole,
    permissions: {
      canManageGateways: canManage(userRole),
      canSendTest: canManage(userRole),
      canProcessQueue: canManage(userRole),
    },
    kpis: {
      activeGateways: gateways.filter((g) => g.status === 'ACTIVE').length,
      sentToday: gateways.reduce((s, g) => s + g.sentToday, 0),
      queued: statusMap.QUEUED ?? 0,
      sent: statusMap.SENT ?? 0,
      failed: statusMap.FAILED ?? 0,
      totalOpens,
      totalClicks,
      openRate: sentCount > 0 ? Math.round((totalOpens / sentCount) * 1000) / 10 : 0,
      clickRate: sentCount > 0 ? Math.round((totalClicks / sentCount) * 1000) / 10 : 0,
    },
    gateways: gateways.map((g) => ({
      id: g.id,
      code: g.gatewayCode,
      name: g.gatewayName,
      provider: g.provider,
      smtpHost: g.smtpHost,
      smtpPort: g.smtpPort,
      fromEmail: g.fromEmail,
      fromName: g.fromName,
      apiKeyMasked: g.apiKeyMasked,
      priority: g.priority,
      status: g.status,
      dailyLimit: g.dailyLimit,
      sentToday: g.sentToday,
      costPerEmail: g.costPerEmail,
      trackOpens: g.trackOpens,
      trackClicks: g.trackClicks,
      simulate503: g.simulate503,
      utilizationPct: g.dailyLimit > 0 ? Math.round((g.sentToday / g.dailyLimit) * 1000) / 10 : 0,
      lastHealthCheck: g.lastHealthCheck?.toISOString() ?? null,
    })),
    recentQueue: recentQueue.map((q) => ({
      id: q.id,
      toEmail: maskEmail(q.toEmail),
      subject: q.subject,
      campaignType: q.campaignType,
      status: q.status,
      gateway: q.gateway?.gatewayCode ?? '—',
      openCount: q.openCount,
      clickCount: q.clickCount,
      trackingId: q.trackingId,
      queuedAt: q.queuedAt.toISOString(),
      sentAt: q.sentAt?.toISOString() ?? null,
      lastError: q.lastError,
    })),
    recentTrackingEvents: recentEvents.map((e) => ({
      id: e.id,
      eventType: e.eventType,
      subject: e.queueItem.subject,
      recipient: maskEmail(e.queueItem.toEmail),
      linkUrl: e.linkUrl,
      createdAt: e.createdAt.toISOString(),
    })),
    providers: [
      { code: 'SENDGRID', label: 'SendGrid' },
      { code: 'SES', label: 'Amazon SES' },
      { code: 'SMTP', label: 'Custom SMTP' },
    ],
    campaignTypes: [
      { code: 'TRANSACTIONAL', label: 'Transactional' },
      { code: 'MARKETING', label: 'Marketing' },
    ],
    trackingNote: 'Open tracking uses a 1×1 pixel; click tracking rewrites links through the ERP redirect endpoint.',
    failoverNote: 'If primary SMTP returns 503, the queue worker immediately shifts to the backup gateway.',
  };
}

export async function createEmailGateway(institutionId: string, input: EmailGatewayInput) {
  if (!canManage(input.userRole ?? '')) throw new Error('Insufficient permissions.');
  const academicYear = input.academicYear ?? '2025-26';
  const code = input.gatewayCode?.trim() || `EMAIL-GW-${Date.now().toString(36).toUpperCase()}`;

  await prisma.commEmailSmtpGateway.create({
    data: {
      institutionId,
      gatewayCode: code,
      gatewayName: input.gatewayName,
      provider: input.provider ?? 'SENDGRID',
      smtpHost: input.smtpHost ?? '',
      smtpPort: input.smtpPort ?? 587,
      fromEmail: input.fromEmail,
      fromName: input.fromName ?? '',
      apiKeyMasked: input.apiKeyMasked ?? '****',
      priority: input.priority ?? 2,
      status: input.status ?? 'ACTIVE',
      dailyLimit: input.dailyLimit ?? 50000,
      costPerEmail: input.costPerEmail ?? 0.05,
      trackOpens: input.trackOpens ?? true,
      trackClicks: input.trackClicks ?? true,
      simulate503: input.simulate503 ?? false,
      academicYear,
    },
  });

  await logActivity(institutionId, 'EMAIL_GATEWAY_CREATED', code, { code }, input.userRole);
  return { message: `Email gateway ${code} created.`, data: await getEmailManagement(institutionId, { academicYear, userRole: input.userRole }) };
}

export async function updateEmailGateway(institutionId: string, gatewayId: string, input: EmailGatewayInput) {
  if (!canManage(input.userRole ?? '')) throw new Error('Insufficient permissions.');
  const existing = await prisma.commEmailSmtpGateway.findFirst({ where: { id: gatewayId, institutionId } });
  if (!existing) throw new Error('Gateway not found.');

  await prisma.commEmailSmtpGateway.update({
    where: { id: gatewayId },
    data: {
      gatewayName: input.gatewayName ?? existing.gatewayName,
      provider: input.provider ?? existing.provider,
      smtpHost: input.smtpHost ?? existing.smtpHost,
      smtpPort: input.smtpPort ?? existing.smtpPort,
      fromEmail: input.fromEmail ?? existing.fromEmail,
      fromName: input.fromName ?? existing.fromName,
      apiKeyMasked: input.apiKeyMasked ?? existing.apiKeyMasked,
      priority: input.priority ?? existing.priority,
      status: input.status ?? existing.status,
      dailyLimit: input.dailyLimit ?? existing.dailyLimit,
      costPerEmail: input.costPerEmail ?? existing.costPerEmail,
      trackOpens: input.trackOpens ?? existing.trackOpens,
      trackClicks: input.trackClicks ?? existing.trackClicks,
      simulate503: input.simulate503 ?? existing.simulate503,
    },
  });

  return { message: 'Email gateway updated.', data: await getEmailManagement(institutionId, { academicYear: existing.academicYear, userRole: input.userRole }) };
}

export async function simulateEmailEngagement(institutionId: string, trackingId: string) {
  const item = await prisma.commEmailQueueItem.findFirst({
    where: { institutionId, trackingId, status: 'SENT' },
  });
  if (!item) throw new Error('Sent email not found for tracking ID.');

  await recordEmailOpen(trackingId, 'Simulated Browser', '127.0.0.1');
  await recordEmailClick(trackingId, 'https://school.example.com/portal', 'Simulated Browser', '127.0.0.1');

  return {
    message: 'Simulated open and click recorded.',
    data: await getEmailManagement(institutionId),
  };
}

export async function seedEmailManagement(institutionId: string) {
  const academicYear = '2025-26';

  const gateways = [
    {
      code: 'EMAIL_GW_A',
      name: 'Primary — SendGrid',
      provider: 'SENDGRID',
      host: 'smtp.sendgrid.net',
      from: 'noreply@schoolerp.demo',
      priority: 1,
      sentToday: 1240,
      simulate503: true,
    },
    {
      code: 'EMAIL_GW_B',
      name: 'Failover — Amazon SES',
      provider: 'SES',
      host: 'email-smtp.ap-south-1.amazonaws.com',
      from: 'notifications@schoolerp.demo',
      priority: 2,
      sentToday: 380,
      simulate503: false,
    },
    {
      code: 'EMAIL_GW_C',
      name: 'Marketing — SendGrid',
      provider: 'SENDGRID',
      host: 'smtp.sendgrid.net',
      from: 'marketing@schoolerp.demo',
      priority: 3,
      sentToday: 890,
      status: 'STANDBY',
      simulate503: false,
    },
  ];

  for (const g of gateways) {
    await prisma.commEmailSmtpGateway.upsert({
      where: { institutionId_gatewayCode_academicYear: { institutionId, gatewayCode: g.code, academicYear } },
      create: {
        institutionId,
        gatewayCode: g.code,
        gatewayName: g.name,
        provider: g.provider,
        smtpHost: g.host,
        smtpPort: 587,
        fromEmail: g.from,
        fromName: 'School ERP',
        apiKeyMasked: '****SG',
        priority: g.priority,
        status: g.status ?? 'ACTIVE',
        dailyLimit: 50000,
        sentToday: g.sentToday,
        costPerEmail: 0.05,
        trackOpens: true,
        trackClicks: true,
        simulate503: g.simulate503,
        academicYear,
        lastHealthCheck: new Date(),
      },
      update: { simulate503: g.simulate503, sentToday: g.sentToday },
    });
  }

  await prisma.commChannel.upsert({
    where: { institutionId_channelCode_academicYear: { institutionId, channelCode: 'EMAIL', academicYear } },
    create: {
      institutionId,
      channelCode: 'EMAIL',
      channelName: 'Email SMTP Pool',
      gatewayProvider: 'SendGrid + SES',
      creditsBalance: 99999,
      costPerUnit: 0.05,
      academicYear,
    },
    update: { status: 'ACTIVE', gatewayProvider: 'SendGrid + SES' },
  });

  const existing = await prisma.commEmailQueueItem.count({ where: { institutionId } });
  if (existing === 0) {
    const samples = [
      {
        to: 'parent@example.com',
        subject: 'Fee Receipt — Term 2',
        html: '<p>Dear Parent,</p><p>Your fee payment has been received. <a href="https://school.example.com/receipt">View Receipt</a></p>',
        type: 'TRANSACTIONAL',
      },
      {
        to: 'teacher@example.com',
        subject: 'Summer Camp Registration Open',
        html: '<p>Register now for Summer Camp 2025! <a href="https://school.example.com/camp">Learn More</a></p>',
        type: 'MARKETING',
      },
    ];

    for (const s of samples) {
      const trackingId = generateTrackingId();
      await prisma.commEmailQueueItem.create({
        data: {
          institutionId,
          toEmail: s.to,
          subject: s.subject,
          bodyHtml: s.html,
          bodyPlain: s.html.replace(/<[^>]+>/g, ' '),
          campaignType: s.type,
          trackingId,
          status: 'SENT',
          sentAt: new Date(),
          academicYear,
        },
      });
    }
  }

  return getEmailManagement(institutionId, { academicYear, userRole: 'Super Admin' });
}
