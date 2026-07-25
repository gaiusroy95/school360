-- Circulars / Notices: official documents, acknowledgments, e-signatures

CREATE TABLE "CommCircular" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "pdfUrl" TEXT NOT NULL DEFAULT '',
    "pdfFileName" TEXT NOT NULL DEFAULT '',
    "pdfSize" INTEGER NOT NULL DEFAULT 0,
    "requireAcknowledgment" BOOLEAN NOT NULL DEFAULT false,
    "requireESignature" BOOLEAN NOT NULL DEFAULT false,
    "audienceType" TEXT NOT NULL DEFAULT 'ALL',
    "audienceLabel" TEXT NOT NULL DEFAULT '',
    "classFilter" TEXT NOT NULL DEFAULT '',
    "targetCount" INTEGER NOT NULL DEFAULT 0,
    "viewedCount" INTEGER NOT NULL DEFAULT 0,
    "acknowledgedCount" INTEGER NOT NULL DEFAULT 0,
    "pushSent" BOOLEAN NOT NULL DEFAULT false,
    "pushCampaignId" TEXT NOT NULL DEFAULT '',
    "publishedBy" TEXT NOT NULL DEFAULT '',
    "publishedAt" TIMESTAMP(3),
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommCircular_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CommCircularAcknowledgment" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "circularId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "accountName" TEXT NOT NULL DEFAULT '',
    "accountRole" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "viewedAt" TIMESTAMP(3),
    "acknowledgedAt" TIMESTAMP(3),
    "ipAddress" TEXT NOT NULL DEFAULT '',
    "userAgent" TEXT NOT NULL DEFAULT '',
    "eSignature" TEXT NOT NULL DEFAULT '',
    "reminderCount" INTEGER NOT NULL DEFAULT 0,
    "lastReminderAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommCircularAcknowledgment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CommCircular_institutionId_status_idx" ON "CommCircular"("institutionId", "status");
CREATE INDEX "CommCircular_institutionId_academicYear_publishedAt_idx" ON "CommCircular"("institutionId", "academicYear", "publishedAt");

CREATE UNIQUE INDEX "CommCircularAcknowledgment_circularId_accountId_key" ON "CommCircularAcknowledgment"("circularId", "accountId");
CREATE INDEX "CommCircularAcknowledgment_institutionId_accountId_status_idx" ON "CommCircularAcknowledgment"("institutionId", "accountId", "status");
CREATE INDEX "CommCircularAcknowledgment_circularId_status_idx" ON "CommCircularAcknowledgment"("circularId", "status");

ALTER TABLE "CommCircular" ADD CONSTRAINT "CommCircular_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommCircularAcknowledgment" ADD CONSTRAINT "CommCircularAcknowledgment_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommCircularAcknowledgment" ADD CONSTRAINT "CommCircularAcknowledgment_circularId_fkey" FOREIGN KEY ("circularId") REFERENCES "CommCircular"("id") ON DELETE CASCADE ON UPDATE CASCADE;
