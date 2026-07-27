-- Integrations, APIs & Notification module

CREATE TABLE "third_party_integrations" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "connectorCode" TEXT NOT NULL,
    "connectorName" TEXT NOT NULL,
    "connectorType" TEXT NOT NULL DEFAULT 'LMS',
    "apiEndpoint" TEXT NOT NULL DEFAULT '',
    "credentialsRef" TEXT NOT NULL DEFAULT '',
    "dataMappings" JSONB NOT NULL DEFAULT '[]',
    "syncSchedule" TEXT NOT NULL DEFAULT '0 */6 * * *',
    "webhookValidated" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "third_party_integrations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "third_party_integrations_institutionId_connectorCode_key" ON "third_party_integrations"("institutionId", "connectorCode");
CREATE INDEX "third_party_integrations_institutionId_connectorType_idx" ON "third_party_integrations"("institutionId", "connectorType");

CREATE TABLE "outgoing_webhooks" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "webhookCode" TEXT NOT NULL,
    "targetUrl" TEXT NOT NULL,
    "eventSubscriptions" JSONB NOT NULL DEFAULT '[]',
    "signingKey" TEXT NOT NULL DEFAULT '',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastTestAt" TIMESTAMP(3),
    "lastTestStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "outgoing_webhooks_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "outgoing_webhooks_institutionId_webhookCode_key" ON "outgoing_webhooks"("institutionId", "webhookCode");
CREATE INDEX "outgoing_webhooks_institutionId_isActive_idx" ON "outgoing_webhooks"("institutionId", "isActive");

CREATE TABLE "workspace_integrations" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT '',
    "clientId" TEXT NOT NULL DEFAULT '',
    "credentialsRef" TEXT NOT NULL DEFAULT '',
    "oauthScopes" JSONB NOT NULL DEFAULT '[]',
    "directorySync" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "lastSyncAt" TIMESTAMP(3),
    "connectionStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "workspace_integrations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "workspace_integrations_institutionId_provider_key" ON "workspace_integrations"("institutionId", "provider");

CREATE TABLE "template_categories" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "categoryCode" TEXT NOT NULL,
    "categoryLabel" TEXT NOT NULL,
    "moduleTag" TEXT NOT NULL DEFAULT 'GENERAL',
    "templateCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "template_categories_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "template_categories_institutionId_categoryCode_key" ON "template_categories"("institutionId", "categoryCode");
CREATE INDEX "template_categories_institutionId_moduleTag_idx" ON "template_categories"("institutionId", "moduleTag");

CREATE TABLE "dynamic_fields" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "fieldKey" TEXT NOT NULL,
    "fieldLabel" TEXT NOT NULL,
    "schemaTable" TEXT NOT NULL DEFAULT '',
    "schemaColumn" TEXT NOT NULL DEFAULT '',
    "placeholder" TEXT NOT NULL DEFAULT '',
    "sampleValue" TEXT NOT NULL DEFAULT '',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "dynamic_fields_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "dynamic_fields_institutionId_fieldKey_key" ON "dynamic_fields"("institutionId", "fieldKey");
CREATE INDEX "dynamic_fields_institutionId_schemaTable_idx" ON "dynamic_fields"("institutionId", "schemaTable");

CREATE TABLE "notification_channel_settings" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "defaultSmsSender" TEXT NOT NULL DEFAULT 'SCHOOL',
    "defaultEmailFrom" TEXT NOT NULL DEFAULT '',
    "defaultChannel" TEXT NOT NULL DEFAULT 'EMAIL',
    "retryMaxAttempts" INTEGER NOT NULL DEFAULT 3,
    "retryBackoffSeconds" INTEGER NOT NULL DEFAULT 60,
    "throttlePerMinute" INTEGER NOT NULL DEFAULT 120,
    "fallbackChannel" TEXT NOT NULL DEFAULT 'SMS',
    "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "smsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "whatsappEnabled" BOOLEAN NOT NULL DEFAULT false,
    "pushEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "notification_channel_settings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "notification_channel_settings_institutionId_key" ON "notification_channel_settings"("institutionId");

ALTER TABLE "third_party_integrations" ADD CONSTRAINT "third_party_integrations_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "outgoing_webhooks" ADD CONSTRAINT "outgoing_webhooks_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workspace_integrations" ADD CONSTRAINT "workspace_integrations_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "template_categories" ADD CONSTRAINT "template_categories_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dynamic_fields" ADD CONSTRAINT "dynamic_fields_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notification_channel_settings" ADD CONSTRAINT "notification_channel_settings_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
