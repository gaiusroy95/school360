import { prisma } from './prisma.js';

export type ReminderPreferenceMap = {
  fee?: { enabled: boolean; daysBefore: number };
  homework?: { enabled: boolean; minutesBefore: number };
  ptm?: { enabled: boolean; daysBefore: number };
  annualFunction?: { enabled: boolean; daysBefore: number };
  dress?: { enabled: boolean; daysBefore: number };
  books?: { enabled: boolean; daysBefore: number };
  sports?: { enabled: boolean; daysBefore: number };
  feedback?: { enabled: boolean; daysBefore: number };
};

export const DEFAULT_REMINDER_PREFERENCES: ReminderPreferenceMap = {
  fee: { enabled: true, daysBefore: 3 },
  homework: { enabled: true, minutesBefore: 30 },
  ptm: { enabled: true, daysBefore: 1 },
  annualFunction: { enabled: true, daysBefore: 2 },
  dress: { enabled: true, daysBefore: 1 },
  books: { enabled: true, daysBefore: 2 },
  sports: { enabled: true, daysBefore: 1 },
  feedback: { enabled: true, daysBefore: 0 },
};

export async function getReminderPreferences(accountId: string) {
  const row = await prisma.mobileReminderPreference.findUnique({ where: { accountId } });
  const stored = (row?.preferences || {}) as ReminderPreferenceMap;
  return {
    preferences: { ...DEFAULT_REMINDER_PREFERENCES, ...stored },
    updatedAt: row?.updatedAt.toISOString() ?? null,
  };
}

export async function updateReminderPreferences(
  accountId: string,
  preferences: ReminderPreferenceMap,
) {
  const row = await prisma.mobileReminderPreference.upsert({
    where: { accountId },
    create: { accountId, preferences },
    update: { preferences },
  });
  return {
    preferences: { ...DEFAULT_REMINDER_PREFERENCES, ...(row.preferences as ReminderPreferenceMap) },
    updatedAt: row.updatedAt.toISOString(),
  };
}
