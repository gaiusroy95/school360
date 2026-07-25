-- CreateTable
CREATE TABLE "CommMessageAuditLog" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "logRef" TEXT NOT NULL DEFAULT '',
    "direction" TEXT NOT NULL DEFAULT 'OUTBOUND',
    "channel" TEXT NOT NULL,
    "sender" TEXT NOT NULL DEFAULT 'School ERP',
    "senderId" TEXT NOT NULL DEFAULT '',
    "recipientName" TEXT NOT NULL DEFAULT '',
    "contactType" TEXT NOT NULL DEFAULT 'MOBILE',
    "contactIdentifier" TEXT NOT NULL DEFAULT '',
    "messageSnippet" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'SENT',
    "cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "studentId" TEXT NOT NULL DEFAULT '',
    "studentName" TEXT NOT NULL DEFAULT '',
    "admissionNumber" TEXT NOT NULL DEFAULT '',
    "className" TEXT NOT NULL DEFAULT '',
    "sourceModule" TEXT NOT NULL DEFAULT 'Communication',
    "sourceRecordId" TEXT NOT NULL DEFAULT '',
    "gatewayPayload" JSONB NOT NULL DEFAULT '{}',
    "gatewayResponse" JSONB NOT NULL DEFAULT '{}',
    "errorDetail" TEXT NOT NULL DEFAULT '',
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "retainedUntil" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommMessageAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CommMessageAuditLog_institutionId_sentAt_idx" ON "CommMessageAuditLog"("institutionId", "sentAt");

-- CreateIndex
CREATE INDEX "CommMessageAuditLog_institutionId_channel_status_idx" ON "CommMessageAuditLog"("institutionId", "channel", "status");

-- CreateIndex
CREATE INDEX "CommMessageAuditLog_institutionId_contactIdentifier_idx" ON "CommMessageAuditLog"("institutionId", "contactIdentifier");

-- CreateIndex
CREATE INDEX "CommMessageAuditLog_institutionId_studentId_idx" ON "CommMessageAuditLog"("institutionId", "studentId");

-- CreateIndex
CREATE INDEX "CommMessageAuditLog_institutionId_admissionNumber_idx" ON "CommMessageAuditLog"("institutionId", "admissionNumber");

-- CreateIndex
CREATE INDEX "CommMessageAuditLog_institutionId_academicYear_sentAt_idx" ON "CommMessageAuditLog"("institutionId", "academicYear", "sentAt");

-- CreateIndex
CREATE INDEX "CommMessageAuditLog_institutionId_direction_sentAt_idx" ON "CommMessageAuditLog"("institutionId", "direction", "sentAt");

-- AddForeignKey
ALTER TABLE "CommMessageAuditLog" ADD CONSTRAINT "CommMessageAuditLog_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
