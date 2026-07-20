export type CalendarCategory =
  | 'ACADEMIC'
  | 'EXAMINATION'
  | 'CO_CURRICULAR'
  | 'EVENTS'
  | 'HOLIDAYS'
  | 'MEETING'
  | 'CUSTOM';

export type CalendarEventItem = {
  id: string;
  title: string;
  category: CalendarCategory;
  date: string; // YYYY-MM-DD
  endDate?: string;
  startTime?: string; // HH:mm
  endTime?: string;
  description?: string;
  /** true when sourced from Holiday master API */
  fromHolidayMaster?: boolean;
  holidayId?: string;
};

export type CalendarSectionKey =
  | 'ACADEMIC'
  | 'EVENTS'
  | 'EXAMINATION'
  | 'HOLIDAYS'
  | 'CUSTOM';

export const CALENDAR_CATEGORIES: {
  id: CalendarCategory;
  label: string;
  color: string;
  bg: string;
  dot: string;
}[] = [
  { id: 'ACADEMIC', label: 'Academic', color: 'text-blue-700', bg: 'bg-blue-100', dot: 'bg-blue-500' },
  { id: 'EXAMINATION', label: 'Examination', color: 'text-emerald-700', bg: 'bg-emerald-100', dot: 'bg-emerald-500' },
  { id: 'CO_CURRICULAR', label: 'Co-Curricular', color: 'text-orange-700', bg: 'bg-orange-100', dot: 'bg-orange-500' },
  { id: 'EVENTS', label: 'Events', color: 'text-violet-700', bg: 'bg-violet-100', dot: 'bg-violet-500' },
  { id: 'HOLIDAYS', label: 'Holidays', color: 'text-red-700', bg: 'bg-red-100', dot: 'bg-red-500' },
  { id: 'MEETING', label: 'Meeting', color: 'text-teal-700', bg: 'bg-teal-100', dot: 'bg-teal-500' },
  { id: 'CUSTOM', label: 'Custom', color: 'text-slate-700', bg: 'bg-slate-100', dot: 'bg-slate-500' },
];

export function categoryMeta(category: CalendarCategory) {
  return CALENDAR_CATEGORIES.find((c) => c.id === category) || CALENDAR_CATEGORIES[0];
}

export function defaultCategoryForSection(section: CalendarSectionKey): CalendarCategory {
  if (section === 'EVENTS') return 'EVENTS';
  if (section === 'EXAMINATION') return 'EXAMINATION';
  if (section === 'HOLIDAYS') return 'HOLIDAYS';
  if (section === 'CUSTOM') return 'CUSTOM';
  return 'ACADEMIC';
}

export const SECTION_UI: Record<
  CalendarSectionKey,
  { addLabel: string; subtitle: string; accentBtn: string; emptyHint: string }
> = {
  ACADEMIC: {
    addLabel: 'Add Academic Event',
    subtitle: 'Session start, PTM, annual day, and other academic milestones only.',
    accentBtn: 'bg-blue-600 hover:bg-blue-700',
    emptyHint: 'No academic events yet. Add session milestones for this calendar.',
  },
  EVENTS: {
    addLabel: 'Add School Event',
    subtitle: 'School events, exhibitions, and celebrations only.',
    accentBtn: 'bg-violet-600 hover:bg-violet-700',
    emptyHint: 'No school events yet. Add an event for this calendar.',
  },
  EXAMINATION: {
    addLabel: 'Add Exam',
    subtitle: 'Unit tests, mid-terms, finals, and exam windows only.',
    accentBtn: 'bg-emerald-600 hover:bg-emerald-700',
    emptyHint: 'No exams scheduled yet. Add an exam for this calendar.',
  },
  HOLIDAYS: {
    addLabel: 'Add Holiday',
    subtitle: 'Institution holidays only (synced with HR & Payroll).',
    accentBtn: 'bg-red-600 hover:bg-red-700',
    emptyHint: 'No holidays on this calendar yet. Use Add Holiday to create one.',
  },
  CUSTOM: {
    addLabel: 'Add Custom Event',
    subtitle: 'Custom reminders and institution-specific dates only.',
    accentBtn: 'bg-slate-700 hover:bg-slate-800',
    emptyHint: 'No custom events yet. Add one for this calendar.',
  },
};

export function newEventId() {
  return `evt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function formatDisplayDate(iso: string): string {
  const d = parseIsoDate(iso);
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()} (${weekdays[d.getDay()]})`;
}

export function formatTimeLabel(start?: string, end?: string): string {
  const fmt = (t: string) => {
    const [hh, mm] = t.split(':').map(Number);
    const h = hh % 12 || 12;
    const ampm = hh >= 12 ? 'PM' : 'AM';
    return `${h}:${String(mm || 0).padStart(2, '0')} ${ampm}`;
  };
  if (!start) return '';
  if (!end) return fmt(start);
  return `${fmt(start)} - ${fmt(end)}`;
}
