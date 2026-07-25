-- AlterTable InvAdjustment
ALTER TABLE "InvAdjustment" ADD COLUMN "reasonCode" TEXT NOT NULL DEFAULT 'CORRECTION',
ADD COLUMN "remarks" TEXT NOT NULL DEFAULT '',
ADD COLUMN "totalQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "financialImpact" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "status" TEXT NOT NULL DEFAULT 'DRAFT',
ADD COLUMN "createdBy" TEXT NOT NULL DEFAULT 'Store Keeper',
ADD COLUMN "submittedBy" TEXT NOT NULL DEFAULT '',
ADD COLUMN "submittedAt" TIMESTAMP(3),
ADD COLUMN "approvedBy" TEXT NOT NULL DEFAULT '',
ADD COLUMN "approvedAt" TIMESTAMP(3),
ADD COLUMN "rejectedReason" TEXT NOT NULL DEFAULT '',
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX "InvAdjustment_institutionId_academicYear_status_idx" ON "InvAdjustment"("institutionId", "academicYear", "status");

-- CreateTable InvAdjustmentLine
CREATE TABLE "InvAdjustmentLine" (
    "id" TEXT NOT NULL,
    "adjustmentId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "direction" TEXT NOT NULL DEFAULT 'DEDUCT',
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unitCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lineValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reasonCode" TEXT NOT NULL DEFAULT 'CORRECTION',
    "remarks" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvAdjustmentLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable InvAdjustmentAuditLog
CREATE TABLE "InvAdjustmentAuditLog" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "adjustmentId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" TEXT NOT NULL DEFAULT '',
    "fieldSnapshot" JSONB NOT NULL DEFAULT '{}',
    "performedBy" TEXT NOT NULL DEFAULT 'Store Keeper',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvAdjustmentAuditLog_pkey" PRIMARY KEY ("id")
);

-- AlterTable InvLedger
ALTER TABLE "InvLedger" ADD COLUMN "adjustmentId" TEXT;

-- CreateIndex
CREATE INDEX "InvAdjustmentLine_adjustmentId_idx" ON "InvAdjustmentLine"("adjustmentId");
CREATE INDEX "InvAdjustmentLine_itemId_idx" ON "InvAdjustmentLine"("itemId");
CREATE INDEX "InvAdjustmentAuditLog_institutionId_adjustmentId_idx" ON "InvAdjustmentAuditLog"("institutionId", "adjustmentId");
CREATE INDEX "InvAdjustmentAuditLog_institutionId_createdAt_idx" ON "InvAdjustmentAuditLog"("institutionId", "createdAt");
CREATE INDEX "InvLedger_adjustmentId_idx" ON "InvLedger"("adjustmentId");

-- AddForeignKey
ALTER TABLE "InvAdjustmentLine" ADD CONSTRAINT "InvAdjustmentLine_adjustmentId_fkey" FOREIGN KEY ("adjustmentId") REFERENCES "InvAdjustment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InvAdjustmentLine" ADD CONSTRAINT "InvAdjustmentLine_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InvItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InvAdjustmentAuditLog" ADD CONSTRAINT "InvAdjustmentAuditLog_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InvAdjustmentAuditLog" ADD CONSTRAINT "InvAdjustmentAuditLog_adjustmentId_fkey" FOREIGN KEY ("adjustmentId") REFERENCES "InvAdjustment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InvLedger" ADD CONSTRAINT "InvLedger_adjustmentId_fkey" FOREIGN KEY ("adjustmentId") REFERENCES "InvAdjustment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
