-- WhatsApp Management: gateway, opt-in, sessions, messages, webhooks

CREATE TABLE "CommWaGateway" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "gatewayCode" TEXT NOT NULL,
    "gatewayName" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'GUPSHUP',
    "phoneNumberId" TEXT NOT NULL DEFAULT '',
    "businessAccountId" TEXT NOT NULL DEFAULT '',
    "apiKeyMasked" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "costPerMessage" DOUBLE PRECISION NOT NULL DEFAULT 0.45,
    "creditsBalance" DOUBLE PRECISION NOT NULL DEFAULT 8500,
    "creditAlertAt" DOUBLE PRECISION NOT NULL DEFAULT 500,
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommWaGateway_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CommWaOptIn" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "contactName" TEXT NOT NULL DEFAULT '',
    "optInStatus" TEXT NOT NULL DEFAULT 'OPTED_IN',
    "optInSource" TEXT NOT NULL DEFAULT 'MANUAL',
    "optInAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "optedOutAt" TIMESTAMP(3),
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommWaOptIn_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CommWaSession" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "contactName" TEXT NOT NULL DEFAULT '',
    "lastInboundAt" TIMESTAMP(3),
    "windowExpiresAt" TIMESTAMP(3),
    "isWindowOpen" BOOLEAN NOT NULL DEFAULT false,
    "unreadCount" INTEGER NOT NULL DEFAULT 0,
    "lastMessagePreview" TEXT NOT NULL DEFAULT '',
    "assignedTo" TEXT NOT NULL DEFAULT 'Helpdesk',
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommWaSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CommWaMessage" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "sessionId" TEXT,
    "mobile" TEXT NOT NULL,
    "direction" TEXT NOT NULL DEFAULT 'OUTBOUND',
    "messageType" TEXT NOT NULL DEFAULT 'TEXT',
    "body" TEXT NOT NULL DEFAULT '',
    "templateCode" TEXT NOT NULL DEFAULT '',
    "mediaUrl" TEXT NOT NULL DEFAULT '',
    "mediaMimeType" TEXT NOT NULL DEFAULT '',
    "mediaFileName" TEXT NOT NULL DEFAULT '',
    "mediaSize" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "vendorMessageId" TEXT NOT NULL DEFAULT '',
    "cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sentBy" TEXT NOT NULL DEFAULT '',
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "failedReason" TEXT NOT NULL DEFAULT '',
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommWaMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CommWaWebhookEvent" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "messageId" TEXT,
    "eventType" TEXT NOT NULL,
    "vendorMessageId" TEXT NOT NULL DEFAULT '',
    "payload" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommWaWebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CommWaGateway_institutionId_gatewayCode_academicYear_key" ON "CommWaGateway"("institutionId", "gatewayCode", "academicYear");
CREATE INDEX "CommWaGateway_institutionId_status_idx" ON "CommWaGateway"("institutionId", "status");

CREATE UNIQUE INDEX "CommWaOptIn_institutionId_mobile_key" ON "CommWaOptIn"("institutionId", "mobile");
CREATE INDEX "CommWaOptIn_institutionId_optInStatus_idx" ON "CommWaOptIn"("institutionId", "optInStatus");

CREATE UNIQUE INDEX "CommWaSession_institutionId_mobile_key" ON "CommWaSession"("institutionId", "mobile");
CREATE INDEX "CommWaSession_institutionId_isWindowOpen_idx" ON "CommWaSession"("institutionId", "isWindowOpen");

CREATE INDEX "CommWaMessage_institutionId_mobile_idx" ON "CommWaMessage"("institutionId", "mobile");
CREATE INDEX "CommWaMessage_institutionId_status_idx" ON "CommWaMessage"("institutionId", "status");
CREATE INDEX "CommWaMessage_sessionId_createdAt_idx" ON "CommWaMessage"("sessionId", "createdAt");

CREATE INDEX "CommWaWebhookEvent_institutionId_eventType_idx" ON "CommWaWebhookEvent"("institutionId", "eventType");
CREATE INDEX "CommWaWebhookEvent_messageId_idx" ON "CommWaWebhookEvent"("messageId");

ALTER TABLE "CommWaGateway" ADD CONSTRAINT "CommWaGateway_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommWaOptIn" ADD CONSTRAINT "CommWaOptIn_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommWaSession" ADD CONSTRAINT "CommWaSession_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommWaMessage" ADD CONSTRAINT "CommWaMessage_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommWaMessage" ADD CONSTRAINT "CommWaMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "CommWaSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CommWaWebhookEvent" ADD CONSTRAINT "CommWaWebhookEvent_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommWaWebhookEvent" ADD CONSTRAINT "CommWaWebhookEvent_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "CommWaMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
