-- AlterEnum
ALTER TYPE "ExamMarkingSheetStatus" ADD VALUE 'RETURNED';
ALTER TYPE "ExamMarkingSheetStatus" ADD VALUE 'APPROVED';
ALTER TYPE "ExamMarkingSheetStatus" ADD VALUE 'LOCKED';

-- CreateEnum
CREATE TYPE "ExamResultBatchStatus" AS ENUM ('COMPILING', 'COMPILED', 'SCHEDULED', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "ExamResultPublishMode" AS ENUM ('AUTOMATIC', 'MANUAL');

-- AlterTable
ALTER TABLE "ExamMarkingSheet" ADD COLUMN "principalApprovedAt" TIMESTAMP(3),
ADD COLUMN "principalApprovedBy" TEXT NOT NULL DEFAULT '',
ADD COLUMN "principalRemarks" TEXT NOT NULL DEFAULT '',
ADD COLUMN "returnedAt" TIMESTAMP(3),
ADD COLUMN "returnedBy" TEXT NOT NULL DEFAULT '',
ADD COLUMN "returnReason" TEXT NOT NULL DEFAULT '',
ADD COLUMN "reopenedAt" TIMESTAMP(3),
ADD COLUMN "reopenedBy" TEXT NOT NULL DEFAULT '',
ADD COLUMN "reopenReason" TEXT NOT NULL DEFAULT '',
ADD COLUMN "lockedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ExamResultBatch" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "examinationName" TEXT NOT NULL,
    "className" TEXT NOT NULL,
    "sectionName" TEXT NOT NULL,
    "status" "ExamResultBatchStatus" NOT NULL DEFAULT 'COMPILING',
    "publishMode" "ExamResultPublishMode" NOT NULL DEFAULT 'MANUAL',
    "scheduledPublishAt" TIMESTAMP(3),
    "compiledAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "publishedBy" TEXT NOT NULL DEFAULT '',
    "totalStudents" INTEGER NOT NULL DEFAULT 0,
    "subjectsTotal" INTEGER NOT NULL DEFAULT 0,
    "subjectsApproved" INTEGER NOT NULL DEFAULT 0,
    "averagePercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "passPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExamResultBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamStudentResult" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "studentName" TEXT NOT NULL,
    "admissionNumber" TEXT NOT NULL,
    "totalObtained" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalMax" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "percentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "grade" TEXT NOT NULL DEFAULT '',
    "gpa" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rank" INTEGER NOT NULL DEFAULT 0,
    "remarks" TEXT NOT NULL DEFAULT '',
    "overallPerformance" TEXT NOT NULL DEFAULT '',
    "subjectScores" JSONB NOT NULL DEFAULT '[]',
    "reportCardToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExamStudentResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamResultAuditLog" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actor" TEXT NOT NULL DEFAULT '',
    "details" TEXT NOT NULL DEFAULT '',
    "sheetId" TEXT,
    "batchId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExamResultAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamResultNotification" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "recipientType" TEXT NOT NULL DEFAULT 'parent',
    "recipientName" TEXT NOT NULL,
    "recipientMobile" TEXT NOT NULL DEFAULT '',
    "recipientEmail" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'SENT',
    "message" TEXT NOT NULL DEFAULT '',
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExamResultNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExamResultBatch_institutionId_recordId_key" ON "ExamResultBatch"("institutionId", "recordId");

-- CreateIndex
CREATE UNIQUE INDEX "ExamResultBatch_institutionId_academicYear_examinationName_cl_key" ON "ExamResultBatch"("institutionId", "academicYear", "examinationName", "className", "sectionName");

-- CreateIndex
CREATE INDEX "ExamResultBatch_institutionId_academicYear_status_idx" ON "ExamResultBatch"("institutionId", "academicYear", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ExamStudentResult_batchId_studentId_key" ON "ExamStudentResult"("batchId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "ExamStudentResult_reportCardToken_key" ON "ExamStudentResult"("reportCardToken");

-- CreateIndex
CREATE INDEX "ExamStudentResult_institutionId_studentId_idx" ON "ExamStudentResult"("institutionId", "studentId");

-- CreateIndex
CREATE INDEX "ExamStudentResult_batchId_rank_idx" ON "ExamStudentResult"("batchId", "rank");

-- CreateIndex
CREATE INDEX "ExamResultAuditLog_institutionId_entityType_entityId_idx" ON "ExamResultAuditLog"("institutionId", "entityType", "entityId");

-- CreateIndex
CREATE INDEX "ExamResultAuditLog_institutionId_createdAt_idx" ON "ExamResultAuditLog"("institutionId", "createdAt");

-- CreateIndex
CREATE INDEX "ExamResultNotification_batchId_channel_idx" ON "ExamResultNotification"("batchId", "channel");

-- CreateIndex
CREATE INDEX "ExamResultNotification_institutionId_studentId_idx" ON "ExamResultNotification"("institutionId", "studentId");

-- AddForeignKey
ALTER TABLE "ExamResultBatch" ADD CONSTRAINT "ExamResultBatch_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamStudentResult" ADD CONSTRAINT "ExamStudentResult_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ExamResultBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamStudentResult" ADD CONSTRAINT "ExamStudentResult_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamResultAuditLog" ADD CONSTRAINT "ExamResultAuditLog_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamResultAuditLog" ADD CONSTRAINT "ExamResultAuditLog_sheetId_fkey" FOREIGN KEY ("sheetId") REFERENCES "ExamMarkingSheet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamResultAuditLog" ADD CONSTRAINT "ExamResultAuditLog_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ExamResultBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamResultNotification" ADD CONSTRAINT "ExamResultNotification_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ExamResultBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
