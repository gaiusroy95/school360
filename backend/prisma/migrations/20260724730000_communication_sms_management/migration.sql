-- SMS Management: gateways, DND registry, dispatch queue with failover

CREATE TABLE "CommSmsGateway" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "gatewayCode" TEXT NOT NULL,
    "gatewayName" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'MSG91',
    "apiEndpoint" TEXT NOT NULL DEFAULT '',
    "senderId" TEXT NOT NULL DEFAULT 'SCHOOL',
    "apiKeyMasked" TEXT NOT NULL DEFAULT '',
    "priority" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "creditsBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "creditAlertAt" DOUBLE PRECISION NOT NULL DEFAULT 1000,
    "costPerCredit" DOUBLE PRECISION NOT NULL DEFAULT 0.25,
    "successRate" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "simulate503" BOOLEAN NOT NULL DEFAULT false,
    "lastHealthCheck" TIMESTAMP(3),
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommSmsGateway_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CommSmsDndEntry" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'PROMOTIONAL',
    "source" TEXT NOT NULL DEFAULT 'TRAI_REGISTRY',
    "notes" TEXT NOT NULL DEFAULT '',
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommSmsDndEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CommSmsQueueItem" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "encoding" TEXT NOT NULL DEFAULT 'GSM',
    "charCount" INTEGER NOT NULL DEFAULT 0,
    "segmentCount" INTEGER NOT NULL DEFAULT 1,
    "creditsRequired" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "messageType" TEXT NOT NULL DEFAULT 'TRANSACTIONAL',
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "gatewayId" TEXT,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT NOT NULL DEFAULT '',
    "dndSkipped" BOOLEAN NOT NULL DEFAULT false,
    "sourceModule" TEXT NOT NULL DEFAULT 'SMS Management',
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "queuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommSmsQueueItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CommSmsDispatchAttempt" (
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

    CONSTRAINT "CommSmsDispatchAttempt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CommSmsGateway_institutionId_gatewayCode_academicYear_key" ON "CommSmsGateway"("institutionId", "gatewayCode", "academicYear");
CREATE INDEX "CommSmsGateway_institutionId_status_priority_idx" ON "CommSmsGateway"("institutionId", "status", "priority");

CREATE UNIQUE INDEX "CommSmsDndEntry_institutionId_mobile_key" ON "CommSmsDndEntry"("institutionId", "mobile");
CREATE INDEX "CommSmsDndEntry_institutionId_category_idx" ON "CommSmsDndEntry"("institutionId", "category");

CREATE INDEX "CommSmsQueueItem_institutionId_status_idx" ON "CommSmsQueueItem"("institutionId", "status");
CREATE INDEX "CommSmsQueueItem_institutionId_academicYear_queuedAt_idx" ON "CommSmsQueueItem"("institutionId", "academicYear", "queuedAt");

CREATE INDEX "CommSmsDispatchAttempt_queueItemId_idx" ON "CommSmsDispatchAttempt"("queueItemId");
CREATE INDEX "CommSmsDispatchAttempt_institutionId_attemptedAt_idx" ON "CommSmsDispatchAttempt"("institutionId", "attemptedAt");

ALTER TABLE "CommSmsGateway" ADD CONSTRAINT "CommSmsGateway_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommSmsDndEntry" ADD CONSTRAINT "CommSmsDndEntry_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommSmsQueueItem" ADD CONSTRAINT "CommSmsQueueItem_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommSmsQueueItem" ADD CONSTRAINT "CommSmsQueueItem_gatewayId_fkey" FOREIGN KEY ("gatewayId") REFERENCES "CommSmsGateway"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CommSmsDispatchAttempt" ADD CONSTRAINT "CommSmsDispatchAttempt_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommSmsDispatchAttempt" ADD CONSTRAINT "CommSmsDispatchAttempt_queueItemId_fkey" FOREIGN KEY ("queueItemId") REFERENCES "CommSmsQueueItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommSmsDispatchAttempt" ADD CONSTRAINT "CommSmsDispatchAttempt_gatewayId_fkey" FOREIGN KEY ("gatewayId") REFERENCES "CommSmsGateway"("id") ON DELETE CASCADE ON UPDATE CASCADE;
