import type { Prisma } from '@prisma/client';
import { prisma } from './prisma.js';
import { deliverPushToTokens } from './pushDelivery.js';

function accountHasStudent(studentIds: unknown, studentId: string) {
  if (!Array.isArray(studentIds)) return false;
  return studentIds.includes(studentId);
}

export async function findParentAccountsForStudent(institutionId: string, studentId: string) {
  const accounts = await prisma.mobileAccount.findMany({
    where: { institutionId, role: 'PARENT', isActive: true },
    select: { id: true, studentIds: true, displayName: true },
  });
  return accounts.filter((a) => accountHasStudent(a.studentIds, studentId));
}

export async function pushToParentAccountsForStudent(params: {
  institutionId: string;
  studentId: string;
  title: string;
  body: string;
  category?: string;
  payload?: Record<string, unknown>;
}) {
  const parents = await findParentAccountsForStudent(params.institutionId, params.studentId);
  let notifications = 0;
  let pushSent = 0;

  for (const parent of parents) {
    await prisma.mobileNotification.create({
      data: {
        institutionId: params.institutionId,
        accountId: parent.id,
        studentId: params.studentId,
        title: params.title,
        body: params.body,
        category: params.category ?? 'general',
        payload: (params.payload ?? {}) as Prisma.InputJsonValue,
      },
    });
    notifications += 1;

    const devices = await prisma.mobileDevice.findMany({
      where: { accountId: parent.id },
      select: { fcmToken: true },
    });
    if (devices.length > 0) {
      const result = await deliverPushToTokens(
        devices.map((d) => d.fcmToken),
        {
          title: params.title,
          body: params.body,
          data: {
            studentId: params.studentId,
            category: params.category ?? 'general',
          },
        },
      );
      pushSent += result.sent;
    }
  }

  return { parents: parents.length, notifications, pushSent };
}

export async function pushToAccount(params: {
  institutionId: string;
  accountId: string;
  title: string;
  body: string;
  category?: string;
  studentId?: string;
  payload?: Record<string, unknown>;
}) {
  await prisma.mobileNotification.create({
    data: {
      institutionId: params.institutionId,
      accountId: params.accountId,
      studentId: params.studentId ?? '',
      title: params.title,
      body: params.body,
      category: params.category ?? 'general',
      payload: (params.payload ?? {}) as Prisma.InputJsonValue,
    },
  });

  const devices = await prisma.mobileDevice.findMany({
    where: { accountId: params.accountId },
    select: { fcmToken: true },
  });

  if (devices.length === 0) return { pushSent: 0 };

  const result = await deliverPushToTokens(
    devices.map((d) => d.fcmToken),
    { title: params.title, body: params.body },
  );
  return { pushSent: result.sent };
}
