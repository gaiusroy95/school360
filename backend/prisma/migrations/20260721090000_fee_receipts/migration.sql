-- CreateEnum
CREATE TYPE "FeePaymentMode" AS ENUM ('CASH', 'UPI', 'CARD', 'CHEQUE', 'BANK_TRANSFER');

-- CreateTable
CREATE TABLE "FeeReceipt" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "admissionRecordId" TEXT,
    "receiptNumber" TEXT NOT NULL,
    "studentName" TEXT NOT NULL,
    "admissionNumber" TEXT NOT NULL DEFAULT '',
    "className" TEXT NOT NULL,
    "sectionName" TEXT NOT NULL DEFAULT '',
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "paymentMode" "FeePaymentMode" NOT NULL,
    "amountPaid" DOUBLE PRECISION NOT NULL,
    "feeBreakdown" JSONB NOT NULL,
    "remarks" TEXT NOT NULL DEFAULT '',
    "collectedBy" TEXT NOT NULL DEFAULT '',
    "collectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "institutionSnapshot" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeeReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FeeReceipt_institutionId_receiptNumber_key" ON "FeeReceipt"("institutionId", "receiptNumber");
CREATE INDEX "FeeReceipt_institutionId_collectedAt_idx" ON "FeeReceipt"("institutionId", "collectedAt");
CREATE INDEX "FeeReceipt_admissionRecordId_idx" ON "FeeReceipt"("admissionRecordId");

-- AddForeignKey
ALTER TABLE "FeeReceipt" ADD CONSTRAINT "FeeReceipt_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FeeReceipt" ADD CONSTRAINT "FeeReceipt_admissionRecordId_fkey" FOREIGN KEY ("admissionRecordId") REFERENCES "AdmissionRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;
