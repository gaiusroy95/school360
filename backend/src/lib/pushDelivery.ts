import { isExpoPushToken, sendExpoPushNotifications } from './expoPush.js';
import { sendFcmNotifications } from './fcm.js';

export async function deliverPushToTokens(
  tokens: string[],
  payload: { title: string; body: string; data?: Record<string, string> },
) {
  const expoTokens = tokens.filter(isExpoPushToken);
  const fcmTokens = tokens.filter((t) => !isExpoPushToken(t));

  const [expo, fcm] = await Promise.all([
    sendExpoPushNotifications(expoTokens, payload),
    sendFcmNotifications(fcmTokens, payload),
  ]);

  return {
    sent: expo.sent + fcm.sent,
    failed: expo.failed + fcm.failed,
    expo,
    fcm,
  };
}
