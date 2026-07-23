import { deliverPushToTokens } from './pushDelivery.js';
import { prisma } from './prisma.js';

export type PushRecipient = {
  type: 'parent' | 'staff' | 'student';
  name: string;
  mobile?: string;
  email?: string;
  fcmToken?: string;
};

export async function dispatchPushNotifications(params: {
  institutionId: string;
  event: string;
  title: string;
  body: string;
  recipients: PushRecipient[];
}) {
  const { institutionId, event, title, body, recipients } = params;
  if (recipients.length === 0) return { sent: 0, event, title };

  const tokens = recipients.map((r) => r.fcmToken).filter((t): t is string => Boolean(t));

  if (tokens.length > 0) {
    const result = await deliverPushToTokens(tokens, {
      title,
      body,
      data: { event, institutionId },
    });
    console.info('[push-notification]', { institutionId, event, ...result });
    return { sent: result.sent, event, title };
  }

  console.info('[push-notification-log]', {
    institutionId,
    event,
    title,
    recipientCount: recipients.length,
    preview: body.slice(0, 160),
  });

  return { sent: recipients.length, event, title, logged: true };
}

export async function notifyStaffPush(
  institutionId: string,
  title: string,
  body: string,
  event = 'PTM Scheduled',
) {
  const staff = await prisma.user.findMany({
    where: { role: { in: ['SUPER_ADMIN', 'ADMIN', 'STAFF'] } },
    select: { displayName: true, email: true },
  });

  return dispatchPushNotifications({
    institutionId,
    event,
    title,
    body,
    recipients: staff.map((s) => ({
      type: 'staff' as const,
      name: s.displayName,
      email: s.email,
    })),
  });
}
