import type { MobileDevicePlatform, Prisma } from '@prisma/client';
import { prisma } from './prisma.js';
import { deliverPushToTokens } from './pushDelivery.js';

export async function registerMobileDevice(
  accountId: string,
  opts: {
    fcmToken: string;
    platform?: MobileDevicePlatform;
    deviceName?: string;
    appVersion?: string;
  },
) {
  const account = await prisma.mobileAccount.findUnique({
    where: { id: accountId },
    select: { id: true, institutionId: true },
  });
  if (!account) throw new Error('Account not found');

  const platform = opts.platform ?? 'OTHER';

  const device = await prisma.mobileDevice.upsert({
    where: {
      accountId_fcmToken: {
        accountId,
        fcmToken: opts.fcmToken,
      },
    },
    create: {
      accountId,
      fcmToken: opts.fcmToken,
      platform,
      deviceName: opts.deviceName?.trim() || '',
      appVersion: opts.appVersion?.trim() || '',
      lastSeenAt: new Date(),
    },
    update: {
      platform,
      deviceName: opts.deviceName?.trim() || '',
      appVersion: opts.appVersion?.trim() || '',
      lastSeenAt: new Date(),
    },
  });

  return {
    id: device.id,
    platform: device.platform,
    deviceName: device.deviceName,
    lastSeenAt: device.lastSeenAt.toISOString(),
  };
}

export async function listMobileNotifications(
  accountId: string,
  opts: { unreadOnly?: boolean; limit?: number } = {},
) {
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 200);

  const rows = await prisma.mobileNotification.findMany({
    where: {
      accountId,
      ...(opts.unreadOnly ? { readAt: null } : {}),
    },
    orderBy: [{ readAt: 'asc' }, { createdAt: 'desc' }],
    take: limit,
  });

  const unreadCount = await prisma.mobileNotification.count({
    where: { accountId, readAt: null },
  });

  return {
    unreadCount,
    records: rows.map((r) => ({
      id: r.id,
      studentId: r.studentId || null,
      category: r.category,
      title: r.title,
      body: r.body,
      payload: r.payload,
      readAt: r.readAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
      isRead: Boolean(r.readAt),
    })),
  };
}

export async function markNotificationRead(accountId: string, notificationId: string) {
  const row = await prisma.mobileNotification.findFirst({
    where: { id: notificationId, accountId },
  });
  if (!row) throw new Error('Notification not found');

  const updated = await prisma.mobileNotification.update({
    where: { id: notificationId },
    data: { readAt: row.readAt ?? new Date() },
  });

  return {
    id: updated.id,
    readAt: updated.readAt?.toISOString() ?? null,
    isRead: true,
  };
}

export async function markAllNotificationsRead(accountId: string) {
  const result = await prisma.mobileNotification.updateMany({
    where: { accountId, readAt: null },
    data: { readAt: new Date() },
  });
  return { marked: result.count };
}

export async function createMobileNotification(params: {
  institutionId: string;
  accountId: string;
  title: string;
  body?: string;
  category?: string;
  studentId?: string;
  payload?: Record<string, unknown>;
}) {
  const row = await prisma.mobileNotification.create({
    data: {
      institutionId: params.institutionId,
      accountId: params.accountId,
      title: params.title,
      body: params.body ?? '',
      category: params.category ?? 'general',
      studentId: params.studentId ?? '',
      payload: (params.payload ?? {}) as Prisma.InputJsonValue,
    },
  });

  const devices = await prisma.mobileDevice.findMany({
    where: { accountId: params.accountId },
    select: { fcmToken: true },
  });

  if (devices.length > 0) {
    await deliverPushToTokens(
      devices.map((d) => d.fcmToken),
      {
        title: params.title,
        body: params.body ?? '',
        data: {
          category: params.category ?? 'general',
          studentId: params.studentId ?? '',
        },
      },
    );
  }

  return row;
}
