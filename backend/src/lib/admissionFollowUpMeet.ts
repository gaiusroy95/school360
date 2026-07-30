import { randomBytes } from 'node:crypto';
import type { Enquiry, FollowUpTask } from '@prisma/client';
import { prisma } from './prisma.js';
import { loadIntegrationsNotificationSetup } from './integrationsApisNotification.js';
import { enqueueEmail } from './communicationEmailManagement.js';
import { sendWhatsAppMessage } from './sms.js';

const DEFAULT_TIMEZONE = process.env.GOOGLE_CALENDAR_TIMEZONE?.trim() || 'Asia/Kolkata';
const DEFAULT_DURATION_MIN = Number(process.env.GOOGLE_MEET_DURATION_MINUTES || '30') || 30;

export type FollowUpNotificationLog = {
  email?: { sent: boolean; at?: string; error?: string };
  whatsapp?: { sent: boolean; at?: string; error?: string };
  calendar?: { synced: boolean; at?: string; error?: string; stub?: boolean };
};

type GoogleCalendarConfig = {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  calendarId: string;
  timezone: string;
};

export function isVideoFollowUpMode(mode?: string | null): boolean {
  const m = String(mode || '').trim().toLowerCase();
  return m === 'video_call' || m === 'google meet' || m === 'video call';
}

function readSetupSections(tile: unknown): Record<string, Record<string, unknown>> {
  if (!tile || typeof tile !== 'object') return {};
  return (tile as { sections?: Record<string, Record<string, unknown>> }).sections || {};
}

function readField(
  sections: Record<string, Record<string, unknown>>,
  sectionKeys: string | string[],
  key: string,
  fallback = '',
) {
  const keys = Array.isArray(sectionKeys) ? sectionKeys : [sectionKeys];
  for (const sectionKey of keys) {
    const val = sections[sectionKey]?.[key];
    if (val != null && String(val) !== '') return String(val);
  }
  return fallback;
}

async function resolveGoogleCalendarConfig(institutionId: string): Promise<GoogleCalendarConfig | null> {
  const envConfig: GoogleCalendarConfig = {
    clientId: process.env.GOOGLE_CALENDAR_CLIENT_ID?.trim() || '',
    clientSecret: process.env.GOOGLE_CALENDAR_CLIENT_SECRET?.trim() || '',
    refreshToken: process.env.GOOGLE_CALENDAR_REFRESH_TOKEN?.trim() || '',
    calendarId: process.env.GOOGLE_CALENDAR_ID?.trim() || 'primary',
    timezone: DEFAULT_TIMEZONE,
  };

  if (envConfig.clientId && envConfig.clientSecret && envConfig.refreshToken) {
    return envConfig;
  }

  const setup = await prisma.institutionSetup.findUnique({ where: { institutionId } });
  const integration = readSetupSections(setup?.integrationSetup);
  const google = readSetupSections(setup?.integrationSetup)?.['Google Workspace']
    || readSetupSections(setup?.integrationSetup)?.googleWorkspace
    || {};

  const clientId =
    readField(integration, ['Google Workspace', 'googleWorkspace'], 'clientId') ||
    String(google.clientId || '');
  const clientSecret =
    readField(integration, ['Google Workspace', 'googleWorkspace'], 'clientSecret') ||
    String(google.clientSecret || '');
  const refreshToken =
    readField(integration, ['Google Workspace', 'googleWorkspace'], 'calendarRefreshToken') ||
    String(google.calendarRefreshToken || '');
  const calendarId =
    readField(integration, ['Google Workspace', 'googleWorkspace'], 'calendarId', 'primary') ||
    'primary';

  if (!clientId || !clientSecret || !refreshToken) return null;

  return {
    clientId,
    clientSecret,
    refreshToken,
    calendarId,
    timezone: DEFAULT_TIMEZONE,
  };
}

async function getGoogleAccessToken(config: GoogleCalendarConfig): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: config.refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  const data = (await res.json()) as { access_token?: string; error?: string; error_description?: string };
  if (!res.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || 'Failed to obtain Google access token');
  }
  return data.access_token;
}

function formatScheduleForMessage(dueDate: Date, timezone: string) {
  return {
    date: dueDate.toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: timezone,
    }),
    time: dueDate.toLocaleTimeString('en-IN', {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: timezone,
    }),
  };
}

async function resolveInstitutionName(institutionId: string): Promise<string> {
  const institution = await prisma.institution.findUnique({
    where: { id: institutionId },
    include: { setup: true },
  });
  const basic = readSetupSections(institution?.setup?.basicInformation);
  return (
    readField(basic, ['Institution Profile', 'institutionProfile'], 'institutionName') ||
    institution?.name ||
    'School'
  );
}

export async function createGoogleMeetCalendarEvent(params: {
  institutionId: string;
  task: Pick<FollowUpTask, 'id' | 'title' | 'subject' | 'dueDate' | 'assignedTo' | 'discussionNotes'>;
  enquiry: Pick<Enquiry, 'enquirerName' | 'email' | 'mobile' | 'enquiryId'>;
  counselorEmail?: string;
}): Promise<{ eventId: string; meetingLink: string; stub?: boolean }> {
  const config = await resolveGoogleCalendarConfig(params.institutionId);
  const start = params.task.dueDate;
  const end = new Date(start.getTime() + DEFAULT_DURATION_MIN * 60_000);
  const schoolName = await resolveInstitutionName(params.institutionId);
  const { date, time } = formatScheduleForMessage(start, config?.timezone || DEFAULT_TIMEZONE);

  const description = [
    `Admission follow-up for ${params.enquiry.enquirerName} (${params.enquiry.enquiryId})`,
    params.task.subject ? `Subject: ${params.task.subject}` : '',
    params.task.discussionNotes ? `Notes: ${params.task.discussionNotes}` : '',
    `Counselor: ${params.task.assignedTo || 'Admission Team'}`,
    '',
    `Scheduled via ${schoolName} Admission CRM`,
  ]
    .filter(Boolean)
    .join('\n');

  if (!config) {
    const stubCode = randomBytes(5).toString('hex').slice(0, 10);
    const stubLink = `https://meet.google.com/${stubCode.slice(0, 3)}-${stubCode.slice(3, 7)}-${stubCode.slice(7, 10)}`;
    console.info('[google-calendar-stub]', {
      institutionId: params.institutionId,
      taskId: params.task.id,
      title: params.task.title,
      start: start.toISOString(),
      stubLink,
    });
    return { eventId: `stub-${params.task.id}`, meetingLink: stubLink, stub: true };
  }

  const accessToken = await getGoogleAccessToken(config);
  const attendees = [
    params.enquiry.email?.trim(),
    params.counselorEmail?.trim(),
  ].filter((e): e is string => Boolean(e));

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(config.calendarId)}/events?conferenceDataVersion=1&sendUpdates=all`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        summary: params.task.title || `Admission Counseling — ${params.enquiry.enquirerName}`,
        description,
        start: { dateTime: start.toISOString(), timeZone: config.timezone },
        end: { dateTime: end.toISOString(), timeZone: config.timezone },
        attendees: attendees.map((email) => ({ email })),
        conferenceData: {
          createRequest: {
            requestId: `${params.task.id}-${Date.now()}`,
            conferenceSolutionKey: { type: 'hangoutsMeet' },
          },
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 60 },
            { method: 'popup', minutes: 15 },
          ],
        },
      }),
    },
  );

  const data = (await res.json()) as {
    id?: string;
    hangoutLink?: string;
    htmlLink?: string;
    conferenceData?: { entryPoints?: Array<{ entryPointType?: string; uri?: string }> };
    error?: { message?: string };
  };

  if (!res.ok) {
    throw new Error(data.error?.message || 'Failed to create Google Calendar event');
  }

  const meetingLink =
    data.hangoutLink ||
    data.conferenceData?.entryPoints?.find((e) => e.entryPointType === 'video')?.uri ||
    data.htmlLink ||
    '';

  if (!meetingLink) {
    throw new Error('Google Calendar event created but Meet link was not returned');
  }

  return { eventId: data.id || '', meetingLink };
}

function buildNotificationBodies(params: {
  schoolName: string;
  enquiryName: string;
  subject: string;
  counselor: string;
  date: string;
  time: string;
  meetingLink: string;
  title: string;
}) {
  const plain = [
    `Dear ${params.enquiryName},`,
    '',
    `Your admission counseling session has been scheduled with ${params.schoolName}.`,
    '',
    `Subject: ${params.subject || params.title}`,
    `Date: ${params.date}`,
    `Time: ${params.time}`,
    `Counselor: ${params.counselor || 'Admission Team'}`,
    '',
    `Join Google Meet: ${params.meetingLink}`,
    '',
    'Please join a few minutes early. For any changes, reply to this message or contact the admission office.',
    '',
    `— ${params.schoolName}`,
  ].join('\n');

  const html = `
    <p>Dear <strong>${params.enquiryName}</strong>,</p>
    <p>Your admission counseling session has been scheduled with <strong>${params.schoolName}</strong>.</p>
    <table style="border-collapse:collapse;margin:12px 0">
      <tr><td style="padding:4px 12px 4px 0;color:#64748b">Subject</td><td><strong>${params.subject || params.title}</strong></td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#64748b">Date</td><td>${params.date}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#64748b">Time</td><td>${params.time}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#64748b">Counselor</td><td>${params.counselor || 'Admission Team'}</td></tr>
    </table>
    <p><a href="${params.meetingLink}" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;font-weight:600">Join Google Meet</a></p>
    <p style="color:#64748b;font-size:13px">Or copy this link: <a href="${params.meetingLink}">${params.meetingLink}</a></p>
    <p>— ${params.schoolName}</p>
  `.trim();

  const whatsapp = [
    `*${params.schoolName} — Admission Follow-up*`,
    '',
    `Hello ${params.enquiryName},`,
    `Your counseling session is scheduled.`,
    `📅 ${params.date} at ${params.time}`,
    `👤 Counselor: ${params.counselor || 'Admission Team'}`,
    params.subject ? `📌 ${params.subject}` : '',
    '',
    `Join Google Meet:`,
    params.meetingLink,
  ]
    .filter(Boolean)
    .join('\n');

  return { plain, html, whatsapp };
}

export async function shareFollowUpMeetingNotifications(params: {
  institutionId: string;
  task: Pick<FollowUpTask, 'title' | 'subject' | 'dueDate' | 'assignedTo'>;
  enquiry: Pick<Enquiry, 'enquirerName' | 'email' | 'mobile'>;
  meetingLink: string;
  notifyEmail: boolean;
  notifyWhatsApp: boolean;
}): Promise<FollowUpNotificationLog> {
  const log: FollowUpNotificationLog = {};
  const schoolName = await resolveInstitutionName(params.institutionId);
  const { date, time } = formatScheduleForMessage(params.task.dueDate, DEFAULT_TIMEZONE);
  const bodies = buildNotificationBodies({
    schoolName,
    enquiryName: params.enquiry.enquirerName,
    subject: params.task.subject,
    counselor: params.task.assignedTo,
    date,
    time,
    meetingLink: params.meetingLink,
    title: params.task.title,
  });

  const integration = await prisma.institutionSetup.findUnique({
    where: { institutionId: params.institutionId },
  });
  const channelConfig = loadIntegrationsNotificationSetup({
    integrationSetup: integration?.integrationSetup,
    notificationSetup: integration?.notificationSetup,
  });

  if (params.notifyEmail && params.enquiry.email?.trim()) {
    try {
      if (channelConfig.channels.emailEnabled) {
        const result = await enqueueEmail(params.institutionId, {
          toEmail: params.enquiry.email.trim(),
          toName: params.enquiry.enquirerName,
          subject: `${schoolName} — Google Meet: ${params.task.subject || params.task.title}`,
          bodyHtml: bodies.html,
          bodyPlain: bodies.plain,
          sourceModule: 'Admission CRM — Follow Ups',
          processNow: true,
        });
        log.email = {
          sent: result.status === 'SENT',
          at: new Date().toISOString(),
          error: result.status === 'SENT' ? undefined : String(result.error || result.status),
        };
      } else {
        log.email = { sent: false, at: new Date().toISOString(), error: 'Email notifications disabled in institution setup' };
      }
    } catch (err) {
      log.email = {
        sent: false,
        at: new Date().toISOString(),
        error: err instanceof Error ? err.message : 'Email send failed',
      };
    }
  }

  if (params.notifyWhatsApp && params.enquiry.mobile?.trim()) {
    try {
      const result = await sendWhatsAppMessage(
        params.institutionId,
        params.enquiry.mobile.trim(),
        bodies.whatsapp,
      );
      log.whatsapp = {
        sent: Boolean(result.sent),
        at: new Date().toISOString(),
        error: result.sent ? undefined : String(result.response || 'WhatsApp send failed'),
      };
    } catch (err) {
      log.whatsapp = {
        sent: false,
        at: new Date().toISOString(),
        error: err instanceof Error ? err.message : 'WhatsApp send failed',
      };
    }
  }

  return log;
}

export async function syncFollowUpVideoCall(params: {
  institutionId: string;
  task: FollowUpTask;
  enquiry: Enquiry;
  counselorEmail?: string;
  force?: boolean;
}): Promise<{
  meetingLink: string;
  calendarEventId: string;
  calendarSyncStatus: string;
  notificationLog: FollowUpNotificationLog;
}> {
  if (!params.task.syncGoogleCalendar && !params.force) {
    return {
      meetingLink: params.task.meetingLink,
      calendarEventId: params.task.calendarEventId,
      calendarSyncStatus: 'SKIPPED',
      notificationLog: (params.task.notificationLog as FollowUpNotificationLog) || {},
    };
  }

  const notificationLog: FollowUpNotificationLog = {
    ...((params.task.notificationLog as FollowUpNotificationLog) || {}),
  };

  try {
    const calendar = await createGoogleMeetCalendarEvent({
      institutionId: params.institutionId,
      task: params.task,
      enquiry: params.enquiry,
      counselorEmail: params.counselorEmail,
    });

    notificationLog.calendar = {
      synced: true,
      at: new Date().toISOString(),
      stub: calendar.stub,
    };

    const shareLog = await shareFollowUpMeetingNotifications({
      institutionId: params.institutionId,
      task: params.task,
      enquiry: params.enquiry,
      meetingLink: calendar.meetingLink,
      notifyEmail: params.task.notifyEmail,
      notifyWhatsApp: params.task.notifyWhatsApp,
    });

    return {
      meetingLink: calendar.meetingLink,
      calendarEventId: calendar.eventId,
      calendarSyncStatus: calendar.stub ? 'SYNCED' : 'SYNCED',
      notificationLog: { ...notificationLog, ...shareLog },
    };
  } catch (err) {
    notificationLog.calendar = {
      synced: false,
      at: new Date().toISOString(),
      error: err instanceof Error ? err.message : 'Calendar sync failed',
    };
    return {
      meetingLink: params.task.meetingLink,
      calendarEventId: params.task.calendarEventId,
      calendarSyncStatus: 'FAILED',
      notificationLog,
    };
  }
}
