-- CreateEnum
CREATE TYPE "ExamCalendarEventType" AS ENUM ('EXAM', 'CLASS_TEST');

-- CreateTable
CREATE TABLE "ExamCalendarSession" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "eventType" "ExamCalendarEventType" NOT NULL DEFAULT 'EXAM',
    "examType" "ExamTypeFilter",
    "scheduleId" TEXT,
    "classTestId" TEXT,
    "seriesName" TEXT NOT NULL DEFAULT '',
    "className" TEXT NOT NULL,
    "sectionName" TEXT NOT NULL,
    "subjectName" TEXT NOT NULL,
    "examDate" DATE NOT NULL,
    "startTime" TEXT NOT NULL DEFAULT '',
    "endTime" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'Scheduled',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExamCalendarSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExamCalendarSession_institutionId_recordId_key" ON "ExamCalendarSession"("institutionId", "recordId");

-- CreateIndex
CREATE INDEX "ExamCalendarSession_institutionId_academicYear_examDate_idx" ON "ExamCalendarSession"("institutionId", "academicYear", "examDate");

-- CreateIndex
CREATE INDEX "ExamCalendarSession_institutionId_academicYear_className_sectionName_idx" ON "ExamCalendarSession"("institutionId", "academicYear", "className", "sectionName");

-- AddForeignKey
ALTER TABLE "ExamCalendarSession" ADD CONSTRAINT "ExamCalendarSession_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamCalendarSession" ADD CONSTRAINT "ExamCalendarSession_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "ExamSchedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamCalendarSession" ADD CONSTRAINT "ExamCalendarSession_classTestId_fkey" FOREIGN KEY ("classTestId") REFERENCES "AcademicClassTest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
