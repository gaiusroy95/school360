-- CreateEnum
CREATE TYPE "StudentReportType" AS ENUM ('ACTIVE_INACTIVE', 'CLASS_TOPPERS', 'ABSENT_CLASS', 'ID_CARD', 'RFID_BIOMETRIC', 'CUSTOM');

-- CreateEnum
CREATE TYPE "StudentReportStatus" AS ENUM ('DRAFT', 'PENDING', 'OPEN', 'ACTIVE', 'COMPLETED', 'APPROVED', 'PAID', 'DUE');

-- CreateTable
CREATE TABLE "StudentReport" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "reportType" "StudentReportType" NOT NULL,
    "name" TEXT NOT NULL,
    "period" TEXT NOT NULL DEFAULT '',
    "className" TEXT NOT NULL DEFAULT '',
    "sectionName" TEXT NOT NULL DEFAULT '',
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "status" "StudentReportStatus" NOT NULL DEFAULT 'COMPLETED',
    "config" JSONB NOT NULL DEFAULT '{}',
    "data" JSONB NOT NULL DEFAULT '{}',
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StudentReport_institutionId_recordId_key" ON "StudentReport"("institutionId", "recordId");

-- CreateIndex
CREATE INDEX "StudentReport_institutionId_reportType_idx" ON "StudentReport"("institutionId", "reportType");

-- CreateIndex
CREATE INDEX "StudentReport_institutionId_status_idx" ON "StudentReport"("institutionId", "status");

-- CreateIndex
CREATE INDEX "StudentReport_institutionId_generatedAt_idx" ON "StudentReport"("institutionId", "generatedAt");

-- CreateIndex
CREATE INDEX "StudentReport_institutionId_className_sectionName_idx" ON "StudentReport"("institutionId", "className", "sectionName");

-- AddForeignKey
ALTER TABLE "StudentReport" ADD CONSTRAINT "StudentReport_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
