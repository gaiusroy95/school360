import { FeeDueStatus } from '@prisma/client';
import { prisma } from './prisma.js';
import { getDefaultInstitutionId } from './institution.js';
import { pushToAccount } from './mobileParentNotify.js';
import { DEFAULT_REMINDER_PREFERENCES } from './mobileReminders.js';

function daysUntil(date: Date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

function minutesUntil(date: Date) {
  return Math.round((date.getTime() - Date.now()) / 60000);
}

async function shouldSendReminder(accountId: string, key: string, fingerprint: string) {
  const existing = await prisma.mobileNotification.findFirst({
    where: {
      accountId,
      category: key,
      body: { contains: fingerprint },
      createdAt: { gte: new Date(Date.now() - 20 * 60 * 1000) },
    },
  });
  return !existing;
}

export async function runMobileReminderJobs(institutionId?: string) {
  const instId = institutionId ?? (await getDefaultInstitutionId());
  let feeReminders = 0;
  let homeworkReminders = 0;

  const parentAccounts = await prisma.mobileAccount.findMany({
    where: { institutionId: instId, role: 'PARENT', isActive: true },
    include: { reminderPreference: true },
  });

  for (const account of parentAccounts) {
    const prefs = {
      ...DEFAULT_REMINDER_PREFERENCES,
      ...((account.reminderPreference?.preferences || {}) as typeof DEFAULT_REMINDER_PREFERENCES),
    };

    const studentIds = Array.isArray(account.studentIds) ? (account.studentIds as string[]) : [];

    for (const studentId of studentIds) {
      if (prefs.fee?.enabled) {
        const dues = await prisma.feeDue.findMany({
          where: {
            institutionId: instId,
            studentId,
            status: { in: [FeeDueStatus.PENDING, FeeDueStatus.OVERDUE] },
          },
        });

        for (const due of dues) {
          const days = daysUntil(due.dueDate);
          if (days >= 0 && days <= (prefs.fee.daysBefore ?? 3)) {
            const fp = `fee-${due.id}-${days}`;
            if (await shouldSendReminder(account.id, 'fee', fp)) {
              await pushToAccount({
                institutionId: instId,
                accountId: account.id,
                studentId,
                title: 'Fee reminder',
                body: `${due.title} of INR ${due.amount} is due on ${due.dueDate.toISOString().slice(0, 10)}.`,
                category: 'fee',
                payload: { feeDueId: due.id, daysUntilDue: days },
              });
              feeReminders += 1;
            }
          }
        }
      }

      if (prefs.homework?.enabled) {
        const student = await prisma.student.findUnique({ where: { id: studentId } });
        if (!student) continue;

        const homework = await prisma.academicHomework.findMany({
          where: {
            institutionId: instId,
            className: student.className,
            sectionName: student.sectionName,
            dueDate: { not: null },
            publishedAt: { not: null },
          },
          orderBy: { dueDate: 'asc' },
          take: 10,
        });

        for (const hw of homework) {
          if (!hw.dueDate) continue;
          const mins = minutesUntil(hw.dueDate);
          const threshold = prefs.homework.minutesBefore ?? 30;
          if (mins >= 0 && mins <= threshold) {
            const fp = `hw-${hw.id}-${mins}`;
            if (await shouldSendReminder(account.id, 'homework', fp)) {
              await pushToAccount({
                institutionId: instId,
                accountId: account.id,
                studentId,
                title: 'Homework reminder',
                body: `${hw.subjectName}: "${hw.title}" is due in ${mins} minutes.`,
                category: 'homework',
                payload: { homeworkId: hw.id, minutesUntilDue: mins },
              });
              homeworkReminders += 1;
            }
          }
        }
      }
    }
  }

  return { feeReminders, homeworkReminders };
}

export function startMobileReminderScheduler() {
  const enabled = process.env.MOBILE_REMINDER_CRON_ENABLED !== 'false';
  if (!enabled) {
    console.log('[mobile-reminder-cron] Scheduler disabled');
    return;
  }

  console.log('[mobile-reminder-cron] Scheduler started — runs every 5 minutes');

  setInterval(() => {
    void runMobileReminderJobs().catch((e) => {
      console.error('[mobile-reminder-cron] failed', e);
    });
  }, 5 * 60 * 1000);
}
