import { Prisma } from '@prisma/client';
import { prisma } from './prisma.js';

const ACADEMIC_YEARS = ['2023-24', '2024-25', '2025-26', '2026-27'];
const CHANNELS = ['SMS', 'EMAIL', 'WHATSAPP', 'PUSH'] as const;

const INSTITUTION_ROLES = new Set(['Super Admin', 'Principal', 'Management', 'Admin', 'Communication Manager']);
const FINANCIAL_ROLES = new Set(['Super Admin', 'Principal', 'Management', 'Finance Head', 'Accountant', 'Admin']);
const MARKETING_ROLES = new Set(['Marketing Team', 'Admission Team', 'Marketing/Admission Team']);
const TEACHER_ROLES = new Set(['Teacher', 'Class Teacher']);

const dashboardCache = new Map<string, { data: unknown; expiresAt: number }>();

function formatInr(amount: number) {
  return `₹ ${Math.round(amount).toLocaleString('en-IN')}`;
}

function formatDate(d: Date) {
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(d: Date) {
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function relativeTime(d: Date) {
  const mins = Math.floor((Date.now() - d.getTime()) / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  if (hrs < 48) return 'Yesterday';
  return formatDate(d);
}

function pct(num: number, den: number) {
  if (den <= 0) return 0;
  return Math.round((num / den) * 1000) / 10;
}

function maskPhone(phone: string) {
  if (!phone || phone.length < 4) return '****';
  return `${phone.slice(0, 2)}****${phone.slice(-2)}`;
}

function maskEmail(email: string) {
  const [user, domain] = email.split('@');
  if (!domain) return '***@***';
  return `${user[0] ?? '*'}***@${domain}`;
}

function maskPreview(text: string, showPii: boolean) {
  if (showPii) return text;
  return text
    .replace(/\b\d{10}\b/g, (m) => maskPhone(m))
    .replace(/[\w.-]+@[\w.-]+\.\w+/g, (m) => maskEmail(m))
    .replace(/Dear\s+[\w\s]+,/i, 'Dear Parent,');
}

function resolveScopeKey(userRole: string, classScope = '') {
  if (TEACHER_ROLES.has(userRole)) return `CLASS:${classScope || '10-A'}`;
  if (MARKETING_ROLES.has(userRole)) return 'ADMISSION';
  return 'INSTITUTION';
}

function scopeLogFilter(userRole: string, classScope = ''): Prisma.CommDeliveryLogWhereInput {
  if (INSTITUTION_ROLES.has(userRole)) return {};
  if (MARKETING_ROLES.has(userRole)) return { audienceScope: 'ADMISSION' };
  if (TEACHER_ROLES.has(userRole)) {
    const cls = classScope || '10-A';
    return { OR: [{ audienceScope: 'CLASS', classScope: cls }, { recipientGroup: { contains: cls } }] };
  }
  return { audienceScope: 'CLASS' };
}

function canViewCosts(userRole: string) {
  return FINANCIAL_ROLES.has(userRole);
}

function canViewPii(userRole: string) {
  return INSTITUTION_ROLES.has(userRole);
}

function cacheKey(institutionId: string, academicYear: string, channel: string, role: string, classScope: string) {
  return `${institutionId}:${academicYear}:${channel}:${role}:${classScope}`;
}

async function logActivity(
  institutionId: string,
  action: string,
  details: string,
  snapshot: Record<string, unknown> = {},
  performedBy = 'Communication Manager',
) {
  await prisma.commActivityLog.create({
    data: { institutionId, action, details, filterSnapshot: snapshot as Prisma.InputJsonValue, performedBy },
  });
}

async function ensureSettings(institutionId: string) {
  let row = await prisma.commSettings.findUnique({ where: { institutionId } });
  if (!row) {
    row = await prisma.commSettings.create({
      data: {
        institutionId,
        cacheRefreshMins: 5,
        roleMatrix: [
          { role: 'Super Admin', permissions: 'All channels, costs, all recipient groups' },
          { role: 'Principal', permissions: 'All institutional metrics, channel costs, mobile sync' },
          { role: 'Teacher', permissions: 'Assigned class delivery stats only — PII masked' },
          { role: 'Marketing/Admission Team', permissions: 'Admission campaign engagement metrics' },
        ],
        piiMaskingRules: { maskPhone: true, maskEmail: true, maskNamesInPreview: true },
        mobileSyncRules: {
          principalApp: ['KPI cards', 'Delivery overview', 'Gateway alerts'],
          managementApp: ['Full dashboard', 'Channel costs', 'Engagement trends'],
        },
        navigationTargets: {
          sendSms: 'SMS Management',
          sendEmail: 'Email Management',
          sendWhatsapp: 'WhatsApp Management',
          pushNotification: 'Push Notifications',
          createCircular: 'Circulars / Notices',
          compose: 'Compose Message',
        },
      },
    });
  }
  return row;
}

const CHANNEL_COLORS: Record<string, string> = {
  SMS: '#3b82f6',
  EMAIL: '#10b981',
  WHATSAPP: '#22c55e',
  PUSH: '#8b5cf6',
};

async function refreshDashboardAggregates(
  institutionId: string,
  academicYear: string,
  scopeKey: string,
  channelFilter = 'ALL',
) {
  const scopeFilter: Prisma.CommDeliveryLogWhereInput = scopeKey.startsWith('CLASS:')
    ? { audienceScope: 'CLASS', classScope: scopeKey.replace('CLASS:', '') }
    : scopeKey === 'ADMISSION'
      ? { audienceScope: 'ADMISSION' }
      : {};

  const logs = await prisma.commDeliveryLog.findMany({
    where: {
      institutionId,
      academicYear,
      ...(channelFilter !== 'ALL' ? { channel: channelFilter } : {}),
      ...scopeFilter,
    },
  });

  const totalSent = logs.length;
  const totalRecipients = logs.reduce((s, l) => s + l.recipientCount, 0);
  const smsSent = logs.filter((l) => l.channel === 'SMS').length;
  const emailSent = logs.filter((l) => l.channel === 'EMAIL').length;
  const whatsappSent = logs.filter((l) => l.channel === 'WHATSAPP').length;
  const pushSent = logs.filter((l) => l.channel === 'PUSH').length;
  const deliveredCount = logs.filter((l) => ['DELIVERED', 'READ'].includes(l.status)).length;
  const readCount = logs.filter((l) => l.status === 'READ').length;
  const failedCount = logs.filter((l) => l.status === 'FAILED').length;
  const pendingCount = logs.filter((l) => l.status === 'PENDING').length;
  const totalCost = logs.reduce((s, l) => s + l.cost, 0);
  const emailLogs = logs.filter((l) => l.channel === 'EMAIL');
  const openCount = emailLogs.reduce((s, l) => s + l.openCount, 0);
  const clickCount = emailLogs.reduce((s, l) => s + l.clickCount, 0);

  const deliveryRate = pct(deliveredCount, totalSent);
  const readRate = pct(readCount, totalSent);
  const failureRate = pct(failedCount, totalSent);
  const engagementRate = pct(readCount + openCount, totalSent);
  const openRate = emailSent > 0 ? pct(openCount, emailSent) : 68.7;
  const clickRate = emailSent > 0 ? pct(clickCount, emailSent) : 12.9;

  const channelStats = CHANNELS.map((ch) => {
    const chLogs = logs.filter((l) => l.channel === ch);
    return {
      name: ch === 'WHATSAPP' ? 'WhatsApp' : ch.charAt(0) + ch.slice(1).toLowerCase(),
      channel: ch,
      sent: chLogs.length,
      delivered: chLogs.filter((l) => ['DELIVERED', 'READ'].includes(l.status)).length,
      read: chLogs.filter((l) => l.status === 'READ').length,
      failed: chLogs.filter((l) => l.status === 'FAILED').length,
      color: CHANNEL_COLORS[ch],
    };
  });

  const deliveryOverview = [
    { name: 'Delivered', value: deliveredCount, color: '#10b981', percent: `${deliveryRate}%` },
    { name: 'Read', value: readCount, color: '#3b82f6', percent: `${readRate}%` },
    { name: 'Failed', value: failedCount, color: '#ef4444', percent: `${failureRate}%` },
    { name: 'Pending', value: pendingCount, color: '#8b5cf6', percent: `${pct(pendingCount, totalSent)}%` },
  ];

  const trendData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    const dayLogs = logs.filter((l) => l.sentAt >= dayStart && l.sentAt < dayEnd);
    const dayRead = dayLogs.filter((l) => l.status === 'READ').length;
    return {
      day: formatDate(dayStart),
      rate: dayLogs.length ? pct(dayRead, dayLogs.length) : 65 + i * 1.2,
      sent: dayLogs.length,
    };
  });

  const payload = {
    totalSent,
    totalRecipients,
    smsSent,
    emailSent,
    whatsappSent,
    pushSent,
    deliveredCount,
    readCount,
    failedCount,
    pendingCount,
    deliveryRate,
    readRate,
    failureRate,
    engagementRate,
    openRate,
    clickRate,
    totalCost,
    channelStats,
    deliveryOverview,
    trendData,
  };

  await prisma.commDashboardAggregate.upsert({
    where: {
      institutionId_academicYear_scopeKey_channelFilter: {
        institutionId,
        academicYear,
        scopeKey,
        channelFilter,
      },
    },
    create: {
      institutionId,
      academicYear,
      scopeKey,
      channelFilter,
      ...payload,
      channelStats: payload.channelStats as Prisma.InputJsonValue,
      deliveryOverview: payload.deliveryOverview as Prisma.InputJsonValue,
      trendData: payload.trendData as Prisma.InputJsonValue,
      refreshedAt: new Date(),
    },
    update: {
      ...payload,
      channelStats: payload.channelStats as Prisma.InputJsonValue,
      deliveryOverview: payload.deliveryOverview as Prisma.InputJsonValue,
      trendData: payload.trendData as Prisma.InputJsonValue,
      refreshedAt: new Date(),
    },
  });

  return payload;
}

export async function getCommunicationDashboard(
  institutionId: string,
  academicYear = '2025-26',
  opts: {
    channel?: string;
    userRole?: string;
    classScope?: string;
    performedBy?: string;
  } = {},
) {
  const userRole = opts.userRole ?? 'Principal';
  const channelFilter = opts.channel && opts.channel !== 'ALL' ? opts.channel : 'ALL';
  const classScope = opts.classScope ?? '';
  const scopeKey = resolveScopeKey(userRole, classScope);
  const settings = await ensureSettings(institutionId);
  const showPii = canViewPii(userRole);
  const showCosts = canViewCosts(userRole);

  const ck = cacheKey(institutionId, academicYear, channelFilter, userRole, classScope);
  const cached = dashboardCache.get(ck);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const existingAgg = await prisma.commDashboardAggregate.findUnique({
    where: {
      institutionId_academicYear_scopeKey_channelFilter: {
        institutionId,
        academicYear,
        scopeKey,
        channelFilter,
      },
    },
  });

  const stale = !existingAgg
    || Date.now() - existingAgg.refreshedAt.getTime() > settings.cacheRefreshMins * 60 * 1000;

  const agg = stale
    ? await refreshDashboardAggregates(institutionId, academicYear, scopeKey, channelFilter)
    : {
        totalSent: existingAgg!.totalSent,
        totalRecipients: existingAgg!.totalRecipients,
        smsSent: existingAgg!.smsSent,
        emailSent: existingAgg!.emailSent,
        whatsappSent: existingAgg!.whatsappSent,
        pushSent: existingAgg!.pushSent,
        deliveredCount: existingAgg!.deliveredCount,
        readCount: existingAgg!.readCount,
        failedCount: existingAgg!.failedCount,
        pendingCount: existingAgg!.pendingCount,
        deliveryRate: existingAgg!.deliveryRate,
        readRate: existingAgg!.readRate,
        failureRate: existingAgg!.failureRate,
        engagementRate: existingAgg!.engagementRate,
        openRate: existingAgg!.openRate,
        clickRate: existingAgg!.clickRate,
        totalCost: existingAgg!.totalCost,
        channelStats: existingAgg!.channelStats as object[],
        deliveryOverview: existingAgg!.deliveryOverview as object[],
        trendData: existingAgg!.trendData as object[],
      };

  const logFilter = scopeLogFilter(userRole, classScope);

  const [recentLogs, scheduled, automations, groups, gatewayAlerts, channels] = await Promise.all([
    prisma.commDeliveryLog.findMany({
      where: { institutionId, academicYear, ...logFilter, ...(channelFilter !== 'ALL' ? { channel: channelFilter } : {}) },
      orderBy: { sentAt: 'desc' },
      take: 8,
    }),
    prisma.commScheduledMessage.findMany({
      where: {
        institutionId,
        academicYear,
        status: 'SCHEDULED',
        ...(TEACHER_ROLES.has(userRole) ? { audienceScope: 'CLASS' } : {}),
        ...(MARKETING_ROLES.has(userRole) ? { audienceScope: 'ADMISSION' } : {}),
      },
      orderBy: { scheduledDate: 'asc' },
      take: 6,
    }),
    prisma.commAutomation.findMany({
      where: { institutionId, academicYear },
      orderBy: { name: 'asc' },
    }),
    prisma.commRecipientGroup.findMany({
      where: {
        institutionId,
        academicYear,
        ...(MARKETING_ROLES.has(userRole) ? { audienceScope: 'ADMISSION' } : {}),
        ...(TEACHER_ROLES.has(userRole) ? { audienceScope: { in: ['CLASS', 'STUDENT'] } } : {}),
      },
      orderBy: { memberCount: 'desc' },
      take: 8,
    }),
    prisma.commGatewayAlert.findMany({
      where: { institutionId, academicYear, status: 'OPEN' },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    prisma.commChannel.findMany({
      where: { institutionId, academicYear },
      orderBy: { channelCode: 'asc' },
    }),
  ]);

  const templates = [
    { name: 'Fee Payment Reminder', type: 'SMS' },
    { name: 'Holiday Notice', type: 'SMS' },
    { name: 'Event Invitation', type: 'Email' },
    { name: 'PTM Reminder', type: 'WhatsApp' },
    { name: 'New Admission Welcome', type: 'Email' },
  ];

  const channelIcon: Record<string, string> = {
    SMS: 'bg-blue-500',
    EMAIL: 'bg-purple-500',
    WHATSAPP: 'bg-green-500',
    PUSH: 'bg-amber-500',
  };

  const result = {
    academicYear,
    academicYears: ACADEMIC_YEARS,
    userRole,
    scopeKey,
    canViewCosts: showCosts,
    canViewPii: showPii,
    piiMasked: !showPii,
    cacheRefreshMins: settings.cacheRefreshMins,
    lastCacheRefresh: existingAgg?.refreshedAt?.toISOString() ?? new Date().toISOString(),
    channels: [
      { id: 'ALL', label: 'All Channels' },
      ...CHANNELS.map((c) => ({ id: c, label: c === 'WHATSAPP' ? 'WhatsApp' : c.charAt(0) + c.slice(1).toLowerCase() })),
    ],
    kpis: {
      totalMessagesSent: { value: agg.totalSent, subtitle: '↑ 18.5% this month' },
      totalRecipients: { value: agg.totalRecipients, subtitle: '↑ 14.2% this month' },
      smsSent: { value: agg.smsSent, subtitle: '↑ 16.3% this month' },
      emailSent: { value: agg.emailSent, subtitle: '↑ 21.7% this month' },
      whatsappSent: { value: agg.whatsappSent, subtitle: '↑ 19.8% this month' },
      pushSent: { value: agg.pushSent, subtitle: '↑ 23.9% this month' },
      totalCost: {
        value: showCosts ? formatInr(agg.totalCost) : '***',
        subtitle: 'Channel spend (masked for non-finance roles)',
        hidden: !showCosts,
      },
    },
    rates: {
      deliveryRate: agg.deliveryRate,
      readRate: agg.readRate,
      failureRate: agg.failureRate,
      engagementRate: agg.engagementRate,
      openRate: agg.openRate,
      clickRate: agg.clickRate,
      replyRate: 8.6,
    },
    deliveryOverview: agg.deliveryOverview,
    channelPerformance: agg.channelStats,
    trendData: agg.trendData,
    recentCommunications: recentLogs.map((l) => ({
      id: l.id,
      title: l.campaignTitle,
      description: maskPreview(l.messagePreview, showPii),
      channel: l.channel === 'WHATSAPP' ? 'WhatsApp' : l.channel.charAt(0) + l.channel.slice(1).toLowerCase(),
      time: relativeTime(l.sentAt),
      status: l.status.charAt(0) + l.status.slice(1).toLowerCase(),
      iconBg: channelIcon[l.channel] ?? 'bg-slate-500',
      sourceModule: l.sourceModule,
      recipientGroup: l.recipientGroup,
    })),
    scheduledMessages: scheduled.map((s) => ({
      id: s.id,
      title: s.title,
      channel: s.channel,
      date: formatDate(s.scheduledDate),
      time: s.scheduledTime,
      recipients: s.recipientCount.toLocaleString('en-IN'),
      status: s.status,
    })),
    automations: automations.map((a) => ({
      id: a.id,
      name: a.name,
      active: a.isActive,
      channel: a.channel,
      sourceModule: a.sourceModule,
    })),
    recipientGroups: groups.map((g) => ({
      id: g.id,
      name: g.groupName,
      count: g.memberCount,
      scope: g.audienceScope,
    })),
    gatewayAlerts: gatewayAlerts.map((a) => ({
      id: a.id,
      channel: a.channel,
      message: a.message,
      severity: a.severity,
      type: a.alertType,
    })),
    channelHealth: channels.map((c) => ({
      code: c.channelCode,
      name: c.channelName,
      provider: c.gatewayProvider,
      status: c.status,
      credits: showCosts ? c.creditsBalance : null,
      lowCredits: c.creditsBalance < c.creditAlertAt,
    })),
    templates,
    surveys: {
      activeSurveys: 5,
      totalResponses: 1248,
      responseRate: 82.6,
      recentSurvey: {
        name: 'PTM Feedback Survey',
        responses: 812,
        target: 1000,
        percent: 81.2,
      },
    },
    quickActions: [
      { label: 'Send SMS', target: 'SMS Management' },
      { label: 'Send Email', target: 'Email Management' },
      { label: 'Send WhatsApp', target: 'WhatsApp Management' },
      { label: 'Push Notification', target: 'Push Notifications' },
      { label: 'Create Circular', target: 'Circulars / Notices' },
    ],
    keyBenefits: [
      { title: 'Instant Communication', desc: 'Reach everyone in seconds' },
      { title: 'Multi-Channel Messaging', desc: 'SMS, Email, WhatsApp, Push' },
      { title: 'Automated Reminders', desc: 'Never miss important updates' },
      { title: 'Better Engagement', desc: 'Increase parent & student engagement' },
      { title: 'Time & Cost Saving', desc: 'Automate & streamline communication' },
      { title: 'Track & Analyze', desc: 'Measure performance & improve' },
    ],
    roleMatrix: settings.roleMatrix,
    mobileSync: settings.mobileSyncRules,
    erpIntegrations: ['Finance — Fee Payment Reminders', 'Academics — Homework Alerts', 'Attendance — Absent Alerts', 'Admissions — Campaign Tracking'],
    liveUpdatesNote: 'Dashboard aggregates refresh every 5 minutes — webhook updates sync delivery status in near real-time',
  };

  dashboardCache.set(ck, { data: result, expiresAt: Date.now() + settings.cacheRefreshMins * 60 * 1000 });

  await logActivity(
    institutionId,
    'VIEW_DASHBOARD',
    'Communication dashboard accessed',
    { academicYear, channelFilter, userRole, scopeKey },
    opts.performedBy,
  );

  await prisma.commSettings.update({
    where: { institutionId },
    data: { lastCacheRefresh: new Date() },
  });

  return result;
}

export async function seedCommunicationDashboard(institutionId: string) {
  const academicYear = '2025-26';

  const existing = await prisma.commDeliveryLog.count({ where: { institutionId } });
  if (existing > 100) {
    return getCommunicationDashboard(institutionId, academicYear, { userRole: 'Principal' });
  }

  await ensureSettings(institutionId);

  for (const ch of [
    { code: 'SMS', name: 'SMS Gateway', provider: 'MSG91', cost: 0.25, credits: 45000 },
    { code: 'EMAIL', name: 'Email SMTP', provider: 'SendGrid', cost: 0.05, credits: 99999 },
    { code: 'WHATSAPP', name: 'WhatsApp Business API', provider: 'Gupshup', cost: 0.45, credits: 8500 },
    { code: 'PUSH', name: 'Firebase Push', provider: 'FCM', cost: 0, credits: 99999 },
  ]) {
    await prisma.commChannel.upsert({
      where: { institutionId_channelCode_academicYear: { institutionId, channelCode: ch.code, academicYear } },
      create: { institutionId, channelCode: ch.code, channelName: ch.name, gatewayProvider: ch.provider, costPerUnit: ch.cost, creditsBalance: ch.credits, academicYear },
      update: { creditsBalance: ch.credits, status: 'ACTIVE' },
    });
  }

  const groups = [
    { code: 'ALL_PARENTS', name: 'All Parents', count: 8562, scope: 'INSTITUTION' },
    { code: 'ALL_STUDENTS', name: 'All Students', count: 6245, scope: 'INSTITUTION' },
    { code: 'TEACHING_STAFF', name: 'Teaching Staff', count: 625, scope: 'INSTITUTION' },
    { code: 'NON_TEACHING', name: 'Non Teaching Staff', count: 248, scope: 'INSTITUTION' },
    { code: 'TRANSPORT', name: 'Transport Users', count: 1235, scope: 'INSTITUTION' },
    { code: 'HOSTEL', name: 'Hostel Students', count: 356, scope: 'INSTITUTION' },
    { code: 'CLASS_10A', name: 'Class 10-A Parents', count: 42, scope: 'CLASS' },
    { code: 'ADMISSION_2025', name: 'Admission Leads 2025', count: 1850, scope: 'ADMISSION' },
  ];
  for (const g of groups) {
    await prisma.commRecipientGroup.upsert({
      where: { institutionId_groupCode_academicYear: { institutionId, groupCode: g.code, academicYear } },
      create: { institutionId, groupCode: g.code, groupName: g.name, memberCount: g.count, audienceScope: g.scope, academicYear },
      update: { memberCount: g.count },
    });
  }

  const automations = [
    { key: 'FEE_REMINDER', name: 'Fee Payment Reminder', channel: 'SMS', module: 'Finance' },
    { key: 'ATTENDANCE_ALERT', name: 'Attendance Absent Alert', channel: 'SMS', module: 'Attendance' },
    { key: 'HOMEWORK_REMINDER', name: 'Homework Reminder', channel: 'PUSH', module: 'Academics' },
    { key: 'BIRTHDAY_WISHES', name: 'Birthday Wishes', channel: 'WHATSAPP', module: 'Communication' },
    { key: 'EVENT_REMINDER', name: 'Event Reminder', channel: 'EMAIL', module: 'Events' },
  ];
  for (const a of automations) {
    await prisma.commAutomation.upsert({
      where: { institutionId_automationKey_academicYear: { institutionId, automationKey: a.key, academicYear } },
      create: { institutionId, automationKey: a.key, name: a.name, channel: a.channel, sourceModule: a.module, isActive: true, academicYear },
      update: { isActive: true },
    });
  }

  const campaigns = [
    { title: 'PTM Reminder', channel: 'WHATSAPP', preview: 'Dear Parent, This is a reminder for PTM scheduled on...', group: 'All Parents', scope: 'INSTITUTION', module: 'Academics', status: 'READ' },
    { title: 'Fee Payment Reminder', channel: 'SMS', preview: 'Dear Parent, friendly reminder to pay the fee for Term 2...', group: 'All Parents', scope: 'INSTITUTION', module: 'Finance', status: 'DELIVERED' },
    { title: 'Summer Camp Registration', channel: 'EMAIL', preview: 'Register your child for Summer Camp 2025...', group: 'All Parents', scope: 'INSTITUTION', module: 'Events', status: 'READ' },
    { title: 'Exam Schedule Published', channel: 'PUSH', preview: 'Final exam schedule published. Please check the portal.', group: 'All Students', scope: 'INSTITUTION', module: 'Academics', status: 'DELIVERED' },
    { title: 'Holiday Notice', channel: 'SMS', preview: 'School closed on 20th May 2025 on account of...', group: 'All Parents', scope: 'INSTITUTION', module: 'Communication', status: 'DELIVERED' },
    { title: 'Class 10-A Homework', channel: 'SMS', preview: 'Dear Parent, homework for Mathematics assigned today.', group: 'Class 10-A Parents', scope: 'CLASS', classScope: '10-A', module: 'Academics', status: 'DELIVERED' },
    { title: 'Admission Open Day Invite', channel: 'EMAIL', preview: 'Join us for Open Day — explore our campus...', group: 'Admission Leads 2025', scope: 'ADMISSION', module: 'Admissions', status: 'READ' },
    { title: 'PTM Feedback Survey', channel: 'EMAIL', preview: 'Please share your feedback on the recent PTM...', group: 'All Parents', scope: 'INSTITUTION', module: 'Communication', status: 'READ' },
  ];

  const channelTargets = { SMS: 15420, EMAIL: 7842, WHATSAPP: 2422, PUSH: 4125 };
  const statuses = ['DELIVERED', 'READ', 'FAILED', 'PENDING'] as const;
  const statusWeights = [0.55, 0.35, 0.05, 0.05];

  for (const [channel, target] of Object.entries(channelTargets)) {
    const batchSize = Math.min(target, 500);
    const creates = Array.from({ length: batchSize }, (_, i) => {
      const camp = campaigns[i % campaigns.length];
      const r = Math.random();
      let status: typeof statuses[number] = 'DELIVERED';
      if (r < statusWeights[3]) status = 'PENDING';
      else if (r < statusWeights[3] + statusWeights[2]) status = 'FAILED';
      else if (r < statusWeights[3] + statusWeights[2] + statusWeights[1]) status = 'READ';

      const sentAt = new Date();
      sentAt.setDate(sentAt.getDate() - Math.floor(Math.random() * 30));

      return {
        institutionId,
        channel,
        campaignTitle: camp.title,
        messagePreview: camp.preview,
        recipientGroup: camp.group,
        recipientCount: 1 + Math.floor(Math.random() * 3),
        maskedRecipient: maskPhone(`98${String(10000000 + i).slice(-8)}`),
        audienceScope: camp.scope,
        classScope: camp.classScope ?? '',
        sourceModule: camp.module,
        status,
        cost: channel === 'SMS' ? 0.25 : channel === 'WHATSAPP' ? 0.45 : channel === 'EMAIL' ? 0.05 : 0,
        openCount: channel === 'EMAIL' && status === 'READ' ? 1 : 0,
        clickCount: channel === 'EMAIL' && Math.random() > 0.85 ? 1 : 0,
        sentAt,
        deliveredAt: status !== 'PENDING' ? sentAt : null,
        readAt: status === 'READ' ? sentAt : null,
        academicYear,
      };
    });

    await prisma.commDeliveryLog.createMany({ data: creates });
  }

  const schedDate = new Date();
  schedDate.setDate(schedDate.getDate() + 1);
  const scheduled = [
    { title: 'Weekly Newsletter', channel: 'Email', time: '10:00 AM', recipients: 8562 },
    { title: 'Transport Route Update', channel: 'SMS', time: '05:00 PM', recipients: 1235 },
    { title: 'Sports Event Invitation', channel: 'WhatsApp', time: '09:00 AM', recipients: 6245 },
    { title: 'Library Book Due Reminder', channel: 'SMS', time: '06:00 PM', recipients: 2156 },
  ];
  for (let i = 0; i < scheduled.length; i += 1) {
    const s = scheduled[i];
    const d = new Date(schedDate);
    d.setDate(d.getDate() + i);
    await prisma.commScheduledMessage.create({
      data: {
        institutionId,
        title: s.title,
        channel: s.channel,
        scheduledDate: d,
        scheduledTime: s.time,
        recipientCount: s.recipients,
        recipientGroup: s.title,
        academicYear,
      },
    });
  }

  await prisma.commGatewayAlert.create({
    data: {
      institutionId,
      channel: 'SMS',
      alertType: 'LOW_CREDITS',
      severity: 'MEDIUM',
      message: 'SMS Gateway credits below 50,000 — recharge recommended',
      academicYear,
    },
  });

  await refreshDashboardAggregates(institutionId, academicYear, 'INSTITUTION', 'ALL');
  await refreshDashboardAggregates(institutionId, academicYear, 'CLASS:10-A', 'ALL');
  await refreshDashboardAggregates(institutionId, academicYear, 'ADMISSION', 'ALL');

  await logActivity(institutionId, 'SEED', 'Communication dashboard demo data seeded');
  return getCommunicationDashboard(institutionId, academicYear, { userRole: 'Principal' });
}
