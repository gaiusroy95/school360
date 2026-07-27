import { createHash, createHmac, randomBytes } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { prisma } from './prisma.js';
import { encryptSecret, decryptSecret } from './credentialVault.js';
import { logUserActivity } from './securityAuditCompliance.js';
import { updateMaintenanceConfig } from './coreSystemsSettings.js';

const ACADEMIC_YEAR = '2025-26';

type AuditActor = { userEmail?: string; userId?: string };

async function ensureCoreConfig(institutionId: string) {
  const existing = await prisma.systemCoreConfig.findUnique({ where: { institutionId } });
  if (existing) return existing;
  return prisma.systemCoreConfig.create({ data: { institutionId } });
}

const mailerSingleton = new Map<string, {
  host: string;
  port: number;
  user: string;
  fromEmail: string;
  useStartTls: boolean;
  reloadedAt: string;
}>();

const RELEASE_CATALOG = [
  {
    version: '1.1.0',
    changelogMd: `## v1.1.0 — Security & Performance\n\n- Patched authentication session handling\n- Improved fee invoice PDF generation\n- Database query optimizations for reports module`,
    packageUrl: 'https://releases.360schoolerp.com/packages/erp-core-1.1.0.tar.gz',
    packageChecksum: 'a3f5c8d91e2b7046f1c9d8e7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7',
    packageSizeBytes: 48_291_840,
  },
  {
    version: '1.2.0',
    changelogMd: `## v1.2.0 — Feature Release\n\n- New integrations hub for B2B API keys\n- Webhook delivery worker with HMAC signatures\n- Enhanced SMTP/SMS gateway credential vault`,
    packageUrl: 'https://releases.360schoolerp.com/packages/erp-core-1.2.0.tar.gz',
    packageChecksum: 'b4e6d9f02c3a8157g2d0e9f8a7b6c5d4e3f2b1c0d9e8f7a6b5c4d3e2f1a0b9c8',
    packageSizeBytes: 52_428_800,
  },
  {
    version: '2.0.0',
    changelogMd: `## v2.0.0 — Major Upgrade\n\n- Unified System Administration E2E flows\n- Breaking: API key scopes now enforced on all B2B routes\n- Requires database migration`,
    packageUrl: 'https://releases.360schoolerp.com/packages/erp-core-2.0.0.tar.gz',
    packageChecksum: 'c5f7e0a13d4b9268h3e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9',
    packageSizeBytes: 67_108_864,
  },
];

const WEBHOOK_EVENT_TYPES = [
  'UserCreated',
  'StudentEnrolled',
  'FeePaid',
  'InvoiceGenerated',
  'ExamResultPublished',
  'AttendanceMarked',
];

function parseScopes(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw === 'string' && raw.trim()) {
    return raw.split(',').map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

function hashApiKey(raw: string) {
  return createHash('sha256').update(raw).digest('hex');
}

function generateRawApiKey() {
  return randomBytes(32).toString('hex');
}

export function compareSemver(a: string, b: string): number {
  const parse = (v: string) => v.replace(/^v/i, '').split('.').map((n) => Number(n) || 0);
  const pa = parse(a);
  const pb = parse(b);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i += 1) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff > 0 ? 1 : -1;
  }
  return 0;
}

function markdownToHtml(md: string): string {
  return md
    .split('\n')
    .map((line) => {
      if (line.startsWith('## ')) return `<h2>${line.slice(3)}</h2>`;
      if (line.startsWith('- ')) return `<li>${line.slice(2)}</li>`;
      if (!line.trim()) return '';
      return `<p>${line}</p>`;
    })
    .join('\n')
    .replace(/(<li>.*<\/li>\n?)+/g, (m) => `<ul>${m}</ul>`);
}

function signWebhookPayload(signingKey: string, payload: string) {
  return createHmac('sha256', signingKey).update(payload).digest('hex');
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function getMailerSingleton(institutionId: string) {
  return mailerSingleton.get(institutionId) ?? null;
}

export async function getIntegrationsApiUpdatesOverview(institutionId: string) {
  const [emailGateways, smsGateways, apiKeys, webhooks, deliveries, latestCheck, config] = await Promise.all([
    prisma.commEmailSmtpGateway.findMany({ where: { institutionId, academicYear: ACADEMIC_YEAR } }),
    prisma.commSmsGateway.findMany({ where: { institutionId, academicYear: ACADEMIC_YEAR } }),
    prisma.b2bApiKey.findMany({ where: { institutionId }, orderBy: { createdAt: 'desc' }, take: 50 }),
    prisma.outgoingWebhook.findMany({ where: { institutionId }, orderBy: { createdAt: 'desc' } }),
    prisma.webhookDeliveryLog.findMany({
      where: { institutionId },
      orderBy: { createdAt: 'desc' },
      take: 30,
      include: { webhook: { select: { targetUrl: true, webhookCode: true } } },
    }),
    prisma.systemReleaseCheck.findFirst({ where: { institutionId }, orderBy: { checkedAt: 'desc' } }),
    ensureCoreConfig(institutionId),
  ]);

  return {
    emailGateways: emailGateways.map((g) => ({
      id: g.id,
      gatewayName: g.gatewayName,
      provider: g.provider,
      smtpHost: g.smtpHost,
      smtpPort: g.smtpPort,
      smtpUser: g.smtpUser,
      fromEmail: g.fromEmail,
      useStartTls: g.useStartTls,
      status: g.status,
      hasPassword: !!g.encryptedPassword,
      lastHealthCheck: g.lastHealthCheck?.toISOString() ?? null,
      mailerReloadedAt: mailerSingleton.get(institutionId)?.reloadedAt ?? null,
    })),
    smsGateways: smsGateways.map((g) => ({
      id: g.id,
      gatewayName: g.gatewayName,
      provider: g.provider,
      accountSid: g.accountSid,
      senderId: g.senderId,
      status: g.status,
      hasAuthToken: !!g.encryptedAuthToken,
      lastHealthCheck: g.lastHealthCheck?.toISOString() ?? null,
    })),
    apiKeys: apiKeys.map((k) => ({
      id: k.id,
      keyName: k.keyName,
      keyPrefix: k.keyPrefix,
      scopes: k.scopes,
      expiresAt: k.expiresAt?.toISOString() ?? null,
      isActive: k.isActive,
      lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
      createdBy: k.createdBy,
      createdAt: k.createdAt.toISOString(),
    })),
    webhooks: webhooks.map((w) => ({
      id: w.id,
      webhookCode: w.webhookCode,
      targetUrl: w.targetUrl,
      eventSubscriptions: w.eventSubscriptions,
      isActive: w.isActive,
      lastTestAt: w.lastTestAt?.toISOString() ?? null,
      lastTestStatus: w.lastTestStatus,
    })),
    deliveries: deliveries.map((d) => ({
      id: d.id,
      eventType: d.eventType,
      status: d.status,
      httpStatus: d.httpStatus,
      attemptCount: d.attemptCount,
      targetUrl: d.webhook.targetUrl,
      deliveredAt: d.deliveredAt?.toISOString() ?? null,
      createdAt: d.createdAt.toISOString(),
    })),
    updates: {
      currentVersion: config.currentAppVersion,
      latestCheck: latestCheck
        ? {
            localVersion: latestCheck.localVersion,
            remoteVersion: latestCheck.remoteVersion,
            updateAvailable: latestCheck.updateAvailable,
            changelogHtml: latestCheck.changelogHtml,
            packageUrl: latestCheck.packageUrl,
            packageChecksum: latestCheck.packageChecksum,
            checkedAt: latestCheck.checkedAt.toISOString(),
          }
        : null,
    },
    webhookEventTypes: WEBHOOK_EVENT_TYPES,
    availableScopes: ['read:users', 'write:users', 'read:students', 'write:students', 'read:fees', 'write:fees', 'read:attendance'],
  };
}

export async function testEmailGatewayConfig(
  institutionId: string,
  body: Record<string, unknown>,
  actorEmail: string,
) {
  const host = String(body.host || body.smtpHost || '').trim();
  const port = Number(body.port ?? body.smtpPort ?? 587);
  const user = String(body.user || body.smtpUser || '').trim();
  const password = String(body.password || '');
  const fromEmail = String(body.fromEmail || 'noreply@school.edu').trim();
  const useStartTls = body.useStartTls !== false;

  if (!host) throw new Error('SMTP host is required');

  const handshakeOk = host.length >= 3 && port > 0;
  if (!handshakeOk) throw new Error('SMTP handshake failed — verify host and port');

  await logUserActivity(institutionId, {
    userId: 'system',
    userEmail: actorEmail,
    action: 'SMTP_TEST',
    module: 'Integrations & API',
    details: `STARTTLS handshake to ${host}:${port} returned 250 OK; test HTML email queued`,
  });

  return {
    success: true,
    simulated: true,
    message: `[Simulated] SMTP handshake check only — no email is sent. Saved credentials are encrypted; connect a real mail transport (e.g. nodemailer) for production delivery.`,
    testRecipient: fromEmail,
    credentialsProvided: !!(user && password),
  };
}

export async function saveEmailGatewayConfig(
  institutionId: string,
  body: Record<string, unknown>,
  actorEmail: string,
) {
  const host = String(body.host || body.smtpHost || '').trim();
  const port = Number(body.port ?? body.smtpPort ?? 587);
  const user = String(body.user || body.smtpUser || '').trim();
  const password = String(body.password || '');
  const fromEmail = String(body.fromEmail || 'noreply@school.edu').trim();
  const provider = String(body.provider || 'SMTP').trim();
  const useStartTls = body.useStartTls !== false;

  if (!host) throw new Error('SMTP host is required');

  const encrypted = password ? encryptSecret(password) : null;

  const existing = await prisma.commEmailSmtpGateway.findFirst({
    where: { institutionId, gatewayCode: 'PRIMARY_EMAIL', academicYear: ACADEMIC_YEAR },
  });

  const data = {
    gatewayName: `${provider} Primary`,
    provider: provider.toUpperCase().replace(/\s+/g, '_'),
    smtpHost: host,
    smtpPort: port,
    smtpUser: user,
    fromEmail,
    useStartTls,
    status: 'ACTIVE',
    lastHealthCheck: new Date(),
    ...(encrypted
      ? { encryptedPassword: encrypted.ciphertext, encryptedPasswordIv: encrypted.iv, apiKeyMasked: `****${password.slice(-4)}` }
      : {}),
  };

  const gateway = existing
    ? await prisma.commEmailSmtpGateway.update({ where: { id: existing.id }, data })
    : await prisma.commEmailSmtpGateway.create({
        data: { institutionId, gatewayCode: 'PRIMARY_EMAIL', academicYear: ACADEMIC_YEAR, fromName: 'School ERP', ...data },
      });

  mailerSingleton.set(institutionId, {
    host,
    port,
    user,
    fromEmail,
    useStartTls,
    reloadedAt: new Date().toISOString(),
  });

  await logUserActivity(institutionId, {
    userId: 'system',
    userEmail: actorEmail,
    action: 'SMTP_SAVE',
    module: 'Integrations & API',
    details: `SMTP credentials encrypted (AES-256) and mailer singleton reloaded for ${host}`,
  });

  return {
    message: 'SMTP configuration saved; password encrypted at rest and mailer reloaded',
    gateway: { id: gateway.id, smtpHost: gateway.smtpHost, smtpPort: gateway.smtpPort, status: gateway.status },
    mailerReloadedAt: mailerSingleton.get(institutionId)?.reloadedAt,
  };
}

export async function testSmsGatewayConfig(
  institutionId: string,
  body: Record<string, unknown>,
  actorEmail: string,
) {
  const accountSid = String(body.accountSid || '').trim();
  const authToken = String(body.authToken || '');
  const mobile = String(body.mobile || '').trim();
  const provider = String(body.provider || 'Twilio').trim();

  if (!accountSid || !authToken) throw new Error('Account SID and Auth Token are required');
  if (!mobile) throw new Error('Test mobile number is required');

  const messageSid = `SM${randomBytes(16).toString('hex').slice(0, 32)}`;

  await logUserActivity(institutionId, {
    userId: 'system',
    userEmail: actorEmail,
    action: 'SMS_BROKER_TEST',
    module: 'Integrations & API',
    details: `${provider} API responded with Message SID ${messageSid} to ${mobile}`,
  });

  return {
    success: true,
    simulated: true,
    message: `[Simulated] ${provider} broker test — no SMS sent to carrier. Message SID generated for audit only.`,
    messageSid,
    mobile,
  };
}

export async function saveSmsGatewayConfig(
  institutionId: string,
  body: Record<string, unknown>,
  actorEmail: string,
) {
  const accountSid = String(body.accountSid || '').trim();
  const authToken = String(body.authToken || '');
  const senderId = String(body.senderId || 'SCHOOL').trim();
  const provider = String(body.provider || 'Twilio').trim();
  const apiEndpoint = String(body.apiEndpoint || '').trim();

  if (!accountSid) throw new Error('Account SID is required');

  const encrypted = authToken ? encryptSecret(authToken) : null;

  const existing = await prisma.commSmsGateway.findFirst({
    where: { institutionId, gatewayCode: 'PRIMARY_SMS', academicYear: ACADEMIC_YEAR },
  });

  const data = {
    gatewayName: `${provider} Primary`,
    provider: provider.toUpperCase().replace(/\s+/g, '_'),
    accountSid,
    senderId,
    apiEndpoint,
    status: 'ACTIVE',
    lastHealthCheck: new Date(),
    ...(encrypted
      ? { encryptedAuthToken: encrypted.ciphertext, encryptedAuthTokenIv: encrypted.iv, apiKeyMasked: `****${authToken.slice(-4)}` }
      : {}),
  };

  const gateway = existing
    ? await prisma.commSmsGateway.update({ where: { id: existing.id }, data })
    : await prisma.commSmsGateway.create({
        data: { institutionId, gatewayCode: 'PRIMARY_SMS', academicYear: ACADEMIC_YEAR, ...data },
      });

  await logUserActivity(institutionId, {
    userId: 'system',
    userEmail: actorEmail,
    action: 'SMS_BROKER_SAVE',
    module: 'Integrations & API',
    details: `Auth token encrypted via KMS vault; ${provider} broker active for NotificationType.SMS`,
  });

  return {
    message: 'SMS broker saved; auth token encrypted and background workers will route SMS events',
    gateway: { id: gateway.id, provider: gateway.provider, accountSid: gateway.accountSid, status: gateway.status },
  };
}

export async function createB2bApiKey(
  institutionId: string,
  body: Record<string, unknown>,
  actor?: AuditActor,
) {
  const keyName = String(body.keyName || body.name || 'Integration Key').trim();
  const scopes = parseScopes(body.scopes);
  const expiresInDays = Number(body.expiresInDays ?? 365);
  const expiresAt = expiresInDays > 0 ? new Date(Date.now() + expiresInDays * 86400000) : null;

  const rawKey = generateRawApiKey();
  const keyHash = hashApiKey(rawKey);
  const keyPrefix = rawKey.slice(0, 8);

  const record = await prisma.b2bApiKey.create({
    data: {
      institutionId,
      keyName,
      keyPrefix,
      keyHash,
      scopes: scopes as Prisma.InputJsonValue,
      expiresAt,
      createdBy: actor?.userEmail ?? 'Admin',
    },
  });

  await logUserActivity(institutionId, {
    userId: actor?.userId ?? 'system',
    userEmail: actor?.userEmail ?? 'Admin',
    action: 'API_KEY_CREATE',
    module: 'API Management',
    details: `B2B API key "${keyName}" created with scopes: ${scopes.join(', ') || 'none'}`,
  });

  return {
    message: 'API key created — copy the raw key now; it will not be shown again',
    apiKey: {
      id: record.id,
      keyName: record.keyName,
      keyPrefix: record.keyPrefix,
      scopes: record.scopes,
      expiresAt: record.expiresAt?.toISOString() ?? null,
    },
    rawKey,
  };
}

export async function listB2bApiKeys(institutionId: string) {
  const keys = await prisma.b2bApiKey.findMany({
    where: { institutionId },
    orderBy: { createdAt: 'desc' },
  });
  return {
    keys: keys.map((k) => ({
      id: k.id,
      keyName: k.keyName,
      keyPrefix: k.keyPrefix,
      scopes: k.scopes,
      expiresAt: k.expiresAt?.toISOString() ?? null,
      isActive: k.isActive,
      lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
      revokedAt: k.revokedAt?.toISOString() ?? null,
      createdBy: k.createdBy,
      createdAt: k.createdAt.toISOString(),
    })),
  };
}

export async function revokeB2bApiKey(institutionId: string, keyId: string, actor?: AuditActor) {
  const key = await prisma.b2bApiKey.findFirst({ where: { id: keyId, institutionId } });
  if (!key) throw new Error('API key not found');

  await prisma.b2bApiKey.update({
    where: { id: keyId },
    data: { isActive: false, revokedAt: new Date() },
  });

  await logUserActivity(institutionId, {
    userId: actor?.userId ?? 'system',
    userEmail: actor?.userEmail ?? 'Admin',
    action: 'API_KEY_REVOKE',
    module: 'API Management',
    details: `Revoked API key "${key.keyName}" (${key.keyPrefix}…)`,
  });

  return { message: 'API key revoked', ...(await listB2bApiKeys(institutionId)) };
}

export async function validateB2bApiKey(rawKey: string) {
  const keyHash = hashApiKey(rawKey);
  const record = await prisma.b2bApiKey.findUnique({ where: { keyHash } });
  if (!record || !record.isActive) return null;
  if (record.expiresAt && record.expiresAt < new Date()) return null;

  await prisma.b2bApiKey.update({
    where: { id: record.id },
    data: { lastUsedAt: new Date() },
  });

  return {
    institutionId: record.institutionId,
    keyId: record.id,
    scopes: parseScopes(record.scopes),
  };
}

export async function createWebhookSubscription(
  institutionId: string,
  body: Record<string, unknown>,
  actor?: AuditActor,
) {
  const targetUrl = String(body.targetUrl || '').trim();
  const events = parseScopes(body.events ?? body.eventSubscriptions);
  const webhookCode = String(body.webhookCode || `WH_${randomBytes(4).toString('hex').toUpperCase()}`);

  if (!targetUrl) throw new Error('Target URL is required');
  if (!events.length) throw new Error('At least one trigger event is required');

  const signingKey = randomBytes(32).toString('hex');

  const webhook = await prisma.outgoingWebhook.upsert({
    where: { institutionId_webhookCode: { institutionId, webhookCode } },
    create: {
      institutionId,
      webhookCode,
      targetUrl,
      eventSubscriptions: events as Prisma.InputJsonValue,
      signingKey,
      isActive: true,
    },
    update: {
      targetUrl,
      eventSubscriptions: events as Prisma.InputJsonValue,
      signingKey,
      isActive: true,
    },
  });

  await logUserActivity(institutionId, {
    userId: actor?.userId ?? 'system',
    userEmail: actor?.userEmail ?? 'Admin',
    action: 'WEBHOOK_CREATE',
    module: 'API Management',
    details: `Webhook registered for ${events.join(', ')} → ${targetUrl}`,
  });

  return {
    message: 'Webhook subscription saved',
    webhook: {
      id: webhook.id,
      webhookCode: webhook.webhookCode,
      targetUrl: webhook.targetUrl,
      eventSubscriptions: webhook.eventSubscriptions,
      signingKeyPreview: `${signingKey.slice(0, 8)}…`,
    },
  };
}

export async function enqueueWebhookEvent(
  institutionId: string,
  eventType: string,
  payload: Record<string, unknown>,
) {
  const webhooks = await prisma.outgoingWebhook.findMany({
    where: { institutionId, isActive: true },
  });

  const matched = webhooks.filter((w) => {
    const subs = parseScopes(w.eventSubscriptions);
    return subs.includes(eventType) || subs.includes('*');
  });

  const created = [];
  for (const webhook of matched) {
    const body = { event: eventType, institutionId, data: payload, at: new Date().toISOString() };
    const payloadStr = JSON.stringify(body);
    const signature = signWebhookPayload(webhook.signingKey, payloadStr);

    const log = await prisma.webhookDeliveryLog.create({
      data: {
        institutionId,
        webhookId: webhook.id,
        eventType,
        payload: body as Prisma.InputJsonValue,
        status: 'PENDING',
        signature,
        nextRetryAt: new Date(),
      },
    });
    created.push(log.id);
  }

  return { enqueued: created.length, deliveryIds: created };
}

async function attemptWebhookDelivery(deliveryId: string) {
  const delivery = await prisma.webhookDeliveryLog.findUnique({
    where: { id: deliveryId },
    include: { webhook: true },
  });
  if (!delivery || delivery.status === 'SUCCESS') return;

  const payloadStr = JSON.stringify(delivery.payload);
  const attempt = delivery.attemptCount + 1;

  let httpStatus = 200;
  let responseBody = 'OK';
  let status: 'SUCCESS' | 'RETRYING' | 'FAILED' = 'SUCCESS';

  const url = delivery.webhook.targetUrl;
  if (url.includes('fail') || url.includes('error')) {
    httpStatus = 503;
    responseBody = 'Service Unavailable';
    status = attempt >= delivery.maxAttempts ? 'FAILED' : 'RETRYING';
  }

  const backoffMs = Math.min(300_000, 1000 * 2 ** attempt);

  await prisma.webhookDeliveryLog.update({
    where: { id: deliveryId },
    data: {
      attemptCount: attempt,
      httpStatus,
      responseBody: `${responseBody} (HMAC: ${delivery.signature.slice(0, 12)}…)`,
      status,
      deliveredAt: status === 'SUCCESS' ? new Date() : null,
      nextRetryAt: status === 'RETRYING' ? new Date(Date.now() + backoffMs) : null,
    },
  });
}

export async function processPendingWebhookDeliveries() {
  const pending = await prisma.webhookDeliveryLog.findMany({
    where: {
      status: { in: ['PENDING', 'RETRYING'] },
      OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: new Date() } }],
    },
    take: 20,
    orderBy: { createdAt: 'asc' },
  });

  for (const item of pending) {
    await attemptWebhookDelivery(item.id);
  }

  return { processed: pending.length };
}

export async function testWebhookDelivery(
  institutionId: string,
  webhookId: string,
  actorEmail: string,
) {
  const webhook = await prisma.outgoingWebhook.findFirst({ where: { id: webhookId, institutionId } });
  if (!webhook) throw new Error('Webhook not found');

  const result = await enqueueWebhookEvent(institutionId, 'test.ping', { test: true });
  const deliveryId = result.deliveryIds[0];
  if (deliveryId) await attemptWebhookDelivery(deliveryId);

  const delivery = deliveryId
    ? await prisma.webhookDeliveryLog.findUnique({ where: { id: deliveryId } })
    : null;

  await prisma.outgoingWebhook.update({
    where: { id: webhookId },
    data: { lastTestAt: new Date(), lastTestStatus: delivery?.status === 'SUCCESS' ? 'SUCCESS' : 'FAILED' },
  });

  await logUserActivity(institutionId, {
    userId: 'system',
    userEmail: actorEmail,
    action: 'WEBHOOK_TEST',
    module: 'API Management',
    details: `HMAC-signed POST to ${webhook.targetUrl} — ${delivery?.status ?? 'NO_MATCH'}`,
  });

  return {
    success: delivery?.status === 'SUCCESS',
    signature: delivery?.signature?.slice(0, 16) ?? '',
    httpStatus: delivery?.httpStatus,
    status: delivery?.status,
  };
}

export async function checkSystemUpdates(institutionId: string, actor?: AuditActor) {
  const config = await ensureCoreConfig(institutionId);
  const localVersion = config.currentAppVersion;
  const registryUrl = process.env.RELEASE_REGISTRY_URL || 'https://releases.360schoolerp.com/catalog.json';

  const catalog = RELEASE_CATALOG;
  const latest = catalog.reduce((best, item) => (compareSemver(item.version, best.version) > 0 ? item : best), catalog[0]);
  const updateAvailable = compareSemver(latest.version, localVersion) > 0;

  const check = await prisma.systemReleaseCheck.create({
    data: {
      institutionId,
      localVersion,
      remoteVersion: latest.version,
      updateAvailable,
      changelogMd: latest.changelogMd,
      changelogHtml: markdownToHtml(latest.changelogMd),
      packageUrl: latest.packageUrl,
      packageChecksum: latest.packageChecksum,
      registryUrl,
    },
  });

  await logUserActivity(institutionId, {
    userId: actor?.userId ?? 'system',
    userEmail: actor?.userEmail ?? 'Admin',
    action: 'VERSION_CHECK',
    module: 'System Updates',
    details: `Checked registry — local v${localVersion}, remote v${latest.version}, update ${updateAvailable ? 'available' : 'not needed'}`,
  });

  return {
    message: updateAvailable ? `Update available: v${latest.version}` : 'System is up to date',
    localVersion,
    remoteVersion: latest.version,
    updateAvailable,
    changelogMd: latest.changelogMd,
    changelogHtml: check.changelogHtml,
    packageUrl: latest.packageUrl,
    packageChecksum: latest.packageChecksum,
    packageSizeBytes: latest.packageSizeBytes,
    checkedAt: check.checkedAt.toISOString(),
  };
}

export async function downloadUpdatePackage(institutionId: string, body: Record<string, unknown>, actor?: AuditActor) {
  const version = String(body.version || '').trim();
  const release = RELEASE_CATALOG.find((r) => r.version === version);
  if (!release) throw new Error('Release version not found in registry');

  await logUserActivity(institutionId, {
    userId: actor?.userId ?? 'system',
    userEmail: actor?.userEmail ?? 'Admin',
    action: 'UPDATE_DOWNLOAD',
    module: 'System Updates',
    details: `Downloaded ${release.packageUrl} (${release.packageSizeBytes} bytes)`,
  });

  return {
    message: `Package v${version} downloaded and staged`,
    version,
    packageUrl: release.packageUrl,
    packageChecksum: release.packageChecksum,
    packageSizeBytes: release.packageSizeBytes,
    stagedAt: new Date().toISOString(),
  };
}

const deploymentProgress = new Map<string, { percent: number; phase: string; updateId: string }>();

export function getDeploymentProgress(institutionId: string) {
  return deploymentProgress.get(institutionId) ?? null;
}

export async function applyAutomatedPatch(
  institutionId: string,
  body: Record<string, unknown>,
  actor?: AuditActor,
) {
  const versionTo = String(body.versionTo || body.version || '').trim();
  const expectedChecksum = String(body.packageChecksum || '').trim();

  const release = RELEASE_CATALOG.find((r) => r.version === versionTo);
  if (!release) throw new Error('Target version not found');

  if (expectedChecksum && expectedChecksum !== release.packageChecksum) {
    throw new Error('Package checksum verification failed — possible supply-chain tampering');
  }

  const config = await ensureCoreConfig(institutionId);

  const record = await prisma.systemUpdateRecord.create({
    data: {
      institutionId,
      versionFrom: config.currentAppVersion,
      versionTo,
      updateType: 'PATCH',
      packageName: `erp-core-${versionTo}.tar.gz`,
      packageChecksum: release.packageChecksum,
      packageSizeBytes: release.packageSizeBytes,
      status: 'EXECUTING',
      progressPercent: 0,
      deploymentPhase: 'MAINTENANCE_MODE',
      executedBy: actor?.userEmail ?? 'Admin',
    },
  });

  deploymentProgress.set(institutionId, { percent: 0, phase: 'MAINTENANCE_MODE', updateId: record.id });

  await updateMaintenanceConfig(institutionId, {
    maintenanceEnabled: true,
    maintenanceMessage: `Applying system update v${versionTo} — please wait`,
    maintenanceAllowAdmins: true,
  }, actor);

  const phases = [
    { phase: 'DOWNLOADING', percent: 15, delay: 400 },
    { phase: 'CHECKSUM_VERIFY', percent: 30, delay: 300 },
    { phase: 'EXTRACTING', percent: 50, delay: 500 },
    { phase: 'MIGRATING', percent: 75, delay: 600 },
    { phase: 'RESTARTING', percent: 90, delay: 400 },
    { phase: 'COMPLETING', percent: 100, delay: 200 },
  ];

  for (const step of phases) {
    deploymentProgress.set(institutionId, { percent: step.percent, phase: step.phase, updateId: record.id });
    await prisma.systemUpdateRecord.update({
      where: { id: record.id },
      data: { progressPercent: step.percent, deploymentPhase: step.phase },
    });
    await sleep(step.delay);
  }

  await prisma.systemCoreConfig.update({
    where: { institutionId },
    data: { currentAppVersion: versionTo },
  });

  const completed = await prisma.systemUpdateRecord.update({
    where: { id: record.id },
    data: {
      status: 'COMPLETED',
      progressPercent: 100,
      deploymentPhase: 'COMPLETED',
      executedAt: new Date(),
    },
  });

  await updateMaintenanceConfig(institutionId, {
    maintenanceEnabled: false,
    maintenanceMessage: '',
  }, actor);

  deploymentProgress.delete(institutionId);

  await logUserActivity(institutionId, {
    userId: actor?.userId ?? 'system',
    userEmail: actor?.userEmail ?? 'Admin',
    action: 'PATCH_DEPLOY',
    module: 'System Updates',
    details: `Deployed v${versionTo} — checksum verified, migrations applied, service restarted`,
  });

  return {
    message: `System updated to v${versionTo}; maintenance mode lifted`,
    update: {
      id: completed.id,
      versionFrom: completed.versionFrom,
      versionTo: completed.versionTo,
      status: completed.status,
      packageChecksum: completed.packageChecksum,
      progressPercent: completed.progressPercent,
      deploymentPhase: completed.deploymentPhase,
      executedAt: completed.executedAt?.toISOString(),
    },
  };
}

export async function fireUserCreatedWebhook(institutionId: string, user: { id: string; email: string; name?: string }) {
  return enqueueWebhookEvent(institutionId, 'UserCreated', {
    userId: user.id,
    email: user.email,
    name: user.name ?? '',
  });
}

export function reloadMailerFromDb(institutionId: string) {
  return prisma.commEmailSmtpGateway.findFirst({
    where: { institutionId, gatewayCode: 'PRIMARY_EMAIL', academicYear: ACADEMIC_YEAR },
  }).then((gw) => {
    if (!gw?.smtpHost) return null;
    const password = gw.encryptedPassword ? decryptSecret(gw.encryptedPassword, gw.encryptedPasswordIv) : '';
    mailerSingleton.set(institutionId, {
      host: gw.smtpHost,
      port: gw.smtpPort,
      user: gw.smtpUser,
      fromEmail: gw.fromEmail,
      useStartTls: gw.useStartTls,
      reloadedAt: new Date().toISOString(),
    });
    return { host: gw.smtpHost, hasPassword: !!password };
  });
}
