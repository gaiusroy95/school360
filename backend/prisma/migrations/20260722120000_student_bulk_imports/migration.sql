-- CreateEnum
CREATE TYPE "BulkImportStatus" AS ENUM ('DRAFT', 'PENDING', 'OPEN', 'ACTIVE', 'COMPLETED', 'APPROVED', 'PAID', 'DUE');

-- CreateEnum
CREATE TYPE "BulkImportRowStatus" AS ENUM ('PENDING', 'SUCCESS', 'UPDATED', 'ERROR', 'SKIPPED');

-- CreateTable
CREATE TABLE "StudentBulkImport" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL DEFAULT '',
    "className" TEXT NOT NULL DEFAULT '',
    "sectionName" TEXT NOT NULL DEFAULT '',
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "status" "BulkImportStatus" NOT NULL DEFAULT 'PENDING',
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "createdCount" INTEGER NOT NULL DEFAULT 0,
    "updatedCount" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "details" TEXT NOT NULL DEFAULT '',
    "updateExisting" BOOLEAN NOT NULL DEFAULT true,
    "errors" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentBulkImport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentBulkImportRow" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "rowNumber" INTEGER NOT NULL,
    "studentName" TEXT NOT NULL DEFAULT '',
    "className" TEXT NOT NULL DEFAULT '',
    "sectionName" TEXT NOT NULL DEFAULT '',
    "admissionNumber" TEXT NOT NULL DEFAULT '',
    "mobile" TEXT NOT NULL DEFAULT '',
    "status" "BulkImportRowStatus" NOT NULL DEFAULT 'PENDING',
    "message" TEXT NOT NULL DEFAULT '',
    "studentId" TEXT,
    "rawData" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentBulkImportRow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StudentBulkImport_institutionId_recordId_key" ON "StudentBulkImport"("institutionId", "recordId");

-- CreateIndex
CREATE INDEX "StudentBulkImport_institutionId_status_idx" ON "StudentBulkImport"("institutionId", "status");

-- CreateIndex
CREATE INDEX "StudentBulkImport_institutionId_createdAt_idx" ON "StudentBulkImport"("institutionId", "createdAt");

-- CreateIndex
CREATE INDEX "StudentBulkImport_institutionId_className_sectionName_idx" ON "StudentBulkImport"("institutionId", "className", "sectionName");

-- CreateIndex
CREATE INDEX "StudentBulkImportRow_batchId_idx" ON "StudentBulkImportRow"("batchId");

-- CreateIndex
CREATE INDEX "StudentBulkImportRow_batchId_status_idx" ON "StudentBulkImportRow"("batchId", "status");

-- AddForeignKey
ALTER TABLE "StudentBulkImport" ADD CONSTRAINT "StudentBulkImport_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentBulkImportRow" ADD CONSTRAINT "StudentBulkImportRow_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "StudentBulkImport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
