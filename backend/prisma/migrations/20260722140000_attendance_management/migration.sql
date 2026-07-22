-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'LATE', 'ON_LEAVE', 'HALF_DAY');

-- CreateEnum
CREATE TYPE "AttendanceSessionMode" AS ENUM ('CLASS', 'SUBJECT', 'ACTIVITY');

-- CreateEnum
CREATE TYPE "LeaveApplicationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "AttendanceSession" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "sessionDate" DATE NOT NULL,
    "className" TEXT NOT NULL,
    "sectionName" TEXT NOT NULL DEFAULT '',
    "subjectName" TEXT NOT NULL DEFAULT '',
    "activityName" TEXT NOT NULL DEFAULT '',
    "mode" "AttendanceSessionMode" NOT NULL DEFAULT 'CLASS',
    "markedBy" TEXT NOT NULL DEFAULT '',
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendanceSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceRecord" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "status" "AttendanceStatus" NOT NULL,
    "checkInTime" TEXT NOT NULL DEFAULT '',
    "lateMinutes" INTEGER NOT NULL DEFAULT 0,
    "absentReason" TEXT NOT NULL DEFAULT '',
    "remarks" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendanceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentLeaveApplication" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "fromDate" DATE NOT NULL,
    "toDate" DATE NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "LeaveApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedBy" TEXT NOT NULL DEFAULT '',
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentLeaveApplication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceSession_institutionId_recordId_key" ON "AttendanceSession"("institutionId", "recordId");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceSession_institutionId_sessionDate_className_section_key" ON "AttendanceSession"("institutionId", "sessionDate", "className", "sectionName", "mode", "subjectName", "activityName");

-- CreateIndex
CREATE INDEX "AttendanceSession_institutionId_academicYear_sessionDate_idx" ON "AttendanceSession"("institutionId", "academicYear", "sessionDate");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceRecord_sessionId_studentId_key" ON "AttendanceRecord"("sessionId", "studentId");

-- CreateIndex
CREATE INDEX "AttendanceRecord_studentId_status_idx" ON "AttendanceRecord"("studentId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "StudentLeaveApplication_institutionId_recordId_key" ON "StudentLeaveApplication"("institutionId", "recordId");

-- CreateIndex
CREATE INDEX "StudentLeaveApplication_institutionId_academicYear_status_idx" ON "StudentLeaveApplication"("institutionId", "academicYear", "status");

-- CreateIndex
CREATE INDEX "StudentLeaveApplication_studentId_fromDate_toDate_idx" ON "StudentLeaveApplication"("studentId", "fromDate", "toDate");

-- AddForeignKey
ALTER TABLE "AttendanceSession" ADD CONSTRAINT "AttendanceSession_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AttendanceSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentLeaveApplication" ADD CONSTRAINT "StudentLeaveApplication_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentLeaveApplication" ADD CONSTRAINT "StudentLeaveApplication_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
