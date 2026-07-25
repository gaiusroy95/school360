-- CreateTable InvBarcode
CREATE TABLE "InvBarcode" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "codeType" TEXT NOT NULL DEFAULT 'BARCODE',
    "itemId" TEXT NOT NULL,
    "batchId" TEXT,
    "assetSerialNo" TEXT NOT NULL DEFAULT '',
    "labelTemplate" TEXT NOT NULL DEFAULT '2x4',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "printCount" INTEGER NOT NULL DEFAULT 0,
    "lastPrintedAt" TIMESTAMP(3),
    "generatedBy" TEXT NOT NULL DEFAULT 'Inventory Manager',
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvBarcode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InvBarcode_institutionId_code_key" ON "InvBarcode"("institutionId", "code");
CREATE INDEX "InvBarcode_institutionId_itemId_academicYear_idx" ON "InvBarcode"("institutionId", "itemId", "academicYear");
CREATE INDEX "InvBarcode_institutionId_codeType_status_idx" ON "InvBarcode"("institutionId", "codeType", "status");
CREATE INDEX "InvBarcode_batchId_idx" ON "InvBarcode"("batchId");

-- AddForeignKey
ALTER TABLE "InvBarcode" ADD CONSTRAINT "InvBarcode_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InvBarcode" ADD CONSTRAINT "InvBarcode_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InvItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InvBarcode" ADD CONSTRAINT "InvBarcode_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "InvBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
