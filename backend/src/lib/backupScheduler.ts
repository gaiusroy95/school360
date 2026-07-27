import { runScheduledBackupsIfDue } from './securityBackupAuditE2E.js';

let lastMinuteKey = '';

export function startBackupScheduler() {
  const enabled = process.env.BACKUP_CRON_ENABLED !== 'false';
  if (!enabled) {
    console.log('[backup-cron] Scheduler disabled (BACKUP_CRON_ENABLED=false)');
    return;
  }

  console.log('[backup-cron] Scheduler started — checks automated backup schedules every minute');

  setInterval(async () => {
    const now = new Date();
    const minuteKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${now.getHours()}-${now.getMinutes()}`;
    if (lastMinuteKey === minuteKey) return;
    lastMinuteKey = minuteKey;

    try {
      const results = await runScheduledBackupsIfDue();
      const ran = results.filter((r) => r.ran);
      if (ran.length) {
        console.log(`[backup-cron] Executed ${ran.length} scheduled backup(s)`);
      }
    } catch (err) {
      console.error('[backup-cron] Scheduled backup failed:', err);
      lastMinuteKey = '';
    }
  }, 15_000);
}
