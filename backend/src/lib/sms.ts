import { prisma } from './prisma.js';

function normalizeIndianMobile(mobile: string) {
  const digits = mobile.replace(/\D/g, '');
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return digits;
  return digits;
}

async function logDispatch(
  institutionId: string,
  channel: string,
  recipient: string,
  template: string,
  status: string,
  response: string,
) {
  try {
    await prisma.messageDispatchLog.create({
      data: { institutionId, channel, recipient, template, status, response: response.slice(0, 500) },
    });
  } catch {
    // non-fatal
  }
}

export async function sendSmsMsg91(
  institutionId: string,
  mobile: string,
  message: string,
  templateId?: string,
) {
  const authKey = process.env.MSG91_AUTH_KEY?.trim();
  const senderId = process.env.MSG91_SENDER_ID?.trim() || 'SCHOOL';
  const tpl = templateId || process.env.MSG91_TEMPLATE_ID?.trim() || '';

  const recipient = normalizeIndianMobile(mobile);
  if (!recipient || recipient.length < 10) {
    return { sent: false, reason: 'invalid_mobile' };
  }

  if (!authKey) {
    console.info('[sms-msg91-stub]', { institutionId, recipient, message: message.slice(0, 120) });
    await logDispatch(institutionId, 'SMS', recipient, tpl, 'STUB', message.slice(0, 200));
    return { sent: true, stub: true };
  }

  const res = await fetch('https://control.msg91.com/api/v5/flow/', {
    method: 'POST',
    headers: {
      authkey: authKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      template_id: tpl || undefined,
      short_url: '0',
      recipients: [{ mobiles: recipient, var: message }],
      sender: senderId,
    }),
  });

  const text = await res.text();
  await logDispatch(institutionId, 'SMS', recipient, tpl, res.ok ? 'SENT' : 'FAILED', text);

  return { sent: res.ok, response: text };
}

export async function sendWhatsAppMessage(
  institutionId: string,
  mobile: string,
  message: string,
) {
  const apiUrl = process.env.WHATSAPP_API_URL?.trim();
  const apiKey = process.env.WHATSAPP_API_KEY?.trim();
  const recipient = normalizeIndianMobile(mobile);

  if (!apiUrl || !apiKey) {
    console.info('[whatsapp-stub]', { institutionId, recipient, message: message.slice(0, 120) });
    await logDispatch(institutionId, 'WHATSAPP', recipient, 'absent_alert', 'STUB', message.slice(0, 200));
    return { sent: true, stub: true };
  }

  const res = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: recipient,
      type: 'text',
      text: { body: message },
    }),
  });

  const text = await res.text();
  await logDispatch(institutionId, 'WHATSAPP', recipient, 'absent_alert', res.ok ? 'SENT' : 'FAILED', text);

  return { sent: res.ok, response: text };
}

export async function notifyMobileNumbers(
  institutionId: string,
  mobiles: string[],
  message: string,
  opts?: { useWhatsApp?: boolean },
) {
  const unique = [...new Set(mobiles.map((m) => m.trim()).filter(Boolean))];
  const results = [];

  for (const mobile of unique) {
    if (opts?.useWhatsApp !== false && process.env.WHATSAPP_API_URL) {
      results.push(await sendWhatsAppMessage(institutionId, mobile, message));
    } else {
      results.push(await sendSmsMsg91(institutionId, mobile, message));
    }
  }

  return {
    attempted: unique.length,
    sent: results.filter((r) => r.sent).length,
    results,
  };
}
