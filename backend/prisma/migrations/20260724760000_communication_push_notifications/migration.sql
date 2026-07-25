-- Push Notifications: FCM/APNs gateways, campaigns, per-recipient dispatch

CREATE TABLE "CommPushGateway" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "gatewayCode" TEXT NOT NULL,
    "gatewayName" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'FCM',
    "serverKeyMasked" TEXT NOT NULL DEFAULT '',
    "bundleId" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "priority" INTEGER NOT NULL DEFAULT 1,
    "sentToday" INTEGER NOT NULL DEFAULT 0,
    "dailyLimit" INTEGER NOT NULL DEFAULT 0,
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommPushGateway_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CommPushCampaign" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL DEFAULT '',
    "payload" JSONB NOT NULL DEFAULT '{}',
    "audienceType" TEXT NOT NULL DEFAULT 'ALL',
    "audienceLabel" TEXT NOT NULL DEFAULT '',
    "classFilter" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "recipientCount" INTEGER NOT NULL DEFAULT 0,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "deliveredCount" INTEGER NOT NULL DEFAULT 0,
    "readCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "deviceCount" INTEGER NOT NULL DEFAULT 0,
    "sentBy" TEXT NOT NULL DEFAULT '',
    "sourceModule" TEXT NOT NULL DEFAULT 'Push Notifications',
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "queuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommPushCampaign_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CommPushRecipient" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL DEFAULT '',
    "accountName" TEXT NOT NULL DEFAULT '',
    "accountRole" TEXT NOT NULL DEFAULT '',
    "platform" TEXT NOT NULL DEFAULT 'ANDROID',
    "deviceTokenMasked" TEXT NOT NULL DEFAULT '',
    "mobileNotificationId" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "gatewayProvider" TEXT NOT NULL DEFAULT 'FCM',
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "failedReason" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommPushRecipient_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CommPushGateway_institutionId_gatewayCode_academicYear_key" ON "CommPushGateway"("institutionId", "gatewayCode", "academicYear");
CREATE INDEX "CommPushGateway_institutionId_status_idx" ON "CommPushGateway"("institutionId", "status");

CREATE INDEX "CommPushCampaign_institutionId_status_idx" ON "CommPushCampaign"("institutionId", "status");
CREATE INDEX "CommPushCampaign_institutionId_academicYear_createdAt_idx" ON "CommPushCampaign"("institutionId", "academicYear", "createdAt");

CREATE INDEX "CommPushRecipient_campaignId_status_idx" ON "CommPushRecipient"("campaignId", "status");
CREATE INDEX "CommPushRecipient_institutionId_mobileNotificationId_idx" ON "CommPushRecipient"("institutionId", "mobileNotificationId");
CREATE INDEX "CommPushRecipient_institutionId_accountId_idx" ON "CommPushRecipient"("institutionId", "accountId");

ALTER TABLE "CommPushGateway" ADD CONSTRAINT "CommPushGateway_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommPushCampaign" ADD CONSTRAINT "CommPushCampaign_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommPushRecipient" ADD CONSTRAINT "CommPushRecipient_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommPushRecipient" ADD CONSTRAINT "CommPushRecipient_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "CommPushCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
