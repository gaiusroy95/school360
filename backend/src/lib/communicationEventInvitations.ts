import { MobileAppRole, Prisma } from '@prisma/client';
import { prisma } from './prisma.js';
import { deliverPushToTokens } from './pushDelivery.js';
import { fetchAudienceAccounts } from './communicationCirculars.js';
import { sendPushCampaign, seedPushManagement } from './communicationPushManagement.js';

const ACADEMIC_YEARS = ['2023-24', '2024-25', '2025-26', '2026-27'];
const ADMIN_ROLES = new Set(['Super Admin', 'Principal', 'Management', 'Admin', 'Communication Manager']);

const AUDIENCE_LABELS: Record<string, string> = {
  ALL: 'All App Users',
  PARENT: 'All Parents',
  STUDENT: 'All Students',
  STAFF: 'Staff (Teachers & Admin)',
  CLASS: 'Class / Section',
};

const EVENT_TYPES = [
  { value: 'ANNUAL_DAY', label: 'Annual Day' },
  { value: 'SPORTS_MEET', label: 'Sports Meet' },
  { value: 'PTM', label: 'Parent-Teacher Meeting' },
  { value: 'WORKSHOP', label: 'Workshop / Seminar' },
  { value: 'OTHER', label: 'Other Event' },
];

export type EventInvitationPayload = {
  title: string;
  description?: string;
  eventType?: string;
  venue?: string;
  eventDate: string;
  eventTime?: string;
  rsvpDeadline?: string;
  audienceType?: 'ALL' | 'PARENT' | 'STUDENT' | 'STAFF' | 'CLASS';
  classFilter?: string;
  allowGuests?: boolean;
  maxGuestsPerRsvp?: number;
  autoRemindEnabled?: boolean;
  remindDaysBefore?: number;
  academicYear?: string;
  userRole?: string;
  createdBy?: string;
};

function canManage(userRole: string) {
  return ADMIN_ROLES.has(userRole);
}

function rsvpRate(responded: number, invited: number) {
  return invited > 0 ? Math.round((responded / invited) * 1000) / 10 : 0;
}

function audienceRoles(audienceType: string): MobileAppRole[] | null {
  switch (audienceType) {
    case 'PARENT': return ['PARENT'];
    case 'STUDENT': return ['STUDENT'];
    case 'STAFF': return ['TEACHER', 'PRINCIPAL', 'TRANSPORT'];
    default: return null;
  }
}

function accountMatchesAudience(role: MobileAppRole, audienceType: string) {
  const roles = audienceRoles(audienceType);
  if (!roles) return true;
  return roles.includes(role);
}

async function logActivity(
  institutionId: string,
  action: string,
  details: string,
  snapshot: Record<string, unknown> = {},
  performedBy = 'Event Manager',
) {
  await prisma.commActivityLog.create({
    data: { institutionId, action, details, filterSnapshot: snapshot as Prisma.InputJsonValue, performedBy },
  });
}

async function refreshEventRsvpCounts(eventId: string) {
  const [yes, no, maybe, pending] = await Promise.all([
    prisma.commEventRsvp.count({ where: { eventId, response: 'YES' } }),
    prisma.commEventRsvp.count({ where: { eventId, response: 'NO' } }),
    prisma.commEventRsvp.count({ where: { eventId, response: 'MAYBE' } }),
    prisma.commEventRsvp.count({ where: { eventId, response: 'PENDING' } }),
  ]);
  await prisma.commEventInvitation.update({
    where: { id: eventId },
    data: { rsvpYesCount: yes, rsvpNoCount: no, rsvpMaybeCount: maybe, rsvpPendingCount: pending },
  });
  return { yes, no, maybe, pending };
}

function serializeEvent(e: {
  id: string;
  title: string;
  description: string;
  eventType: string;
  venue: string;
  eventDate: Date;
  eventTime: string;
  rsvpDeadline: Date | null;
  status: string;
  audienceType: string;
  audienceLabel: string;
  inviteCount: number;
  rsvpYesCount: number;
  rsvpNoCount: number;
  rsvpMaybeCount: number;
  rsvpPendingCount: number;
  allowGuests: boolean;
  autoRemindEnabled: boolean;
  remindDaysBefore: number;
  pushSent: boolean;
  createdBy: string;
  publishedAt: Date | null;
  createdAt: Date;
}) {
  const responded = e.rsvpYesCount + e.rsvpNoCount + e.rsvpMaybeCount;
  return {
    id: e.id,
    title: e.title,
    descriptionPreview: e.description.slice(0, 120),
    eventType: e.eventType,
    eventTypeLabel: EVENT_TYPES.find((t) => t.value === e.eventType)?.label ?? e.eventType,
    venue: e.venue,
    eventDate: e.eventDate.toISOString(),
    eventTime: e.eventTime,
    rsvpDeadline: e.rsvpDeadline?.toISOString() ?? null,
    status: e.status,
    audienceType: e.audienceType,
    audienceLabel: e.audienceLabel,
    inviteCount: e.inviteCount,
    rsvpYesCount: e.rsvpYesCount,
    rsvpNoCount: e.rsvpNoCount,
    rsvpMaybeCount: e.rsvpMaybeCount,
    rsvpPendingCount: e.rsvpPendingCount,
    rsvpResponseRate: rsvpRate(responded, e.inviteCount),
    allowGuests: e.allowGuests,
    autoRemindEnabled: e.autoRemindEnabled,
    remindDaysBefore: e.remindDaysBefore,
    pushSent: e.pushSent,
    createdBy: e.createdBy,
    publishedAt: e.publishedAt?.toISOString() ?? null,
    createdAt: e.createdAt.toISOString(),
  };
}

export async function getEventInvitationsManagement(
  institutionId: string,
  opts: { academicYear?: string; userRole?: string } = {},
) {
  const academicYear = opts.academicYear ?? '2025-26';
  const userRole = opts.userRole ?? 'Principal';

  const events = await prisma.commEventInvitation.findMany({
    where: { institutionId, academicYear },
    orderBy: [{ eventDate: 'asc' }, { createdAt: 'desc' }],
  });

  const published = events.filter((e) => e.status === 'PUBLISHED' || e.status === 'COMPLETED');
  const totalInvited = published.reduce((s, e) => s + e.inviteCount, 0);
  const totalYes = published.reduce((s, e) => s + e.rsvpYesCount, 0);
  const upcoming = events.filter((e) => e.status === 'PUBLISHED' && e.eventDate >= new Date());

  return {
    academicYear,
    academicYears: ACADEMIC_YEARS,
    userRole,
    permissions: { canManage: canManage(userRole), canPublish: canManage(userRole) },
    kpis: {
      totalEvents: events.length,
      published: published.length,
      upcoming: upcoming.length,
      drafts: events.filter((e) => e.status === 'DRAFT').length,
      totalInvited,
      totalYes,
      avgRsvpRate: rsvpRate(
        published.reduce((s, e) => s + e.rsvpYesCount + e.rsvpNoCount + e.rsvpMaybeCount, 0),
        totalInvited,
      ),
      pendingRsvps: published.reduce((s, e) => s + e.rsvpPendingCount, 0),
    },
    events: events.map(serializeEvent),
    eventTypes: EVENT_TYPES,
    audienceOptions: Object.entries(AUDIENCE_LABELS).map(([value, label]) => ({ value, label })),
    workflowSteps: [
      'Create Event & Set RSVP Deadline',
      'Select Target Audience',
      'Publish Invitations',
      'Send Push Notification',
      'Stakeholders RSVP (Yes / No / Maybe)',
      'Automated Reminders to Pending',
      'Track Attendance Headcount',
    ],
    complianceNotes: [
      'RSVP reminders are sent automatically based on "Remind X days before" setting.',
      'Use "Resend Reminder" to manually nudge pending invitees before the event.',
      'Guest count is tracked when "Allow Guests" is enabled.',
      'Events sync to the Events section of Student/Parent/Staff mobile apps.',
    ],
  };
}

export async function getEventInvitationDetail(institutionId: string, eventId: string) {
  const event = await prisma.commEventInvitation.findFirst({
    where: { id: eventId, institutionId },
    include: { rsvps: { orderBy: [{ response: 'asc' }, { accountName: 'asc' }] } },
  });
  if (!event) throw new Error('Event not found.');

  const yes = event.rsvps.filter((r) => r.response === 'YES');
  const no = event.rsvps.filter((r) => r.response === 'NO');
  const maybe = event.rsvps.filter((r) => r.response === 'MAYBE');
  const pending = event.rsvps.filter((r) => r.response === 'PENDING');
  const totalGuests = yes.reduce((s, r) => s + r.guestCount, 0);

  return {
    event: serializeEvent(event),
    detail: {
      description: event.description,
      classFilter: event.classFilter,
      maxGuestsPerRsvp: event.maxGuestsPerRsvp,
      pushCampaignId: event.pushCampaignId,
      lastReminderAt: event.lastReminderAt?.toISOString() ?? null,
    },
    summary: {
      inviteCount: event.inviteCount,
      yesCount: yes.length,
      noCount: no.length,
      maybeCount: maybe.length,
      pendingCount: pending.length,
      totalGuests,
      expectedAttendance: yes.length + totalGuests,
      rsvpResponseRate: rsvpRate(yes.length + no.length + maybe.length, event.inviteCount),
    },
    rsvps: {
      yes: yes.map(serializeRsvp),
      no: no.map(serializeRsvp),
      maybe: maybe.map(serializeRsvp),
      pending: pending.map(serializeRsvp),
    },
  };
}

function serializeRsvp(r: {
  id: string;
  accountId: string;
  accountName: string;
  accountRole: string;
  response: string;
  guestCount: number;
  respondedAt: Date | null;
  notes: string;
  reminderCount: number;
  lastReminderAt: Date | null;
}) {
  return {
    id: r.id,
    accountId: r.accountId,
    accountName: r.accountName,
    accountRole: r.accountRole,
    response: r.response,
    guestCount: r.guestCount,
    respondedAt: r.respondedAt?.toISOString() ?? null,
    notes: r.notes,
    reminderCount: r.reminderCount,
    lastReminderAt: r.lastReminderAt?.toISOString() ?? null,
  };
}

export async function createEventDraft(institutionId: string, payload: EventInvitationPayload) {
  if (!canManage(payload.userRole ?? '')) throw new Error('Permission denied.');
  if (!payload.title?.trim()) throw new Error('Event title is required.');
  if (!payload.eventDate) throw new Error('Event date is required.');

  const audienceType = payload.audienceType ?? 'ALL';
  const event = await prisma.commEventInvitation.create({
    data: {
      institutionId,
      title: payload.title.trim(),
      description: payload.description?.trim() ?? '',
      eventType: payload.eventType ?? 'OTHER',
      venue: payload.venue?.trim() ?? '',
      eventDate: new Date(payload.eventDate),
      eventTime: payload.eventTime?.trim() ?? '',
      rsvpDeadline: payload.rsvpDeadline ? new Date(payload.rsvpDeadline) : null,
      audienceType,
      audienceLabel: AUDIENCE_LABELS[audienceType] ?? audienceType,
      classFilter: payload.classFilter ?? '',
      allowGuests: payload.allowGuests ?? false,
      maxGuestsPerRsvp: payload.maxGuestsPerRsvp ?? 2,
      autoRemindEnabled: payload.autoRemindEnabled ?? true,
      remindDaysBefore: payload.remindDaysBefore ?? 3,
      createdBy: payload.createdBy ?? payload.userRole ?? 'Event Manager',
      academicYear: payload.academicYear ?? '2025-26',
      status: 'DRAFT',
    },
  });

  await logActivity(institutionId, 'EVENT_DRAFT', `Draft created: ${event.title}`, { eventId: event.id });
  return { message: 'Event draft saved.', eventId: event.id };
}

export async function updateEventDraft(
  institutionId: string,
  eventId: string,
  payload: EventInvitationPayload,
) {
  if (!canManage(payload.userRole ?? '')) throw new Error('Permission denied.');

  const existing = await prisma.commEventInvitation.findFirst({ where: { id: eventId, institutionId } });
  if (!existing) throw new Error('Event not found.');
  if (existing.status !== 'DRAFT') throw new Error('Only draft events can be edited.');

  const audienceType = payload.audienceType ?? existing.audienceType;
  await prisma.commEventInvitation.update({
    where: { id: eventId },
    data: {
      title: payload.title?.trim() ?? existing.title,
      description: payload.description ?? existing.description,
      eventType: payload.eventType ?? existing.eventType,
      venue: payload.venue ?? existing.venue,
      eventDate: payload.eventDate ? new Date(payload.eventDate) : existing.eventDate,
      eventTime: payload.eventTime ?? existing.eventTime,
      rsvpDeadline: payload.rsvpDeadline ? new Date(payload.rsvpDeadline) : existing.rsvpDeadline,
      audienceType,
      audienceLabel: AUDIENCE_LABELS[audienceType] ?? audienceType,
      classFilter: payload.classFilter ?? existing.classFilter,
      allowGuests: payload.allowGuests ?? existing.allowGuests,
      maxGuestsPerRsvp: payload.maxGuestsPerRsvp ?? existing.maxGuestsPerRsvp,
      autoRemindEnabled: payload.autoRemindEnabled ?? existing.autoRemindEnabled,
      remindDaysBefore: payload.remindDaysBefore ?? existing.remindDaysBefore,
    },
  });

  return { message: 'Event draft updated.' };
}

export async function publishEventInvitation(
  institutionId: string,
  eventId: string,
  opts: { userRole?: string; sendPush?: boolean } = {},
) {
  if (!canManage(opts.userRole ?? '')) throw new Error('Permission denied.');

  const event = await prisma.commEventInvitation.findFirst({ where: { id: eventId, institutionId } });
  if (!event) throw new Error('Event not found.');
  if (event.status !== 'DRAFT') throw new Error('Event is already published.');

  const accounts = await fetchAudienceAccounts(institutionId, event.audienceType, event.classFilter);
  if (accounts.length === 0) throw new Error('No invitees found for the selected audience.');

  const now = new Date();
  for (const account of accounts) {
    await prisma.commEventRsvp.upsert({
      where: { eventId_accountId: { eventId, accountId: account.id } },
      create: {
        institutionId,
        eventId,
        accountId: account.id,
        accountName: account.displayName,
        accountRole: account.role,
        response: 'PENDING',
      },
      update: { accountName: account.displayName, accountRole: account.role },
    });
  }

  let pushCampaignId = '';
  if (opts.sendPush !== false) {
    try {
      const dateStr = event.eventDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
      const pushResult = await sendPushCampaign(institutionId, {
        title: `You're Invited: ${event.title}`,
        body: `${dateStr}${event.eventTime ? ` at ${event.eventTime}` : ''}${event.venue ? ` — ${event.venue}` : ''}. Please RSVP.`,
        audienceType: event.audienceType as 'ALL' | 'PARENT' | 'STUDENT' | 'STAFF' | 'CLASS',
        classFilter: event.classFilter,
        deepLink: `/events/${eventId}`,
        category: 'event_invitation',
        sentBy: opts.userRole ?? 'Event Manager',
        userRole: opts.userRole ?? 'Super Admin',
        academicYear: event.academicYear,
      });
      pushCampaignId = pushResult.campaignId;
    } catch {
      // best-effort push
    }
  }

  await prisma.commEventInvitation.update({
    where: { id: eventId },
    data: {
      status: 'PUBLISHED',
      publishedAt: now,
      inviteCount: accounts.length,
      rsvpPendingCount: accounts.length,
      pushSent: Boolean(pushCampaignId),
      pushCampaignId,
    },
  });

  await prisma.commDeliveryLog.create({
    data: {
      institutionId,
      channel: 'EVENT',
      campaignTitle: event.title,
      messagePreview: event.description.slice(0, 120),
      recipientCount: accounts.length,
      maskedRecipient: event.audienceLabel,
      audienceScope: event.audienceType,
      status: 'DELIVERED',
      cost: 0,
      sourceModule: 'Event Invitations',
      academicYear: event.academicYear,
    },
  });

  await logActivity(
    institutionId,
    'EVENT_PUBLISH',
    `Published: ${event.title} to ${accounts.length} invitees`,
    { eventId, inviteCount: accounts.length },
    opts.userRole ?? 'Super Admin',
  );

  return {
    message: `Invitations sent to ${accounts.length} stakeholder(s).${pushCampaignId ? ' Push notification delivered.' : ''}`,
    eventId,
    inviteCount: accounts.length,
    pushSent: Boolean(pushCampaignId),
  };
}

async function sendReminderPush(
  institutionId: string,
  event: { id: string; title: string; eventDate: Date; eventTime: string; venue: string },
  accountId: string,
) {
  const account = await prisma.mobileAccount.findFirst({
    where: { id: accountId, institutionId, isActive: true },
    include: { devices: true },
  });
  if (!account?.devices.length) return false;

  const dateStr = event.eventDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  await deliverPushToTokens(
    account.devices.map((d) => d.fcmToken),
    {
      title: `RSVP Reminder: ${event.title}`,
      body: `Event on ${dateStr}${event.eventTime ? ` at ${event.eventTime}` : ''}. Please confirm your attendance.`,
      data: { category: 'event_reminder', eventId: event.id, deepLink: `/events/${event.id}` },
    },
  );
  return true;
}

export async function resendEventReminders(
  institutionId: string,
  eventId: string,
  opts: { userRole?: string } = {},
) {
  if (!canManage(opts.userRole ?? '')) throw new Error('Permission denied.');

  const event = await prisma.commEventInvitation.findFirst({
    where: { id: eventId, institutionId, status: 'PUBLISHED' },
  });
  if (!event) throw new Error('Published event not found.');

  const pending = await prisma.commEventRsvp.findMany({
    where: { eventId, response: 'PENDING' },
  });
  if (pending.length === 0) {
    return { message: 'All invitees have responded.', reminded: 0 };
  }

  let reminded = 0;
  for (const rsvp of pending) {
    const sent = await sendReminderPush(institutionId, event, rsvp.accountId);
    if (sent) {
      await prisma.commEventRsvp.update({
        where: { id: rsvp.id },
        data: { reminderCount: { increment: 1 }, lastReminderAt: new Date() },
      });
      reminded += 1;
    }
  }

  await prisma.commEventInvitation.update({
    where: { id: eventId },
    data: { lastReminderAt: new Date() },
  });

  await logActivity(
    institutionId,
    'EVENT_REMINDER',
    `RSVP reminders sent to ${reminded} pending invitee(s) for: ${event.title}`,
    { eventId, reminded },
    opts.userRole ?? 'Super Admin',
  );

  return { message: `RSVP reminder sent to ${reminded} pending invitee(s).`, reminded };
}

export async function processAutoEventReminders(institutionId: string) {
  const now = new Date();
  const events = await prisma.commEventInvitation.findMany({
    where: {
      institutionId,
      status: 'PUBLISHED',
      autoRemindEnabled: true,
      rsvpPendingCount: { gt: 0 },
      eventDate: { gt: now },
    },
  });

  let totalReminded = 0;
  for (const event of events) {
    const remindAt = new Date(event.eventDate);
    remindAt.setDate(remindAt.getDate() - event.remindDaysBefore);
    if (now < remindAt) continue;
    if (event.lastReminderAt && event.lastReminderAt > remindAt) continue;

    const result = await resendEventReminders(institutionId, event.id, { userRole: 'System' });
    totalReminded += result.reminded;
  }

  return { processed: events.length, reminded: totalReminded };
}

// ─── Mobile RSVP API ──────────────────────────────────────────────────────────

export async function getMobileEventInvitations(
  institutionId: string,
  accountId: string,
  accountRole: MobileAppRole,
) {
  const events = await prisma.commEventInvitation.findMany({
    where: { institutionId, status: { in: ['PUBLISHED', 'COMPLETED'] } },
    orderBy: { eventDate: 'asc' },
    include: { rsvps: { where: { accountId } } },
  });

  const items = events
    .filter((e) => accountMatchesAudience(accountRole, e.audienceType))
    .map((e) => {
      const rsvp = e.rsvps[0];
      const isPast = e.eventDate < new Date();
      return {
        id: e.id,
        title: e.title,
        descriptionPreview: e.description.slice(0, 160),
        eventType: e.eventType,
        venue: e.venue,
        eventDate: e.eventDate.toISOString(),
        eventTime: e.eventTime,
        rsvpDeadline: e.rsvpDeadline?.toISOString() ?? null,
        allowGuests: e.allowGuests,
        maxGuestsPerRsvp: e.maxGuestsPerRsvp,
        response: rsvp?.response ?? 'PENDING',
        guestCount: rsvp?.guestCount ?? 0,
        respondedAt: rsvp?.respondedAt?.toISOString() ?? null,
        isPast,
        needsRsvp: !rsvp || rsvp.response === 'PENDING',
      };
    });

  const pendingCount = items.filter((i) => i.needsRsvp && !i.isPast).length;

  return { pendingCount, badgeCount: pendingCount, items };
}

export async function getMobileEventDetail(
  institutionId: string,
  accountId: string,
  accountRole: MobileAppRole,
  eventId: string,
) {
  const event = await prisma.commEventInvitation.findFirst({
    where: { id: eventId, institutionId, status: { in: ['PUBLISHED', 'COMPLETED'] } },
    include: { rsvps: { where: { accountId } } },
  });
  if (!event) throw new Error('Event not found.');
  if (!accountMatchesAudience(accountRole, event.audienceType)) {
    throw new Error('This event invitation is not available for your account.');
  }

  const rsvp = event.rsvps[0];
  const deadlinePassed = event.rsvpDeadline ? event.rsvpDeadline < new Date() : false;

  return {
    id: event.id,
    title: event.title,
    description: event.description,
    eventType: event.eventType,
    venue: event.venue,
    eventDate: event.eventDate.toISOString(),
    eventTime: event.eventTime,
    rsvpDeadline: event.rsvpDeadline?.toISOString() ?? null,
    deadlinePassed,
    allowGuests: event.allowGuests,
    maxGuestsPerRsvp: event.maxGuestsPerRsvp,
    response: rsvp?.response ?? 'PENDING',
    guestCount: rsvp?.guestCount ?? 0,
    notes: rsvp?.notes ?? '',
    respondedAt: rsvp?.respondedAt?.toISOString() ?? null,
    canRsvp: !deadlinePassed && event.status === 'PUBLISHED',
  };
}

export async function submitMobileEventRsvp(
  institutionId: string,
  accountId: string,
  accountRole: MobileAppRole,
  eventId: string,
  opts: { response: 'YES' | 'NO' | 'MAYBE'; guestCount?: number; notes?: string },
) {
  const event = await prisma.commEventInvitation.findFirst({
    where: { id: eventId, institutionId, status: 'PUBLISHED' },
  });
  if (!event) throw new Error('Event not found or not open for RSVP.');
  if (!accountMatchesAudience(accountRole, event.audienceType)) {
    throw new Error('This event invitation is not available for your account.');
  }
  if (event.rsvpDeadline && event.rsvpDeadline < new Date()) {
    throw new Error('RSVP deadline has passed.');
  }
  if (!['YES', 'NO', 'MAYBE'].includes(opts.response)) {
    throw new Error('Invalid RSVP response. Use YES, NO, or MAYBE.');
  }

  const account = await prisma.mobileAccount.findFirst({ where: { id: accountId, institutionId } });
  if (!account) throw new Error('Account not found.');

  let guestCount = opts.guestCount ?? 0;
  if (opts.response === 'YES' && event.allowGuests) {
    guestCount = Math.min(Math.max(0, guestCount), event.maxGuestsPerRsvp);
  } else {
    guestCount = 0;
  }

  const existing = await prisma.commEventRsvp.findUnique({
    where: { eventId_accountId: { eventId, accountId } },
  });
  const prevResponse = existing?.response ?? 'PENDING';

  const now = new Date();
  await prisma.commEventRsvp.upsert({
    where: { eventId_accountId: { eventId, accountId } },
    create: {
      institutionId,
      eventId,
      accountId,
      accountName: account.displayName,
      accountRole: account.role,
      response: opts.response,
      guestCount,
      notes: opts.notes?.trim() ?? '',
      respondedAt: now,
    },
    update: {
      response: opts.response,
      guestCount,
      notes: opts.notes?.trim() ?? '',
      respondedAt: now,
    },
  });

  if (prevResponse !== opts.response) {
    const delta: Record<string, number> = {};
    if (prevResponse === 'YES') delta.rsvpYesCount = -1;
    if (prevResponse === 'NO') delta.rsvpNoCount = -1;
    if (prevResponse === 'MAYBE') delta.rsvpMaybeCount = -1;
    if (prevResponse === 'PENDING') delta.rsvpPendingCount = -1;
    if (opts.response === 'YES') delta.rsvpYesCount = (delta.rsvpYesCount ?? 0) + 1;
    if (opts.response === 'NO') delta.rsvpNoCount = (delta.rsvpNoCount ?? 0) + 1;
    if (opts.response === 'MAYBE') delta.rsvpMaybeCount = (delta.rsvpMaybeCount ?? 0) + 1;

    await prisma.commEventInvitation.update({
      where: { id: eventId },
      data: {
        rsvpYesCount: { increment: delta.rsvpYesCount ?? 0 },
        rsvpNoCount: { increment: delta.rsvpNoCount ?? 0 },
        rsvpMaybeCount: { increment: delta.rsvpMaybeCount ?? 0 },
        rsvpPendingCount: { increment: delta.rsvpPendingCount ?? 0 },
      },
    });
  }

  await logActivity(
    institutionId,
    'EVENT_RSVP',
    `${account.displayName} RSVP'd ${opts.response} for: ${event.title}`,
    { eventId, accountId, response: opts.response, guestCount },
    account.displayName,
  );

  return {
    message: `RSVP recorded: ${opts.response}`,
    eventId,
    response: opts.response,
    guestCount,
    respondedAt: now.toISOString(),
  };
}

export async function seedEventInvitationsManagement(institutionId: string) {
  const academicYear = '2025-26';

  const existing = await prisma.commEventInvitation.count({ where: { institutionId } });
  if (existing > 0) {
    return getEventInvitationsManagement(institutionId, { academicYear, userRole: 'Super Admin' });
  }

  const accountCount = await prisma.mobileAccount.count({ where: { institutionId, isActive: true } });
  if (accountCount === 0) await seedPushManagement(institutionId);

  const annualDay = await prisma.commEventInvitation.create({
    data: {
      institutionId,
      title: 'Annual Day Celebration 2025',
      description: 'Join us for our grand Annual Day featuring cultural performances, prize distribution, and chief guest address. Families are welcome.',
      eventType: 'ANNUAL_DAY',
      venue: 'School Auditorium',
      eventDate: new Date('2025-12-15T10:00:00'),
      eventTime: '10:00 AM',
      rsvpDeadline: new Date('2025-12-10T23:59:59'),
      audienceType: 'PARENT',
      audienceLabel: AUDIENCE_LABELS.PARENT,
      allowGuests: true,
      maxGuestsPerRsvp: 3,
      autoRemindEnabled: true,
      remindDaysBefore: 5,
      createdBy: 'Principal',
      academicYear,
      status: 'DRAFT',
    },
  });

  const sportsMeet = await prisma.commEventInvitation.create({
    data: {
      institutionId,
      title: 'Inter-House Sports Meet 2025',
      description: 'Annual sports competition across all houses. Parents are invited to cheer for their children. Refreshments will be served.',
      eventType: 'SPORTS_MEET',
      venue: 'School Sports Ground',
      eventDate: new Date('2025-11-20T08:00:00'),
      eventTime: '8:00 AM',
      rsvpDeadline: new Date('2025-11-15T23:59:59'),
      audienceType: 'ALL',
      audienceLabel: AUDIENCE_LABELS.ALL,
      allowGuests: true,
      maxGuestsPerRsvp: 2,
      autoRemindEnabled: true,
      remindDaysBefore: 3,
      createdBy: 'Sports Coordinator',
      academicYear,
      status: 'DRAFT',
    },
  });

  const ptm = await prisma.commEventInvitation.create({
    data: {
      institutionId,
      title: 'PTM — Class 10-A (Term 2)',
      description: 'Parent-Teacher Meeting to discuss Term 2 progress, board exam preparation, and individual student feedback.',
      eventType: 'PTM',
      venue: 'Class 10-A Room',
      eventDate: new Date('2025-10-25T14:00:00'),
      eventTime: '2:00 PM – 5:00 PM',
      rsvpDeadline: new Date('2025-10-23T23:59:59'),
      audienceType: 'PARENT',
      audienceLabel: AUDIENCE_LABELS.PARENT,
      classFilter: '10-A',
      allowGuests: false,
      autoRemindEnabled: true,
      remindDaysBefore: 2,
      createdBy: 'Class Teacher',
      academicYear,
      status: 'DRAFT',
    },
  });

  await publishEventInvitation(institutionId, annualDay.id, { userRole: 'Super Admin', sendPush: true });
  await publishEventInvitation(institutionId, sportsMeet.id, { userRole: 'Super Admin', sendPush: true });
  await publishEventInvitation(institutionId, ptm.id, { userRole: 'Super Admin', sendPush: true });

  const annualRsvps = await prisma.commEventRsvp.findMany({ where: { eventId: annualDay.id }, take: 3 });
  if (annualRsvps[0]) {
    await submitMobileEventRsvp(institutionId, annualRsvps[0].accountId, 'PARENT', annualDay.id, {
      response: 'YES', guestCount: 2,
    });
  }
  if (annualRsvps[1]) {
    await submitMobileEventRsvp(institutionId, annualRsvps[1].accountId, 'PARENT', annualDay.id, {
      response: 'NO',
    });
  }
  if (annualRsvps[2]) {
    await submitMobileEventRsvp(institutionId, annualRsvps[2].accountId, 'PARENT', annualDay.id, {
      response: 'MAYBE', guestCount: 1,
    });
  }

  void ptm;
  return getEventInvitationsManagement(institutionId, { academicYear, userRole: 'Super Admin' });
}
