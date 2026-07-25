-- CreateTable
CREATE TABLE IF NOT EXISTS "TransportReportsSettings" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "kpiConfig" JSONB NOT NULL DEFAULT '[]',
    "dashboardWidgets" JSONB NOT NULL DEFAULT '[]',
    "roleMatrix" JSONB NOT NULL DEFAULT '[]',
    "notificationRules" JSONB NOT NULL DEFAULT '{}',
    "mobileSyncRules" JSONB NOT NULL DEFAULT '{}',
    "exportFormats" JSONB NOT NULL DEFAULT '["PDF","Excel","CSV"]',
    "biIntegrations" JSONB NOT NULL DEFAULT '["Power BI","Tableau","API"]',
    "reportCatalog" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransportReportsSettings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "TransportReportsSchedule" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "reportName" TEXT NOT NULL,
    "frequency" TEXT NOT NULL DEFAULT 'DAILY',
    "channel" TEXT NOT NULL DEFAULT 'EMAIL',
    "recipients" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "lastRunAt" TIMESTAMP(3),
    "nextRunAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransportReportsSchedule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "TransportReportsAuditLog" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL DEFAULT '',
    "action" TEXT NOT NULL,
    "details" TEXT NOT NULL DEFAULT '',
    "performedBy" TEXT NOT NULL DEFAULT 'MIS Admin',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransportReportsAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "TransportReportsSettings_institutionId_key" ON "TransportReportsSettings"("institutionId");
CREATE INDEX IF NOT EXISTS "TransportReportsSchedule_institutionId_status_idx" ON "TransportReportsSchedule"("institutionId", "status");
CREATE INDEX IF NOT EXISTS "TransportReportsAuditLog_institutionId_createdAt_idx" ON "TransportReportsAuditLog"("institutionId", "createdAt");

ALTER TABLE "TransportReportsSettings" ADD CONSTRAINT "TransportReportsSettings_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransportReportsSchedule" ADD CONSTRAINT "TransportReportsSchedule_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransportReportsAuditLog" ADD CONSTRAINT "TransportReportsAuditLog_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
