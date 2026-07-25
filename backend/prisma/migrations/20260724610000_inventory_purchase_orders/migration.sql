-- AlterTable InvPurchaseOrder
ALTER TABLE "InvPurchaseOrder" ADD COLUMN "indentId" TEXT,
ADD COLUMN "department" TEXT NOT NULL DEFAULT '',
ADD COLUMN "budgetCode" TEXT NOT NULL DEFAULT '',
ADD COLUMN "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "encumbranceAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "encumbranceBlocked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "approvalRoute" TEXT NOT NULL DEFAULT 'AUTO',
ADD COLUMN "submittedBy" TEXT NOT NULL DEFAULT '',
ADD COLUMN "submittedAt" TIMESTAMP(3),
ADD COLUMN "approvedBy" TEXT NOT NULL DEFAULT '',
ADD COLUMN "approvedAt" TIMESTAMP(3),
ADD COLUMN "rejectedReason" TEXT NOT NULL DEFAULT '',
ADD COLUMN "emailedAt" TIMESTAMP(3),
ADD COLUMN "emailedTo" TEXT NOT NULL DEFAULT '',
ADD COLUMN "notes" TEXT NOT NULL DEFAULT '';

ALTER TABLE "InvPurchaseOrder" ALTER COLUMN "status" SET DEFAULT 'DRAFT';

-- AlterTable InvPurchaseOrderLine
ALTER TABLE "InvPurchaseOrderLine" ADD COLUMN "indentLineId" TEXT,
ADD COLUMN "taxRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "discountPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable InvPurchaseIndent
CREATE TABLE "InvPurchaseIndent" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "indentNumber" TEXT NOT NULL,
    "department" TEXT NOT NULL DEFAULT '',
    "requestedBy" TEXT NOT NULL DEFAULT 'Department Head',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "notes" TEXT NOT NULL DEFAULT '',
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvPurchaseIndent_pkey" PRIMARY KEY ("id")
);

-- CreateTable InvPurchaseIndentLine
CREATE TABLE "InvPurchaseIndentLine" (
    "id" TEXT NOT NULL,
    "indentId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "requestedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unitEstimate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT NOT NULL DEFAULT '',
    "convertedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvPurchaseIndentLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InvPurchaseIndent_institutionId_indentNumber_key" ON "InvPurchaseIndent"("institutionId", "indentNumber");
CREATE INDEX "InvPurchaseIndent_institutionId_academicYear_status_idx" ON "InvPurchaseIndent"("institutionId", "academicYear", "status");
CREATE INDEX "InvPurchaseIndentLine_indentId_idx" ON "InvPurchaseIndentLine"("indentId");
CREATE INDEX "InvPurchaseIndentLine_itemId_idx" ON "InvPurchaseIndentLine"("itemId");
CREATE INDEX "InvPurchaseOrderLine_indentLineId_idx" ON "InvPurchaseOrderLine"("indentLineId");

-- AddForeignKey
ALTER TABLE "InvPurchaseOrder" ADD CONSTRAINT "InvPurchaseOrder_indentId_fkey" FOREIGN KEY ("indentId") REFERENCES "InvPurchaseIndent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InvPurchaseOrderLine" ADD CONSTRAINT "InvPurchaseOrderLine_indentLineId_fkey" FOREIGN KEY ("indentLineId") REFERENCES "InvPurchaseIndentLine"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InvPurchaseIndent" ADD CONSTRAINT "InvPurchaseIndent_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InvPurchaseIndentLine" ADD CONSTRAINT "InvPurchaseIndentLine_indentId_fkey" FOREIGN KEY ("indentId") REFERENCES "InvPurchaseIndent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InvPurchaseIndentLine" ADD CONSTRAINT "InvPurchaseIndentLine_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InvItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Legacy PO rows: treat existing PENDING as ORDERED (vendor-facing)
UPDATE "InvPurchaseOrder" SET "status" = 'ORDERED' WHERE "status" = 'PENDING';
