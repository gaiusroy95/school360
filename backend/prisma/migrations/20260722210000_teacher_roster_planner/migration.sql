-- CreateEnum
CREATE TYPE "TeacherRosterTaskType" AS ENUM ('CLASS_SUBJECT', 'TASK', 'ACTIVITY', 'EVENT', 'PARENT_ENGAGEMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "TeacherRosterTaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TeacherRosterPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateTable
CREATE TABLE "AcademicTeacherRosterTask" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "term" TEXT NOT NULL DEFAULT 'Term 1',
    "teacherName" TEXT NOT NULL,
    "department" TEXT NOT NULL DEFAULT 'General',
    "taskType" "TeacherRosterTaskType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "className" TEXT NOT NULL DEFAULT '',
    "sectionName" TEXT NOT NULL DEFAULT '',
    "subjectName" TEXT NOT NULL DEFAULT '',
    "linkedEntityId" TEXT NOT NULL DEFAULT '',
    "startDate" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "priority" "TeacherRosterPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "TeacherRosterTaskStatus" NOT NULL DEFAULT 'PENDING',
    "feedbackRequired" BOOLEAN NOT NULL DEFAULT false,
    "feedbackRecorded" BOOLEAN NOT NULL DEFAULT false,
    "feedbackNotes" TEXT NOT NULL DEFAULT '',
    "parentFeedbackRating" INTEGER NOT NULL DEFAULT 0,
    "assignedBy" TEXT NOT NULL DEFAULT '',
    "completedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcademicTeacherRosterTask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AcademicTeacherRosterTask_institutionId_recordId_key" ON "AcademicTeacherRosterTask"("institutionId", "recordId");

-- CreateIndex
CREATE INDEX "AcademicTeacherRosterTask_institutionId_academicYear_teacherName_idx" ON "AcademicTeacherRosterTask"("institutionId", "academicYear", "teacherName");

-- CreateIndex
CREATE INDEX "AcademicTeacherRosterTask_institutionId_taskType_status_idx" ON "AcademicTeacherRosterTask"("institutionId", "taskType", "status");

-- CreateIndex
CREATE INDEX "AcademicTeacherRosterTask_institutionId_dueDate_idx" ON "AcademicTeacherRosterTask"("institutionId", "dueDate");

-- AddForeignKey
ALTER TABLE "AcademicTeacherRosterTask" ADD CONSTRAINT "AcademicTeacherRosterTask_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
