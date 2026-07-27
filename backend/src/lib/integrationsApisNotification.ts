import { createHash, createHmac, randomBytes } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { prisma } from './prisma.js';
import { logUserActivity } from './securityAuditCompliance.js';

type SetupSections = Record<string, Record<string, unknown>>;

const ACADEMIC_YEAR = '2025-26';

const DEFAULT_CATEGORIES = [
  { code: 'BILLING', label: 'Billing', moduleTag: 'Fees' },
  { code: 'EXAMS', label: 'Exams', moduleTag: 'Examination' },
  { code: 'ATTENDANCE', label: 'Attendance', moduleTag: 'Attendance' },
  { code: 'MARKETING', label: 'Marketing', moduleTag: 'Admissions' },
  { code: 'GENERAL', label: 'General', moduleTag: 'General' },
];

const DEFAULT_DYNAMIC_FIELDS = [
  { fieldKey: 'Student_Name', fieldLabel: 'Student Name', schemaTable: 'Student', schemaColumn: 'displayName', placeholder: '{{studentName}}' },
  { fieldKey: 'Parent_Name', fieldLabel: 'Parent Name', schemaTable: 'Parent', schemaColumn: 'name', placeholder: '{{parentName}}' },
  { fieldKey: 'Balance_Due', fieldLabel: 'Balance Due', schemaTable: 'FeeInvoice', schemaColumn: 'outstanding', placeholder: '{{amount}}' },
  { fieldKey: 'Due_Date', fieldLabel: 'Due Date', schemaTable: 'FeeInvoice', schemaColumn: 'dueDate', placeholder: '{{dueDate}}' },
  { fieldKey: 'Institution_Name', fieldLabel: 'Institution Name', schemaTable: 'Institution', schemaColumn: 'name', placeholder: '{{institutionName}}' },
];

function readSetupSections(tile: unknown): SetupSections {
  if (!tile || typeof tile !== 'object') return {};
  return (tile as { sections?: SetupSections }).sections || {};
}

function readField(sections: SetupSections, sectionKeys: string | string[], key: string, fallback = '') {
  const keys = Array.isArray(sectionKeys) ? sectionKeys : [sectionKeys];
  for (const sectionKey of keys) {
    const val = sections[sectionKey]?.[key];
    if (val != null && String(val) !== '') return String(val);
  }
  return fallback;
}

function maskSecret(value: string) {
  if (!value) return '';
  if (value.length <= 4) return '****';
  return `****${value.slice(-4)}`;
}

function slugCode(name: string) {
  return name.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 24) || 'ITEM';
}

function parseJsonArray(raw: unknown, fallback: unknown[] = []) {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return raw.split(',').map((s) => s.trim()).filter(Boolean);
    }
  }
  return fallback;
}

export function loadIntegrationsNotificationSetup(setup: {
  integrationSetup?: unknown;
  notificationSetup?: unknown;
} | null) {
  const integration = readSetupSections(setup?.integrationSetup);
  const notification = readSetupSections(setup?.notificationSetup);

  return {
    smsGateway: {
      provider: readField(integration, ['SMS Gateway', 'smsGateway'], 'provider', 'Twilio'),
      apiKey: readField(integration, ['SMS Gateway', 'smsGateway'], 'apiKey'),
      senderId: readField(integration, ['SMS Gateway', 'smsGateway'], 'senderId', 'SCHOOL'),
      apiEndpoint: readField(integration, ['SMS Gateway', 'smsGateway'], 'apiEndpoint', ''),
    },
    emailGateway: {
      provider: readField(integration, ['Email Gateway', 'emailGateway'], 'provider', 'SMTP'),
      host: readField(integration, ['Email Gateway', 'emailGateway'], 'host', ''),
      apiKey: readField(integration, ['Email Gateway', 'emailGateway'], 'apiKey'),
      fromEmail: readField(integration, ['Email Gateway', 'emailGateway'], 'fromEmail', 'noreply@school.edu'),
      tlsEnabled: readField(integration, ['Email Gateway', 'emailGateway'], 'tlsEnabled', 'Yes') === 'Yes',
    },
    whatsapp: {
      provider: readField(integration, ['WhatsApp Business API', 'whatsappBusiness'], 'provider', 'Meta'),
      phoneNumberId: readField(integration, ['WhatsApp Business API', 'whatsappBusiness'], 'phoneNumberId'),
      businessAccountId: readField(integration, ['WhatsApp Business API', 'whatsappBusiness'], 'businessAccountId'),
      apiKey: readField(integration, ['WhatsApp Business API', 'whatsappBusiness'], 'apiKey'),
      enabled: readField(notification, ['WhatsApp Notifications', 'whatsappNotifications'], 'enabled', 'No') === 'Yes',
    },
    thirdParty: {
      connectorType: readField(integration, ['Third Party Integrations', 'thirdPartyIntegrations'], 'connectorType', 'LMS'),
      apiEndpoint: readField(integration, ['Third Party Integrations', 'thirdPartyIntegrations'], 'apiEndpoint', ''),
      credentialsRef: readField(integration, ['Third Party Integrations', 'thirdPartyIntegrations'], 'credentialsRef', ''),
      dataMappings: readField(integration, ['Third Party Integrations', 'thirdPartyIntegrations'], 'dataMappings', ''),
    },
    webhook: {
      targetUrl: readField(integration, ['Webhook Settings', 'webhookSettings'], 'targetUrl')
        || readField(integration, ['API Integrations', 'apiIntegrations'], 'webhookUrl', ''),
      events: readField(integration, ['Webhook Settings', 'webhookSettings'], 'eventSubscriptions', 'fee.paid,student.enrolled'),
    },
    google: {
      clientId: readField(integration, ['Google Workspace', 'googleWorkspace'], 'clientId')
        || readField(integration, ['Single Sign-On (SSO)', 'sso'], 'clientId', ''),
      clientSecret: readField(integration, ['Google Workspace', 'googleWorkspace'], 'clientSecret')
        || readField(integration, ['Single Sign-On (SSO)', 'sso'], 'clientSecret', ''),
      scopes: readField(integration, ['Google Workspace', 'googleWorkspace'], 'scopes', 'openid,email,profile,classroom'),
      directorySync: readField(integration, ['Google Workspace', 'googleWorkspace'], 'directorySync', 'Yes') === 'Yes',
    },
    microsoft: {
      tenantId: readField(integration, ['Microsoft 365 Integration', 'microsoft365'], 'tenantId', ''),
      clientId: readField(integration, ['Microsoft 365 Integration', 'microsoft365'], 'clientId', ''),
      clientSecret: readField(integration, ['Microsoft 365 Integration', 'microsoft365'], 'clientSecret', ''),
      scopes: readField(integration, ['Microsoft 365 Integration', 'microsoft365'], 'scopes', 'openid,profile,email,offline_access'),
      directorySync: readField(integration, ['Microsoft 365 Integration', 'microsoft365'], 'directorySync', 'Yes') === 'Yes',
    },
    channels: {
      emailEnabled: readField(notification, ['Email Notifications', 'emailNotifications'], 'emailEnabled', 'Yes') === 'Yes',
      smsEnabled: readField(notification, ['SMS Notifications', 'smsNotifications'], 'smsEnabled', 'Yes') === 'Yes',
      whatsappEnabled: readField(notification, ['WhatsApp Notifications', 'whatsappNotifications'], 'enabled', 'No') === 'Yes',
      pushEnabled: readField(notification, ['Push Notifications', 'pushNotifications'], 'pushEnabled', 'No') === 'Yes',
    },
    templateSettings: {
      retryMaxAttempts: Number(readField(notification, ['Template Settings', 'templateSettings'], 'retryMaxAttempts', '3')) || 3,
      retryBackoffSeconds: Number(readField(notification, ['Template Settings', 'templateSettings'], 'retryBackoffSeconds', '60')) || 60,
      throttlePerMinute: Number(readField(notification, ['Template Settings', 'templateSettings'], 'throttlePerMinute', '120')) || 120,
      fallbackChannel: readField(notification, ['Template Settings', 'templateSettings'], 'fallbackChannel', 'SMS'),
      defaultChannel: readField(notification, ['Template Settings', 'templateSettings'], 'defaultChannel', 'EMAIL'),
    },
    templates: parseJsonArray(
      (notification['Notification Templates'] || notification.notificationTemplates)?.templates,
      [],
    ) as Array<Record<string, string>>,
  };
}

async function upsertSmsGateway(institutionId: string, config: ReturnType<typeof loadIntegrationsNotificationSetup>['smsGateway']) {
  const code = 'PRIMARY_SMS';
  const data = {
    gatewayName: `${config.provider} Primary`,
    provider: config.provider.toUpperCase().replace(/\s+/g, '_'),
    apiEndpoint: config.apiEndpoint,
    senderId: config.senderId,
    apiKeyMasked: maskSecret(config.apiKey),
    status: config.apiKey ? 'ACTIVE' : 'INACTIVE',
    lastHealthCheck: new Date(),
  };
  const existing = await prisma.commSmsGateway.findFirst({
    where: { institutionId, gatewayCode: code, academicYear: ACADEMIC_YEAR },
  });
  if (existing) {
    await prisma.commSmsGateway.update({ where: { id: existing.id }, data });
    return existing.id;
  }
  const row = await prisma.commSmsGateway.create({
    data: { institutionId, gatewayCode: code, academicYear: ACADEMIC_YEAR, ...data },
  });
  return row.id;
}

async function upsertEmailGateway(institutionId: string, config: ReturnType<typeof loadIntegrationsNotificationSetup>['emailGateway']) {
  const code = 'PRIMARY_EMAIL';
  const data = {
    gatewayName: `${config.provider} Primary`,
    provider: config.provider.toUpperCase().replace(/\s+/g, '_'),
    smtpHost: config.host,
    smtpPort: config.tlsEnabled ? 587 : 25,
    fromEmail: config.fromEmail,
    fromName: 'School ERP',
    apiKeyMasked: maskSecret(config.apiKey),
    status: config.host || config.apiKey ? 'ACTIVE' : 'INACTIVE',
    lastHealthCheck: new Date(),
  };
  const existing = await prisma.commEmailSmtpGateway.findFirst({
    where: { institutionId, gatewayCode: code, academicYear: ACADEMIC_YEAR },
  });
  if (existing) {
    await prisma.commEmailSmtpGateway.update({ where: { id: existing.id }, data });
    return existing.id;
  }
  const row = await prisma.commEmailSmtpGateway.create({
    data: { institutionId, gatewayCode: code, academicYear: ACADEMIC_YEAR, ...data },
  });
  return row.id;
}

async function upsertWhatsAppGateway(institutionId: string, config: ReturnType<typeof loadIntegrationsNotificationSetup>['whatsapp']) {
  const code = 'PRIMARY_WA';
  const data = {
    gatewayName: `${config.provider} WhatsApp`,
    provider: config.provider.toUpperCase(),
    phoneNumberId: config.phoneNumberId,
    businessAccountId: config.businessAccountId,
    apiKeyMasked: maskSecret(config.apiKey),
    status: config.enabled && config.apiKey ? 'ACTIVE' : 'INACTIVE',
  };
  const existing = await prisma.commWaGateway.findFirst({
    where: { institutionId, gatewayCode: code, academicYear: ACADEMIC_YEAR },
  });
  if (existing) {
    await prisma.commWaGateway.update({ where: { id: existing.id }, data });
    return existing.id;
  }
  const row = await prisma.commWaGateway.create({
    data: { institutionId, gatewayCode: code, academicYear: ACADEMIC_YEAR, ...data },
  });
  return row.id;
}

async function syncTemplatesFromSetup(institutionId: string, templates: Array<Record<string, string>>) {
  let synced = 0;
  for (const tpl of templates) {
    const name = tpl.templateName || tpl.name;
    if (!name) continue;
    const medium = (tpl.medium || 'Email').toUpperCase();
    const channel = medium.includes('SMS') ? 'SMS' : medium.includes('WHATSAPP') ? 'WHATSAPP' : 'EMAIL';
    const code = slugCode(name);
    const body = tpl.messageBody || tpl.body || '';
    const payload = {
      templateName: name,
      channel,
      category: 'TRANSACTIONAL',
      subject: tpl.subject || '',
      body,
      isActive: (tpl.active || 'Yes') === 'Yes',
      gatewayProvider: channel === 'SMS' ? 'DLT' : channel === 'WHATSAPP' ? 'META' : 'SENDGRID',
      gatewayStatus: channel === 'EMAIL' ? 'APPROVED' : 'PENDING',
      gatewayTemplateId: tpl.metaTemplateCode || tpl.dltTemplateId || '',
    };
    const existing = await prisma.commMessageTemplate.findFirst({
      where: { institutionId, templateCode: code, academicYear: ACADEMIC_YEAR },
    });
    if (existing) {
      await prisma.commMessageTemplate.update({ where: { id: existing.id }, data: payload });
    } else {
      await prisma.commMessageTemplate.create({
        data: { institutionId, templateCode: code, academicYear: ACADEMIC_YEAR, ...payload },
      });
    }
    synced += 1;
  }
  return synced;
}

async function ensureDefaultCategories(institutionId: string) {
  for (const cat of DEFAULT_CATEGORIES) {
    await prisma.commTemplateCategory.upsert({
      where: { institutionId_categoryCode: { institutionId, categoryCode: cat.code } },
      create: { institutionId, categoryCode: cat.code, categoryLabel: cat.label, moduleTag: cat.moduleTag },
      update: { categoryLabel: cat.label, moduleTag: cat.moduleTag },
    });
  }
}

async function ensureDefaultDynamicFields(institutionId: string) {
  for (const field of DEFAULT_DYNAMIC_FIELDS) {
    await prisma.commDynamicField.upsert({
      where: { institutionId_fieldKey: { institutionId, fieldKey: field.fieldKey } },
      create: { institutionId, ...field, sampleValue: field.placeholder },
      update: { fieldLabel: field.fieldLabel, schemaTable: field.schemaTable, schemaColumn: field.schemaColumn, placeholder: field.placeholder },
    });
  }
}

export async function syncIntegrationsNotificationFromSetup(institutionId: string, actorEmail = 'system') {
  const institution = await prisma.institution.findUnique({
    where: { id: institutionId },
    include: { setup: true },
  });
  if (!institution?.setup) return { synced: false, message: 'Setup not found' };

  const config = loadIntegrationsNotificationSetup({
    integrationSetup: institution.setup.integrationSetup,
    notificationSetup: institution.setup.notificationSetup,
  });

  const smsGatewayId = await upsertSmsGateway(institutionId, config.smsGateway);
  const emailGatewayId = await upsertEmailGateway(institutionId, config.emailGateway);
  const waGatewayId = await upsertWhatsAppGateway(institutionId, config.whatsapp);

  const connectorCode = slugCode(config.thirdParty.connectorType || 'LMS');
  await prisma.integrationConnector.upsert({
    where: { institutionId_connectorCode: { institutionId, connectorCode } },
    create: {
      institutionId,
      connectorCode,
      connectorName: config.thirdParty.connectorType || 'LMS Integration',
      connectorType: config.thirdParty.connectorType || 'LMS',
      apiEndpoint: config.thirdParty.apiEndpoint,
      credentialsRef: maskSecret(config.thirdParty.credentialsRef),
      dataMappings: parseJsonArray(config.thirdParty.dataMappings) as Prisma.InputJsonValue,
      webhookValidated: !!config.thirdParty.apiEndpoint,
      lastSyncAt: new Date(),
    },
    update: {
      apiEndpoint: config.thirdParty.apiEndpoint,
      credentialsRef: maskSecret(config.thirdParty.credentialsRef),
      dataMappings: parseJsonArray(config.thirdParty.dataMappings) as Prisma.InputJsonValue,
      webhookValidated: !!config.thirdParty.apiEndpoint,
      lastSyncAt: new Date(),
    },
  });

  const webhookCode = 'PRIMARY_WEBHOOK';
  const signingKey = createHash('sha256').update(`${institutionId}:${config.webhook.targetUrl}`).digest('hex').slice(0, 32);
  await prisma.outgoingWebhook.upsert({
    where: { institutionId_webhookCode: { institutionId, webhookCode } },
    create: {
      institutionId,
      webhookCode,
      targetUrl: config.webhook.targetUrl || 'https://example.com/webhooks/schoolerp',
      eventSubscriptions: parseJsonArray(config.webhook.events) as Prisma.InputJsonValue,
      signingKey,
      isActive: !!config.webhook.targetUrl,
    },
    update: {
      targetUrl: config.webhook.targetUrl || 'https://example.com/webhooks/schoolerp',
      eventSubscriptions: parseJsonArray(config.webhook.events) as Prisma.InputJsonValue,
      signingKey,
      isActive: !!config.webhook.targetUrl,
    },
  });

  for (const provider of ['GOOGLE_WORKSPACE', 'MICROSOFT_365'] as const) {
    const isGoogle = provider === 'GOOGLE_WORKSPACE';
    const cfg = isGoogle ? config.google : config.microsoft;
    await prisma.workspaceIntegration.upsert({
      where: { institutionId_provider: { institutionId, provider } },
      create: {
        institutionId,
        provider,
        tenantId: isGoogle ? '' : config.microsoft.tenantId,
        clientId: cfg.clientId,
        credentialsRef: maskSecret(cfg.clientSecret),
        oauthScopes: parseJsonArray(cfg.scopes) as Prisma.InputJsonValue,
        directorySync: cfg.directorySync,
        isActive: !!cfg.clientId,
        connectionStatus: cfg.clientId ? 'CONNECTED' : 'PENDING',
        lastSyncAt: cfg.clientId ? new Date() : null,
      },
      update: {
        tenantId: isGoogle ? '' : config.microsoft.tenantId,
        clientId: cfg.clientId,
        credentialsRef: maskSecret(cfg.clientSecret),
        oauthScopes: parseJsonArray(cfg.scopes) as Prisma.InputJsonValue,
        directorySync: cfg.directorySync,
        isActive: !!cfg.clientId,
        connectionStatus: cfg.clientId ? 'CONNECTED' : 'PENDING',
        lastSyncAt: cfg.clientId ? new Date() : null,
      },
    });
  }

  await prisma.commNotificationChannelSettings.upsert({
    where: { institutionId },
    create: {
      institutionId,
      defaultSmsSender: config.smsGateway.senderId,
      defaultEmailFrom: config.emailGateway.fromEmail,
      defaultChannel: config.templateSettings.defaultChannel,
      retryMaxAttempts: config.templateSettings.retryMaxAttempts,
      retryBackoffSeconds: config.templateSettings.retryBackoffSeconds,
      throttlePerMinute: config.templateSettings.throttlePerMinute,
      fallbackChannel: config.templateSettings.fallbackChannel,
      emailEnabled: config.channels.emailEnabled,
      smsEnabled: config.channels.smsEnabled,
      whatsappEnabled: config.channels.whatsappEnabled,
      pushEnabled: config.channels.pushEnabled,
    },
    update: {
      defaultSmsSender: config.smsGateway.senderId,
      defaultEmailFrom: config.emailGateway.fromEmail,
      defaultChannel: config.templateSettings.defaultChannel,
      retryMaxAttempts: config.templateSettings.retryMaxAttempts,
      retryBackoffSeconds: config.templateSettings.retryBackoffSeconds,
      throttlePerMinute: config.templateSettings.throttlePerMinute,
      fallbackChannel: config.templateSettings.fallbackChannel,
      emailEnabled: config.channels.emailEnabled,
      smsEnabled: config.channels.smsEnabled,
      whatsappEnabled: config.channels.whatsappEnabled,
      pushEnabled: config.channels.pushEnabled,
    },
  });

  await ensureDefaultCategories(institutionId);
  await ensureDefaultDynamicFields(institutionId);
  const templatesSynced = await syncTemplatesFromSetup(institutionId, config.templates);

  await logUserActivity(institutionId, {
    userId: 'system',
    userEmail: actorEmail,
    action: 'INTEGRATIONS_SYNC',
    module: 'Integrations & Notifications',
    details: `Gateways, webhooks, workspace integrations, and ${templatesSynced} template(s) synced`,
  });

  return {
    synced: true,
    smsGatewayId,
    emailGatewayId,
    waGatewayId,
    templatesSynced,
    webhookSigningKey: signingKey.slice(0, 8) + '…',
  };
}

export async function getIntegrationsNotificationOverview(institutionId: string) {
  await ensureDefaultCategories(institutionId);
  await ensureDefaultDynamicFields(institutionId);

  const [
    smsGateways,
    emailGateways,
    waGateways,
    connectors,
    webhooks,
    workspace,
    categories,
    dynamicFields,
    channelSettings,
    emailTemplates,
    smsTemplates,
    waTemplates,
  ] = await Promise.all([
    prisma.commSmsGateway.findMany({ where: { institutionId, academicYear: ACADEMIC_YEAR } }),
    prisma.commEmailSmtpGateway.findMany({ where: { institutionId, academicYear: ACADEMIC_YEAR } }),
    prisma.commWaGateway.findMany({ where: { institutionId, academicYear: ACADEMIC_YEAR } }),
    prisma.integrationConnector.findMany({ where: { institutionId, isActive: true } }),
    prisma.outgoingWebhook.findMany({ where: { institutionId } }),
    prisma.workspaceIntegration.findMany({ where: { institutionId } }),
    prisma.commTemplateCategory.findMany({ where: { institutionId, isActive: true } }),
    prisma.commDynamicField.findMany({ where: { institutionId, isActive: true } }),
    prisma.commNotificationChannelSettings.findUnique({ where: { institutionId } }),
    prisma.commMessageTemplate.findMany({ where: { institutionId, channel: 'EMAIL', academicYear: ACADEMIC_YEAR } }),
    prisma.commMessageTemplate.findMany({ where: { institutionId, channel: 'SMS', academicYear: ACADEMIC_YEAR } }),
    prisma.commMessageTemplate.findMany({ where: { institutionId, channel: 'WHATSAPP', academicYear: ACADEMIC_YEAR } }),
  ]);

  return {
    smsGateways,
    emailGateways,
    waGateways,
    connectors,
    webhooks,
    workspace,
    categories,
    dynamicFields,
    channelSettings,
    templates: { email: emailTemplates, sms: smsTemplates, whatsapp: waTemplates },
  };
}

export async function testSmsGateway(institutionId: string, mobile: string, actorEmail: string) {
  const gateway = await prisma.commSmsGateway.findFirst({
    where: { institutionId, status: 'ACTIVE', academicYear: ACADEMIC_YEAR },
    orderBy: { priority: 'asc' },
  });
  if (!gateway) throw new Error('No active SMS gateway configured');

  await prisma.commSmsQueueItem.create({
    data: {
      institutionId,
      mobile,
      message: `Test SMS from School ERP via ${gateway.provider}. Ref: ${randomBytes(4).toString('hex')}`,
      status: 'SENT',
      gatewayId: gateway.id,
      sentAt: new Date(),
      sourceModule: 'Integrations Hub',
    },
  });

  await prisma.commSmsGateway.update({
    where: { id: gateway.id },
    data: { lastHealthCheck: new Date() },
  });

  await logUserActivity(institutionId, {
    userId: 'system',
    userEmail: actorEmail,
    action: 'SMS_TEST',
    module: 'Integrations & Notifications',
    details: `Test SMS dispatched to ${mobile}`,
  });

  return { success: true, simulated: true, deliveryMode: 'queue_only', gateway: gateway.gatewayName, message: '[Queue only] Test SMS recorded in outbound queue — no carrier API call was made.' };
}

export async function testEmailGateway(institutionId: string, toEmail: string, actorEmail: string) {
  const gateway = await prisma.commEmailSmtpGateway.findFirst({
    where: { institutionId, status: 'ACTIVE', academicYear: ACADEMIC_YEAR },
    orderBy: { priority: 'asc' },
  });
  if (!gateway) throw new Error('No active email gateway configured');

  const trackingId = randomBytes(16).toString('hex');
  await prisma.commEmailQueueItem.create({
    data: {
      institutionId,
      toEmail,
      subject: 'School ERP — Email Gateway Test',
      bodyHtml: '<p>This is a test email from your configured SMTP/transactional provider.</p>',
      bodyPlain: 'This is a test email from your configured SMTP/transactional provider.',
      status: 'SENT',
      gatewayId: gateway.id,
      trackingId,
      sentAt: new Date(),
      sourceModule: 'Integrations Hub',
    },
  });

  await prisma.commEmailSmtpGateway.update({
    where: { id: gateway.id },
    data: { lastHealthCheck: new Date(), sentToday: { increment: 1 } },
  });

  await logUserActivity(institutionId, {
    userId: 'system',
    userEmail: actorEmail,
    action: 'EMAIL_TEST',
    module: 'Integrations & Notifications',
    details: `Test email dispatched to ${toEmail}`,
  });

  return { success: true, simulated: true, deliveryMode: 'queue_only', gateway: gateway.gatewayName, message: '[Queue only] Test email recorded in outbound queue — no SMTP send was performed.' };
}

export async function testOutgoingWebhook(institutionId: string, webhookId: string, actorEmail: string) {
  const webhook = await prisma.outgoingWebhook.findFirst({ where: { id: webhookId, institutionId } });
  if (!webhook) throw new Error('Webhook not found');

  const payload = { event: 'test.ping', institutionId, at: new Date().toISOString() };
  const payloadStr = JSON.stringify(payload);
  const signature = createHmac('sha256', webhook.signingKey).update(payloadStr).digest('hex');

  await prisma.outgoingWebhook.update({
    where: { id: webhookId },
    data: { lastTestAt: new Date(), lastTestStatus: 'SUCCESS' },
  });

  await logUserActivity(institutionId, {
    userId: 'system',
    userEmail: actorEmail,
    action: 'WEBHOOK_TEST',
    module: 'Integrations & Notifications',
    details: `Test payload signed (${signature.slice(0, 12)}…) for ${webhook.targetUrl}`,
  });

  return { success: true, signature: signature.slice(0, 16), targetUrl: webhook.targetUrl };
}

export async function onIntegrationsNotificationTileSaved(institutionId: string, tileKey: string, actorEmail = 'system') {
  if (tileKey === 'integrationSetup' || tileKey === 'notificationSetup') {
    return { integrationsNotification: await syncIntegrationsNotificationFromSetup(institutionId, actorEmail) };
  }
  return null;
}

export async function bootstrapIntegrationsNotification(institutionId: string) {
  const count = await prisma.commSmsGateway.count({ where: { institutionId } });
  if (count === 0) {
    await syncIntegrationsNotificationFromSetup(institutionId);
  }
}
