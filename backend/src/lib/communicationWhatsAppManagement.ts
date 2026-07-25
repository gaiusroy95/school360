import { randomBytes } from 'crypto';
import { Prisma } from '@prisma/client';
import { prisma } from './prisma.js';

const ACADEMIC_YEARS = ['2023-24', '2024-25', '2025-26', '2026-27'];
const WINDOW_HOURS = 24;
const ADMIN_ROLES = new Set(['Super Admin', 'Principal', 'Management', 'Admin', 'Communication Manager', 'Reception', 'Helpdesk']);

const MEDIA_LIMITS: Record<string, number> = {
  IMAGE: 5 * 1024 * 1024,
  PDF: 16 * 1024 * 1024,
  VIDEO: 16 * 1024 * 1024,
};

export type SendWhatsAppPayload = {
  mobile: string;
  body?: string;
  messageType?: 'TEXT' | 'TEMPLATE' | 'IMAGE' | 'PDF' | 'VIDEO';
  templateCode?: string;
  mediaUrl?: string;
  mediaMimeType?: string;
  mediaFileName?: string;
  mediaSize?: number;
  contactName?: string;
  sentBy?: string;
  userRole?: string;
  academicYear?: string;
};

function canManage(userRole: string) {
  return ADMIN_ROLES.has(userRole);
}

function maskMobile(mobile: string) {
  if (mobile.length < 6) return '******';
  return `+${mobile.slice(0, 2)}******${mobile.slice(-4)}`;
}

/** Validates E.164-style number with country code (no + prefix in storage) */
export function normalizeWaMobile(mobile: string) {
  const digits = mobile.replace(/\D/g, '');
  if (digits.length < 11 || digits.length > 15) {
    throw new Error('Phone number must include country code (11–15 digits, e.g. 919876543210).');
  }
  if (digits.length === 10) {
    throw new Error('Local 10-digit numbers are not allowed — include country code (e.g. 91 for India).');
  }
  return digits;
}

function windowExpiryFrom(inboundAt: Date) {
  return new Date(inboundAt.getTime() + WINDOW_HOURS * 60 * 60 * 1000);
}

function isWindowActive(windowExpiresAt: Date | null | undefined) {
  if (!windowExpiresAt) return false;
  return windowExpiresAt.getTime() > Date.now();
}

async function logActivity(
  institutionId: string,
  action: string,
  details: string,
  snapshot: Record<string, unknown> = {},
  performedBy = 'WhatsApp Manager',
) {
  await prisma.commActivityLog.create({
    data: { institutionId, action, details, filterSnapshot: snapshot as Prisma.InputJsonValue, performedBy },
  });
}

async function getOrCreateSession(institutionId: string, mobile: string, contactName: string, academicYear: string) {
  let session = await prisma.commWaSession.findUnique({
    where: { institutionId_mobile: { institutionId, mobile } },
  });
  if (!session) {
    session = await prisma.commWaSession.create({
      data: { institutionId, mobile, contactName, academicYear },
    });
  } else if (contactName && !session.contactName) {
    session = await prisma.commWaSession.update({
      where: { id: session.id },
      data: { contactName },
    });
  }
  return session;
}

async function refreshSessionWindow(sessionId: string, inboundAt: Date) {
  const expires = windowExpiryFrom(inboundAt);
  return prisma.commWaSession.update({
    where: { id: sessionId },
    data: {
      lastInboundAt: inboundAt,
      windowExpiresAt: expires,
      isWindowOpen: true,
      updatedAt: new Date(),
    },
  });
}

export async function checkOptInStatus(institutionId: string, mobile: string) {
  const normalized = normalizeWaMobile(mobile);
  const row = await prisma.commWaOptIn.findUnique({
    where: { institutionId_mobile: { institutionId, mobile: normalized } },
  });
  return {
    mobile: normalized,
    optedIn: row?.optInStatus === 'OPTED_IN',
    status: row?.optInStatus ?? 'NOT_REGISTERED',
    contactName: row?.contactName ?? '',
  };
}

export async function registerOptIn(
  institutionId: string,
  mobile: string,
  contactName = '',
  source = 'MANUAL',
  userRole = 'Super Admin',
) {
  if (!canManage(userRole)) throw new Error('Insufficient permissions.');
  const normalized = normalizeWaMobile(mobile);
  await prisma.commWaOptIn.upsert({
    where: { institutionId_mobile: { institutionId, mobile: normalized } },
    create: {
      institutionId,
      mobile: normalized,
      contactName,
      optInStatus: 'OPTED_IN',
      optInSource: source,
    },
    update: {
      contactName: contactName || undefined,
      optInStatus: 'OPTED_IN',
      optedOutAt: null,
      optInAt: new Date(),
      optInSource: source,
    },
  });
  return { message: `Opt-in registered for +${normalized}.`, mobile: normalized };
}

export async function registerOptOut(institutionId: string, mobile: string, userRole = 'Super Admin') {
  if (!canManage(userRole)) throw new Error('Insufficient permissions.');
  const normalized = normalizeWaMobile(mobile);
  await prisma.commWaOptIn.upsert({
    where: { institutionId_mobile: { institutionId, mobile: normalized } },
    create: {
      institutionId,
      mobile: normalized,
      optInStatus: 'OPTED_OUT',
      optedOutAt: new Date(),
    },
    update: { optInStatus: 'OPTED_OUT', optedOutAt: new Date() },
  });
  return { message: `Opt-out recorded for +${normalized}.` };
}

export async function getSessionWindowInfo(institutionId: string, mobile: string) {
  const normalized = normalizeWaMobile(mobile);
  const session = await prisma.commWaSession.findUnique({
    where: { institutionId_mobile: { institutionId, mobile: normalized } },
  });
  const open = isWindowActive(session?.windowExpiresAt);
  return {
    mobile: normalized,
    isWindowOpen: open,
    lastInboundAt: session?.lastInboundAt?.toISOString() ?? null,
    windowExpiresAt: session?.windowExpiresAt?.toISOString() ?? null,
    hoursRemaining: session?.windowExpiresAt
      ? Math.max(0, Math.round((session.windowExpiresAt.getTime() - Date.now()) / 3600000 * 10) / 10)
      : 0,
    allowFreeform: open,
    requireTemplate: !open,
  };
}

function validateMedia(messageType: string, mediaSize = 0) {
  const limit = MEDIA_LIMITS[messageType];
  if (limit && mediaSize > limit) {
    const mb = Math.round(limit / (1024 * 1024));
    throw new Error(`${messageType} attachment exceeds ${mb}MB WhatsApp limit.`);
  }
}

async function dispatchToVendor(
  institutionId: string,
  gateway: { gatewayCode: string; provider: string; costPerMessage: number },
  mobile: string,
  payload: SendWhatsAppPayload,
) {
  const apiKey = process.env.WHATSAPP_API_KEY?.trim() || process.env.GUPSHUP_API_KEY?.trim();
  const vendorMessageId = `wa-${randomBytes(8).toString('hex')}`;

  if (!apiKey) {
    await prisma.messageDispatchLog.create({
      data: {
        institutionId,
        channel: 'WHATSAPP',
        recipient: mobile,
        template: payload.templateCode || payload.messageType || 'TEXT',
        status: 'STUB_SENT',
        response: (payload.body ?? '').slice(0, 200),
      },
    }).catch(() => {});
    return { vendorMessageId, sent: true, cost: gateway.costPerMessage };
  }

  const apiUrl = process.env.WHATSAPP_API_URL?.trim();
  if (apiUrl) {
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: mobile,
        type: payload.messageType?.toLowerCase() ?? 'text',
        text: payload.body ? { body: payload.body } : undefined,
        template: payload.templateCode ? { name: payload.templateCode } : undefined,
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text.slice(0, 200) || 'WhatsApp API dispatch failed.');
    }
  }

  return { vendorMessageId, sent: true, cost: gateway.costPerMessage };
}

export async function sendWhatsAppMessage(institutionId: string, payload: SendWhatsAppPayload) {
  const academicYear = payload.academicYear ?? '2025-26';
  const normalized = normalizeWaMobile(payload.mobile);
  const messageType = payload.messageType ?? (payload.templateCode ? 'TEMPLATE' : 'TEXT');

  const optIn = await checkOptInStatus(institutionId, normalized);
  if (!optIn.optedIn) {
    throw new Error('Recipient has not opted in to WhatsApp communications.');
  }

  const window = await getSessionWindowInfo(institutionId, normalized);
  const isFreeform = messageType === 'TEXT' || ['IMAGE', 'PDF', 'VIDEO'].includes(messageType);
  if (isFreeform && !payload.templateCode && window.requireTemplate) {
    throw new Error(
      '24-hour customer service window has expired. Only approved templates are allowed. Ask the parent to reply first.',
    );
  }
  if (messageType === 'TEMPLATE' && !payload.templateCode) {
    throw new Error('Template code is required for template messages.');
  }
  if (['IMAGE', 'PDF', 'VIDEO'].includes(messageType) && !payload.mediaUrl) {
    throw new Error(`Media URL is required for ${messageType} messages.`);
  }
  validateMedia(messageType, payload.mediaSize ?? 0);

  const gateway = await prisma.commWaGateway.findFirst({
    where: { institutionId, academicYear, status: 'ACTIVE' },
    orderBy: { gatewayCode: 'asc' },
  });
  if (!gateway) throw new Error('No active WhatsApp gateway configured.');

  const session = await getOrCreateSession(institutionId, normalized, payload.contactName ?? optIn.contactName, academicYear);

  const msg = await prisma.commWaMessage.create({
    data: {
      institutionId,
      sessionId: session.id,
      mobile: normalized,
      direction: 'OUTBOUND',
      messageType,
      body: payload.body ?? '',
      templateCode: payload.templateCode ?? '',
      mediaUrl: payload.mediaUrl ?? '',
      mediaMimeType: payload.mediaMimeType ?? '',
      mediaFileName: payload.mediaFileName ?? '',
      mediaSize: payload.mediaSize ?? 0,
      status: 'QUEUED',
      sentBy: payload.sentBy ?? payload.userRole ?? 'Helpdesk',
      academicYear,
    },
  });

  try {
    const result = await dispatchToVendor(institutionId, gateway, normalized, payload);
    const now = new Date();
    await prisma.commWaMessage.update({
      where: { id: msg.id },
      data: {
        status: 'SENT',
        vendorMessageId: result.vendorMessageId,
        cost: result.cost,
        sentAt: now,
      },
    });

    await prisma.commWaSession.update({
      where: { id: session.id },
      data: {
        lastMessagePreview: (payload.body || `[${messageType}]`).slice(0, 120),
        updatedAt: now,
      },
    });

    await prisma.commWaGateway.update({
      where: { id: gateway.id },
      data: { creditsBalance: { decrement: result.cost } },
    });

    await prisma.commDeliveryLog.create({
      data: {
        institutionId,
        channel: 'WHATSAPP',
        campaignTitle: payload.templateCode || 'WhatsApp Message',
        messagePreview: (payload.body ?? '').slice(0, 120),
        recipientCount: 1,
        maskedRecipient: maskMobile(normalized),
        status: 'DELIVERED',
        cost: result.cost,
        sourceModule: 'WhatsApp Management',
        academicYear,
      },
    });

    await simulateWebhookProgression(institutionId, msg.id, result.vendorMessageId);

    return {
      message: 'WhatsApp message dispatched.',
      messageId: msg.id,
      vendorMessageId: result.vendorMessageId,
      windowOpen: window.isWindowOpen,
      usedTemplate: !!payload.templateCode || messageType === 'TEMPLATE',
    };
  } catch (e) {
    const reason = e instanceof Error ? e.message : 'Dispatch failed';
    await prisma.commWaMessage.update({
      where: { id: msg.id },
      data: { status: 'FAILED', failedReason: reason },
    });
    throw e;
  }
}

async function simulateWebhookProgression(institutionId: string, messageId: string, vendorMessageId: string) {
  for (const eventType of ['DELIVERED', 'READ'] as const) {
    await handleWhatsAppWebhook(institutionId, {
      vendorMessageId,
      eventType,
      messageId,
    });
  }
}

export async function recordInboundMessage(
  institutionId: string,
  mobile: string,
  body: string,
  contactName = '',
  academicYear = '2025-26',
) {
  const normalized = normalizeWaMobile(mobile);
  const now = new Date();
  const session = await getOrCreateSession(institutionId, normalized, contactName, academicYear);
  await refreshSessionWindow(session.id, now);

  const msg = await prisma.commWaMessage.create({
    data: {
      institutionId,
      sessionId: session.id,
      mobile: normalized,
      direction: 'INBOUND',
      messageType: 'TEXT',
      body,
      status: 'DELIVERED',
      sentAt: now,
      deliveredAt: now,
      academicYear,
    },
  });

  await prisma.commWaSession.update({
    where: { id: session.id },
    data: {
      lastMessagePreview: body.slice(0, 120),
      unreadCount: { increment: 1 },
      contactName: contactName || session.contactName,
    },
  });

  return { messageId: msg.id, sessionId: session.id, windowExpiresAt: windowExpiryFrom(now).toISOString() };
}

export async function handleWhatsAppWebhook(
  institutionId: string,
  payload: {
    vendorMessageId?: string;
    messageId?: string;
    eventType: 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
    failedReason?: string;
  },
) {
  const msg = payload.messageId
    ? await prisma.commWaMessage.findFirst({ where: { id: payload.messageId, institutionId } })
    : await prisma.commWaMessage.findFirst({
        where: { institutionId, vendorMessageId: payload.vendorMessageId ?? '' },
      });
  if (!msg) return { ok: false, reason: 'Message not found' };

  const now = new Date();
  const updates: Prisma.CommWaMessageUpdateInput = {};
  if (payload.eventType === 'DELIVERED') {
    updates.status = 'DELIVERED';
    updates.deliveredAt = now;
  } else if (payload.eventType === 'READ') {
    updates.status = 'READ';
    updates.readAt = now;
    if (!msg.deliveredAt) updates.deliveredAt = now;
  } else if (payload.eventType === 'FAILED') {
    updates.status = 'FAILED';
    updates.failedReason = payload.failedReason ?? 'Delivery failed';
  } else if (payload.eventType === 'SENT') {
    updates.status = 'SENT';
    updates.sentAt = now;
  }

  await prisma.commWaMessage.update({ where: { id: msg.id }, data: updates });

  await prisma.commWaWebhookEvent.create({
    data: {
      institutionId,
      messageId: msg.id,
      eventType: payload.eventType,
      vendorMessageId: payload.vendorMessageId ?? msg.vendorMessageId,
      payload: payload as Prisma.InputJsonValue,
    },
  });

  if (payload.eventType === 'READ') {
    await prisma.commDeliveryLog.updateMany({
      where: { institutionId, channel: 'WHATSAPP', maskedRecipient: { contains: msg.mobile.slice(-4) } },
      data: { readAt: now, status: 'READ', openCount: { increment: 1 } },
    });
  }

  return { ok: true, messageId: msg.id, status: payload.eventType };
}

export async function getConversationMessages(institutionId: string, mobile: string) {
  const normalized = normalizeWaMobile(mobile);
  const [session, messages, window, optIn] = await Promise.all([
    prisma.commWaSession.findUnique({ where: { institutionId_mobile: { institutionId, mobile: normalized } } }),
    prisma.commWaMessage.findMany({
      where: { institutionId, mobile: normalized },
      orderBy: { createdAt: 'asc' },
      take: 100,
    }),
    getSessionWindowInfo(institutionId, normalized),
    checkOptInStatus(institutionId, normalized),
  ]);

  if (session) {
    await prisma.commWaSession.update({
      where: { id: session.id },
      data: { unreadCount: 0 },
    });
  }

  return {
    mobile: normalized,
    maskedMobile: maskMobile(normalized),
    contactName: session?.contactName || optIn.contactName || 'Parent',
    window,
    optIn,
    messages: messages.map((m) => ({
      id: m.id,
      direction: m.direction,
      messageType: m.messageType,
      body: m.body,
      templateCode: m.templateCode,
      mediaUrl: m.mediaUrl,
      mediaFileName: m.mediaFileName,
      status: m.status,
      sentBy: m.sentBy,
      sentAt: m.sentAt?.toISOString() ?? m.createdAt.toISOString(),
      deliveredAt: m.deliveredAt?.toISOString() ?? null,
      readAt: m.readAt?.toISOString() ?? null,
    })),
  };
}

export async function getWhatsAppManagement(
  institutionId: string,
  opts: { academicYear?: string; userRole?: string } = {},
) {
  const academicYear = opts.academicYear ?? '2025-26';
  const userRole = opts.userRole ?? 'Principal';

  const [gateway, sessions, stats, templates, optInCount, recentWebhooks] = await Promise.all([
    prisma.commWaGateway.findFirst({ where: { institutionId, academicYear, status: 'ACTIVE' } }),
    prisma.commWaSession.findMany({
      where: { institutionId, academicYear },
      orderBy: { updatedAt: 'desc' },
      take: 30,
    }),
    prisma.commWaMessage.groupBy({
      by: ['status'],
      where: { institutionId, academicYear, direction: 'OUTBOUND' },
      _count: { _all: true },
    }),
    prisma.commMessageTemplate.findMany({
      where: { institutionId, academicYear, channel: 'WHATSAPP', gatewayStatus: 'APPROVED', isActive: true },
      orderBy: { templateName: 'asc' },
      take: 20,
    }),
    prisma.commWaOptIn.count({ where: { institutionId, optInStatus: 'OPTED_IN' } }),
    prisma.commWaWebhookEvent.findMany({
      where: { institutionId },
      orderBy: { createdAt: 'desc' },
      take: 8,
    }),
  ]);

  const statusMap = Object.fromEntries(stats.map((s) => [s.status, s._count._all]));
  const sent = (statusMap.SENT ?? 0) + (statusMap.DELIVERED ?? 0) + (statusMap.READ ?? 0);
  const read = statusMap.READ ?? 0;
  const delivered = (statusMap.DELIVERED ?? 0) + read;
  const readRate = delivered > 0 ? Math.round((read / delivered) * 1000) / 10 : 0;

  const openWindows = sessions.filter((s) => isWindowActive(s.windowExpiresAt)).length;

  return {
    academicYear,
    academicYears: ACADEMIC_YEARS,
    userRole,
    permissions: {
      canManage: canManage(userRole),
      canReplyInbox: canManage(userRole),
      canManageOptIn: canManage(userRole),
    },
    kpis: {
      whatsappSent: sent,
      delivered,
      read,
      readRate,
      failed: statusMap.FAILED ?? 0,
      openWindows,
      optedInContacts: optInCount,
      creditsBalance: gateway?.creditsBalance ?? 0,
      costPerMessage: gateway?.costPerMessage ?? 0.45,
    },
    gateway: gateway
      ? {
          code: gateway.gatewayCode,
          name: gateway.gatewayName,
          provider: gateway.provider,
          status: gateway.status,
          creditsBalance: gateway.creditsBalance,
          creditAlertAt: gateway.creditAlertAt,
          lowCredits: gateway.creditsBalance <= gateway.creditAlertAt,
        }
      : null,
    inbox: sessions.map((s) => ({
      id: s.id,
      mobile: s.mobile,
      maskedMobile: maskMobile(s.mobile),
      contactName: s.contactName || 'Parent',
      lastMessagePreview: s.lastMessagePreview,
      unreadCount: s.unreadCount,
      isWindowOpen: isWindowActive(s.windowExpiresAt),
      windowExpiresAt: s.windowExpiresAt?.toISOString() ?? null,
      hoursRemaining: s.windowExpiresAt
        ? Math.max(0, Math.round((s.windowExpiresAt.getTime() - Date.now()) / 3600000 * 10) / 10)
        : 0,
      lastInboundAt: s.lastInboundAt?.toISOString() ?? null,
      assignedTo: s.assignedTo,
      updatedAt: s.updatedAt.toISOString(),
    })),
    approvedTemplates: templates.map((t) => ({
      code: t.templateCode,
      name: t.templateName,
      body: t.body,
      category: t.category,
    })),
    recentWebhooks: recentWebhooks.map((w) => ({
      id: w.id,
      eventType: w.eventType,
      vendorMessageId: w.vendorMessageId,
      createdAt: w.createdAt.toISOString(),
    })),
    mediaLimits: {
      IMAGE: '5 MB',
      PDF: '16 MB',
      VIDEO: '16 MB',
    },
    workflowSteps: [
      'Check Recipient Opt-in Status',
      'Identify 24h Customer Service Window',
      'Freeform (in window) or Template Only (expired)',
      'Dispatch via Vendor API',
      'Receive Webhooks (Sent, Delivered, Read, Failed)',
    ],
    complianceNotes: [
      'Free-form messaging blocked when 24-hour session has expired.',
      'Phone numbers must include country code (e.g. 91XXXXXXXXXX).',
      'Only Meta-approved templates allowed outside the service window.',
      'Opt-in required before any outbound WhatsApp message.',
    ],
  };
}

export async function seedWhatsAppManagement(institutionId: string) {
  const academicYear = '2025-26';

  await prisma.commWaGateway.upsert({
    where: { institutionId_gatewayCode_academicYear: { institutionId, gatewayCode: 'WA_PRIMARY', academicYear } },
    create: {
      institutionId,
      gatewayCode: 'WA_PRIMARY',
      gatewayName: 'WhatsApp Business — Gupshup',
      provider: 'GUPSHUP',
      phoneNumberId: '1234567890',
      businessAccountId: 'META-BIZ-360',
      apiKeyMasked: '****GUP',
      creditsBalance: 8500,
      costPerMessage: 0.45,
      academicYear,
    },
    update: { creditsBalance: 8500, status: 'ACTIVE' },
  });

  const contacts = [
    { mobile: '919876543210', name: 'Mr. Kumar', preview: 'What is the PTM date for Class 10?', hoursAgo: 2 },
    { mobile: '919123456789', name: 'Mrs. Sharma', preview: 'Fee receipt not received yet.', hoursAgo: 26 },
    { mobile: '918887776666', name: 'Mr. Patel', preview: 'Thank you for the update!', hoursAgo: 5 },
  ];

  for (const c of contacts) {
    await registerOptIn(institutionId, c.mobile, c.name, 'PARENT_PORTAL', 'Super Admin');
    const inboundAt = new Date(Date.now() - c.hoursAgo * 3600000);
    const session = await getOrCreateSession(institutionId, c.mobile, c.name, academicYear);
    const windowOpen = c.hoursAgo < 24;
    await prisma.commWaSession.update({
      where: { id: session.id },
      data: {
        lastInboundAt: inboundAt,
        windowExpiresAt: windowExpiryFrom(inboundAt),
        isWindowOpen: windowOpen,
        lastMessagePreview: c.preview,
        unreadCount: windowOpen ? 1 : 0,
      },
    });
    await prisma.commWaMessage.create({
      data: {
        institutionId,
        sessionId: session.id,
        mobile: c.mobile,
        direction: 'INBOUND',
        messageType: 'TEXT',
        body: c.preview,
        status: 'DELIVERED',
        deliveredAt: inboundAt,
        sentAt: inboundAt,
        academicYear,
      },
    });
  }

  await prisma.commChannel.upsert({
    where: { institutionId_channelCode_academicYear: { institutionId, channelCode: 'WHATSAPP', academicYear } },
    create: {
      institutionId,
      channelCode: 'WHATSAPP',
      channelName: 'WhatsApp Business API',
      gatewayProvider: 'Gupshup',
      creditsBalance: 8500,
      costPerUnit: 0.45,
      academicYear,
    },
    update: { status: 'ACTIVE', creditsBalance: 8500 },
  });

  const existingOutbound = await prisma.commWaMessage.count({
    where: { institutionId, direction: 'OUTBOUND' },
  });
  if (existingOutbound === 0) {
    await sendWhatsAppMessage(institutionId, {
      mobile: '919876543210',
      body: 'Dear Parent, PTM for Class 10-A is scheduled on Saturday 10 AM.',
      sentBy: 'Helpdesk',
      userRole: 'Super Admin',
      academicYear,
    });
  }

  return getWhatsAppManagement(institutionId, { academicYear, userRole: 'Super Admin' });
}
