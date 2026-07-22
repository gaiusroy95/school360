-- AlterTable
ALTER TABLE "StudentLeaveApplication" ADD COLUMN IF NOT EXISTS "leaveType" TEXT NOT NULL DEFAULT 'GENERAL';
ALTER TABLE "StudentLeaveApplication" ADD COLUMN IF NOT EXISTS "reviewerRemarks" TEXT NOT NULL DEFAULT '';
ALTER TABLE "StudentLeaveApplication" ADD COLUMN IF NOT EXISTS "source" TEXT NOT NULL DEFAULT 'PARENT_APP';

-- CreateTable
CREATE TABLE "TeacherLeaveApplication" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "teacherProfileId" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "leaveType" TEXT NOT NULL DEFAULT 'PLANNED',
    "fromDate" DATE NOT NULL,
    "toDate" DATE NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "LeaveApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedBy" TEXT NOT NULL DEFAULT '',
    "reviewerRemarks" TEXT NOT NULL DEFAULT '',
    "source" TEXT NOT NULL DEFAULT 'MOBILE',
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeacherLeaveApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffLeaveApplication" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "staffProfileId" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "leaveType" TEXT NOT NULL DEFAULT 'PLANNED',
    "fromDate" DATE NOT NULL,
    "toDate" DATE NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "LeaveApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedBy" TEXT NOT NULL DEFAULT '',
    "reviewerRemarks" TEXT NOT NULL DEFAULT '',
    "source" TEXT NOT NULL DEFAULT 'MOBILE',
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffLeaveApplication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TeacherLeaveApplication_institutionId_recordId_key" ON "TeacherLeaveApplication"("institutionId", "recordId");

-- CreateIndex
CREATE INDEX "TeacherLeaveApplication_institutionId_academicYear_status_idx" ON "TeacherLeaveApplication"("institutionId", "academicYear", "status");

-- CreateIndex
CREATE INDEX "TeacherLeaveApplication_teacherProfileId_fromDate_toDate_idx" ON "TeacherLeaveApplication"("teacherProfileId", "fromDate", "toDate");

-- CreateIndex
CREATE UNIQUE INDEX "StaffLeaveApplication_institutionId_recordId_key" ON "StaffLeaveApplication"("institutionId", "recordId");

-- CreateIndex
CREATE INDEX "StaffLeaveApplication_institutionId_academicYear_status_idx" ON "StaffLeaveApplication"("institutionId", "academicYear", "status");

-- CreateIndex
CREATE INDEX "StaffLeaveApplication_staffProfileId_fromDate_toDate_idx" ON "StaffLeaveApplication"("staffProfileId", "fromDate", "toDate");

-- AddForeignKey
ALTER TABLE "TeacherLeaveApplication" ADD CONSTRAINT "TeacherLeaveApplication_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherLeaveApplication" ADD CONSTRAINT "TeacherLeaveApplication_teacherProfileId_fkey" FOREIGN KEY ("teacherProfileId") REFERENCES "TeacherAttendanceProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffLeaveApplication" ADD CONSTRAINT "StaffLeaveApplication_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffLeaveApplication" ADD CONSTRAINT "StaffLeaveApplication_staffProfileId_fkey" FOREIGN KEY ("staffProfileId") REFERENCES "StaffAttendanceProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
