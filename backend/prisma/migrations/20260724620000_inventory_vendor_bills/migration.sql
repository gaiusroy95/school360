-- CreateTable InvVendorBill
CREATE TABLE "InvVendorBill" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "grnId" TEXT NOT NULL,
    "purchaseOrderId" TEXT,
    "billRef" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "invoiceDate" DATE NOT NULL,
    "dueDate" DATE,
    "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "matchStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "hasRateVariance" BOOLEAN NOT NULL DEFAULT false,
    "hasQtyVariance" BOOLEAN NOT NULL DEFAULT false,
    "varianceNotes" TEXT NOT NULL DEFAULT '',
    "varianceApproved" BOOLEAN NOT NULL DEFAULT false,
    "varianceApprovedBy" TEXT NOT NULL DEFAULT '',
    "approvedBy" TEXT NOT NULL DEFAULT '',
    "approvedAt" TIMESTAMP(3),
    "sentToFinanceAt" TIMESTAMP(3),
    "journalEntryRef" TEXT NOT NULL DEFAULT '',
    "apLedgerAccount" TEXT NOT NULL DEFAULT '',
    "journalEntryPayload" JSONB NOT NULL DEFAULT '{}',
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvVendorBill_pkey" PRIMARY KEY ("id")
);

-- CreateTable InvVendorBillLine
CREATE TABLE "InvVendorBillLine" (
    "id" TEXT NOT NULL,
    "vendorBillId" TEXT NOT NULL,
    "grnLineId" TEXT,
    "poLineId" TEXT,
    "itemId" TEXT NOT NULL,
    "invoiceQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "invoiceRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "grnQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "poRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "poQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lineValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "hasRateVariance" BOOLEAN NOT NULL DEFAULT false,
    "hasQtyVariance" BOOLEAN NOT NULL DEFAULT false,
    "varianceNote" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "InvVendorBillLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InvVendorBill_institutionId_billRef_key" ON "InvVendorBill"("institutionId", "billRef");
CREATE INDEX "InvVendorBill_institutionId_academicYear_status_idx" ON "InvVendorBill"("institutionId", "academicYear", "status");
CREATE INDEX "InvVendorBill_grnId_idx" ON "InvVendorBill"("grnId");
CREATE INDEX "InvVendorBill_supplierId_idx" ON "InvVendorBill"("supplierId");
CREATE INDEX "InvVendorBillLine_vendorBillId_idx" ON "InvVendorBillLine"("vendorBillId");
CREATE INDEX "InvVendorBillLine_itemId_idx" ON "InvVendorBillLine"("itemId");

-- AddForeignKey
ALTER TABLE "InvVendorBill" ADD CONSTRAINT "InvVendorBill_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InvVendorBill" ADD CONSTRAINT "InvVendorBill_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "InvSupplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InvVendorBill" ADD CONSTRAINT "InvVendorBill_grnId_fkey" FOREIGN KEY ("grnId") REFERENCES "InvGrn"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InvVendorBill" ADD CONSTRAINT "InvVendorBill_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "InvPurchaseOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InvVendorBillLine" ADD CONSTRAINT "InvVendorBillLine_vendorBillId_fkey" FOREIGN KEY ("vendorBillId") REFERENCES "InvVendorBill"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InvVendorBillLine" ADD CONSTRAINT "InvVendorBillLine_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InvItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
