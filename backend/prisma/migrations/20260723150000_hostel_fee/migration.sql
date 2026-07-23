-- CreateTable
CREATE TABLE "HostelFeeCategory" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "frequency" TEXT NOT NULL DEFAULT 'Monthly',
    "refundable" BOOLEAN NOT NULL DEFAULT false,
    "gstMode" TEXT NOT NULL DEFAULT 'CONFIGURABLE',
    "defaultAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "description" TEXT NOT NULL DEFAULT '',
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "status" "FeeMasterStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HostelFeeCategory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HostelFeeCollection" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "categoryId" TEXT,
    "receiptNumber" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "periodLabel" TEXT NOT NULL DEFAULT '',
    "studentId" TEXT NOT NULL DEFAULT '',
    "studentName" TEXT NOT NULL,
    "admissionNumber" TEXT NOT NULL DEFAULT '',
    "className" TEXT NOT NULL DEFAULT '',
    "roomNumber" TEXT NOT NULL DEFAULT '',
    "amount" DOUBLE PRECISION NOT NULL,
    "paymentMode" TEXT NOT NULL DEFAULT 'CASH',
    "collectedBy" TEXT NOT NULL DEFAULT '',
    "collectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "remarks" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HostelFeeCollection_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "HostelFeeCategory_institutionId_code_key" ON "HostelFeeCategory"("institutionId", "code");
CREATE INDEX "HostelFeeCategory_institutionId_status_idx" ON "HostelFeeCategory"("institutionId", "status");
CREATE INDEX "HostelFeeCategory_institutionId_displayOrder_idx" ON "HostelFeeCategory"("institutionId", "displayOrder");

CREATE UNIQUE INDEX "HostelFeeCollection_institutionId_receiptNumber_key" ON "HostelFeeCollection"("institutionId", "receiptNumber");
CREATE INDEX "HostelFeeCollection_institutionId_academicYear_idx" ON "HostelFeeCollection"("institutionId", "academicYear");
CREATE INDEX "HostelFeeCollection_institutionId_studentId_idx" ON "HostelFeeCollection"("institutionId", "studentId");
CREATE INDEX "HostelFeeCollection_categoryId_idx" ON "HostelFeeCollection"("categoryId");

ALTER TABLE "HostelFeeCategory" ADD CONSTRAINT "HostelFeeCategory_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HostelFeeCollection" ADD CONSTRAINT "HostelFeeCollection_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HostelFeeCollection" ADD CONSTRAINT "HostelFeeCollection_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "HostelFeeCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
