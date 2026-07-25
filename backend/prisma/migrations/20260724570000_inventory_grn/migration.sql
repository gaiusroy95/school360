-- AlterTable InvGrn
ALTER TABLE "InvGrn" ADD COLUMN "purchaseOrderId" TEXT,
ADD COLUMN "challanNumber" TEXT NOT NULL DEFAULT '',
ADD COLUMN "billNumber" TEXT NOT NULL DEFAULT '',
ADD COLUMN "hasVariance" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "varianceApproved" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "qualityNotes" TEXT NOT NULL DEFAULT '',
ADD COLUMN "approvedBy" TEXT NOT NULL DEFAULT '',
ADD COLUMN "approvedAt" TIMESTAMP(3),
ADD COLUMN "apQueued" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "InvGrn" ALTER COLUMN "status" SET DEFAULT 'DRAFT';

-- AlterTable InvGrnLine
ALTER TABLE "InvGrnLine" ADD COLUMN "poLineId" TEXT,
ADD COLUMN "orderedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "pendingQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "batchNo" TEXT NOT NULL DEFAULT '',
ADD COLUMN "manufacturingDate" DATE,
ADD COLUMN "expiryDate" DATE,
ADD COLUMN "varianceOverride" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable InvPurchaseOrderLine
CREATE TABLE "InvPurchaseOrderLine" (
    "id" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "orderedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "receivedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unitCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lineValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvPurchaseOrderLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable InvBatch
CREATE TABLE "InvBatch" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "grnId" TEXT,
    "itemId" TEXT NOT NULL,
    "batchNo" TEXT NOT NULL,
    "manufacturingDate" DATE,
    "expiryDate" DATE,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "remainingQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable InvLedger
CREATE TABLE "InvLedger" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "grnId" TEXT,
    "transactionType" TEXT NOT NULL DEFAULT 'GRN_IN',
    "referenceNo" TEXT NOT NULL DEFAULT '',
    "quantityIn" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "quantityOut" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unitCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "balanceQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "transactionDate" DATE NOT NULL,
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "performedBy" TEXT NOT NULL DEFAULT 'Store Keeper',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvLedger_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InvGrn_institutionId_status_academicYear_idx" ON "InvGrn"("institutionId", "status", "academicYear");

CREATE INDEX "InvGrnLine_poLineId_idx" ON "InvGrnLine"("poLineId");

CREATE INDEX "InvPurchaseOrderLine_purchaseOrderId_idx" ON "InvPurchaseOrderLine"("purchaseOrderId");

CREATE INDEX "InvPurchaseOrderLine_itemId_idx" ON "InvPurchaseOrderLine"("itemId");

CREATE INDEX "InvBatch_institutionId_itemId_academicYear_idx" ON "InvBatch"("institutionId", "itemId", "academicYear");

CREATE INDEX "InvBatch_institutionId_expiryDate_idx" ON "InvBatch"("institutionId", "expiryDate");

CREATE INDEX "InvBatch_grnId_idx" ON "InvBatch"("grnId");

CREATE INDEX "InvLedger_institutionId_itemId_academicYear_idx" ON "InvLedger"("institutionId", "itemId", "academicYear");

CREATE INDEX "InvLedger_institutionId_transactionDate_idx" ON "InvLedger"("institutionId", "transactionDate");

CREATE INDEX "InvLedger_grnId_idx" ON "InvLedger"("grnId");

-- AddForeignKey
ALTER TABLE "InvGrn" ADD CONSTRAINT "InvGrn_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "InvPurchaseOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "InvGrnLine" ADD CONSTRAINT "InvGrnLine_poLineId_fkey" FOREIGN KEY ("poLineId") REFERENCES "InvPurchaseOrderLine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "InvPurchaseOrderLine" ADD CONSTRAINT "InvPurchaseOrderLine_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "InvPurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InvPurchaseOrderLine" ADD CONSTRAINT "InvPurchaseOrderLine_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InvItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InvBatch" ADD CONSTRAINT "InvBatch_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InvBatch" ADD CONSTRAINT "InvBatch_grnId_fkey" FOREIGN KEY ("grnId") REFERENCES "InvGrn"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "InvBatch" ADD CONSTRAINT "InvBatch_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InvItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InvLedger" ADD CONSTRAINT "InvLedger_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InvLedger" ADD CONSTRAINT "InvLedger_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InvItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InvLedger" ADD CONSTRAINT "InvLedger_grnId_fkey" FOREIGN KEY ("grnId") REFERENCES "InvGrn"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Update existing GRN records to RECEIVED status if they were legacy
UPDATE "InvGrn" SET "status" = 'RECEIVED' WHERE "status" = 'RECEIVED' OR "challanNumber" = '';
