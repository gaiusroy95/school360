-- CreateEnum
CREATE TYPE "AcademicCalendarUploadStatus" AS ENUM ('PROCESSING', 'COMPLETED', 'FAILED');
CREATE TYPE "AcademicCalendarEventSource" AS ENUM ('MANUAL', 'OCR');

-- AlterTable AcademicCalendarEvent
ALTER TABLE "AcademicCalendarEvent" ADD COLUMN "boardName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "AcademicCalendarEvent" ADD COLUMN "endDate" TIMESTAMP(3);
ALTER TABLE "AcademicCalendarEvent" ADD COLUMN "eventSource" "AcademicCalendarEventSource" NOT NULL DEFAULT 'MANUAL';
ALTER TABLE "AcademicCalendarEvent" ADD COLUMN "uploadId" TEXT;
ALTER TABLE "AcademicCalendarEvent" ADD COLUMN "publishedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "AcademicBoardCalendarUpload" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "boardName" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL DEFAULT 'application/pdf',
    "fileSizeBytes" INTEGER NOT NULL DEFAULT 0,
    "ocrRawText" TEXT NOT NULL DEFAULT '',
    "status" "AcademicCalendarUploadStatus" NOT NULL DEFAULT 'PROCESSING',
    "eventCount" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" TIMESTAMP(3),
    "errorMessage" TEXT NOT NULL DEFAULT '',
    "previewEvents" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcademicBoardCalendarUpload_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AcademicBoardCalendarUpload_institutionId_recordId_key" ON "AcademicBoardCalendarUpload"("institutionId", "recordId");
CREATE INDEX "AcademicBoardCalendarUpload_institutionId_boardName_academicYear_idx" ON "AcademicBoardCalendarUpload"("institutionId", "boardName", "academicYear");
CREATE INDEX "AcademicBoardCalendarUpload_institutionId_status_idx" ON "AcademicBoardCalendarUpload"("institutionId", "status");

CREATE INDEX "AcademicCalendarEvent_institutionId_boardName_eventDate_idx" ON "AcademicCalendarEvent"("institutionId", "boardName", "eventDate");
CREATE INDEX "AcademicCalendarEvent_institutionId_publishedAt_idx" ON "AcademicCalendarEvent"("institutionId", "publishedAt");
CREATE INDEX "AcademicCalendarEvent_uploadId_idx" ON "AcademicCalendarEvent"("uploadId");

-- AddForeignKey
ALTER TABLE "AcademicCalendarEvent" ADD CONSTRAINT "AcademicCalendarEvent_uploadId_fkey" FOREIGN KEY ("uploadId") REFERENCES "AcademicBoardCalendarUpload"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AcademicBoardCalendarUpload" ADD CONSTRAINT "AcademicBoardCalendarUpload_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
