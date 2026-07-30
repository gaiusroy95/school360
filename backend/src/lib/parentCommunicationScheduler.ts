import { processDueCommunicationCampaigns } from './parentCommunicationCampaigns.js';

let lastMinuteKey = '';

export function startParentCommunicationScheduler() {
  const enabled = process.env.PARENT_COMM_CRON_ENABLED !== 'false';
  if (!enabled) {
    console.log('[parent-comm-cron] Scheduler disabled (PARENT_COMM_CRON_ENABLED=false)');
    return;
  }

  console.log('[parent-comm-cron] Scheduler started — checks due campaigns every minute');

  setInterval(async () => {
    const now = new Date();
    const minuteKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${now.getHours()}-${now.getMinutes()}`;
    if (lastMinuteKey === minuteKey) return;
    lastMinuteKey = minuteKey;

    try {
      const results = await processDueCommunicationCampaigns();
      const ran = results.filter((r) => r.ok);
      if (ran.length) {
        console.log(`[parent-comm-cron] Executed ${ran.length} scheduled campaign(s)`);
      }
    } catch (err) {
      console.error('[parent-comm-cron] Scheduled campaign processing failed:', err);
      lastMinuteKey = '';
    }
  }, 15_000);
}
