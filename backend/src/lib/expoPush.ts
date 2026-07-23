export function isExpoPushToken(token: string) {
  return (
    token.startsWith('ExponentPushToken[') ||
    token.startsWith('ExpoPushToken[') ||
    token.startsWith('ExpoPushToken')
  );
}

export async function sendExpoPushNotifications(
  tokens: string[],
  payload: { title: string; body: string; data?: Record<string, string> },
) {
  if (tokens.length === 0) return { sent: 0, failed: 0 };

  const messages = tokens.map((to) => ({
    to,
    sound: 'default',
    title: payload.title,
    body: payload.body,
    data: payload.data ?? {},
    priority: 'high',
  }));

  const res = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(messages),
  });

  const data = (await res.json().catch(() => ({}))) as {
    data?: { status?: string }[];
  };

  const results = data.data ?? [];
  const sent = results.filter((r) => r.status === 'ok').length;
  const failed = results.length - sent;

  return { sent, failed, raw: data };
}
