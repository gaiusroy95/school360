-- CreateEnum
CREATE TYPE "TeacherAttendanceStatus" AS ENUM ('PRESENT', 'PLANNED_LEAVE_ABSENT', 'MEDICAL_LEAVE_ABSENT', 'UNPLANNED_ABSENT', 'UNPLANNED_NOT_INTIMATED');

-- CreateTable
CREATE TABLE "TeacherAttendanceProfile" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "teacherName" TEXT NOT NULL,
    "employeeCode" TEXT NOT NULL DEFAULT '',
    "department" TEXT NOT NULL DEFAULT 'General',
    "designation" TEXT NOT NULL DEFAULT 'Teacher',
    "mobile" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeacherAttendanceProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeacherAttendanceDailyRecord" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "teacherProfileId" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "recordDate" DATE NOT NULL,
    "status" "TeacherAttendanceStatus" NOT NULL,
    "teacherRemarks" TEXT NOT NULL DEFAULT '',
    "source" TEXT NOT NULL DEFAULT 'MOBILE',
    "checkInTime" TEXT NOT NULL DEFAULT '',
    "markedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeacherAttendanceDailyRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeacherLeaveGrant" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "teacherProfileId" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "leaveType" TEXT NOT NULL,
    "daysGranted" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeacherLeaveGrant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TeacherAttendanceProfile_institutionId_recordId_key" ON "TeacherAttendanceProfile"("institutionId", "recordId");

-- CreateIndex
CREATE UNIQUE INDEX "TeacherAttendanceProfile_institutionId_academicYear_teacherName_key" ON "TeacherAttendanceProfile"("institutionId", "academicYear", "teacherName");

-- CreateIndex
CREATE INDEX "TeacherAttendanceProfile_institutionId_academicYear_isActive_idx" ON "TeacherAttendanceProfile"("institutionId", "academicYear", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "TeacherAttendanceDailyRecord_teacherProfileId_recordDate_key" ON "TeacherAttendanceDailyRecord"("teacherProfileId", "recordDate");

-- CreateIndex
CREATE INDEX "TeacherAttendanceDailyRecord_institutionId_academicYear_recordDate_idx" ON "TeacherAttendanceDailyRecord"("institutionId", "academicYear", "recordDate");

-- CreateIndex
CREATE INDEX "TeacherAttendanceDailyRecord_institutionId_recordDate_status_idx" ON "TeacherAttendanceDailyRecord"("institutionId", "recordDate", "status");

-- CreateIndex
CREATE UNIQUE INDEX "TeacherLeaveGrant_teacherProfileId_academicYear_leaveType_key" ON "TeacherLeaveGrant"("teacherProfileId", "academicYear", "leaveType");

-- CreateIndex
CREATE INDEX "TeacherLeaveGrant_institutionId_academicYear_idx" ON "TeacherLeaveGrant"("institutionId", "academicYear");

-- AddForeignKey
ALTER TABLE "TeacherAttendanceProfile" ADD CONSTRAINT "TeacherAttendanceProfile_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherAttendanceDailyRecord" ADD CONSTRAINT "TeacherAttendanceDailyRecord_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherAttendanceDailyRecord" ADD CONSTRAINT "TeacherAttendanceDailyRecord_teacherProfileId_fkey" FOREIGN KEY ("teacherProfileId") REFERENCES "TeacherAttendanceProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherLeaveGrant" ADD CONSTRAINT "TeacherLeaveGrant_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherLeaveGrant" ADD CONSTRAINT "TeacherLeaveGrant_teacherProfileId_fkey" FOREIGN KEY ("teacherProfileId") REFERENCES "TeacherAttendanceProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
