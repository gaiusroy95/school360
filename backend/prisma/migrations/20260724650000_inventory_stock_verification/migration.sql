-- CreateTable InvAuditSession
CREATE TABLE "InvAuditSession" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "sessionCode" TEXT NOT NULL,
    "sessionType" TEXT NOT NULL DEFAULT 'CYCLIC',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "storeFrozen" BOOLEAN NOT NULL DEFAULT false,
    "frozenAt" TIMESTAMP(3),
    "frozenBy" TEXT NOT NULL DEFAULT '',
    "initiatedBy" TEXT NOT NULL DEFAULT 'Store Keeper',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "totalItems" INTEGER NOT NULL DEFAULT 0,
    "itemsCounted" INTEGER NOT NULL DEFAULT 0,
    "varianceLines" INTEGER NOT NULL DEFAULT 0,
    "totalVarianceQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalVarianceValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "adjustmentId" TEXT,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvAuditSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable InvAuditCount
CREATE TABLE "InvAuditCount" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "systemQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "physicalQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "variance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unitCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "varianceValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "scanMethod" TEXT NOT NULL DEFAULT 'MANUAL',
    "scannedBy" TEXT NOT NULL DEFAULT '',
    "scannedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "InvAuditCount_pkey" PRIMARY KEY ("id")
);

-- CreateTable InvAuditVariance
CREATE TABLE "InvAuditVariance" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "countId" TEXT,
    "itemId" TEXT NOT NULL,
    "systemQty" DOUBLE PRECISION NOT NULL,
    "physicalQty" DOUBLE PRECISION NOT NULL,
    "variance" DOUBLE PRECISION NOT NULL,
    "unitCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "varianceValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "approvedBy" TEXT NOT NULL DEFAULT '',
    "approvedAt" TIMESTAMP(3),
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvAuditVariance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InvAuditSession_institutionId_sessionCode_key" ON "InvAuditSession"("institutionId", "sessionCode");
CREATE INDEX "InvAuditSession_institutionId_storeId_status_academicYear_idx" ON "InvAuditSession"("institutionId", "storeId", "status", "academicYear");

CREATE UNIQUE INDEX "InvAuditCount_sessionId_itemId_key" ON "InvAuditCount"("sessionId", "itemId");
CREATE INDEX "InvAuditCount_institutionId_sessionId_idx" ON "InvAuditCount"("institutionId", "sessionId");

CREATE UNIQUE INDEX "InvAuditVariance_countId_key" ON "InvAuditVariance"("countId");
CREATE INDEX "InvAuditVariance_institutionId_sessionId_status_idx" ON "InvAuditVariance"("institutionId", "sessionId", "status");

-- AddForeignKey
ALTER TABLE "InvAuditSession" ADD CONSTRAINT "InvAuditSession_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InvAuditSession" ADD CONSTRAINT "InvAuditSession_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "InvStore"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InvAuditCount" ADD CONSTRAINT "InvAuditCount_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InvAuditCount" ADD CONSTRAINT "InvAuditCount_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "InvAuditSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InvAuditCount" ADD CONSTRAINT "InvAuditCount_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InvItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InvAuditVariance" ADD CONSTRAINT "InvAuditVariance_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InvAuditVariance" ADD CONSTRAINT "InvAuditVariance_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "InvAuditSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InvAuditVariance" ADD CONSTRAINT "InvAuditVariance_countId_fkey" FOREIGN KEY ("countId") REFERENCES "InvAuditCount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InvAuditVariance" ADD CONSTRAINT "InvAuditVariance_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InvItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
