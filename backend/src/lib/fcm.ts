export async function sendFcmNotifications(
  tokens: string[],
  payload: { title: string; body: string; data?: Record<string, string> },
) {
  const serverKey = process.env.FCM_SERVER_KEY?.trim();
  if (!serverKey || tokens.length === 0) {
    return { sent: 0, failed: tokens.length, skipped: !serverKey };
  }

  let sent = 0;
  let failed = 0;

  for (const token of tokens) {
    try {
      const res = await fetch('https://fcm.googleapis.com/fcm/send', {
        method: 'POST',
        headers: {
          Authorization: `key=${serverKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: token,
          notification: {
            title: payload.title,
            body: payload.body,
          },
          data: payload.data ?? {},
          priority: 'high',
        }),
      });

      const body = (await res.json().catch(() => ({}))) as { success?: number };
      if (res.ok && body.success === 1) sent += 1;
      else failed += 1;
    } catch {
      failed += 1;
    }
  }

  return { sent, failed };
}
