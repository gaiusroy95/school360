-- Auto Reminders: extend CommAutomation + runs + queue

ALTER TABLE "CommAutomation" ADD COLUMN IF NOT EXISTS "description" TEXT NOT NULL DEFAULT '';
ALTER TABLE "CommAutomation" ADD COLUMN IF NOT EXISTS "triggerType" TEXT NOT NULL DEFAULT 'FEE_DUE';
ALTER TABLE "CommAutomation" ADD COLUMN IF NOT EXISTS "channelFallback" JSONB NOT NULL DEFAULT '["WHATSAPP","SMS"]';
ALTER TABLE "CommAutomation" ADD COLUMN IF NOT EXISTS "templateCode" TEXT NOT NULL DEFAULT '';
ALTER TABLE "CommAutomation" ADD COLUMN IF NOT EXISTS "templateBody" TEXT NOT NULL DEFAULT '';
ALTER TABLE "CommAutomation" ADD COLUMN IF NOT EXISTS "cronTime" TEXT NOT NULL DEFAULT '08:00';
ALTER TABLE "CommAutomation" ADD COLUMN IF NOT EXISTS "offsetDays" INTEGER NOT NULL DEFAULT 3;
ALTER TABLE "CommAutomation" ADD COLUMN IF NOT EXISTS "lastRunAt" TIMESTAMP(3);
ALTER TABLE "CommAutomation" ADD COLUMN IF NOT EXISTS "lastRunStatus" TEXT NOT NULL DEFAULT '';
ALTER TABLE "CommAutomation" ADD COLUMN IF NOT EXISTS "lastRecipientsCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "CommAutomation" ADD COLUMN IF NOT EXISTS "config" JSONB NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS "CommAutomation_institutionId_triggerType_idx" ON "CommAutomation"("institutionId", "triggerType");

CREATE TABLE "CommAutomationRun" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "automationId" TEXT NOT NULL,
    "runAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "recipientsFound" INTEGER NOT NULL DEFAULT 0,
    "queuedCount" INTEGER NOT NULL DEFAULT 0,
    "dispatchedCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "durationMs" INTEGER NOT NULL DEFAULT 0,
    "logSummary" TEXT NOT NULL DEFAULT '',
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommAutomationRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CommAutomationQueueItem" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "automationId" TEXT NOT NULL,
    "runId" TEXT,
    "channel" TEXT NOT NULL DEFAULT 'SMS',
    "recipientName" TEXT NOT NULL DEFAULT '',
    "recipientMobile" TEXT NOT NULL DEFAULT '',
    "recipientEmail" TEXT NOT NULL DEFAULT '',
    "messageBody" TEXT NOT NULL DEFAULT '',
    "templateCode" TEXT NOT NULL DEFAULT '',
    "triggerRef" TEXT NOT NULL DEFAULT '',
    "sourceModule" TEXT NOT NULL DEFAULT 'Auto Reminders',
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "failoverUsed" BOOLEAN NOT NULL DEFAULT false,
    "lastError" TEXT NOT NULL DEFAULT '',
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "queuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommAutomationQueueItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CommAutomationRun_institutionId_runAt_idx" ON "CommAutomationRun"("institutionId", "runAt");
CREATE INDEX "CommAutomationRun_automationId_runAt_idx" ON "CommAutomationRun"("automationId", "runAt");

CREATE INDEX "CommAutomationQueueItem_institutionId_status_idx" ON "CommAutomationQueueItem"("institutionId", "status");
CREATE INDEX "CommAutomationQueueItem_automationId_queuedAt_idx" ON "CommAutomationQueueItem"("automationId", "queuedAt");
CREATE INDEX "CommAutomationQueueItem_runId_idx" ON "CommAutomationQueueItem"("runId");

ALTER TABLE "CommAutomationRun" ADD CONSTRAINT "CommAutomationRun_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommAutomationRun" ADD CONSTRAINT "CommAutomationRun_automationId_fkey" FOREIGN KEY ("automationId") REFERENCES "CommAutomation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommAutomationQueueItem" ADD CONSTRAINT "CommAutomationQueueItem_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommAutomationQueueItem" ADD CONSTRAINT "CommAutomationQueueItem_automationId_fkey" FOREIGN KEY ("automationId") REFERENCES "CommAutomation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommAutomationQueueItem" ADD CONSTRAINT "CommAutomationQueueItem_runId_fkey" FOREIGN KEY ("runId") REFERENCES "CommAutomationRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;
