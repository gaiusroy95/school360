import { fetchInstitutionSetup, updateInstitutionTile } from '../../../lib/institutionApi';
import { api } from '../../../lib/api';
import { createHoliday, deleteHoliday, fetchHolidays, type Holiday } from '../../../lib/holidayApi';
import {
  newEventId,
  type CalendarCategory,
  type CalendarEventItem,
} from './calendarTypes';

type CalendarSetupTile = {
  sections?: Record<string, Record<string, string>>;
  events?: CalendarEventItem[];
  publish?: CalendarPublishInfo;
  publishedEvents?: CalendarEventItem[];
};

export type CalendarPublishInfo = {
  staffApp: string;
  studentApp: string;
  parentApp: string;
  publishedAt: string;
  publishedBy: string;
  year: number;
};

async function loadTile(): Promise<CalendarSetupTile> {
  const { setup } = await fetchInstitutionSetup();
  const raw = (setup.calendarSetup || {}) as CalendarSetupTile;
  return {
    sections: raw.sections || {},
    events: Array.isArray(raw.events) ? raw.events.filter((e) => !e.fromHolidayMaster) : [],
    publish: raw.publish,
    publishedEvents: raw.publishedEvents,
  };
}

async function saveEvents(events: CalendarEventItem[], sections: Record<string, Record<string, string>>) {
  const tile = await loadTile();
  const clean = events.filter((e) => !e.fromHolidayMaster).map(({ holidayId: _h, fromHolidayMaster: _f, ...rest }) => rest);
  await updateInstitutionTile('calendarSetup', {
    sections,
    events: clean,
    publish: tile.publish,
    publishedEvents: tile.publishedEvents,
  });
}

function holidayToEvent(h: Holiday): CalendarEventItem {
  return {
    id: `holiday_${h.id}`,
    holidayId: h.id,
    title: h.name,
    category: 'HOLIDAYS',
    date: h.date.slice(0, 10),
    description: h.notes || `${h.type} · ${h.applicableTo}${h.isPaid ? ' · Paid' : ''}`,
    fromHolidayMaster: true,
  };
}

export async function fetchCalendarBundle(year?: number): Promise<{
  events: CalendarEventItem[];
  sections: Record<string, Record<string, string>>;
}> {
  const [tile, holidayRes] = await Promise.all([
    loadTile(),
    fetchHolidays(year ? { year } : undefined).catch(() => ({ holidays: [] as Holiday[] })),
  ]);
  const holidays = (holidayRes.holidays || []).map(holidayToEvent);
  return {
    sections: tile.sections || {},
    events: [...(tile.events || []), ...holidays],
  };
}

export async function upsertCalendarEvent(
  input: Omit<CalendarEventItem, 'id'> & { id?: string },
): Promise<CalendarEventItem> {
  if (input.category === 'HOLIDAYS' && !input.id?.startsWith('evt_')) {
    // Create / update via holiday master when adding holiday from calendar
    if (input.holidayId || input.id?.startsWith('holiday_')) {
      // Updates to holiday master go through HolidayManager; treat as create-only from calendar
    }
    const { holiday } = await createHoliday({
      date: input.date,
      name: input.title,
      type: 'INSTITUTIONAL',
      applicableTo: 'ALL',
      isPaid: true,
      notes: input.description || null,
    });
    return holidayToEvent(holiday);
  }

  const tile = await loadTile();
  const events = [...(tile.events || [])];
  const id = input.id && !input.id.startsWith('holiday_') ? input.id : newEventId();
  const next: CalendarEventItem = {
    id,
    title: input.title,
    category: input.category,
    date: input.date,
    endDate: input.endDate,
    startTime: input.startTime,
    endTime: input.endTime,
    description: input.description,
  };
  const idx = events.findIndex((e) => e.id === id);
  if (idx >= 0) events[idx] = next;
  else events.push(next);
  await saveEvents(events, tile.sections || {});
  return next;
}

export async function removeCalendarEvent(event: CalendarEventItem): Promise<void> {
  if (event.fromHolidayMaster && event.holidayId) {
    await deleteHoliday(event.holidayId);
    return;
  }
  const tile = await loadTile();
  const events = (tile.events || []).filter((e) => e.id !== event.id);
  await saveEvents(events, tile.sections || {});
}

export const SECTION_CATEGORY_OPTIONS: CalendarCategory[] = [
  'ACADEMIC',
  'EXAMINATION',
  'CO_CURRICULAR',
  'EVENTS',
  'HOLIDAYS',
  'MEETING',
  'CUSTOM',
];

export async function fetchComprehensiveCalendar(year?: number): Promise<{
  year: number;
  events: CalendarEventItem[];
  publish: CalendarPublishInfo | null;
  publishedEventCount: number;
}> {
  const q = year ? `?year=${year}` : '';
  return api(`/api/institution/calendar${q}`);
}

export async function publishComprehensiveCalendar(input: {
  staffApp: boolean;
  studentApp: boolean;
  parentApp: boolean;
  year?: number;
}): Promise<{ message: string; publish: CalendarPublishInfo; eventCount: number }> {
  return api('/api/institution/calendar/publish', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
