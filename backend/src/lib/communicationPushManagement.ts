import bcrypt from 'bcryptjs';
import { MobileAppRole, Prisma } from '@prisma/client';
import { prisma } from './prisma.js';
import { deliverPushToTokens } from './pushDelivery.js';

const ACADEMIC_YEARS = ['2023-24', '2024-25', '2025-26', '2026-27'];
const ADMIN_ROLES = new Set(['Super Admin', 'Principal', 'Management', 'Admin', 'Communication Manager']);

export type PushGatewayInput = {
  gatewayCode?: string;
  gatewayName: string;
  provider?: string;
  serverKeyMasked?: string;
  bundleId?: string;
  priority?: number;
  status?: string;
  dailyLimit?: number;
  academicYear?: string;
  userRole?: string;
};

export type SendPushPayload = {
  title: string;
  body: string;
  audienceType?: 'ALL' | 'PARENT' | 'STUDENT' | 'STAFF' | 'CLASS';
  audienceLabel?: string;
  classFilter?: string;
  deepLink?: string;
  category?: string;
  payload?: Record<string, unknown>;
  sentBy?: string;
  userRole?: string;
  academicYear?: string;
  processNow?: boolean;
};

const AUDIENCE_LABELS: Record<string, string> = {
  ALL: 'All App Users',
  PARENT: 'All Parents',
  STUDENT: 'All Students',
  STAFF: 'Staff (Teachers & Admin)',
  CLASS: 'Class / Section',
};

function canManage(userRole: string) {
  return ADMIN_ROLES.has(userRole);
}

function maskToken(token: string) {
  if (token.length <= 8) return '****';
  return `${token.slice(0, 4)}…${token.slice(-4)}`;
}

function audienceRoles(audienceType: string): MobileAppRole[] | null {
  switch (audienceType) {
    case 'PARENT':
      return ['PARENT'];
    case 'STUDENT':
      return ['STUDENT'];
    case 'STAFF':
      return ['TEACHER', 'PRINCIPAL', 'TRANSPORT'];
    case 'ALL':
    case 'CLASS':
      return null;
    default:
      return null;
  }
}

async function logActivity(
  institutionId: string,
  action: string,
  details: string,
  snapshot: Record<string, unknown> = {},
  performedBy = 'Push Manager',
) {
  await prisma.commActivityLog.create({
    data: { institutionId, action, details, filterSnapshot: snapshot as Prisma.InputJsonValue, performedBy },
  });
}

async function getActiveGateways(institutionId: string, academicYear: string) {
  return prisma.commPushGateway.findMany({
    where: { institutionId, academicYear, status: { in: ['ACTIVE', 'STANDBY'] } },
    orderBy: [{ priority: 'asc' }, { gatewayName: 'asc' }],
  });
}

async function fetchAudienceAccounts(
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
    include: {
      devices: { orderBy: { lastSeenAt: 'desc' } },
    },
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

  return accounts.filter((a) => a.devices.length > 0);
}

type GatewayRow = Awaited<ReturnType<typeof getActiveGateways>>[number];

function pickGatewayForPlatform(gateways: GatewayRow[], platform: string): GatewayRow | null {
  const preferApns = platform === 'IOS';
  const sorted = [...gateways].sort((a, b) => a.priority - b.priority);
  const match = sorted.find((g) => (preferApns ? g.provider === 'APNS' : g.provider === 'FCM'));
  return match ?? sorted[0] ?? null;
}

async function dispatchToDevice(
  institutionId: string,
  gateway: GatewayRow,
  token: string,
  title: string,
  body: string,
  data: Record<string, string>,
) {
  if (gateway.dailyLimit > 0 && gateway.sentToday >= gateway.dailyLimit) {
    return { sent: false, delivered: false, response: 'Daily send limit exceeded', provider: gateway.provider };
  }

  const hasFcmKey = Boolean(process.env.FCM_SERVER_KEY?.trim());
  const hasApnsKey = Boolean(process.env.APNS_KEY_ID?.trim());

  if (gateway.provider === 'APNS' && !hasApnsKey) {
    await prisma.messageDispatchLog.create({
      data: {
        institutionId,
        channel: 'PUSH',
        recipient: maskToken(token),
        template: gateway.gatewayCode,
        status: 'STUB_SENT',
        response: title.slice(0, 120),
      },
    }).catch(() => {});
    return { sent: true, delivered: true, response: `Stub APNs dispatch via ${gateway.bundleId || 'default'}`, provider: 'APNS' };
  }

  if (gateway.provider === 'FCM' && !hasFcmKey && !token.startsWith('ExponentPushToken')) {
    await prisma.messageDispatchLog.create({
      data: {
        institutionId,
        channel: 'PUSH',
        recipient: maskToken(token),
        template: gateway.gatewayCode,
        status: 'STUB_SENT',
        response: title.slice(0, 120),
      },
    }).catch(() => {});
    return { sent: true, delivered: true, response: `Stub FCM dispatch`, provider: 'FCM' };
  }

  const result = await deliverPushToTokens([token], { title, body, data });
  const sent = result.sent > 0;
  return {
    sent,
    delivered: sent,
    response: sent ? 'Delivered to FCM/APNs' : 'Push delivery failed',
    provider: gateway.provider,
  };
}

export async function recordPushReadFromNotification(notificationId: string) {
  if (!notificationId) return null;

  const recipient = await prisma.commPushRecipient.findFirst({
    where: { mobileNotificationId: notificationId, readAt: null },
    include: { campaign: true },
  });
  if (!recipient) return null;

  const now = new Date();
  await prisma.commPushRecipient.update({
    where: { id: recipient.id },
    data: { status: 'READ', readAt: now },
  });

  await prisma.commPushCampaign.update({
    where: { id: recipient.campaignId },
    data: { readCount: { increment: 1 } },
  });

  await prisma.commDeliveryLog.updateMany({
    where: {
      institutionId: recipient.institutionId,
      channel: 'PUSH',
      campaignTitle: recipient.campaign.title,
      readAt: null,
    },
    data: { readAt: now, status: 'READ', openCount: { increment: 1 } },
  });

  return { recipientId: recipient.id, campaignId: recipient.campaignId };
}

export async function sendPushCampaign(institutionId: string, payload: SendPushPayload) {
  const academicYear = payload.academicYear ?? '2025-26';
  const audienceType = payload.audienceType ?? 'ALL';
  const userRole = payload.userRole ?? 'Super Admin';

  if (!payload.title?.trim()) throw new Error('Push title is required.');
  if (!payload.body?.trim()) throw new Error('Push body is required.');
  if (!canManage(userRole) && userRole !== 'Teacher') {
    throw new Error('You do not have permission to send push notifications.');
  }

  const accounts = await fetchAudienceAccounts(institutionId, audienceType, payload.classFilter);
  if (accounts.length === 0) {
    throw new Error('No registered devices found for the selected audience. Users must log in to the mobile app first.');
  }

  const gateways = await getActiveGateways(institutionId, academicYear);
  if (gateways.length === 0) {
    throw new Error('No active push gateway configured. Add FCM or APNs gateway first.');
  }

  const audienceLabel = payload.audienceLabel || AUDIENCE_LABELS[audienceType] || audienceType;
  const pushPayload = {
    ...(payload.payload ?? {}),
    deepLink: payload.deepLink ?? '',
    category: payload.category ?? 'general',
  };

  const campaign = await prisma.commPushCampaign.create({
    data: {
      institutionId,
      title: payload.title.trim(),
      body: payload.body.trim(),
      payload: pushPayload as Prisma.InputJsonValue,
      audienceType,
      audienceLabel,
      classFilter: payload.classFilter ?? '',
      status: 'SENDING',
      recipientCount: accounts.length,
      sentBy: payload.sentBy ?? userRole,
      academicYear,
    },
  });

  let sentCount = 0;
  let deliveredCount = 0;
  let failedCount = 0;
  let deviceCount = 0;

  for (const account of accounts) {
    for (const device of account.devices) {
      deviceCount += 1;
      const gateway = pickGatewayForPlatform(gateways, device.platform);
      if (!gateway) {
        failedCount += 1;
        continue;
      }

      const dataPayload: Record<string, string> = {
        category: payload.category ?? 'general',
        studentId: account.studentId ?? '',
        deepLink: payload.deepLink ?? '',
        campaignId: campaign.id,
      };

      const notification = await prisma.mobileNotification.create({
        data: {
          institutionId,
          accountId: account.id,
          title: payload.title.trim(),
          body: payload.body.trim(),
          category: payload.category ?? 'general',
          studentId: account.studentId ?? '',
          payload: {
            ...pushPayload,
            pushRecipientId: '',
            campaignId: campaign.id,
          } as Prisma.InputJsonValue,
        },
      });

      const recipient = await prisma.commPushRecipient.create({
        data: {
          institutionId,
          campaignId: campaign.id,
          accountId: account.id,
          accountName: account.displayName,
          accountRole: account.role,
          platform: device.platform,
          deviceTokenMasked: maskToken(device.fcmToken),
          mobileNotificationId: notification.id,
          status: 'QUEUED',
          gatewayProvider: gateway.provider,
        },
      });

      await prisma.mobileNotification.update({
        where: { id: notification.id },
        data: {
          payload: {
            ...pushPayload,
            pushRecipientId: recipient.id,
            campaignId: campaign.id,
            notificationId: notification.id,
          } as Prisma.InputJsonValue,
        },
      });

      const result = await dispatchToDevice(
        institutionId,
        gateway,
        device.fcmToken,
        payload.title.trim(),
        payload.body.trim(),
        { ...dataPayload, pushRecipientId: recipient.id, notificationId: notification.id },
      );

      const now = new Date();
      if (result.sent) {
        sentCount += 1;
        deliveredCount += result.delivered ? 1 : 0;
        await prisma.commPushRecipient.update({
          where: { id: recipient.id },
          data: {
            status: result.delivered ? 'DELIVERED' : 'SENT',
            sentAt: now,
            deliveredAt: result.delivered ? now : null,
          },
        });
        await prisma.commPushGateway.update({
          where: { id: gateway.id },
          data: { sentToday: { increment: 1 } },
        });
      } else {
        failedCount += 1;
        await prisma.commPushRecipient.update({
          where: { id: recipient.id },
          data: { status: 'FAILED', failedReason: result.response },
        });
      }
    }
  }

  const finalStatus = failedCount === deviceCount
    ? 'FAILED'
    : failedCount > 0
      ? 'PARTIAL'
      : 'SENT';

  await prisma.commPushCampaign.update({
    where: { id: campaign.id },
    data: {
      status: finalStatus,
      sentCount,
      deliveredCount,
      failedCount,
      deviceCount,
      sentAt: new Date(),
    },
  });

  await prisma.commDeliveryLog.create({
    data: {
      institutionId,
      channel: 'PUSH',
      campaignTitle: payload.title.trim(),
      messagePreview: payload.body.trim().slice(0, 120),
      recipientCount: accounts.length,
      maskedRecipient: `${accounts.length} devices`,
      audienceScope: audienceType,
      classScope: payload.classFilter ?? '',
      status: 'DELIVERED',
      cost: 0,
      sourceModule: 'Push Notifications',
      academicYear,
    },
  });

  await logActivity(
    institutionId,
    'PUSH_CAMPAIGN',
    `Push sent to ${audienceLabel}: ${sentCount}/${deviceCount} devices`,
    { campaignId: campaign.id, audienceType, sentCount, failedCount },
    payload.sentBy ?? userRole,
  );

  return {
    message: finalStatus === 'FAILED'
      ? 'Push campaign failed — no devices received the notification.'
      : `Push sent to ${sentCount} device(s) across ${accounts.length} account(s).`,
    campaignId: campaign.id,
    status: finalStatus,
    sentCount,
    deliveredCount,
    failedCount,
    deviceCount,
    recipientCount: accounts.length,
  };
}

export async function simulatePushRead(institutionId: string, recipientId: string) {
  const recipient = await prisma.commPushRecipient.findFirst({
    where: { id: recipientId, institutionId },
    include: { campaign: true },
  });
  if (!recipient) throw new Error('Recipient not found.');
  if (recipient.readAt) return { message: 'Already marked as read.', recipientId };

  const now = new Date();
  await prisma.commPushRecipient.update({
    where: { id: recipient.id },
    data: { status: 'READ', readAt: now },
  });

  if (recipient.mobileNotificationId) {
    await prisma.mobileNotification.updateMany({
      where: { id: recipient.mobileNotificationId, readAt: null },
      data: { readAt: now },
    });
  }

  await prisma.commPushCampaign.update({
    where: { id: recipient.campaignId },
    data: { readCount: { increment: 1 } },
  });

  return { message: 'Push marked as read (app opened).', recipientId, campaignId: recipient.campaignId };
}

export async function getPushManagement(
  institutionId: string,
  opts: { academicYear?: string; userRole?: string } = {},
) {
  const academicYear = opts.academicYear ?? '2025-26';
  const userRole = opts.userRole ?? 'Principal';

  const [gateways, campaigns, deviceStats, accountStats, recipientStats] = await Promise.all([
    prisma.commPushGateway.findMany({
      where: { institutionId, academicYear },
      orderBy: [{ priority: 'asc' }, { gatewayName: 'asc' }],
    }),
    prisma.commPushCampaign.findMany({
      where: { institutionId, academicYear },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        recipients: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    }),
    prisma.mobileDevice.groupBy({
      by: ['platform'],
      where: { account: { institutionId, isActive: true } },
      _count: { _all: true },
    }),
    prisma.mobileAccount.groupBy({
      by: ['role'],
      where: { institutionId, isActive: true },
      _count: { _all: true },
    }),
    prisma.commPushRecipient.groupBy({
      by: ['status'],
      where: { institutionId, campaign: { academicYear } },
      _count: { _all: true },
    }),
  ]);

  const statusMap = Object.fromEntries(recipientStats.map((s) => [s.status, s._count._all]));
  const sent = (statusMap.SENT ?? 0) + (statusMap.DELIVERED ?? 0) + (statusMap.READ ?? 0);
  const delivered = (statusMap.DELIVERED ?? 0) + (statusMap.READ ?? 0);
  const read = statusMap.READ ?? 0;
  const readRate = delivered > 0 ? Math.round((read / delivered) * 1000) / 10 : 0;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const sentToday = await prisma.commPushRecipient.count({
    where: { institutionId, sentAt: { gte: todayStart } },
  });

  const totalDevices = deviceStats.reduce((sum, d) => sum + d._count._all, 0);

  return {
    academicYear,
    academicYears: ACADEMIC_YEARS,
    userRole,
    permissions: {
      canManage: canManage(userRole),
      canSend: canManage(userRole) || userRole === 'Teacher',
    },
    kpis: {
      pushSent: sent,
      delivered,
      read,
      readRate,
      failed: statusMap.FAILED ?? 0,
      sentToday,
      registeredDevices: totalDevices,
      registeredAccounts: accountStats.reduce((sum, a) => sum + a._count._all, 0),
      costPerPush: 0,
    },
    gateways: gateways.map((g) => ({
      id: g.id,
      code: g.gatewayCode,
      name: g.gatewayName,
      provider: g.provider,
      bundleId: g.bundleId,
      status: g.status,
      priority: g.priority,
      sentToday: g.sentToday,
      dailyLimit: g.dailyLimit,
      serverKeyMasked: g.serverKeyMasked,
    })),
    deviceBreakdown: deviceStats.map((d) => ({
      platform: d.platform,
      count: d._count._all,
    })),
    accountBreakdown: accountStats.map((a) => ({
      role: a.role,
      count: a._count._all,
    })),
    campaigns: campaigns.map((c) => ({
      id: c.id,
      title: c.title,
      body: c.body,
      audienceType: c.audienceType,
      audienceLabel: c.audienceLabel,
      status: c.status,
      recipientCount: c.recipientCount,
      sentCount: c.sentCount,
      deliveredCount: c.deliveredCount,
      readCount: c.readCount,
      failedCount: c.failedCount,
      deviceCount: c.deviceCount,
      readRate: c.deliveredCount > 0 ? Math.round((c.readCount / c.deliveredCount) * 1000) / 10 : 0,
      sentBy: c.sentBy,
      sentAt: c.sentAt?.toISOString() ?? c.createdAt.toISOString(),
      recipients: c.recipients.map((r) => ({
        id: r.id,
        accountName: r.accountName,
        accountRole: r.accountRole,
        platform: r.platform,
        status: r.status,
        readAt: r.readAt?.toISOString() ?? null,
      })),
    })),
    audienceOptions: Object.entries(AUDIENCE_LABELS).map(([value, label]) => ({ value, label })),
    workflowSteps: [
      'Generate Payload (title, body, deep link)',
      'Fetch Device Tokens from DB',
      'Push to FCM / APNs',
      'OS Delivers Push Notification',
      'App Opens → ERP Logs Read',
    ],
    complianceNotes: [
      'Zero-cost instant alerts via Firebase Cloud Messaging (FCM) or Apple Push Notification Service (APNs).',
      'Recipients must have the mobile app installed and be logged in (device token registered).',
      'Read status is logged when the user opens the notification in the app.',
      'Promotional pushes should respect user notification preferences.',
    ],
  };
}

export async function updatePushGateway(
  institutionId: string,
  gatewayId: string,
  input: PushGatewayInput,
) {
  if (!canManage(input.userRole ?? '')) throw new Error('Permission denied.');

  const gateway = await prisma.commPushGateway.update({
    where: { id: gatewayId, institutionId },
    data: {
      gatewayName: input.gatewayName,
      provider: input.provider,
      serverKeyMasked: input.serverKeyMasked,
      bundleId: input.bundleId,
      priority: input.priority,
      status: input.status,
      dailyLimit: input.dailyLimit,
    },
  });

  const data = await getPushManagement(institutionId, { academicYear: gateway.academicYear });
  return { message: 'Gateway updated.', data };
}

export async function seedPushManagement(institutionId: string) {
  const academicYear = '2025-26';
  const passwordHash = await bcrypt.hash('demo1234', 10);

  await prisma.commPushGateway.upsert({
    where: { institutionId_gatewayCode_academicYear: { institutionId, gatewayCode: 'FCM_PRIMARY', academicYear } },
    create: {
      institutionId,
      gatewayCode: 'FCM_PRIMARY',
      gatewayName: 'Firebase Cloud Messaging',
      provider: 'FCM',
      serverKeyMasked: '****FCM',
      status: 'ACTIVE',
      priority: 1,
      academicYear,
    },
    update: { status: 'ACTIVE' },
  });

  await prisma.commPushGateway.upsert({
    where: { institutionId_gatewayCode_academicYear: { institutionId, gatewayCode: 'APNS_PRIMARY', academicYear } },
    create: {
      institutionId,
      gatewayCode: 'APNS_PRIMARY',
      gatewayName: 'Apple Push Notification Service',
      provider: 'APNS',
      serverKeyMasked: '****APN',
      bundleId: 'com.schoolerp.parent',
      status: 'ACTIVE',
      priority: 2,
      academicYear,
    },
    update: { status: 'ACTIVE' },
  });

  const demoAccounts = [
    { role: 'PARENT' as const, mobile: '919876543210', name: 'Mr. Kumar (Parent)', token: 'fcm_demo_parent_kumar_001', platform: 'ANDROID' as const },
    { role: 'PARENT' as const, mobile: '919123456789', name: 'Mrs. Sharma (Parent)', token: 'fcm_demo_parent_sharma_002', platform: 'IOS' as const },
    { role: 'STUDENT' as const, mobile: '918887776666', name: 'Rahul Patel (Student)', token: 'ExponentPushToken[demo_student_rahul]', platform: 'ANDROID' as const },
    { role: 'TEACHER' as const, mobile: '917777666655', name: 'Ms. Priya (Teacher)', token: 'fcm_demo_teacher_priya_004', platform: 'ANDROID' as const, employeeCode: 'TCH-042' },
  ];

  for (const d of demoAccounts) {
    const isTeacher = d.role === 'TEACHER' && 'employeeCode' in d;
    const existing = isTeacher
      ? await prisma.mobileAccount.findFirst({
          where: { institutionId, role: d.role, employeeCode: d.employeeCode, registeredMobile: d.mobile },
        })
      : await prisma.mobileAccount.findFirst({
          where: {
            institutionId,
            role: d.role,
            admissionNumber: d.role === 'STUDENT' ? 'STU-2024-1042' : '',
            registeredMobile: d.mobile,
          },
        });

    const account = existing
      ? await prisma.mobileAccount.update({
          where: { id: existing.id },
          data: { displayName: d.name, isActive: true },
        })
      : await prisma.mobileAccount.create({
          data: {
            institutionId,
            role: d.role,
            admissionNumber: d.role === 'STUDENT' ? 'STU-2024-1042' : '',
            employeeCode: isTeacher ? d.employeeCode : '',
            registeredMobile: d.mobile,
            passwordHash,
            displayName: d.name,
            isActive: true,
          },
        });

    await prisma.mobileDevice.upsert({
      where: { accountId_fcmToken: { accountId: account.id, fcmToken: d.token } },
      create: {
        accountId: account.id,
        fcmToken: d.token,
        platform: d.platform,
        deviceName: d.platform === 'IOS' ? 'iPhone 15' : 'Samsung Galaxy',
        appVersion: '2.4.1',
        lastSeenAt: new Date(),
      },
      update: { lastSeenAt: new Date(), platform: d.platform },
    });
  }

  await prisma.commChannel.upsert({
    where: { institutionId_channelCode_academicYear: { institutionId, channelCode: 'PUSH', academicYear } },
    create: {
      institutionId,
      channelCode: 'PUSH',
      channelName: 'Firebase Push',
      gatewayProvider: 'FCM',
      costPerUnit: 0,
      creditsBalance: 99999,
      academicYear,
    },
    update: { status: 'ACTIVE', creditsBalance: 99999 },
  });

  const existingCampaigns = await prisma.commPushCampaign.count({ where: { institutionId } });
  if (existingCampaigns === 0) {
    const result = await sendPushCampaign(institutionId, {
      title: 'PTM Reminder — Class 10-A',
      body: 'Parent-Teacher Meeting is scheduled for Saturday, 10:00 AM in the school auditorium.',
      audienceType: 'PARENT',
      category: 'ptm',
      deepLink: '/events/ptm',
      sentBy: 'Communication Manager',
      userRole: 'Super Admin',
      academicYear,
    });

    const recipients = await prisma.commPushRecipient.findMany({
      where: { campaignId: result.campaignId, status: 'DELIVERED' },
      take: 2,
    });
    for (const r of recipients.slice(0, 1)) {
      await simulatePushRead(institutionId, r.id);
    }

    await sendPushCampaign(institutionId, {
      title: 'Homework Alert — Mathematics',
      body: 'Complete Exercise 4.2 (Q1–Q10) by tomorrow. Submit via the student app.',
      audienceType: 'STUDENT',
      category: 'homework',
      deepLink: '/homework/math',
      sentBy: 'Teacher',
      userRole: 'Super Admin',
      academicYear,
    });
  }

  return getPushManagement(institutionId, { academicYear, userRole: 'Super Admin' });
}
