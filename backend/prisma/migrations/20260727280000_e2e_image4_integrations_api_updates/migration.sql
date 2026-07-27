-- Image 4: Integrations / API / Updates E2E

ALTER TABLE "CommSmsGateway" ADD COLUMN IF NOT EXISTS "accountSid" TEXT NOT NULL DEFAULT '';
ALTER TABLE "CommSmsGateway" ADD COLUMN IF NOT EXISTS "encryptedAuthToken" TEXT NOT NULL DEFAULT '';
ALTER TABLE "CommSmsGateway" ADD COLUMN IF NOT EXISTS "encryptedAuthTokenIv" TEXT NOT NULL DEFAULT '';

ALTER TABLE "CommEmailSmtpGateway" ADD COLUMN IF NOT EXISTS "smtpUser" TEXT NOT NULL DEFAULT '';
ALTER TABLE "CommEmailSmtpGateway" ADD COLUMN IF NOT EXISTS "encryptedPassword" TEXT NOT NULL DEFAULT '';
ALTER TABLE "CommEmailSmtpGateway" ADD COLUMN IF NOT EXISTS "encryptedPasswordIv" TEXT NOT NULL DEFAULT '';
ALTER TABLE "CommEmailSmtpGateway" ADD COLUMN IF NOT EXISTS "useStartTls" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "SystemUpdateRecord" ADD COLUMN IF NOT EXISTS "packageChecksum" TEXT NOT NULL DEFAULT '';
ALTER TABLE "SystemUpdateRecord" ADD COLUMN IF NOT EXISTS "packageSizeBytes" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "SystemUpdateRecord" ADD COLUMN IF NOT EXISTS "progressPercent" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "SystemUpdateRecord" ADD COLUMN IF NOT EXISTS "deploymentPhase" TEXT NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS "b2b_api_keys" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "keyName" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "scopes" JSONB NOT NULL DEFAULT '[]',
    "expiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastUsedAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL DEFAULT '',
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "b2b_api_keys_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "webhook_delivery_logs" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "webhookId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "httpStatus" INTEGER,
    "responseBody" TEXT NOT NULL DEFAULT '',
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "nextRetryAt" TIMESTAMP(3),
    "signature" TEXT NOT NULL DEFAULT '',
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "webhook_delivery_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "system_release_checks" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "localVersion" TEXT NOT NULL,
    "remoteVersion" TEXT NOT NULL DEFAULT '',
    "updateAvailable" BOOLEAN NOT NULL DEFAULT false,
    "changelogMd" TEXT NOT NULL DEFAULT '',
    "changelogHtml" TEXT NOT NULL DEFAULT '',
    "packageUrl" TEXT NOT NULL DEFAULT '',
    "packageChecksum" TEXT NOT NULL DEFAULT '',
    "registryUrl" TEXT NOT NULL DEFAULT '',
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_release_checks_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "b2b_api_keys_keyHash_key" ON "b2b_api_keys"("keyHash");
CREATE INDEX IF NOT EXISTS "b2b_api_keys_institutionId_isActive_idx" ON "b2b_api_keys"("institutionId", "isActive");

CREATE INDEX IF NOT EXISTS "webhook_delivery_logs_institutionId_status_nextRetryAt_idx" ON "webhook_delivery_logs"("institutionId", "status", "nextRetryAt");
CREATE INDEX IF NOT EXISTS "webhook_delivery_logs_webhookId_createdAt_idx" ON "webhook_delivery_logs"("webhookId", "createdAt");

CREATE INDEX IF NOT EXISTS "system_release_checks_institutionId_checkedAt_idx" ON "system_release_checks"("institutionId", "checkedAt");

ALTER TABLE "b2b_api_keys" ADD CONSTRAINT "b2b_api_keys_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "webhook_delivery_logs" ADD CONSTRAINT "webhook_delivery_logs_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "webhook_delivery_logs" ADD CONSTRAINT "webhook_delivery_logs_webhookId_fkey" FOREIGN KEY ("webhookId") REFERENCES "outgoing_webhooks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "system_release_checks" ADD CONSTRAINT "system_release_checks_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
