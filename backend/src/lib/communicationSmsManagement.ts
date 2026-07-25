import { Prisma } from '@prisma/client';
import { prisma } from './prisma.js';

const ACADEMIC_YEARS = ['2023-24', '2024-25', '2025-26', '2026-27'];
const GSM_SINGLE = 160;
const GSM_CONCAT = 153;
const UNICODE_SINGLE = 70;
const UNICODE_CONCAT = 67;

const ADMIN_ROLES = new Set(['Super Admin', 'Principal', 'Management', 'Admin', 'Communication Manager']);

// Basic GSM 7-bit charset (common subset)
const GSM_REGEX = /^[@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&'()*+,\-./0-9:;<=>?¡A-ZÄÖÑÜ§¿a-zäöñüà^{}\\\[~\]|\u20AC]*$/;

export type SmsSegmentInfo = {
  encoding: 'GSM' | 'UNICODE';
  charCount: number;
  segmentCount: number;
  creditsRequired: number;
  charsPerSegment: number;
  singleSegmentLimit: number;
};

export type SmsGatewayInput = {
  gatewayCode?: string;
  gatewayName: string;
  provider?: string;
  apiEndpoint?: string;
  senderId?: string;
  apiKeyMasked?: string;
  priority?: number;
  status?: string;
  creditsBalance?: number;
  creditAlertAt?: number;
  costPerCredit?: number;
  simulate503?: boolean;
  academicYear?: string;
  userRole?: string;
};

export type EnqueueSmsPayload = {
  mobile: string;
  message: string;
  messageType?: 'TRANSACTIONAL' | 'PROMOTIONAL';
  academicYear?: string;
  sourceModule?: string;
  processNow?: boolean;
};

function canManage(userRole: string) {
  return ADMIN_ROLES.has(userRole);
}

function normalizeMobile(mobile: string) {
  const digits = mobile.replace(/\D/g, '');
  if (digits.length === 10) return digits;
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  return digits;
}

function isGsm7(text: string) {
  return GSM_REGEX.test(text);
}

export function calculateSmsSegments(message: string): SmsSegmentInfo {
  const charCount = [...message].length;
  const encoding: 'GSM' | 'UNICODE' = isGsm7(message) ? 'GSM' : 'UNICODE';
  const singleLimit = encoding === 'GSM' ? GSM_SINGLE : UNICODE_SINGLE;
  const concatUnit = encoding === 'GSM' ? GSM_CONCAT : UNICODE_CONCAT;

  let segmentCount = 1;
  if (charCount <= singleLimit) {
    segmentCount = 1;
  } else {
    segmentCount = Math.ceil(charCount / concatUnit);
  }

  return {
    encoding,
    charCount,
    segmentCount,
    creditsRequired: segmentCount,
    charsPerSegment: charCount <= singleLimit ? singleLimit : concatUnit,
    singleSegmentLimit: singleLimit,
  };
}

async function logActivity(
  institutionId: string,
  action: string,
  details: string,
  snapshot: Record<string, unknown> = {},
  performedBy = 'SMS Manager',
) {
  await prisma.commActivityLog.create({
    data: { institutionId, action, details, filterSnapshot: snapshot as Prisma.InputJsonValue, performedBy },
  });
}

async function isDndNumber(institutionId: string, mobile: string, messageType: string) {
  const normalized = normalizeMobile(mobile);
  const entry = await prisma.commSmsDndEntry.findFirst({
    where: {
      institutionId,
      mobile: normalized,
      OR: [{ category: 'ALL' }, ...(messageType === 'PROMOTIONAL' ? [{ category: 'PROMOTIONAL' }] : [])],
    },
  });
  return !!entry || normalized.endsWith('0000');
}

async function getActiveGateways(institutionId: string, academicYear: string) {
  return prisma.commSmsGateway.findMany({
    where: { institutionId, academicYear, status: { in: ['ACTIVE', 'STANDBY'] } },
    orderBy: [{ priority: 'asc' }, { gatewayName: 'asc' }],
  });
}

type GatewayRow = Awaited<ReturnType<typeof getActiveGateways>>[number];

async function dispatchViaGateway(
  institutionId: string,
  gateway: GatewayRow,
  mobile: string,
  message: string,
) {
  if (gateway.simulate503) {
    return { httpStatus: 503, status: 'FAILED' as const, response: '503 Service Unavailable', sent: false, failover: true };
  }

  const authKey = process.env.MSG91_AUTH_KEY?.trim();
  const recipient = normalizeMobile(mobile);
  if (!authKey || gateway.provider !== 'MSG91') {
    await prisma.messageDispatchLog.create({
      data: {
        institutionId,
        channel: 'SMS',
        recipient: `91${recipient}`,
        template: gateway.gatewayCode,
        status: 'STUB_SENT',
        response: message.slice(0, 200),
      },
    }).catch(() => {});
    return { httpStatus: 200, status: 'SUCCESS' as const, response: 'Stub dispatch OK', sent: true, failover: false };
  }

  const res = await fetch(gateway.apiEndpoint || 'https://control.msg91.com/api/v5/flow/', {
    method: 'POST',
    headers: { authkey: authKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sender: gateway.senderId || 'SCHOOL',
      short_url: '0',
      recipients: [{ mobiles: `91${recipient}`, message }],
    }),
  });

  const text = await res.text();
  const failover = res.status === 503 || res.status === 502 || res.status === 504;
  return {
    httpStatus: res.status,
    status: res.ok ? ('SUCCESS' as const) : ('FAILED' as const),
    response: text.slice(0, 500),
    sent: res.ok,
    failover,
  };
}

export async function processSmsQueueItem(institutionId: string, queueItemId: string) {
  const item = await prisma.commSmsQueueItem.findFirst({
    where: { id: queueItemId, institutionId },
  });
  if (!item || item.status === 'SENT' || item.dndSkipped) return { status: item?.status ?? 'NOT_FOUND' };

  const gateways = await getActiveGateways(institutionId, item.academicYear);
  if (gateways.length === 0) {
    await prisma.commSmsQueueItem.update({
      where: { id: queueItemId },
      data: { status: 'FAILED', lastError: 'No active SMS gateways configured.' },
    });
    return { status: 'FAILED', error: 'No gateways' };
  }

  await prisma.commSmsQueueItem.update({
    where: { id: queueItemId },
    data: { status: 'PROCESSING' },
  });

  let lastError = '';
  for (let i = 0; i < gateways.length; i++) {
    const gateway = gateways[i];
    const result = await dispatchViaGateway(institutionId, gateway, item.mobile, item.message);

    await prisma.commSmsDispatchAttempt.create({
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

    await prisma.commSmsQueueItem.update({
      where: { id: queueItemId },
      data: {
        attemptCount: { increment: 1 },
        gatewayId: gateway.id,
        lastError: result.sent ? '' : result.response,
      },
    });

    if (result.sent) {
      await prisma.commSmsQueueItem.update({
        where: { id: queueItemId },
        data: { status: 'SENT', sentAt: new Date(), gatewayId: gateway.id },
      });
      await prisma.commSmsGateway.update({
        where: { id: gateway.id },
        data: { creditsBalance: { decrement: item.creditsRequired }, lastHealthCheck: new Date() },
      });
      await prisma.commDeliveryLog.create({
        data: {
          institutionId,
          channel: 'SMS',
          campaignTitle: 'SMS Dispatch',
          messagePreview: item.message.slice(0, 120),
          recipientCount: 1,
          maskedRecipient: `**${item.mobile.slice(-4)}`,
          status: 'DELIVERED',
          cost: item.creditsRequired * gateway.costPerCredit,
          sourceModule: item.sourceModule,
          academicYear: item.academicYear,
        },
      });
      return { status: 'SENT', gateway: gateway.gatewayCode, failoverUsed: i > 0 };
    }

    lastError = result.response;
    if (result.failover && i < gateways.length - 1) {
      await logActivity(
        institutionId,
        'SMS_FAILOVER',
        `Gateway ${gateway.gatewayCode} returned ${result.httpStatus} — shifting to ${gateways[i + 1].gatewayCode}`,
        { queueItemId, from: gateway.gatewayCode, to: gateways[i + 1].gatewayCode },
      );
      continue;
    }
    break;
  }

  await prisma.commSmsQueueItem.update({
    where: { id: queueItemId },
    data: { status: 'FAILED', lastError },
  });
  return { status: 'FAILED', error: lastError };
}

export async function enqueueSms(institutionId: string, payload: EnqueueSmsPayload) {
  const academicYear = payload.academicYear ?? '2025-26';
  const messageType = payload.messageType ?? 'TRANSACTIONAL';
  const mobile = normalizeMobile(payload.mobile);
  const segments = calculateSmsSegments(payload.message);

  const dnd = messageType === 'PROMOTIONAL' ? await isDndNumber(institutionId, mobile, messageType) : false;

  const item = await prisma.commSmsQueueItem.create({
    data: {
      institutionId,
      mobile,
      message: payload.message,
      encoding: segments.encoding,
      charCount: segments.charCount,
      segmentCount: segments.segmentCount,
      creditsRequired: segments.creditsRequired,
      messageType,
      status: dnd ? 'DND_SKIPPED' : 'QUEUED',
      dndSkipped: dnd,
      sourceModule: payload.sourceModule ?? 'SMS Management',
      academicYear,
      lastError: dnd ? 'Number on DND registry — promotional SMS blocked.' : '',
    },
  });

  if (dnd) {
    return { message: 'Number scrubbed — on DND registry.', queueItemId: item.id, status: 'DND_SKIPPED', segments };
  }

  if (payload.processNow !== false) {
    const result = await processSmsQueueItem(institutionId, item.id);
    return { message: result.status === 'SENT' ? 'SMS sent successfully.' : `Dispatch ${result.status}.`, queueItemId: item.id, ...result, segments };
  }

  return { message: 'SMS queued.', queueItemId: item.id, status: 'QUEUED', segments };
}

export async function processSmsQueue(institutionId: string, academicYear = '2025-26') {
  const pending = await prisma.commSmsQueueItem.findMany({
    where: { institutionId, academicYear, status: 'QUEUED' },
    orderBy: { queuedAt: 'asc' },
    take: 50,
  });

  const results = [];
  for (const item of pending) {
    results.push(await processSmsQueueItem(institutionId, item.id));
  }

  return { processed: results.length, results };
}

export async function scrubNumbersAgainstDnd(
  institutionId: string,
  mobiles: string[],
  messageType: 'TRANSACTIONAL' | 'PROMOTIONAL' = 'PROMOTIONAL',
) {
  const cleaned: { mobile: string; onDnd: boolean; reason: string }[] = [];
  for (const m of mobiles) {
    const mobile = normalizeMobile(m);
    const onDnd = await isDndNumber(institutionId, mobile, messageType);
    cleaned.push({
      mobile,
      onDnd,
      reason: onDnd ? 'DND registry match' : 'Clear',
    });
  }
  const allowed = cleaned.filter((c) => !c.onDnd);
  const blocked = cleaned.filter((c) => c.onDnd);
  return { total: cleaned.length, allowed: allowed.length, blocked: blocked.length, results: cleaned };
}

export async function getSmsManagement(
  institutionId: string,
  opts: { academicYear?: string; userRole?: string } = {},
) {
  const academicYear = opts.academicYear ?? '2025-26';
  const userRole = opts.userRole ?? 'Principal';

  const [gateways, dndCount, queueStats, recentQueue, recentAttempts, lowCreditGateways] = await Promise.all([
    prisma.commSmsGateway.findMany({
      where: { institutionId, academicYear },
      orderBy: [{ priority: 'asc' }, { gatewayName: 'asc' }],
    }),
    prisma.commSmsDndEntry.count({ where: { institutionId } }),
    prisma.commSmsQueueItem.groupBy({
      by: ['status'],
      where: { institutionId, academicYear },
      _count: { _all: true },
    }),
    prisma.commSmsQueueItem.findMany({
      where: { institutionId, academicYear },
      orderBy: { queuedAt: 'desc' },
      take: 15,
      include: { gateway: { select: { gatewayCode: true, gatewayName: true } } },
    }),
    prisma.commSmsDispatchAttempt.findMany({
      where: { institutionId },
      orderBy: { attemptedAt: 'desc' },
      take: 10,
    }),
    prisma.commSmsGateway.findMany({
      where: { institutionId, academicYear, creditsBalance: { lte: 1000 } },
    }),
  ]);

  const statusMap = Object.fromEntries(queueStats.map((s) => [s.status, s._count._all]));
  const totalCredits = gateways.reduce((sum, g) => sum + g.creditsBalance, 0);

  return {
    academicYear,
    academicYears: ACADEMIC_YEARS,
    userRole,
    permissions: {
      canManageGateways: canManage(userRole),
      canManageDnd: canManage(userRole),
      canSendTest: canManage(userRole),
      canProcessQueue: canManage(userRole),
    },
    segmentRules: {
      gsm: { single: GSM_SINGLE, concat: GSM_CONCAT },
      unicode: { single: UNICODE_SINGLE, concat: UNICODE_CONCAT },
    },
    kpis: {
      activeGateways: gateways.filter((g) => g.status === 'ACTIVE').length,
      totalCredits: Math.round(totalCredits),
      dndEntries: dndCount,
      queued: statusMap.QUEUED ?? 0,
      sent: statusMap.SENT ?? 0,
      failed: statusMap.FAILED ?? 0,
      dndSkipped: statusMap.DND_SKIPPED ?? 0,
    },
    gateways: gateways.map((g) => ({
      id: g.id,
      code: g.gatewayCode,
      name: g.gatewayName,
      provider: g.provider,
      senderId: g.senderId,
      apiKeyMasked: g.apiKeyMasked,
      priority: g.priority,
      status: g.status,
      creditsBalance: g.creditsBalance,
      creditAlertAt: g.creditAlertAt,
      costPerCredit: g.costPerCredit,
      successRate: g.successRate,
      simulate503: g.simulate503,
      lowCredits: g.creditsBalance <= g.creditAlertAt,
      lastHealthCheck: g.lastHealthCheck?.toISOString() ?? null,
    })),
    lowCreditAlerts: lowCreditGateways.map((g) => ({
      gateway: g.gatewayName,
      credits: g.creditsBalance,
      alertAt: g.creditAlertAt,
    })),
    recentQueue: recentQueue.map((q) => ({
      id: q.id,
      mobile: `******${q.mobile.slice(-4)}`,
      message: q.message.slice(0, 60),
      encoding: q.encoding,
      segmentCount: q.segmentCount,
      creditsRequired: q.creditsRequired,
      status: q.status,
      gateway: q.gateway?.gatewayCode ?? '—',
      queuedAt: q.queuedAt.toISOString(),
      sentAt: q.sentAt?.toISOString() ?? null,
      lastError: q.lastError,
    })),
    recentFailovers: recentAttempts
      .filter((a) => a.failover)
      .map((a) => ({
        id: a.id,
        gatewayCode: a.gatewayCode,
        httpStatus: a.httpStatus,
        status: a.status,
        response: a.response.slice(0, 80),
        attemptedAt: a.attemptedAt.toISOString(),
      })),
    failoverNote: 'If Gateway A returns 503, the queue worker immediately shifts payload to Gateway B.',
  };
}

export async function createSmsGateway(institutionId: string, input: SmsGatewayInput) {
  if (!canManage(input.userRole ?? '')) throw new Error('Insufficient permissions.');
  const academicYear = input.academicYear ?? '2025-26';
  const code = input.gatewayCode?.trim() || `GW-${Date.now().toString(36).toUpperCase()}`;

  await prisma.commSmsGateway.create({
    data: {
      institutionId,
      gatewayCode: code,
      gatewayName: input.gatewayName,
      provider: input.provider ?? 'MSG91',
      apiEndpoint: input.apiEndpoint ?? '',
      senderId: input.senderId ?? 'SCHOOL',
      apiKeyMasked: input.apiKeyMasked ?? '****',
      priority: input.priority ?? 2,
      status: input.status ?? 'ACTIVE',
      creditsBalance: input.creditsBalance ?? 10000,
      creditAlertAt: input.creditAlertAt ?? 1000,
      costPerCredit: input.costPerCredit ?? 0.25,
      simulate503: input.simulate503 ?? false,
      academicYear,
    },
  });

  await logActivity(institutionId, 'SMS_GATEWAY_CREATED', code, { code }, input.userRole);
  return { message: `Gateway ${code} created.`, data: await getSmsManagement(institutionId, { academicYear, userRole: input.userRole }) };
}

export async function updateSmsGateway(institutionId: string, gatewayId: string, input: SmsGatewayInput) {
  if (!canManage(input.userRole ?? '')) throw new Error('Insufficient permissions.');

  const existing = await prisma.commSmsGateway.findFirst({ where: { id: gatewayId, institutionId } });
  if (!existing) throw new Error('Gateway not found.');

  await prisma.commSmsGateway.update({
    where: { id: gatewayId },
    data: {
      gatewayName: input.gatewayName ?? existing.gatewayName,
      provider: input.provider ?? existing.provider,
      apiEndpoint: input.apiEndpoint ?? existing.apiEndpoint,
      senderId: input.senderId ?? existing.senderId,
      apiKeyMasked: input.apiKeyMasked ?? existing.apiKeyMasked,
      priority: input.priority ?? existing.priority,
      status: input.status ?? existing.status,
      creditsBalance: input.creditsBalance ?? existing.creditsBalance,
      creditAlertAt: input.creditAlertAt ?? existing.creditAlertAt,
      costPerCredit: input.costPerCredit ?? existing.costPerCredit,
      simulate503: input.simulate503 ?? existing.simulate503,
    },
  });

  return { message: 'Gateway updated.', data: await getSmsManagement(institutionId, { academicYear: existing.academicYear, userRole: input.userRole }) };
}

export async function addDndEntry(institutionId: string, mobile: string, category = 'PROMOTIONAL', notes = '', userRole = 'Super Admin') {
  if (!canManage(userRole)) throw new Error('Insufficient permissions.');
  const normalized = normalizeMobile(mobile);
  await prisma.commSmsDndEntry.upsert({
    where: { institutionId_mobile: { institutionId, mobile: normalized } },
    create: { institutionId, mobile: normalized, category, notes, source: 'MANUAL' },
    update: { category, notes },
  });
  return { message: `DND entry added for ${normalized}.`, data: await getSmsManagement(institutionId, { userRole }) };
}

export async function listDndEntries(institutionId: string, limit = 50) {
  const rows = await prisma.commSmsDndEntry.findMany({
    where: { institutionId },
    orderBy: { registeredAt: 'desc' },
    take: limit,
  });
  return rows.map((r) => ({
    id: r.id,
    mobile: `******${r.mobile.slice(-4)}`,
    fullMobile: r.mobile,
    category: r.category,
    source: r.source,
    notes: r.notes,
    registeredAt: r.registeredAt.toISOString(),
  }));
}

export async function seedSmsManagement(institutionId: string) {
  const academicYear = '2025-26';

  const gateways = [
    { code: 'GATEWAY_A', name: 'Primary — MSG91', provider: 'MSG91', priority: 1, credits: 45000, simulate503: true },
    { code: 'GATEWAY_B', name: 'Failover — TextLocal', provider: 'TEXTLOCAL', priority: 2, credits: 22000, simulate503: false },
    { code: 'GATEWAY_C', name: 'Backup — Twilio', provider: 'TWILIO', priority: 3, credits: 8500, simulate503: false, status: 'STANDBY' },
  ];

  for (const g of gateways) {
    await prisma.commSmsGateway.upsert({
      where: { institutionId_gatewayCode_academicYear: { institutionId, gatewayCode: g.code, academicYear } },
      create: {
        institutionId,
        gatewayCode: g.code,
        gatewayName: g.name,
        provider: g.provider,
        senderId: 'SCHOOL',
        apiKeyMasked: '****MSG91',
        priority: g.priority,
        status: g.status ?? 'ACTIVE',
        creditsBalance: g.credits,
        creditAlertAt: 1000,
        costPerCredit: 0.25,
        simulate503: g.simulate503,
        academicYear,
        lastHealthCheck: new Date(),
      },
      update: { simulate503: g.simulate503, creditsBalance: g.credits },
    });
  }

  const dndNumbers = ['9876500000', '9123400000', '9988770000', '9876543210', '9123456789'];
  for (const mobile of dndNumbers) {
    await prisma.commSmsDndEntry.upsert({
      where: { institutionId_mobile: { institutionId, mobile } },
      create: { institutionId, mobile, category: 'PROMOTIONAL', source: 'TRAI_REGISTRY' },
      update: {},
    });
  }

  await prisma.commChannel.upsert({
    where: { institutionId_channelCode_academicYear: { institutionId, channelCode: 'SMS', academicYear } },
    create: {
      institutionId,
      channelCode: 'SMS',
      channelName: 'SMS Gateway Pool',
      gatewayProvider: 'MSG91 + Failover',
      creditsBalance: 75500,
      costPerUnit: 0.25,
      academicYear,
    },
    update: { creditsBalance: 75500, status: 'ACTIVE' },
  });

  return getSmsManagement(institutionId, { academicYear, userRole: 'Super Admin' });
}
