-- CreateTable CommChannel
CREATE TABLE "CommChannel" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "channelCode" TEXT NOT NULL,
    "channelName" TEXT NOT NULL,
    "gatewayProvider" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "creditsBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "creditAlertAt" DOUBLE PRECISION NOT NULL DEFAULT 1000,
    "costPerUnit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CommChannel_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CommDeliveryLog" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "campaignTitle" TEXT NOT NULL,
    "messagePreview" TEXT NOT NULL DEFAULT '',
    "recipientGroup" TEXT NOT NULL DEFAULT '',
    "recipientCount" INTEGER NOT NULL DEFAULT 1,
    "maskedRecipient" TEXT NOT NULL DEFAULT '',
    "audienceScope" TEXT NOT NULL DEFAULT 'INSTITUTION',
    "classScope" TEXT NOT NULL DEFAULT '',
    "sourceModule" TEXT NOT NULL DEFAULT 'Communication',
    "status" TEXT NOT NULL DEFAULT 'DELIVERED',
    "cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "openCount" INTEGER NOT NULL DEFAULT 0,
    "clickCount" INTEGER NOT NULL DEFAULT 0,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CommDeliveryLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CommDashboardAggregate" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "scopeKey" TEXT NOT NULL DEFAULT 'INSTITUTION',
    "channelFilter" TEXT NOT NULL DEFAULT 'ALL',
    "totalSent" INTEGER NOT NULL DEFAULT 0,
    "totalRecipients" INTEGER NOT NULL DEFAULT 0,
    "smsSent" INTEGER NOT NULL DEFAULT 0,
    "emailSent" INTEGER NOT NULL DEFAULT 0,
    "whatsappSent" INTEGER NOT NULL DEFAULT 0,
    "pushSent" INTEGER NOT NULL DEFAULT 0,
    "deliveredCount" INTEGER NOT NULL DEFAULT 0,
    "readCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "pendingCount" INTEGER NOT NULL DEFAULT 0,
    "deliveryRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "readRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "failureRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "engagementRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "openRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "clickRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "channelStats" JSONB NOT NULL DEFAULT '{}',
    "deliveryOverview" JSONB NOT NULL DEFAULT '[]',
    "trendData" JSONB NOT NULL DEFAULT '[]',
    "refreshedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CommDashboardAggregate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CommScheduledMessage" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "scheduledDate" DATE NOT NULL,
    "scheduledTime" TEXT NOT NULL DEFAULT '09:00',
    "recipientCount" INTEGER NOT NULL DEFAULT 0,
    "recipientGroup" TEXT NOT NULL DEFAULT '',
    "audienceScope" TEXT NOT NULL DEFAULT 'INSTITUTION',
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CommScheduledMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CommAutomation" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "automationKey" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'SMS',
    "sourceModule" TEXT NOT NULL DEFAULT 'Communication',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CommAutomation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CommRecipientGroup" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "groupCode" TEXT NOT NULL,
    "groupName" TEXT NOT NULL,
    "memberCount" INTEGER NOT NULL DEFAULT 0,
    "audienceScope" TEXT NOT NULL DEFAULT 'INSTITUTION',
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CommRecipientGroup_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CommGatewayAlert" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "alertType" TEXT NOT NULL DEFAULT 'GATEWAY_DOWN',
    "severity" TEXT NOT NULL DEFAULT 'HIGH',
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CommGatewayAlert_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CommSettings" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "cacheRefreshMins" INTEGER NOT NULL DEFAULT 5,
    "roleMatrix" JSONB NOT NULL DEFAULT '[]',
    "piiMaskingRules" JSONB NOT NULL DEFAULT '{}',
    "mobileSyncRules" JSONB NOT NULL DEFAULT '{}',
    "navigationTargets" JSONB NOT NULL DEFAULT '{}',
    "lastCacheRefresh" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CommSettings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CommActivityLog" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" TEXT NOT NULL DEFAULT '',
    "filterSnapshot" JSONB NOT NULL DEFAULT '{}',
    "performedBy" TEXT NOT NULL DEFAULT 'Communication Manager',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CommActivityLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CommChannel_institutionId_channelCode_academicYear_key" ON "CommChannel"("institutionId", "channelCode", "academicYear");
CREATE INDEX "CommChannel_institutionId_status_idx" ON "CommChannel"("institutionId", "status");
CREATE INDEX "CommDeliveryLog_institutionId_academicYear_channel_idx" ON "CommDeliveryLog"("institutionId", "academicYear", "channel");
CREATE INDEX "CommDeliveryLog_institutionId_academicYear_status_idx" ON "CommDeliveryLog"("institutionId", "academicYear", "status");
CREATE INDEX "CommDeliveryLog_institutionId_audienceScope_classScope_idx" ON "CommDeliveryLog"("institutionId", "audienceScope", "classScope");
CREATE INDEX "CommDeliveryLog_institutionId_sentAt_idx" ON "CommDeliveryLog"("institutionId", "sentAt");
CREATE UNIQUE INDEX "CommDashboardAggregate_institutionId_academicYear_scopeKey_channelFilter_key" ON "CommDashboardAggregate"("institutionId", "academicYear", "scopeKey", "channelFilter");
CREATE INDEX "CommDashboardAggregate_institutionId_academicYear_idx" ON "CommDashboardAggregate"("institutionId", "academicYear");
CREATE INDEX "CommScheduledMessage_institutionId_academicYear_status_idx" ON "CommScheduledMessage"("institutionId", "academicYear", "status");
CREATE UNIQUE INDEX "CommAutomation_institutionId_automationKey_academicYear_key" ON "CommAutomation"("institutionId", "automationKey", "academicYear");
CREATE INDEX "CommAutomation_institutionId_isActive_idx" ON "CommAutomation"("institutionId", "isActive");
CREATE UNIQUE INDEX "CommRecipientGroup_institutionId_groupCode_academicYear_key" ON "CommRecipientGroup"("institutionId", "groupCode", "academicYear");
CREATE INDEX "CommGatewayAlert_institutionId_academicYear_status_idx" ON "CommGatewayAlert"("institutionId", "academicYear", "status");
CREATE UNIQUE INDEX "CommSettings_institutionId_key" ON "CommSettings"("institutionId");
CREATE INDEX "CommActivityLog_institutionId_createdAt_idx" ON "CommActivityLog"("institutionId", "createdAt");

ALTER TABLE "CommChannel" ADD CONSTRAINT "CommChannel_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommDeliveryLog" ADD CONSTRAINT "CommDeliveryLog_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommDashboardAggregate" ADD CONSTRAINT "CommDashboardAggregate_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommScheduledMessage" ADD CONSTRAINT "CommScheduledMessage_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommAutomation" ADD CONSTRAINT "CommAutomation_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommRecipientGroup" ADD CONSTRAINT "CommRecipientGroup_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommGatewayAlert" ADD CONSTRAINT "CommGatewayAlert_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommSettings" ADD CONSTRAINT "CommSettings_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommActivityLog" ADD CONSTRAINT "CommActivityLog_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
