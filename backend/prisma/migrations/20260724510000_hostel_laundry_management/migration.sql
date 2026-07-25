CREATE TABLE "HostelLaundryVendor" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "vendorName" TEXT NOT NULL,
    "contactPerson" TEXT NOT NULL DEFAULT '',
    "mobile" TEXT NOT NULL DEFAULT '',
    "pickupSchedule" TEXT NOT NULL DEFAULT 'Mon, Thu',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HostelLaundryVendor_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HostelLaundryBatch" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "batchNumber" TEXT NOT NULL DEFAULT '',
    "totalItems" INTEGER NOT NULL DEFAULT 0,
    "totalWeightKg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "requestCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "dispatchedAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3),
    "expectedReturnAt" TIMESTAMP(3),
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HostelLaundryBatch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HostelLaundryRequest" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "hostelId" TEXT,
    "batchId" TEXT,
    "studentId" TEXT NOT NULL DEFAULT '',
    "studentProfileId" TEXT NOT NULL DEFAULT '',
    "studentName" TEXT NOT NULL DEFAULT '',
    "itemCount" INTEGER NOT NULL DEFAULT 0,
    "weightKg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dropNotes" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'TOKEN_ISSUED',
    "tokenNumber" TEXT NOT NULL DEFAULT '',
    "qrToken" TEXT NOT NULL DEFAULT '',
    "monthLabel" TEXT NOT NULL DEFAULT '',
    "droppedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "droppedBy" TEXT NOT NULL DEFAULT '',
    "dispatchedAt" TIMESTAMP(3),
    "receivedFromVendorAt" TIMESTAMP(3),
    "readyNotifiedAt" TIMESTAMP(3),
    "collectedAt" TIMESTAMP(3),
    "collectedBy" TEXT NOT NULL DEFAULT '',
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HostelLaundryRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HostelLaundryQuota" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL DEFAULT '',
    "monthlyItemLimit" INTEGER NOT NULL DEFAULT 30,
    "monthlyWeightLimitKg" DOUBLE PRECISION NOT NULL DEFAULT 15,
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HostelLaundryQuota_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HostelLaundryAuditLog" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "fromStatus" TEXT NOT NULL DEFAULT '',
    "toStatus" TEXT NOT NULL DEFAULT '',
    "performedBy" TEXT NOT NULL DEFAULT '',
    "details" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HostelLaundryAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "HostelLaundryVendor_institutionId_academicYear_status_idx" ON "HostelLaundryVendor"("institutionId", "academicYear", "status");
CREATE INDEX "HostelLaundryBatch_institutionId_academicYear_status_idx" ON "HostelLaundryBatch"("institutionId", "academicYear", "status");
CREATE INDEX "HostelLaundryBatch_batchNumber_idx" ON "HostelLaundryBatch"("batchNumber");
CREATE INDEX "HostelLaundryRequest_institutionId_academicYear_status_idx" ON "HostelLaundryRequest"("institutionId", "academicYear", "status");
CREATE INDEX "HostelLaundryRequest_institutionId_studentProfileId_monthLabel_idx" ON "HostelLaundryRequest"("institutionId", "studentProfileId", "monthLabel");
CREATE INDEX "HostelLaundryRequest_qrToken_idx" ON "HostelLaundryRequest"("qrToken");
CREATE INDEX "HostelLaundryRequest_tokenNumber_idx" ON "HostelLaundryRequest"("tokenNumber");
CREATE INDEX "HostelLaundryRequest_batchId_idx" ON "HostelLaundryRequest"("batchId");
CREATE UNIQUE INDEX "HostelLaundryQuota_institutionId_studentProfileId_academicYear_key" ON "HostelLaundryQuota"("institutionId", "studentProfileId", "academicYear");
CREATE INDEX "HostelLaundryQuota_institutionId_academicYear_idx" ON "HostelLaundryQuota"("institutionId", "academicYear");
CREATE INDEX "HostelLaundryAuditLog_institutionId_requestId_idx" ON "HostelLaundryAuditLog"("institutionId", "requestId");
CREATE INDEX "HostelLaundryAuditLog_institutionId_createdAt_idx" ON "HostelLaundryAuditLog"("institutionId", "createdAt");

ALTER TABLE "HostelLaundryVendor" ADD CONSTRAINT "HostelLaundryVendor_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HostelLaundryBatch" ADD CONSTRAINT "HostelLaundryBatch_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HostelLaundryBatch" ADD CONSTRAINT "HostelLaundryBatch_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "HostelLaundryVendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HostelLaundryRequest" ADD CONSTRAINT "HostelLaundryRequest_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HostelLaundryRequest" ADD CONSTRAINT "HostelLaundryRequest_hostelId_fkey" FOREIGN KEY ("hostelId") REFERENCES "HostelMaster"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "HostelLaundryRequest" ADD CONSTRAINT "HostelLaundryRequest_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "HostelLaundryBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "HostelLaundryQuota" ADD CONSTRAINT "HostelLaundryQuota_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HostelLaundryAuditLog" ADD CONSTRAINT "HostelLaundryAuditLog_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HostelLaundryAuditLog" ADD CONSTRAINT "HostelLaundryAuditLog_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "HostelLaundryRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
