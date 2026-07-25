CREATE TABLE IF NOT EXISTS "LibAuditSession" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "branchId" TEXT,
    "rackId" TEXT,
    "shelfId" TEXT,
    "auditCode" TEXT NOT NULL,
    "targetLabel" TEXT NOT NULL DEFAULT '',
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "scannedBy" TEXT NOT NULL,
    "closedBy" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "systemCount" INTEGER NOT NULL DEFAULT 0,
    "physicalCount" INTEGER NOT NULL DEFAULT 0,
    "variance" INTEGER NOT NULL DEFAULT 0,
    "missingCount" INTEGER NOT NULL DEFAULT 0,
    "misplacedCount" INTEGER NOT NULL DEFAULT 0,
    "extraCount" INTEGER NOT NULL DEFAULT 0,
    "damagedCount" INTEGER NOT NULL DEFAULT 0,
    "returnedUnrecordedCount" INTEGER NOT NULL DEFAULT 0,
    "financialLoss" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "adminNotified" BOOLEAN NOT NULL DEFAULT false,
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LibAuditSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "LibAuditScan" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "accessionNo" TEXT NOT NULL,
    "copyId" TEXT,
    "bookTitle" TEXT NOT NULL DEFAULT '',
    "scanMethod" TEXT NOT NULL DEFAULT 'BARCODE',
    "discrepancyType" TEXT NOT NULL DEFAULT 'NONE',
    "resolution" TEXT NOT NULL DEFAULT 'PENDING',
    "resolutionNotes" TEXT NOT NULL DEFAULT '',
    "expectedLocation" TEXT NOT NULL DEFAULT '',
    "scannedLocation" TEXT NOT NULL DEFAULT '',
    "issueStatus" TEXT NOT NULL DEFAULT '',
    "purchasePrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "scannedBy" TEXT NOT NULL,
    "resolvedBy" TEXT NOT NULL DEFAULT '',
    "resolvedAt" TIMESTAMP(3),
    "scannedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LibAuditScan_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "LibAuditSession_institutionId_auditCode_key" ON "LibAuditSession"("institutionId", "auditCode");
CREATE INDEX IF NOT EXISTS "LibAuditSession_institutionId_status_idx" ON "LibAuditSession"("institutionId", "status");
CREATE INDEX IF NOT EXISTS "LibAuditSession_institutionId_startDate_idx" ON "LibAuditSession"("institutionId", "startDate");
CREATE UNIQUE INDEX IF NOT EXISTS "LibAuditScan_sessionId_accessionNo_key" ON "LibAuditScan"("sessionId", "accessionNo");
CREATE INDEX IF NOT EXISTS "LibAuditScan_institutionId_sessionId_idx" ON "LibAuditScan"("institutionId", "sessionId");
CREATE INDEX IF NOT EXISTS "LibAuditScan_sessionId_discrepancyType_resolution_idx" ON "LibAuditScan"("sessionId", "discrepancyType", "resolution");

ALTER TABLE "LibAuditSession" ADD CONSTRAINT "LibAuditSession_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LibAuditSession" ADD CONSTRAINT "LibAuditSession_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "LibBranch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LibAuditSession" ADD CONSTRAINT "LibAuditSession_rackId_fkey" FOREIGN KEY ("rackId") REFERENCES "LibRack"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LibAuditSession" ADD CONSTRAINT "LibAuditSession_shelfId_fkey" FOREIGN KEY ("shelfId") REFERENCES "LibShelf"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LibAuditScan" ADD CONSTRAINT "LibAuditScan_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LibAuditScan" ADD CONSTRAINT "LibAuditScan_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "LibAuditSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
