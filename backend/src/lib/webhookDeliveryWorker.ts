import { processPendingWebhookDeliveries } from './integrationsApiUpdatesE2E.js';

export function startWebhookDeliveryWorker() {
  const enabled = process.env.WEBHOOK_WORKER_ENABLED !== 'false';
  if (!enabled) {
    console.log('[webhook-worker] Delivery worker disabled (WEBHOOK_WORKER_ENABLED=false)');
    return;
  }

  console.log('[webhook-worker] Started — processes pending webhook deliveries every 30s');

  setInterval(async () => {
    try {
      const result = await processPendingWebhookDeliveries();
      if (result.processed > 0) {
        console.log(`[webhook-worker] Processed ${result.processed} webhook delivery attempt(s)`);
      }
    } catch (err) {
      console.error('[webhook-worker] Delivery processing failed:', err);
    }
  }, 30_000);
}
