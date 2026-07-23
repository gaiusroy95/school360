import crypto from 'crypto';

type RazorpayOrderResponse = {
  id: string;
  amount: number;
  currency: string;
  status: string;
};

function getCredentials() {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!keyId || !keySecret) return null;
  return { keyId, keySecret };
}

function basicAuth(keyId: string, keySecret: string) {
  return `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`;
}

export function isRazorpayConfigured() {
  return Boolean(getCredentials());
}

export async function createRazorpayOrder(params: {
  amountInr: number;
  receipt: string;
  notes?: Record<string, string>;
}) {
  const creds = getCredentials();
  if (!creds) throw new Error('Razorpay is not configured');

  const amountPaise = Math.round(params.amountInr * 100);
  const res = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      Authorization: basicAuth(creds.keyId, creds.keySecret),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: amountPaise,
      currency: 'INR',
      receipt: params.receipt,
      notes: params.notes ?? {},
    }),
  });

  const data = (await res.json().catch(() => ({}))) as RazorpayOrderResponse & { error?: { description?: string } };
  if (!res.ok) {
    throw new Error(data.error?.description || 'Failed to create Razorpay order');
  }

  return data;
}

export function verifyRazorpayPaymentSignature(params: {
  orderId: string;
  paymentId: string;
  signature: string;
}) {
  const creds = getCredentials();
  if (!creds) return false;

  const body = `${params.orderId}|${params.paymentId}`;
  const expected = crypto.createHmac('sha256', creds.keySecret).update(body).digest('hex');
  return expected === params.signature;
}

export function verifyRazorpayWebhookSignature(rawBody: string, signature: string) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim() || process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!secret) return false;

  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  return expected === signature;
}
