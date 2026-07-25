-- AlterTable InvLedger
ALTER TABLE "InvLedger" ADD COLUMN "outwardId" TEXT;

-- CreateTable InvOutwardIndent
CREATE TABLE "InvOutwardIndent" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "indentNumber" TEXT NOT NULL,
    "departmentName" TEXT NOT NULL DEFAULT '',
    "requestedBy" TEXT NOT NULL DEFAULT '',
    "approvedBy" TEXT NOT NULL DEFAULT '',
    "approvedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'APPROVED',
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvOutwardIndent_pkey" PRIMARY KEY ("id")
);

-- CreateTable InvOutwardIndentLine
CREATE TABLE "InvOutwardIndentLine" (
    "id" TEXT NOT NULL,
    "indentId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "requestedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "issuedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unitCost" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "InvOutwardIndentLine_pkey" PRIMARY KEY ("id")
);

-- AlterTable InvStockOutward
ALTER TABLE "InvStockOutward" ADD COLUMN "indentId" TEXT,
ADD COLUMN "outwardType" TEXT NOT NULL DEFAULT 'ISSUE_TO_STAFF',
ADD COLUMN "consumerType" TEXT NOT NULL DEFAULT 'STAFF',
ADD COLUMN "consumerId" TEXT NOT NULL DEFAULT '',
ADD COLUMN "consumerName" TEXT NOT NULL DEFAULT '',
ADD COLUMN "salesInvoiceNo" TEXT NOT NULL DEFAULT '',
ADD COLUMN "paymentMethod" TEXT NOT NULL DEFAULT '',
ADD COLUMN "paymentStatus" TEXT NOT NULL DEFAULT '',
ADD COLUMN "receiptSent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "feeLedgerPosted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable InvStockOutwardLine
ALTER TABLE "InvStockOutwardLine" ADD COLUMN "batchId" TEXT,
ADD COLUMN "batchNo" TEXT NOT NULL DEFAULT '',
ADD COLUMN "unitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX "InvOutwardIndent_institutionId_indentNumber_key" ON "InvOutwardIndent"("institutionId", "indentNumber");

CREATE INDEX "InvOutwardIndent_institutionId_status_academicYear_idx" ON "InvOutwardIndent"("institutionId", "status", "academicYear");

CREATE INDEX "InvOutwardIndentLine_indentId_idx" ON "InvOutwardIndentLine"("indentId");

CREATE INDEX "InvOutwardIndentLine_itemId_idx" ON "InvOutwardIndentLine"("itemId");

CREATE INDEX "InvStockOutward_institutionId_outwardType_status_idx" ON "InvStockOutward"("institutionId", "outwardType", "status");

CREATE INDEX "InvLedger_outwardId_idx" ON "InvLedger"("outwardId");

-- AddForeignKey
ALTER TABLE "InvLedger" ADD CONSTRAINT "InvLedger_outwardId_fkey" FOREIGN KEY ("outwardId") REFERENCES "InvStockOutward"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "InvOutwardIndent" ADD CONSTRAINT "InvOutwardIndent_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InvOutwardIndentLine" ADD CONSTRAINT "InvOutwardIndentLine_indentId_fkey" FOREIGN KEY ("indentId") REFERENCES "InvOutwardIndent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InvOutwardIndentLine" ADD CONSTRAINT "InvOutwardIndentLine_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InvItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InvStockOutward" ADD CONSTRAINT "InvStockOutward_indentId_fkey" FOREIGN KEY ("indentId") REFERENCES "InvOutwardIndent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
