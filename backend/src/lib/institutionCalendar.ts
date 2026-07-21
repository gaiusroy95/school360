import { prisma } from './prisma.js';

export type CalendarEventDto = {
  id: string;
  title: string;
  category: string;
  date: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  description?: string;
  fromHolidayMaster?: boolean;
  holidayId?: string;
};

export type CalendarPublishSettings = {
  staffApp: string;
  studentApp: string;
  parentApp: string;
  publishedAt: string;
  publishedBy: string;
  year: number;
};

type CalendarSetupTile = {
  sections?: Record<string, Record<string, string>>;
  events?: CalendarEventDto[];
  publish?: CalendarPublishSettings;
  publishedEvents?: CalendarEventDto[];
};

function yearBounds(year: number) {
  return {
    gte: new Date(Date.UTC(year, 0, 1)),
    lte: new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999)),
  };
}

export async function getMergedCalendarEvents(
  institutionId: string,
  year?: number,
): Promise<CalendarEventDto[]> {
  const y = year || new Date().getFullYear();
  const setup = await prisma.institutionSetup.findUnique({ where: { institutionId } });
  const tile = (setup?.calendarSetup || {}) as CalendarSetupTile;
  const stored = (Array.isArray(tile.events) ? tile.events : []).filter((e) => !e.fromHolidayMaster);

  const holidays = await prisma.holiday.findMany({
    where: {
      institutionId,
      date: yearBounds(y),
    },
    orderBy: { date: 'asc' },
  });

  const holidayEvents: CalendarEventDto[] = holidays.map((h) => ({
    id: `holiday_${h.id}`,
    holidayId: h.id,
    title: h.name,
    category: 'HOLIDAYS',
    date: h.date.toISOString().slice(0, 10),
    description: h.notes || `${h.type} · ${h.applicableTo}`,
    fromHolidayMaster: true,
  }));

  const inYear = (iso: string) => {
    const d = iso.slice(0, 4);
    return d === String(y);
  };

  return [...stored, ...holidayEvents]
    .filter((e) => inYear(e.date))
    .sort((a, b) => a.date.localeCompare(b.date) || (a.startTime || '').localeCompare(b.startTime || ''));
}

export async function getCalendarPublishMeta(institutionId: string) {
  const setup = await prisma.institutionSetup.findUnique({ where: { institutionId } });
  const tile = (setup?.calendarSetup || {}) as CalendarSetupTile;
  return {
    publish: tile.publish || null,
    publishedEventCount: Array.isArray(tile.publishedEvents) ? tile.publishedEvents.length : 0,
  };
}

export async function publishInstitutionCalendar(
  institutionId: string,
  input: {
    staffApp: boolean;
    studentApp: boolean;
    parentApp: boolean;
    publishedBy: string;
    year?: number;
  },
) {
  const year = input.year || new Date().getFullYear();
  const events = await getMergedCalendarEvents(institutionId, year);

  const setup = await prisma.institutionSetup.findUnique({ where: { institutionId } });
  const existing = (setup?.calendarSetup || {}) as CalendarSetupTile;

  const publish: CalendarPublishSettings = {
    staffApp: input.staffApp ? 'Yes' : 'No',
    studentApp: input.studentApp ? 'Yes' : 'No',
    parentApp: input.parentApp ? 'Yes' : 'No',
    publishedAt: new Date().toISOString(),
    publishedBy: input.publishedBy,
    year,
  };

  const calendarSetup: CalendarSetupTile = {
    ...existing,
    publish,
    publishedEvents: events,
  };

  await prisma.institutionSetup.update({
    where: { institutionId },
    data: { calendarSetup },
  });

  return { publish, events, eventCount: events.length };
}

export async function getPublishedCalendarForApp(
  institutionId: string,
  app: 'staff' | 'student' | 'parent',
) {
  const setup = await prisma.institutionSetup.findUnique({ where: { institutionId } });
  const tile = (setup?.calendarSetup || {}) as CalendarSetupTile;
  const publish = tile.publish;

  if (!publish?.publishedAt) {
    return { published: false, events: [] as CalendarEventDto[], publish: null };
  }

  const enabled =
    (app === 'staff' && publish.staffApp === 'Yes') ||
    (app === 'student' && publish.studentApp === 'Yes') ||
    (app === 'parent' && publish.parentApp === 'Yes');

  if (!enabled) {
    return { published: false, events: [] as CalendarEventDto[], publish };
  }

  return {
    published: true,
    events: Array.isArray(tile.publishedEvents) ? tile.publishedEvents : [],
    publish,
  };
}
