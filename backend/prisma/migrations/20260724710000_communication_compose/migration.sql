-- Communication Compose Message tables

CREATE TABLE "CommMessageTemplate" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "templateCode" TEXT NOT NULL,
    "templateName" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'SMS',
    "subject" TEXT NOT NULL DEFAULT '',
    "body" TEXT NOT NULL,
    "mergeTags" JSONB NOT NULL DEFAULT '[]',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommMessageTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CommMessageHeader" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "messageCode" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "subject" TEXT NOT NULL DEFAULT '',
    "bodyHtml" TEXT NOT NULL DEFAULT '',
    "bodyPlain" TEXT NOT NULL,
    "recipientGroups" JSONB NOT NULL DEFAULT '[]',
    "audienceFilters" JSONB NOT NULL DEFAULT '{}',
    "recipientCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
    "approvedBy" TEXT NOT NULL DEFAULT '',
    "approvedAt" TIMESTAMP(3),
    "scheduleAt" TIMESTAMP(3),
    "queuedAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "queueRef" TEXT NOT NULL DEFAULT '',
    "queueProvider" TEXT NOT NULL DEFAULT 'RABBITMQ',
    "translateEnabled" BOOLEAN NOT NULL DEFAULT false,
    "targetLanguage" TEXT NOT NULL DEFAULT '',
    "dndSkippedCount" INTEGER NOT NULL DEFAULT 0,
    "createdBy" TEXT NOT NULL DEFAULT '',
    "userRole" TEXT NOT NULL DEFAULT 'Principal',
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommMessageHeader_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CommMessageRecipient" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "headerId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL DEFAULT '',
    "recipientType" TEXT NOT NULL DEFAULT 'PARENT',
    "recipientName" TEXT NOT NULL,
    "mobile" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "preferredLanguage" TEXT NOT NULL DEFAULT 'en',
    "mergeData" JSONB NOT NULL DEFAULT '{}',
    "personalizedBody" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "dndSkipped" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommMessageRecipient_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CommMessageAttachment" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "headerId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL DEFAULT '',
    "fileSize" INTEGER NOT NULL DEFAULT 0,
    "mimeType" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommMessageAttachment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CommMessageTemplate_institutionId_templateCode_academicYear_key" ON "CommMessageTemplate"("institutionId", "templateCode", "academicYear");
CREATE INDEX "CommMessageTemplate_institutionId_channel_isActive_idx" ON "CommMessageTemplate"("institutionId", "channel", "isActive");

CREATE UNIQUE INDEX "CommMessageHeader_institutionId_messageCode_key" ON "CommMessageHeader"("institutionId", "messageCode");
CREATE INDEX "CommMessageHeader_institutionId_status_idx" ON "CommMessageHeader"("institutionId", "status");
CREATE INDEX "CommMessageHeader_institutionId_academicYear_status_idx" ON "CommMessageHeader"("institutionId", "academicYear", "status");

CREATE INDEX "CommMessageRecipient_headerId_idx" ON "CommMessageRecipient"("headerId");
CREATE INDEX "CommMessageRecipient_institutionId_status_idx" ON "CommMessageRecipient"("institutionId", "status");

CREATE INDEX "CommMessageAttachment_headerId_idx" ON "CommMessageAttachment"("headerId");

ALTER TABLE "CommMessageTemplate" ADD CONSTRAINT "CommMessageTemplate_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommMessageHeader" ADD CONSTRAINT "CommMessageHeader_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommMessageRecipient" ADD CONSTRAINT "CommMessageRecipient_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommMessageRecipient" ADD CONSTRAINT "CommMessageRecipient_headerId_fkey" FOREIGN KEY ("headerId") REFERENCES "CommMessageHeader"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommMessageAttachment" ADD CONSTRAINT "CommMessageAttachment_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommMessageAttachment" ADD CONSTRAINT "CommMessageAttachment_headerId_fkey" FOREIGN KEY ("headerId") REFERENCES "CommMessageHeader"("id") ON DELETE CASCADE ON UPDATE CASCADE;
