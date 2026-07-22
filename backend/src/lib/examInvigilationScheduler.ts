import { runDailyInvigilationRotation } from './examInvigilation.js';
import { runScheduledResultPublications } from './examResultProcessing.js';
import { getDefaultInstitutionId } from './institution.js';

let lastRunKey = '';

function getISTDateKey() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
}

function getISTHourMinute() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date());
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? '0');
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? '0');
  return { hour, minute };
}

export function startInvigilationScheduler() {
  const enabled = process.env.INVIGILATION_CRON_ENABLED !== 'false';
  if (!enabled) {
    console.log('[invigilation-cron] Scheduler disabled (INVIGILATION_CRON_ENABLED=false)');
    return;
  }

  console.log('[invigilation-cron] Scheduler started — daily rotation at 5:00 AM IST on exam dates');

  setInterval(async () => {
    const { hour, minute } = getISTHourMinute();

    // Check scheduled result publications every minute
    try {
      const institutionId = await getDefaultInstitutionId();
      const pubResult = await runScheduledResultPublications(institutionId);
      if (pubResult.published > 0) {
        console.log('[result-cron]', `Published ${pubResult.published} scheduled result batch(es)`);
      }
    } catch (err) {
      console.error('[result-cron] Scheduled publication failed:', err);
    }

    if (hour !== 5 || minute !== 0) return;

    const dateKey = getISTDateKey();
    if (lastRunKey === dateKey) return;
    lastRunKey = dateKey;

    try {
      const institutionId = await getDefaultInstitutionId();
      const result = await runDailyInvigilationRotation(institutionId, new Date(`${dateKey}T00:00:00.000Z`));
      console.log('[invigilation-cron]', result.message || result.reason);
    } catch (err) {
      console.error('[invigilation-cron] Rotation failed:', err);
      lastRunKey = '';
    }
  }, 60_000);
}
