-- CreateEnum
CREATE TYPE "StaffAttendanceStatus" AS ENUM ('PRESENT', 'PLANNED_LEAVE_ABSENT', 'MEDICAL_LEAVE_ABSENT', 'UNPLANNED_ABSENT', 'UNPLANNED_NOT_INTIMATED');

-- CreateTable
CREATE TABLE "StaffAttendanceProfile" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "staffName" TEXT NOT NULL,
    "employeeCode" TEXT NOT NULL DEFAULT '',
    "department" TEXT NOT NULL DEFAULT 'General',
    "designation" TEXT NOT NULL DEFAULT 'Staff',
    "mobile" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffAttendanceProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffAttendanceDailyRecord" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "staffProfileId" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "recordDate" DATE NOT NULL,
    "status" "StaffAttendanceStatus" NOT NULL,
    "staffRemarks" TEXT NOT NULL DEFAULT '',
    "source" TEXT NOT NULL DEFAULT 'MOBILE',
    "checkInTime" TEXT NOT NULL DEFAULT '',
    "markedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffAttendanceDailyRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffLeaveGrant" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "staffProfileId" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "leaveType" TEXT NOT NULL,
    "daysGranted" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffLeaveGrant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StaffAttendanceProfile_institutionId_recordId_key" ON "StaffAttendanceProfile"("institutionId", "recordId");

-- CreateIndex
CREATE UNIQUE INDEX "StaffAttendanceProfile_institutionId_academicYear_staffName_key" ON "StaffAttendanceProfile"("institutionId", "academicYear", "staffName");

-- CreateIndex
CREATE INDEX "StaffAttendanceProfile_institutionId_academicYear_isActive_idx" ON "StaffAttendanceProfile"("institutionId", "academicYear", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "StaffAttendanceDailyRecord_staffProfileId_recordDate_key" ON "StaffAttendanceDailyRecord"("staffProfileId", "recordDate");

-- CreateIndex
CREATE INDEX "StaffAttendanceDailyRecord_institutionId_academicYear_recordDate_idx" ON "StaffAttendanceDailyRecord"("institutionId", "academicYear", "recordDate");

-- CreateIndex
CREATE INDEX "StaffAttendanceDailyRecord_institutionId_recordDate_status_idx" ON "StaffAttendanceDailyRecord"("institutionId", "recordDate", "status");

-- CreateIndex
CREATE UNIQUE INDEX "StaffLeaveGrant_staffProfileId_academicYear_leaveType_key" ON "StaffLeaveGrant"("staffProfileId", "academicYear", "leaveType");

-- CreateIndex
CREATE INDEX "StaffLeaveGrant_institutionId_academicYear_idx" ON "StaffLeaveGrant"("institutionId", "academicYear");

-- AddForeignKey
ALTER TABLE "StaffAttendanceProfile" ADD CONSTRAINT "StaffAttendanceProfile_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffAttendanceDailyRecord" ADD CONSTRAINT "StaffAttendanceDailyRecord_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffAttendanceDailyRecord" ADD CONSTRAINT "StaffAttendanceDailyRecord_staffProfileId_fkey" FOREIGN KEY ("staffProfileId") REFERENCES "StaffAttendanceProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffLeaveGrant" ADD CONSTRAINT "StaffLeaveGrant_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffLeaveGrant" ADD CONSTRAINT "StaffLeaveGrant_staffProfileId_fkey" FOREIGN KEY ("staffProfileId") REFERENCES "StaffAttendanceProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
