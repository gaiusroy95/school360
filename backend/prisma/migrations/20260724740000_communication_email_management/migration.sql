-- Email Management: SMTP gateways, queue, open/click tracking

CREATE TABLE "CommEmailSmtpGateway" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "gatewayCode" TEXT NOT NULL,
    "gatewayName" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'SENDGRID',
    "smtpHost" TEXT NOT NULL DEFAULT '',
    "smtpPort" INTEGER NOT NULL DEFAULT 587,
    "fromEmail" TEXT NOT NULL,
    "fromName" TEXT NOT NULL DEFAULT '',
    "apiKeyMasked" TEXT NOT NULL DEFAULT '',
    "priority" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "dailyLimit" INTEGER NOT NULL DEFAULT 50000,
    "sentToday" INTEGER NOT NULL DEFAULT 0,
    "costPerEmail" DOUBLE PRECISION NOT NULL DEFAULT 0.05,
    "trackOpens" BOOLEAN NOT NULL DEFAULT true,
    "trackClicks" BOOLEAN NOT NULL DEFAULT true,
    "simulate503" BOOLEAN NOT NULL DEFAULT false,
    "lastHealthCheck" TIMESTAMP(3),
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommEmailSmtpGateway_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CommEmailQueueItem" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "toEmail" TEXT NOT NULL,
    "toName" TEXT NOT NULL DEFAULT '',
    "subject" TEXT NOT NULL,
    "bodyHtml" TEXT NOT NULL,
    "bodyPlain" TEXT NOT NULL DEFAULT '',
    "campaignType" TEXT NOT NULL DEFAULT 'TRANSACTIONAL',
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "gatewayId" TEXT,
    "trackingId" TEXT NOT NULL,
    "openCount" INTEGER NOT NULL DEFAULT 0,
    "clickCount" INTEGER NOT NULL DEFAULT 0,
    "openedAt" TIMESTAMP(3),
    "firstClickAt" TIMESTAMP(3),
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT NOT NULL DEFAULT '',
    "sourceModule" TEXT NOT NULL DEFAULT 'Email Management',
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "queuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommEmailQueueItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CommEmailTrackingEvent" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "queueItemId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "linkUrl" TEXT NOT NULL DEFAULT '',
    "userAgent" TEXT NOT NULL DEFAULT '',
    "ipAddress" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommEmailTrackingEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CommEmailDispatchAttempt" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "queueItemId" TEXT NOT NULL,
    "gatewayId" TEXT NOT NULL,
    "gatewayCode" TEXT NOT NULL,
    "httpStatus" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'FAILED',
    "response" TEXT NOT NULL DEFAULT '',
    "failover" BOOLEAN NOT NULL DEFAULT false,
    "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommEmailDispatchAttempt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CommEmailSmtpGateway_institutionId_gatewayCode_academicYear_key" ON "CommEmailSmtpGateway"("institutionId", "gatewayCode", "academicYear");
CREATE INDEX "CommEmailSmtpGateway_institutionId_status_priority_idx" ON "CommEmailSmtpGateway"("institutionId", "status", "priority");

CREATE UNIQUE INDEX "CommEmailQueueItem_trackingId_key" ON "CommEmailQueueItem"("trackingId");
CREATE INDEX "CommEmailQueueItem_institutionId_status_idx" ON "CommEmailQueueItem"("institutionId", "status");
CREATE INDEX "CommEmailQueueItem_institutionId_academicYear_queuedAt_idx" ON "CommEmailQueueItem"("institutionId", "academicYear", "queuedAt");
CREATE INDEX "CommEmailQueueItem_institutionId_campaignType_idx" ON "CommEmailQueueItem"("institutionId", "campaignType");

CREATE INDEX "CommEmailTrackingEvent_queueItemId_eventType_idx" ON "CommEmailTrackingEvent"("queueItemId", "eventType");
CREATE INDEX "CommEmailTrackingEvent_institutionId_createdAt_idx" ON "CommEmailTrackingEvent"("institutionId", "createdAt");

CREATE INDEX "CommEmailDispatchAttempt_queueItemId_idx" ON "CommEmailDispatchAttempt"("queueItemId");
CREATE INDEX "CommEmailDispatchAttempt_institutionId_attemptedAt_idx" ON "CommEmailDispatchAttempt"("institutionId", "attemptedAt");

ALTER TABLE "CommEmailSmtpGateway" ADD CONSTRAINT "CommEmailSmtpGateway_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommEmailQueueItem" ADD CONSTRAINT "CommEmailQueueItem_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommEmailQueueItem" ADD CONSTRAINT "CommEmailQueueItem_gatewayId_fkey" FOREIGN KEY ("gatewayId") REFERENCES "CommEmailSmtpGateway"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CommEmailTrackingEvent" ADD CONSTRAINT "CommEmailTrackingEvent_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommEmailTrackingEvent" ADD CONSTRAINT "CommEmailTrackingEvent_queueItemId_fkey" FOREIGN KEY ("queueItemId") REFERENCES "CommEmailQueueItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommEmailDispatchAttempt" ADD CONSTRAINT "CommEmailDispatchAttempt_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommEmailDispatchAttempt" ADD CONSTRAINT "CommEmailDispatchAttempt_queueItemId_fkey" FOREIGN KEY ("queueItemId") REFERENCES "CommEmailQueueItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommEmailDispatchAttempt" ADD CONSTRAINT "CommEmailDispatchAttempt_gatewayId_fkey" FOREIGN KEY ("gatewayId") REFERENCES "CommEmailSmtpGateway"("id") ON DELETE CASCADE ON UPDATE CASCADE;
