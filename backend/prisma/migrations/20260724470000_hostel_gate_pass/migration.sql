ALTER TABLE "HostelGateLog" ADD COLUMN "gatePassId" TEXT;
ALTER TABLE "HostelGateLog" ADD COLUMN "scanDevice" TEXT NOT NULL DEFAULT '';
ALTER TABLE "HostelGateLog" ADD COLUMN "scanIp" TEXT NOT NULL DEFAULT '';

CREATE TABLE "HostelGatePass" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "hostelId" TEXT,
    "studentId" TEXT NOT NULL DEFAULT '',
    "studentProfileId" TEXT NOT NULL DEFAULT '',
    "studentName" TEXT NOT NULL DEFAULT '',
    "purpose" TEXT NOT NULL DEFAULT '',
    "destination" TEXT NOT NULL DEFAULT '',
    "maxDurationMinutes" INTEGER NOT NULL DEFAULT 120,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validFrom" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "wardenIssuedAt" TIMESTAMP(3),
    "wardenIssuedBy" TEXT NOT NULL DEFAULT '',
    "rejectedBy" TEXT NOT NULL DEFAULT '',
    "rejectionReason" TEXT NOT NULL DEFAULT '',
    "rejectedAt" TIMESTAMP(3),
    "qrToken" TEXT NOT NULL DEFAULT '',
    "exitScannedAt" TIMESTAMP(3),
    "returnScannedAt" TIMESTAMP(3),
    "lateMinutes" INTEGER NOT NULL DEFAULT 0,
    "fineAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fineApplied" BOOLEAN NOT NULL DEFAULT false,
    "securityOutBy" TEXT NOT NULL DEFAULT '',
    "securityInBy" TEXT NOT NULL DEFAULT '',
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HostelGatePass_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HostelGatePassAuditLog" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "gatePassId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "fromStatus" TEXT NOT NULL DEFAULT '',
    "toStatus" TEXT NOT NULL DEFAULT '',
    "performedBy" TEXT NOT NULL DEFAULT '',
    "details" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HostelGatePassAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "HostelGateLog_gatePassId_idx" ON "HostelGateLog"("gatePassId");
CREATE INDEX "HostelGatePass_institutionId_academicYear_status_idx" ON "HostelGatePass"("institutionId", "academicYear", "status");
CREATE INDEX "HostelGatePass_institutionId_studentProfileId_idx" ON "HostelGatePass"("institutionId", "studentProfileId");
CREATE INDEX "HostelGatePass_qrToken_idx" ON "HostelGatePass"("qrToken");
CREATE INDEX "HostelGatePass_validUntil_idx" ON "HostelGatePass"("validUntil");
CREATE INDEX "HostelGatePassAuditLog_institutionId_gatePassId_idx" ON "HostelGatePassAuditLog"("institutionId", "gatePassId");
CREATE INDEX "HostelGatePassAuditLog_institutionId_createdAt_idx" ON "HostelGatePassAuditLog"("institutionId", "createdAt");

ALTER TABLE "HostelGateLog" ADD CONSTRAINT "HostelGateLog_gatePassId_fkey" FOREIGN KEY ("gatePassId") REFERENCES "HostelGatePass"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "HostelGatePass" ADD CONSTRAINT "HostelGatePass_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HostelGatePass" ADD CONSTRAINT "HostelGatePass_hostelId_fkey" FOREIGN KEY ("hostelId") REFERENCES "HostelMaster"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "HostelGatePassAuditLog" ADD CONSTRAINT "HostelGatePassAuditLog_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HostelGatePassAuditLog" ADD CONSTRAINT "HostelGatePassAuditLog_gatePassId_fkey" FOREIGN KEY ("gatePassId") REFERENCES "HostelGatePass"("id") ON DELETE CASCADE ON UPDATE CASCADE;
